import { eq } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { authProfiles } from "@monitor/db";
import {
  AuthProfileQueryRepository,
  AuthProfileDTO,
} from "../../domain/ports/auth-profile-query-repository.js";
import { AuthProfileType } from "../../domain/model/auth-profile/auth-profile-type.js";
import { CryptoVault } from "../../domain/services/crypto-vault.js";

export class DrizzleAuthProfileQueryRepository implements AuthProfileQueryRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  private mapToDTO(row: any): AuthProfileDTO {
    const rawData = (row.data as Record<string, any>) || {};
    const maskedData = CryptoVault.maskData(row.type as AuthProfileType, rawData);
    const headersSummary: string[] = [];

    switch (row.type as AuthProfileType) {
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
      case "OAUTH2_CLIENT_CREDENTIALS":
        headersSummary.push(`OAuth2 Client Credentials (${maskedData.tokenUrl || "OAuth Endpoint"})`);
        break;
      default:
        headersSummary.push(`${row.type}`);
    }

    return {
      id: row.id,
      dashboardId: row.dashboardId,
      name: row.name,
      type: row.type as AuthProfileType,
      maskedData,
      headersSummary,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    };
  }

  public async findByDashboardId(dashboardId: string): Promise<AuthProfileDTO[]> {
    const rows = await this.db
      .select()
      .from(authProfiles)
      .where(eq(authProfiles.dashboardId, dashboardId));

    return rows.map((r) => this.mapToDTO(r));
  }

  public async findById(id: string): Promise<AuthProfileDTO | null> {
    const rows = await this.db
      .select()
      .from(authProfiles)
      .where(eq(authProfiles.id, id));

    if (rows.length === 0) return null;
    return this.mapToDTO(rows[0]);
  }
}
