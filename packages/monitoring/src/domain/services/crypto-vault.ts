import crypto from "node:crypto";
import { AuthProfileType } from "../model/auth-profile/auth-profile-type.js";

const ALGORITHM = "aes-256-gcm";
const DEFAULT_KEY_SALT = "api-monitor-vault-salt";
const TEST_KEY = "api-monitor-vault-test-only-key-32b";

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "test" || process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      return crypto.scryptSync(TEST_KEY, DEFAULT_KEY_SALT, 32);
    }
    throw new Error(
      "CRITICAL SECURITY CONFIGURATION ERROR: ENCRYPTION_KEY environment variable is not defined. " +
      "The Vault cannot operate in an insecure state. Set ENCRYPTION_KEY in your environment."
    );
  }
  return crypto.scryptSync(secret, DEFAULT_KEY_SALT, 32);
}

export class CryptoVault {
  public static encryptString(plaintext: string): string {
    if (!plaintext) return plaintext;
    try {
      const key = getEncryptionKey();
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      let encrypted = cipher.update(plaintext, "utf8", "hex");
      encrypted += cipher.final("hex");
      const authTag = cipher.getAuthTag().toString("hex");

      return `enc:gcm:${iv.toString("hex")}:${authTag}:${encrypted}`;
    } catch (err) {
      if (err instanceof Error && err.message.includes("CRITICAL SECURITY CONFIGURATION ERROR")) {
        throw err;
      }
      return plaintext;
    }
  }

