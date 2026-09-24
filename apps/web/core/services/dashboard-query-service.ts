import "server-only";
import { createDashboardUseCase, useMock } from "@/infrastructure/backend";
import { dashboardQueryRepository } from "@/infrastructure/backend-read";
import { DashboardDTO } from "@/core/ports/gateways";

export async function getDashboards(): Promise<DashboardDTO[]> {
  try {
    const list = await dashboardQueryRepository.findAll();

    // Se non ci sono dashboard, creane una di default per l'utente
    if (list.length === 0 && !useMock) {
      const defaultDash = await createDashboardUseCase.execute({
        name: "Dashboard Principale",
        tenantId: "default-tenant",
      });
      return [
        {
          id: defaultDash.id.toString(),
          name: defaultDash.name,
          reportConfig: defaultDash.reportConfig.toValue(),
          createdAt: defaultDash.createdAt.toISOString(),
          updatedAt: defaultDash.updatedAt.toISOString(),
        },
      ];
    }

    return list;
  } catch (error) {
    console.error("[DashboardQueryService] Error fetching dashboards:", error);
    return [];
  }
}

export async function getDefaultDashboard(): Promise<DashboardDTO | null> {
  const list = await getDashboards();
  return list.length > 0 ? list[0] : null;
}
