import { AuthProfileRepository } from "../../domain/ports/auth-profile-repository.js";
import {
  AuthProfileQueryRepository,
  AuthProfileDTO,
} from "../../domain/ports/auth-profile-query-repository.js";
import { AuthProfile } from "../../domain/model/auth-profile/auth-profile.js";
import { AuthProfileId } from "../../domain/model/auth-profile/auth-profile-id.js";
import { CryptoVault } from "../../domain/services/crypto-vault.js";

export class MockAuthProfileRepository implements AuthProfileRepository {
  public profiles: Map<string, AuthProfile> = new Map();

  constructor(initialProfiles?: AuthProfile[]) {
    if (initialProfiles) {
      for (const p of initialProfiles) {
        this.profiles.set(p.id.toString(), p);
      }
    }
  }

  public async save(profile: AuthProfile): Promise<void> {
    this.profiles.set(profile.id.toString(), profile);
  }

  public async findById(id: AuthProfileId): Promise<AuthProfile | null> {
    return this.profiles.get(id.toString()) || null;
  }

  public async findByDashboardId(dashboardId: string): Promise<AuthProfile[]> {
    const list: AuthProfile[] = [];
    for (const p of this.profiles.values()) {
      if (p.dashboardId === dashboardId) {
        list.push(p);
      }
    }
    return list;
  }

  public async delete(id: AuthProfileId): Promise<void> {
    this.profiles.delete(id.toString());
  }
}

export class MockAuthProfileQueryRepository implements AuthProfileQueryRepository {
  constructor(private readonly writeRepo: MockAuthProfileRepository) {}

  public async findById(id: string): Promise<AuthProfileDTO | null> {
    const p = this.writeRepo.profiles.get(id);
    if (!p) return null;
    return this.mapToDTO(p);
  }

  public async findByDashboardId(dashboardId: string): Promise<AuthProfileDTO[]> {
    const list: AuthProfileDTO[] = [];
    for (const p of this.writeRepo.profiles.values()) {
      if (p.dashboardId === dashboardId) {
        list.push(this.mapToDTO(p));
      }
    }
    return list;
  }

  private mapToDTO(p: AuthProfile): AuthProfileDTO {
    const maskedData = CryptoVault.maskData(p.type, p.data);
    const headersSummary: string[] = [];

    switch (p.type) {
      case "BEARER":
        headersSummary.push(`Authorization: Bearer ${maskedData.token || "••••"}`);
        break;
      case "API_KEY":
        headersSummary.push(`${maskedData.headerName || "X-API-Key"}: ${maskedData.headerValue || "••••"}`);
        break;
      case "BASIC_AUTH":
        headersSummary.push(`Authorization: Basic (${maskedData.username || "user"}:••••)`);
        break;
      case "CUSTOM_HEADERS":
        if (maskedData.headers) {
          for (const [k, v] of Object.entries(maskedData.headers)) {
            headersSummary.push(`${k}: ${v}`);
          }
        }
        break;
      default:
        headersSummary.push(`${p.type}`);
    }

    return {
      id: p.id.toString(),
      dashboardId: p.dashboardId,
      name: p.name,
      type: p.type,
      maskedData,
      headersSummary,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