  public static decryptString(ciphertext: string): string {
    if (!ciphertext || typeof ciphertext !== "string" || !ciphertext.startsWith("enc:gcm:")) {
      return ciphertext;
    }
    try {
      const parts = ciphertext.split(":");
      if (parts.length !== 5) return ciphertext;

      const [, , ivHex, authTagHex, encryptedHex] = parts;
      const key = getEncryptionKey();
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (err) {
      if (err instanceof Error && err.message.includes("CRITICAL SECURITY CONFIGURATION ERROR")) {
        throw err;
      }
      return ciphertext;
    }
  }

  public static maskSecret(value?: string): string {
    if (!value) return "";
    const clean = this.decryptString(value);
    if (clean.length <= 8) {
      return "••••••••";
    }
    return `${clean.slice(0, 4)}••••••••${clean.slice(-4)}`;
  }

  public static encryptData(type: AuthProfileType, data: Record<string, any>): Record<string, any> {
    if (!data) return {};
    const result: Record<string, any> = { ...data };

    if (type === "BEARER" && result.token) {
      result.token = this.encryptString(result.token);
    } else if (type === "API_KEY" && result.headerValue) {
      result.headerValue = this.encryptString(result.headerValue);
    } else if (type === "BASIC_AUTH") {
      if (result.password) result.password = this.encryptString(result.password);
    } else if (type === "CUSTOM_HEADERS" && result.headers) {
      const encHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(result.headers)) {
        encHeaders[k] = this.encryptString(v as string);
      }
      result.headers = encHeaders;
    } else if (type === "OAUTH2_CLIENT_CREDENTIALS") {
      if (result.clientSecret) result.clientSecret = this.encryptString(result.clientSecret);
      if (result.headers) {
        const encHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(result.headers)) {
          encHeaders[k] = this.encryptString(v as string);
        }
        result.headers = encHeaders;
      }
    } else if (type === "DYNAMIC_LOGIN") {
      if (result.body && typeof result.body === "string") {
        result.body = this.encryptString(result.body);
      }
      if (result.headers) {
        const encHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(result.headers)) {
          encHeaders[k] = this.encryptString(v as string);
        }
        result.headers = encHeaders;
      }
    }

    return result;
  }

  public static decryptData(type: AuthProfileType, data: Record<string, any>): Record<string, any> {
    if (!data) return {};
    const result: Record<string, any> = { ...data };

    if (type === "BEARER" && result.token) {
      result.token = this.decryptString(result.token);
    } else if (type === "API_KEY" && result.headerValue) {
      result.headerValue = this.decryptString(result.headerValue);
    } else if (type === "BASIC_AUTH") {
      if (result.password) result.password = this.decryptString(result.password);
    } else if (type === "CUSTOM_HEADERS" && result.headers) {
      const decHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(result.headers)) {
        decHeaders[k] = this.decryptString(v as string);
      }
      result.headers = decHeaders;
    } else if (type === "OAUTH2_CLIENT_CREDENTIALS") {
      if (result.clientSecret) result.clientSecret = this.decryptString(result.clientSecret);
      if (result.headers) {
        const decHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(result.headers)) {
          decHeaders[k] = this.decryptString(v as string);
        }
        result.headers = decHeaders;
      }
    } else if (type === "DYNAMIC_LOGIN") {
      if (result.body && typeof result.body === "string") {
        result.body = this.decryptString(result.body);
      }
      if (result.headers) {
        const decHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(result.headers)) {
          decHeaders[k] = this.decryptString(v as string);
        }
        result.headers = decHeaders;
      }
    }

    return result;
  }

  public static maskData(type: AuthProfileType, data: Record<string, any>): Record<string, any> {
    if (!data) return {};
    const decrypted = this.decryptData(type, data);
    const masked: Record<string, any> = { ...decrypted };

    if (type === "BEARER" && masked.token) {
      masked.token = this.maskSecret(masked.token);
    } else if (type === "API_KEY" && masked.headerValue) {
      masked.headerValue = this.maskSecret(masked.headerValue);
    } else if (type === "BASIC_AUTH") {
      if (masked.password) masked.password = "••••••••";
    } else if (type === "CUSTOM_HEADERS" && masked.headers) {
      const maskedHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(masked.headers)) {
        if (k.toLowerCase().includes("auth") || k.toLowerCase().includes("key") || k.toLowerCase().includes("token") || k.toLowerCase().includes("secret")) {
          maskedHeaders[k] = this.maskSecret(v as string);
        } else {
          maskedHeaders[k] = v as string;
        }
      }
      masked.headers = maskedHeaders;
    } else if (type === "OAUTH2_CLIENT_CREDENTIALS") {
      if (masked.clientSecret) masked.clientSecret = this.maskSecret(masked.clientSecret);
      if (masked.headers) {
        const maskedHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(masked.headers)) {
          if (k.toLowerCase().includes("auth") || k.toLowerCase().includes("key") || k.toLowerCase().includes("token") || k.toLowerCase().includes("secret")) {
            maskedHeaders[k] = this.maskSecret(v as string);
          } else {
            maskedHeaders[k] = v as string;
          }
        }
        masked.headers = maskedHeaders;
      }
    } else if (type === "DYNAMIC_LOGIN") {
      if (masked.body && typeof masked.body === "string") {
        try {
          const parsed = JSON.parse(masked.body);
          const maskObj = (obj: any): any => {
            if (typeof obj !== "object" || obj === null) return obj;
            const res = Array.isArray(obj) ? [...obj] : { ...obj };
            for (const key of Object.keys(res)) {
              if (
                key.toLowerCase().includes("pass") ||
                key.toLowerCase().includes("secret") ||
                key.toLowerCase().includes("token") ||
                key.toLowerCase().includes("key")
              ) {
                res[key] = "••••••••";
              } else if (typeof res[key] === "object") {
                res[key] = maskObj(res[key]);
              }
            }
            return res;
          };
          masked.body = JSON.stringify(maskObj(parsed), null, 2);
        } catch {
          // Se non è JSON valido, mascheriamo pattern password comuni
          masked.body = masked.body.replace(/("?(?:password|secret|pass)"?\s*[:=]\s*)"([^"]+)"/gi, '$1"••••••••"');
        }
      }
      if (masked.headers) {
        const maskedHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(masked.headers)) {
          if (k.toLowerCase().includes("auth") || k.toLowerCase().includes("key") || k.toLowerCase().includes("token") || k.toLowerCase().includes("secret")) {
            maskedHeaders[k] = this.maskSecret(v as string);
          } else {
            maskedHeaders[k] = v as string;
          }
        }
        masked.headers = maskedHeaders;
      }
    }

    return masked;
  }
}
