import { AuthProfile } from "../model/auth-profile/auth-profile.js";
import { AuthProfileId } from "../model/auth-profile/auth-profile-id.js";

export interface AuthProfileRepository {
  save(profile: AuthProfile): Promise<void>;
  findById(id: AuthProfileId): Promise<AuthProfile | null>;
  findByDashboardId(dashboardId: string): Promise<AuthProfile[]>;
  delete(id: AuthProfileId): Promise<void>;
}
