import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProfile } from "../domain/model/auth-profile/auth-profile.js";
import { AuthTokenManager, extractByJsonPath } from "../domain/services/auth-token-manager.js";
import { InMemoryAuthTokenCache } from "../infrastructure/cache/in-memory-auth-token-cache.js";
import { CryptoVault } from "../domain/services/crypto-vault.js";
import { MockAuthProfileRepository } from "../infrastructure/adapters/mock-auth-profile-repository.js";
import { ExecuteCheckUseCase } from "../application/use-cases/execute-check.js";
import { Monitor } from "../domain/model/monitor/monitor.js";
import { MonitorId } from "../domain/model/monitor/monitor-id.js";
import { MonitorType } from "../domain/model/monitor/monitor-type.js";
import { MonitorStatus } from "../domain/model/monitor/monitor-status.js";
import { ProbeConfiguration } from "../domain/model/monitor/probe-configuration.js";
import { Schedule } from "../domain/model/monitor/schedule.js";
import { AlarmPolicy } from "../domain/model/monitor/alarm-policy.js";
import { AssertionEngine } from "../domain/services/assertion-engine.js";
import { CheckResult } from "../domain/model/check-execution/check-result.js";

describe("AuthTokenManager & Dynamic Authentication", () => {
  let cache: InMemoryAuthTokenCache;
  let tokenManager: AuthTokenManager;

  beforeEach(() => {
    cache = new InMemoryAuthTokenCache();
    tokenManager = new AuthTokenManager(cache, 10_000); // 10s safety margin per i test
    vi.restoreAllMocks();
  });

  describe("extractByJsonPath", () => {
    it("should extract top-level and nested properties", () => {
      const payload = {
        access_token: "tok-1",
        data: {
          auth: {
            jwt: "tok-nested",
          },
        },
      };

      expect(extractByJsonPath(payload, "access_token")).toBe("tok-1");
      expect(extractByJsonPath(payload, "data.auth.jwt")).toBe("tok-nested");
      expect(extractByJsonPath(payload, "$.data.auth.jwt")).toBe("tok-nested");
      expect(extractByJsonPath(payload, "not.found")).toBeUndefined();
    });
  });

  describe("Static Profiles", () => {
    it("should immediately resolve static profiles without calling fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const profile = AuthProfile.create({
        dashboardId: "dash-1",
        name: "Static Key",
        type: "API_KEY",
        data: { headerName: "X-Key", headerValue: "secret-123" },
      });

      const headers = await tokenManager.resolveHeaders(profile);
      expect(headers).toEqual({ "X-Key": "secret-123" });
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("DYNAMIC_LOGIN Flow & Caching", () => {
    it("should execute POST login, extract token and cache it", async () => {
      let callCount = 0;
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        callCount++;
        expect(url).toBe("https://api.test.local/login");
        expect(init?.method).toBe("POST");
        const bodyObj = JSON.parse(init?.body as string);
        expect(bodyObj.username).toBe("admin");

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () => JSON.stringify({
            data: { sessionToken: "session_jwt_abc123" },
            expires_in: 3600,
          }),
        } as any;
      });

      const profile = AuthProfile.create({
        dashboardId: "dash-1",
        name: "Dynamic Portal",
        type: "DYNAMIC_LOGIN",
        data: {
          loginUrl: "https://api.test.local/login",
          method: "POST",
          body: JSON.stringify({ username: "admin", password: "secretPassword" }),
          tokenPath: "data.sessionToken",
          expiresInPath: "expires_in",
          targetHeaderName: "Authorization",
          targetHeaderPrefix: "Bearer ",
        },
      });

      // 1. Prima chiamata: esegue la fetch
      const headers1 = await tokenManager.resolveHeaders(profile);
      expect(headers1).toEqual({ Authorization: "Bearer session_jwt_abc123" });
      expect(callCount).toBe(1);

      // 2. Seconda chiamata: deve attingere dalla cache senza invocare fetch!
      const headers2 = await tokenManager.resolveHeaders(profile);
      expect(headers2).toEqual({ Authorization: "Bearer session_jwt_abc123" });
      expect(callCount).toBe(1);

      // 3. Invalidation esplicita: la chiamata successiva ripete la fetch
      await tokenManager.invalidate(profile.id.toString());
      const headers3 = await tokenManager.resolveHeaders(profile);
      expect(headers3).toEqual({ Authorization: "Bearer session_jwt_abc123" });
      expect(callCount).toBe(2);
    });

    it("Single-Flight: concurrent requests must not duplicate HTTP calls (prevents Thundering Herd)", async () => {
      let callCount = 0;
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        callCount++;
        // Simula latenza di rete di 50ms
        await new Promise((r) => setTimeout(r, 50));
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () => JSON.stringify({ access_token: "single_flight_token" }),
        } as any;
      });

      const profile = AuthProfile.create({
        dashboardId: "dash-1",
        name: "Concurrent Test",
        type: "DYNAMIC_LOGIN",
        data: {
          loginUrl: "https://auth.test.local/token",
          tokenPath: "access_token",
        },
      });

      // Eseguiamo 5 richieste in concorrenza con Promise.all
      const results = await Promise.all([
        tokenManager.resolveHeaders(profile),
        tokenManager.resolveHeaders(profile),
        tokenManager.resolveHeaders(profile),
        tokenManager.resolveHeaders(profile),
        tokenManager.resolveHeaders(profile),
      ]);

      expect(callCount).toBe(1);
      results.forEach((h) => {
        expect(h).toEqual({ Authorization: "Bearer single_flight_token" });
      });
    });

    it("should throw an exception with status and details if login fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => "Invalid credentials provided",
      } as any);

      const profile = AuthProfile.create({
        dashboardId: "dash-1",
        name: "Failing Auth",
        type: "DYNAMIC_LOGIN",
        data: {
          loginUrl: "https://api.test.local/login",
          tokenPath: "access_token",
        },
      });

      await expect(tokenManager.resolveHeaders(profile)).rejects.toThrow(/Pre-flight login failed: HTTP 401/);
    });
  });

  describe("OAUTH2_CLIENT_CREDENTIALS Flow", () => {
    it("should execute form-urlencoded request with client credentials", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        expect(url).toBe("https://oauth.provider.com/token");
        expect(init?.headers).toMatchObject({
          "Content-Type": "application/x-www-form-urlencoded",
        });
        const bodyStr = init?.body as string;
        expect(bodyStr).toContain("grant_type=client_credentials");
        expect(bodyStr).toContain("client_id=my-client-id");
        expect(bodyStr).toContain("client_secret=superSecretKey");
        expect(bodyStr).toContain("scope=read%3Amonitors");

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () => JSON.stringify({
            access_token: "oauth2-generated-token-xyz",
            token_type: "Bearer",
            expires_in: 7200,
          }),
        } as any;
      });

      const profile = AuthProfile.create({
        dashboardId: "dash-1",
        name: "OAuth2 Keycloak",
        type: "OAUTH2_CLIENT_CREDENTIALS",
        data: {
          tokenUrl: "https://oauth.provider.com/token",
          clientId: "my-client-id",
          clientSecret: "superSecretKey",
          scope: "read:monitors",
        },
      });

      const headers = await tokenManager.resolveHeaders(profile);
      expect(headers).toEqual({ Authorization: "Bearer oauth2-generated-token-xyz" });
    });
  });

  describe("CryptoVault with OAuth2 and Dynamic Login", () => {
    it("should encrypt clientSecret in OAuth2 and decrypt it at runtime", () => {
      const data = {
        tokenUrl: "https://auth.test.local",
        clientId: "cid_1",
        clientSecret: "mySuperSecretClientSecret123",
      };

      const encrypted = CryptoVault.encryptData("OAUTH2_CLIENT_CREDENTIALS", data);
      expect(encrypted.clientSecret).not.toBe(data.clientSecret);
      expect(encrypted.clientSecret.startsWith("enc:gcm:")).toBe(true);

      const decrypted = CryptoVault.decryptData("OAUTH2_CLIENT_CREDENTIALS", encrypted);
      expect(decrypted.clientSecret).toBe(data.clientSecret);

      const masked = CryptoVault.maskData("OAUTH2_CLIENT_CREDENTIALS", encrypted);
      expect(masked.clientSecret.includes("••••••••")).toBe(true);
    });

    it("should encrypt JSON body in Dynamic Login and mask password", () => {
      const rawBody = JSON.stringify({
        username: "admin",
        password: "mySecretPassword999",
      });
      const data = {
        loginUrl: "https://auth.test.local/login",
        body: rawBody,
        tokenPath: "token",
      };

      const encrypted = CryptoVault.encryptData("DYNAMIC_LOGIN", data);
      expect(encrypted.body).not.toBe(rawBody);
      expect(encrypted.body.startsWith("enc:gcm:")).toBe(true);

      const decrypted = CryptoVault.decryptData("DYNAMIC_LOGIN", encrypted);
      expect(decrypted.body).toBe(rawBody);

      const masked = CryptoVault.maskData("DYNAMIC_LOGIN", encrypted);
      const maskedParsed = JSON.parse(masked.body);
      expect(maskedParsed.username).toBe("admin");
      expect(maskedParsed.password).toBe("••••••••");
    });
  });

  describe("ExecuteCheckUseCase with Dynamic Auth & Auto-Invalidation", () => {
    it("should resolve dynamic profile and execute check with Bearer header", async () => {
      const authRepo = new MockAuthProfileRepository();
      const dynamicProfile = AuthProfile.create({
        dashboardId: "dash-1",
        name: "Dynamic Profile In UseCase",
        type: "DYNAMIC_LOGIN",
        data: {
          loginUrl: "https://api.test.local/login",
          tokenPath: "jwt",
        },
      });
      await authRepo.save(dynamicProfile);

      // Mock della chiamata di login
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ jwt: "test_bearer_token_777" }),
      } as any);

      // Mock Probe Executor per HTTP
      let capturedConfig: any = null;
      const mockExecutor = {
        execute: vi.fn().mockImplementation(async (config: ProbeConfiguration) => {
          capturedConfig = config;
          return {
            success: true,
            status: 200,
            responseTimeMs: 80,
          };
        }),
      };

      const monitorRepo = {
        findById: vi.fn(),
        save: vi.fn(),
      };
      const checkRepo = {
        save: vi.fn(),
      };
      const executorRegistry = {
        getExecutor: vi.fn().mockReturnValue(mockExecutor),
      };
      const eventBus = {
        publish: vi.fn(),
      };

      const monitor = Monitor.reconstitute(
        MonitorId.create("mon-dynamic-1"),
        "Test Dynamic Monitor",
        MonitorType.create("HTTP"),
        MonitorStatus.create("UP"),
        ProbeConfiguration.createHttp({
          url: "https://target.api.local/v1/data",
          method: "GET",
          timeoutMs: 5000,
          authProfileId: dynamicProfile.id.toString(),
        }),
        Schedule.create({ intervalSeconds: 60 }),
        [],
        AlarmPolicy.create({ consecutiveFailures: 3 }),
        new Date(),
        new Date(),
        undefined,
        [],
        undefined,
        []
      );

      monitorRepo.findById.mockResolvedValue(monitor);

      const useCase = new ExecuteCheckUseCase(
        monitorRepo as any,
        checkRepo as any,
        executorRegistry as any,
        new AssertionEngine(),
        eventBus as any,
        undefined,
        undefined,
        undefined,
        authRepo,
        tokenManager
      );

      const execution = await useCase.execute({ monitorId: "mon-dynamic-1" });
      expect(execution).not.toBeNull();
      expect(capturedConfig).not.toBeNull();
      expect(capturedConfig.http.headers).toEqual({
        Authorization: "Bearer test_bearer_token_777",
      });
    });

    it("should invalidate cached token if target probe responds 401 Unauthorized", async () => {
      const authRepo = new MockAuthProfileRepository();
      const dynamicProfile = AuthProfile.create({
        dashboardId: "dash-1",
        name: "Invalidation Test Profile",
        type: "DYNAMIC_LOGIN",
        data: {
          loginUrl: "https://api.test.local/login",
          tokenPath: "token",
        },
      });
      await authRepo.save(dynamicProfile);

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ token: "expired_on_server_side" }),
      } as any);

      const invalidateSpy = vi.spyOn(tokenManager, "invalidate");

      // La sonda target HTTP risponde 401 Unauthorized
      const mockExecutor = {
        execute: vi.fn().mockResolvedValue(
          CheckResult.createSuccess(50, 401, {}, "Unauthorized")
        ),
      };

      const monitorRepo = {
        findById: vi.fn(),
        save: vi.fn(),
      };
      const checkRepo = { save: vi.fn() };
      const executorRegistry = { getExecutor: vi.fn().mockReturnValue(mockExecutor) };
      const eventBus = { publish: vi.fn() };

      const monitor = Monitor.reconstitute(
        MonitorId.create("mon-inval-1"),
        "Test Invalidation Monitor",
        MonitorType.create("HTTP"),
        MonitorStatus.create("UP"),
        ProbeConfiguration.createHttp({
          url: "https://target.api.local/v1/protected",
          method: "GET",
          timeoutMs: 5000,
          authProfileId: dynamicProfile.id.toString(),
        }),
        Schedule.create({ intervalSeconds: 60 }),
        [],
        AlarmPolicy.create({ consecutiveFailures: 3 }),
        new Date(),
        new Date(),
        undefined,
        [],
        undefined,
        []
      );

      monitorRepo.findById.mockResolvedValue(monitor);

      const useCase = new ExecuteCheckUseCase(
        monitorRepo as any,
        checkRepo as any,
        executorRegistry as any,
        new AssertionEngine(),
        eventBus as any,
        undefined,
        undefined,
        undefined,
        authRepo,
        tokenManager
      );

      await useCase.execute({ monitorId: "mon-inval-1" });

      // Deve aver invocato invalidate sul profilo per rimuovere il token 401 dalla cache
      expect(invalidateSpy).toHaveBeenCalledWith(dynamicProfile.id.toString());
    });
  });
});
