"use server";

import { revalidatePath } from "next/cache";
import {
  useMock,
  createAuthProfileUseCase,
  updateAuthProfileUseCase,
  deleteAuthProfileUseCase,
  cloneAuthProfileUseCase,
  authProfileRepository,
  authTokenManager,
} from "@/infrastructure/backend";
import { AuthProfileType, CryptoVault, AuthProfile, AuthProfileId } from "@monitor/monitoring";
import { mockStore } from "@/infrastructure/gateways/mock-data";

const revalidateAll = () => {
  revalidatePath("/[dashboardId]", "layout");
};

export async function createCredentialAction(
  dashboardId: string,
  data: {
    name: string;
    type: AuthProfileType;
    data: Record<string, any>;
  }
) {
  if (!dashboardId) throw new Error("ID dashboard non specificato.");
  if (!data.name || !data.name.trim()) throw new Error("Il nome della credenziale è obbligatorio.");

  if (useMock) {
    const newCred = {
      id: `auth-${Math.random().toString(36).substring(2, 9)}`,
      dashboardId,
      name: data.name.trim(),
      type: data.type,
      maskedData: CryptoVault.maskData(data.type, data.data),
      headersSummary: [`${data.type}`],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore.authProfilesList.push(newCred);
    revalidateAll();
    return newCred;
  }

  const profile = await createAuthProfileUseCase.execute({
    dashboardId,
    name: data.name,
    type: data.type,
    data: data.data,
  });

  revalidateAll();
  return {
    id: profile.id.toString(),
    dashboardId: profile.dashboardId,
    name: profile.name,
    type: profile.type,
  };
}

function mergeWithExistingSecrets(
  type: AuthProfileType,
  incomingData: Record<string, any>,
  existingDecryptedData: Record<string, any>
): Record<string, any> {
  const merged = { ...incomingData };

  if (type === "BEARER") {
    if (!merged.token || merged.token.includes("••••")) {
      merged.token = existingDecryptedData.token;
    }
  } else if (type === "API_KEY") {
    if (!merged.headerValue || merged.headerValue.includes("••••")) {
      merged.headerValue = existingDecryptedData.headerValue;
    }
  } else if (type === "BASIC_AUTH") {
    if (!merged.password || merged.password.includes("••••")) {
      merged.password = existingDecryptedData.password;
    }
  } else if (type === "OAUTH2_CLIENT_CREDENTIALS") {
    if (!merged.clientSecret || merged.clientSecret.includes("••••")) {
      merged.clientSecret = existingDecryptedData.clientSecret;
    }
  } else if (type === "DYNAMIC_LOGIN") {
    if (merged.body && typeof merged.body === "string" && merged.body.includes("••••")) {
      try {
        const currentParsed = JSON.parse(merged.body);
        const originalParsed =
          typeof existingDecryptedData.body === "string"
            ? JSON.parse(existingDecryptedData.body)
            : existingDecryptedData.body;

        const mergeObj = (curr: any, orig: any): any => {
          if (!orig) return curr;
          if (typeof curr !== "object" || curr === null) {
            return typeof curr === "string" && curr.includes("••••") ? orig : curr;
          }
          const res = Array.isArray(curr) ? [...curr] : { ...curr };
          for (const key of Object.keys(res)) {
            res[key] = mergeObj(res[key], orig[key]);
          }
          return res;
        };

        merged.body = JSON.stringify(mergeObj(currentParsed, originalParsed));
      } catch {
        merged.body = existingDecryptedData.body;
      }
    }
  }

  return merged;
}

export async function updateCredentialAction(
  id: string,
  data: {
    name?: string;
    type?: AuthProfileType;
    data?: Record<string, any>;
  }
) {
  if (!id) throw new Error("ID credenziale non specificato.");

  if (useMock) {
    const target = (mockStore.authProfilesList || []).find((p: any) => p.id === id);
    if (!target) throw new Error("Credenziale non trovata.");
    if (data.name) target.name = data.name.trim();
    if (data.type) target.type = data.type;
    if (data.data) {
      const finalData = mergeWithExistingSecrets(target.type, data.data, target.data || target.maskedData || {});
      target.data = finalData;
      target.maskedData = CryptoVault.maskData(target.type, finalData);
    }
    target.updatedAt = new Date().toISOString();
    revalidateAll();
    return target;
  }

  let finalPayloadData = data.data;
  if (data.data) {
    const existing = await authProfileRepository.findById(AuthProfileId.create(id));
    if (existing) {
      const decrypted = CryptoVault.decryptData(existing.type, existing.data);
      finalPayloadData = mergeWithExistingSecrets(data.type || existing.type, data.data, decrypted);
    }
  }

  const profile = await updateAuthProfileUseCase.execute({
    id,
    name: data.name,
    type: data.type,
    data: finalPayloadData,
  });

  revalidateAll();
  return {
    id: profile.id.toString(),
    dashboardId: profile.dashboardId,
    name: profile.name,
    type: profile.type,
  };
}

export async function deleteCredentialAction(id: string) {
  if (!id) throw new Error("ID credenziale non specificato.");

  if (useMock) {
    mockStore.authProfilesList = (mockStore.authProfilesList || []).filter((p: any) => p.id !== id);
    revalidateAll();
    return { success: true };
  }

  await deleteAuthProfileUseCase.execute({ id });
  revalidateAll();
  return { success: true };
}

export async function cloneCredentialToDashboardAction(
  sourceId: string,
  targetDashboardId: string,
  newName?: string
) {
  if (!sourceId) throw new Error("ID credenziale sorgente non specificato.");
  if (!targetDashboardId) throw new Error("Dashboard di destinazione non specificata.");

  if (useMock) {
    const source = (mockStore.authProfilesList || []).find((p: any) => p.id === sourceId);
    if (!source) throw new Error("Credenziale sorgente non trovata.");

    const cloned = {
      ...source,
      id: `auth-${Math.random().toString(36).substring(2, 9)}`,
      dashboardId: targetDashboardId,
      name: newName || `${source.name} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore.authProfilesList.push(cloned);
    revalidateAll();
    return cloned;
  }

  const profile = await cloneAuthProfileUseCase.execute({
    sourceId,
    targetDashboardId,
    newName,
  });

  revalidateAll();
  return {
    id: profile.id.toString(),
    dashboardId: profile.dashboardId,
    name: profile.name,
    type: profile.type,
  };
}

export async function testCredentialLoginAction(data: {
  id?: string;
  name?: string;
  type: AuthProfileType;
  data: Record<string, any>;
}) {
  try {
    let finalData = data.data || {};

    if (data.id) {
      if (useMock) {
        const found = (mockStore.authProfilesList || []).find((p: any) => p.id === data.id);
        if (found) {
          finalData = mergeWithExistingSecrets(data.type, finalData, found.data || found.maskedData || {});
        }
      } else {
        const existing = await authProfileRepository.findById(AuthProfileId.create(data.id));
        if (existing) {
          const decrypted = CryptoVault.decryptData(existing.type, existing.data);
          finalData = mergeWithExistingSecrets(data.type, finalData, decrypted);
        }
      }
    }

    const dummyProfile = AuthProfile.create({
      dashboardId: "test-login-dashboard-id",
      name: data.name?.trim() || "Test Login",
      type: data.type,
      data: finalData,
    });

    const result = await authTokenManager.testLogin(dummyProfile);
    return result;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Errore durante il test di autenticazione.",
    };
  }
}
