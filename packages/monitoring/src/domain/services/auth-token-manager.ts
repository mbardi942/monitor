import { AuthProfile } from "../model/auth-profile/auth-profile.js";
import { AuthTokenCache, CachedToken } from "../ports/auth-token-cache.js";
import { InMemoryAuthTokenCache } from "../../infrastructure/cache/in-memory-auth-token-cache.js";
import { CryptoVault } from "./crypto-vault.js";

export interface AuthLoginTestResult {
  success: boolean;
  status?: number;
  statusText?: string;
  tokenPreview?: string;
  expiresInSeconds?: number;
  headers?: Record<string, string>;
  rawResponseSnippet?: string;
  error?: string;
}

export function extractByJsonPath(obj: any, path?: string): any {
  if (!obj || !path) return undefined;
  const normalized = path.replace(/^\$\.?/, "").trim();
  if (!normalized) return obj;

  const segments = normalized.split(".");
  let current = obj;
  for (const segment of segments) {
    if (current === undefined || current === null) return undefined;
    current = current[segment];
  }
  return current;
}

export class AuthTokenManager {
  private readonly cache: AuthTokenCache;
  private readonly safetyMarginMs: number;
  private readonly inFlightRequests: Map<string, Promise<Record<string, string>>> = new Map();

  constructor(cache?: AuthTokenCache, safetyMarginMs: number = 60_000) {
    this.cache = cache ?? new InMemoryAuthTokenCache();
    this.safetyMarginMs = safetyMarginMs;
  }

  public async resolveHeaders(profile: AuthProfile): Promise<Record<string, string>> {
    // 1. Profili con credenziali statiche
    if (
      profile.type === "BEARER" ||
      profile.type === "API_KEY" ||
      profile.type === "BASIC_AUTH" ||
      profile.type === "CUSTOM_HEADERS"
    ) {
      return profile.toHeaders();
    }

    // 2. Profili con autenticazione dinamica (OAuth2 o Dynamic Login)
    const profileId = profile.id.toString();
    const cached = await this.cache.get(profileId);

    if (cached) {
      const remainingTime = cached.expiresAt.getTime() - Date.now();
      if (remainingTime > this.safetyMarginMs) {
        return { [cached.headerName]: `${cached.headerPrefix}${cached.token}` };
      }
    }

    // 3. Single-flight execution per evitare richieste concorrenti duplicate (Thundering Herd)
    if (this.inFlightRequests.has(profileId)) {
      return this.inFlightRequests.get(profileId)!;
    }

    const fetchPromise = this.executeLoginAndCache(profile).finally(() => {
      this.inFlightRequests.delete(profileId);
    });

    this.inFlightRequests.set(profileId, fetchPromise);
    return fetchPromise;
  }

  public async invalidate(profileId: string): Promise<void> {
    await this.cache.invalidate(profileId);
  }

  public async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  public async testLogin(profile: AuthProfile): Promise<AuthLoginTestResult> {
    try {
      const decryptedData = CryptoVault.decryptData(profile.type, profile.data);

      if (profile.type === "OAUTH2_CLIENT_CREDENTIALS") {
        return await this.performOAuth2Login(decryptedData, false);
      } else if (profile.type === "DYNAMIC_LOGIN") {
        return await this.performDynamicLogin(decryptedData, false);
      } else {
        const headers = profile.toHeaders();
        return {
          success: true,
          status: 200,
          statusText: "Static Profile",
          headers,
          rawResponseSnippet: "Profilo statico valido. Nessuna chiamata di login necessaria.",
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Errore sconosciuto durante il test di login.",
      };
    }
  }

  private async executeLoginAndCache(profile: AuthProfile): Promise<Record<string, string>> {
    const decryptedData = CryptoVault.decryptData(profile.type, profile.data);
    let result: AuthLoginTestResult;

    if (profile.type === "OAUTH2_CLIENT_CREDENTIALS") {
      result = await this.performOAuth2Login(decryptedData, true, profile.id.toString());
    } else if (profile.type === "DYNAMIC_LOGIN") {
      result = await this.performDynamicLogin(decryptedData, true, profile.id.toString());
    } else {
      return profile.toHeaders();
    }

    if (!result.success || !result.headers) {
      throw new Error(result.error || "Fallimento durante l'autenticazione pre-flight.");
    }

    return result.headers;
  }

  private async performOAuth2Login(
    data: Record<string, any>,
    saveToCache: boolean,
    profileId?: string
  ): Promise<AuthLoginTestResult> {
    const tokenUrl = data.tokenUrl?.trim();
    const clientId = data.clientId?.trim();
    const clientSecret = data.clientSecret;

    if (!tokenUrl) throw new Error("Token URL mancante nella configurazione OAuth2.");
    if (!clientId) throw new Error("Client ID mancante nella configurazione OAuth2.");
    if (!clientSecret) throw new Error("Client Secret mancante nella configurazione OAuth2.");

    const targetHeaderName = data.targetHeaderName?.trim() || "Authorization";
    const targetHeaderPrefix = data.targetHeaderPrefix !== undefined ? data.targetHeaderPrefix : "Bearer ";

    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    if (data.scope?.trim()) params.append("scope", data.scope.trim());
    if (data.audience?.trim()) params.append("audience", data.audience.trim());

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      ...(data.headers || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: requestHeaders,
        body: params.toString(),
        signal: controller.signal,
      });

      const responseText = await res.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // Non è JSON valido
      }

