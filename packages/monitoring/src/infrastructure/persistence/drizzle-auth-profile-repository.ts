import { eq } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { authProfiles } from "@monitor/db";
import { AuthProfileRepository } from "../../domain/ports/auth-profile-repository.js";
import { AuthProfile } from "../../domain/model/auth-profile/auth-profile.js";
import { AuthProfileId } from "../../domain/model/auth-profile/auth-profile-id.js";
import { AuthProfileType } from "../../domain/model/auth-profile/auth-profile-type.js";
import { CryptoVault } from "../../domain/services/crypto-vault.js";

export class DrizzleAuthProfileRepository implements AuthProfileRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  private mapToDomain(row: any): AuthProfile {
    const rawData = (row.data as Record<string, any>) || {};
    const decryptedData = CryptoVault.decryptData(row.type as AuthProfileType, rawData);

    return AuthProfile.reconstitute(AuthProfileId.create(row.id), {
      dashboardId: row.dashboardId,
      name: row.name,
      type: row.type as AuthProfileType,
      data: decryptedData,
      createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
    });
  }

  public async findById(id: AuthProfileId): Promise<AuthProfile | null> {
    const results = await this.db
      .select()
      .from(authProfiles)
      .where(eq(authProfiles.id, id.toString()));

    if (results.length === 0) {
      return null;
    }

    return this.mapToDomain(results[0]);
  }

  public async findByDashboardId(dashboardId: string): Promise<AuthProfile[]> {
    const results = await this.db
      .select()
      .from(authProfiles)
      .where(eq(authProfiles.dashboardId, dashboardId));

    return results.map((r) => this.mapToDomain(r));
  }

  public async save(profile: AuthProfile): Promise<void> {
    const encryptedData = CryptoVault.encryptData(profile.type, profile.data);

    const values = {
      id: profile.id.toString(),
      dashboardId: profile.dashboardId,
      name: profile.name,
      type: profile.type,
      data: encryptedData,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };

    await this.db
      .insert(authProfiles)
      .values(values)
      .onConflictDoUpdate({
        target: authProfiles.id,
        set: {
          name: values.name,
          type: values.type,
          data: values.data,
          updatedAt: values.updatedAt,
        },
      });
  }

  public async delete(id: AuthProfileId): Promise<void> {
    await this.db.delete(authProfiles).where(eq(authProfiles.id, id.toString()));
  }
}
