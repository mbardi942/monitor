import "server-only";
import { authProfileQueryRepository } from "@/infrastructure/backend-read";
import { AuthProfileDTO } from "@monitor/monitoring";

export async function getAuthProfilesForDashboard(dashboardId: string): Promise<AuthProfileDTO[]> {
  return authProfileQueryRepository.findByDashboardId(dashboardId);
}

export async function getAuthProfileById(id: string): Promise<AuthProfileDTO | null> {
  return authProfileQueryRepository.findById(id);
}