      if (!res.ok) {
        return {
          success: false,
          status: res.status,
          statusText: res.statusText,
          rawResponseSnippet: responseText.slice(0, 500),
          error: `OAuth2 token request failed: HTTP ${res.status} ${res.statusText} - ${responseText.slice(0, 200)}`,
        };
      }

      const token = responseJson?.access_token || responseJson?.token;
      if (!token) {
        return {
          success: false,
          status: res.status,
          statusText: res.statusText,
          rawResponseSnippet: responseText.slice(0, 500),
          error: "Nessun 'access_token' trovato nella risposta OAuth2.",
        };
      }

      const expiresIn =
        typeof responseJson?.expires_in === "number" && responseJson.expires_in > 0
          ? responseJson.expires_in
          : 3600;

      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      if (saveToCache && profileId) {
        await this.cache.set(profileId, {
          token,
          expiresAt,
          headerName: targetHeaderName,
          headerPrefix: targetHeaderPrefix,
        });
      }

      const tokenPreview = CryptoVault.maskSecret(token);
      const headers = { [targetHeaderName]: `${targetHeaderPrefix}${token}` };

      return {
        success: true,
        status: res.status,
        statusText: res.statusText,
        tokenPreview,
        expiresInSeconds: expiresIn,
        headers,
        rawResponseSnippet: responseText.slice(0, 500),
      };
    } catch (err: any) {
      const isTimeout = err.name === "AbortError";
      return {
        success: false,
        error: isTimeout ? "Timeout richiesta OAuth2 (superati 10 secondi)." : err.message,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async performDynamicLogin(
    data: Record<string, any>,
    saveToCache: boolean,
    profileId?: string
  ): Promise<AuthLoginTestResult> {
    const loginUrl = data.loginUrl?.trim();
    if (!loginUrl) throw new Error("Login URL mancante nella configurazione del profilo dinamico.");

    const method = (data.method?.toUpperCase() || "POST") as "GET" | "POST";
    const tokenPath = data.tokenPath?.trim() || "access_token";
    const expiresInPath = data.expiresInPath?.trim();
    const fallbackTtl = Number(data.fallbackTtlSeconds) > 0 ? Number(data.fallbackTtlSeconds) : 3600;
    const targetHeaderName = data.targetHeaderName?.trim() || "Authorization";
    const targetHeaderPrefix = data.targetHeaderPrefix !== undefined ? data.targetHeaderPrefix : "Bearer ";

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(data.headers || {}),
    };

    let requestBody: string | undefined = undefined;
    if (method !== "GET" && data.body) {
      requestBody = typeof data.body === "string" ? data.body : JSON.stringify(data.body);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(loginUrl, {
        method,
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal,
      });

      const responseText = await res.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // Non è JSON valido
      }

      if (!res.ok) {
        return {
          success: false,
          status: res.status,
          statusText: res.statusText,
          rawResponseSnippet: responseText.slice(0, 500),
          error: `Pre-flight login failed: HTTP ${res.status} ${res.statusText} - ${responseText.slice(0, 200)}`,
        };
      }

      if (!responseJson) {
        return {
          success: false,
          status: res.status,
          statusText: res.statusText,
          rawResponseSnippet: responseText.slice(0, 500),
          error: "La risposta del login non è un JSON valido.",
        };
      }

      const extractedToken = extractByJsonPath(responseJson, tokenPath);
      if (!extractedToken || typeof extractedToken !== "string") {
        return {
          success: false,
          status: res.status,
          statusText: res.statusText,
          rawResponseSnippet: responseText.slice(0, 500),
          error: `Token non trovato o non valido al percorso JSON '${tokenPath}'.`,
        };
      }

      let expiresIn = fallbackTtl;
      if (expiresInPath) {
        const extractedTtl = extractByJsonPath(responseJson, expiresInPath);
        if (typeof extractedTtl === "number" && extractedTtl > 0) {
          expiresIn = extractedTtl;
        }
      }

      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      if (saveToCache && profileId) {
        await this.cache.set(profileId, {
          token: extractedToken,
          expiresAt,
          headerName: targetHeaderName,
          headerPrefix: targetHeaderPrefix,
        });
      }

      const tokenPreview = CryptoVault.maskSecret(extractedToken);
      const headers = { [targetHeaderName]: `${targetHeaderPrefix}${extractedToken}` };

      return {
        success: true,
        status: res.status,
        statusText: res.statusText,
        tokenPreview,
        expiresInSeconds: expiresIn,
        headers,
        rawResponseSnippet: responseText.slice(0, 500),
      };
    } catch (err: any) {
      const isTimeout = err.name === "AbortError";
      return {
        success: false,
        error: isTimeout ? "Timeout richiesta login (superati 10 secondi)." : err.message,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
