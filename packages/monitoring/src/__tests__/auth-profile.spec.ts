import { describe, it, expect, vi } from "vitest";
import { AuthProfile } from "../domain/model/auth-profile/auth-profile.js";
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

describe("AuthProfile & CryptoVault", () => {
  describe("CryptoVault", () => {
    it("should encrypt and decrypt a string correctly", () => {
      const original = "sk-live-secret-key-123456789";
      const encrypted = CryptoVault.encryptString(original);
      expect(encrypted).not.toBe(original);
      expect(encrypted.startsWith("enc:gcm:")).toBe(true);

      const decrypted = CryptoVault.decryptString(encrypted);
      expect(decrypted).toBe(original);
    });

    it("should mask secrets showing only start and end characters", () => {
      const secret = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
      const masked = CryptoVault.maskSecret(secret);
      expect(masked.startsWith("ghp_")).toBe(true);
      expect(masked.endsWith("wxyz")).toBe(true);
      expect(masked.includes("••••••••")).toBe(true);
    });
  });

  describe("AuthProfile Header Generation", () => {
    it("should generate correct Bearer headers", () => {
      const profile = AuthProfile.create({
        dashboardId: "dash-1",
        name: "Stripe API",
        type: "BEARER",
        data: { token: "tok_secret_123" },
      });

      const headers = profile.toHeaders();
      expect(headers).toEqual({ Authorization: "Bearer tok_secret_123" });
    });

    it("should generate API_KEY header with custom name", () => {
      const profile = AuthProfile.create({
        dashboardId: "dash-1",
        name: "AWS Gateway",
        type: "API_KEY",
        data: { headerName: "x-api-key", headerValue: "aws-val-456" },
      });

      const headers = profile.toHeaders();
      expect(headers).toEqual({ "x-api-key": "aws-val-456" });
    });

    it("should generate Base64 encoded Basic Auth header", () => {
      const profile = AuthProfile.create({
        dashboardId: "dash-1",
        name: "Internal Linux Server",
        type: "BASIC_AUTH",
        data: { username: "admin", password: "password123" },
      });

      const headers = profile.toHeaders();
      const expected = "Basic " + Buffer.from("admin:password123").toString("base64");
      expect(headers).toEqual({ Authorization: expected });
    });

    it("should return configured Custom Headers", () => {
      const profile = AuthProfile.create({
        dashboardId: "dash-1",
        name: "Multi-Tenant Gateway",
        type: "CUSTOM_HEADERS",
        data: {
          headers: {
            "X-Tenant-Id": "tenant-abc",
            "X-App-Version": "2.4.0",
          },
        },
      });

      const headers = profile.toHeaders();
      expect(headers).toEqual({
        "X-Tenant-Id": "tenant-abc",
        "X-App-Version": "2.4.0",
      });
    });

    it("should clone a profile for another dashboard with a new ID", () => {
      const original = AuthProfile.create({
        dashboardId: "dash-1",
        name: "Stripe Production",
        type: "BEARER",
        data: { token: "tok_123" },
      });

      const clone = original.cloneForDashboard("dash-2", "Stripe Staging (Clonato)");
      expect(clone.id.toString()).not.toBe(original.id.toString());
      expect(clone.dashboardId).toBe("dash-2");
      expect(clone.name).toBe("Stripe Staging (Clonato)");
      expect(clone.type).toBe("BEARER");
      expect(clone.data).toEqual({ token: "tok_123" });
    });
  });

  describe("ExecuteCheckUseCase with AuthProfile", () => {
    it("should merge profile headers with local monitor headers", async () => {
      const authRepo = new MockAuthProfileRepository();
      const profile = AuthProfile.create({
        dashboardId: "dash-1",
        name: "Shared Auth",
        type: "BEARER",
        data: { token: "profile-secret-token" },
      });
      await authRepo.save(profile);

      const monitorRepo = {
        findById: vi.fn().mockResolvedValue(
          Monitor.reconstitute(
            MonitorId.create("mon-1"),
            "API Service",
            MonitorType.create("HTTP"),
            MonitorStatus.create("UP"),
            ProbeConfiguration.createHttp({
              url: "https://api.example.com/health",
              method: "GET",
              timeoutMs: 3000,
              authProfileId: profile.id.toString(),
              headers: {
                "X-Custom-Client": "WebMonitor",
              },
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
          )
        ),
        save: vi.fn(),
      } as any;

      const checkExecutionRepo = {
        save: vi.fn(),
      } as any;

      let executedConfig: ProbeConfiguration | null = null;
      const mockExecutor = {
        execute: vi.fn().mockImplementation(async (config: ProbeConfiguration) => {
          executedConfig = config;
          return CheckResult.createSuccess(120, 200, {}, "OK");
        }),
      };

      const executorRegistry = {
        getExecutor: () => mockExecutor,
      } as any;

      const eventBus = {
        publish: vi.fn(),
      } as any;

      const useCase = new ExecuteCheckUseCase(
        monitorRepo,
        checkExecutionRepo,
        executorRegistry,
        new AssertionEngine(),
        eventBus,
        undefined,
        undefined,
        undefined,
        authRepo
      );

      await useCase.execute({ monitorId: "mon-1" });

      expect(executedConfig).not.toBeNull();
      const httpProps = (executedConfig as any).http;
      expect(httpProps.headers).toEqual({
        Authorization: "Bearer profile-secret-token",
        "X-Custom-Client": "WebMonitor",
      });
    });
  });
});
