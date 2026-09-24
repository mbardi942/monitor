import { AuthProfileType } from "../model/auth-profile/auth-profile-type.js";

export interface AuthProfileDTO {
  id: string;
  dashboardId: string;
  name: string;
  type: AuthProfileType;
  maskedData: Record<string, any>;
  headersSummary: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthProfileQueryRepository {
  findByDashboardId(dashboardId: string): Promise<AuthProfileDTO[]>;
  findById(id: string): Promise<AuthProfileDTO | null>;
}
