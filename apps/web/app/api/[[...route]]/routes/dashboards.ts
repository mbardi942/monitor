import { Hono } from "hono";
import { createDashboardUseCase } from "@/infrastructure/backend";
import { dashboardQueryRepository } from "@/infrastructure/backend-read";

// API di SOLA LETTURA. Le mutazioni sono Server Actions.
export const dashboardsRouter = new Hono().get("/dashboards", async (c) => {
  try {
    let list = await dashboardQueryRepository.findAll();
    // Se non ci sono dashboard, creane una di default per l'utente
    if (list.length === 0) {
      const defaultDash = await createDashboardUseCase.execute({
        name: "Dashboard Principale",
        tenantId: "default-tenant",
      });
      list = [
        {
          id: defaultDash.id.toString(),
          name: defaultDash.name,
          reportConfig: defaultDash.reportConfig.toValue(),
          createdAt: defaultDash.createdAt.toISOString(),
          updatedAt: defaultDash.updatedAt.toISOString(),
        },
      ];
    }
    return c.json(list);
  } catch (error: any) {
    console.error("[API] Error fetching dashboards:", error);
    return c.json({ error: error.message }, 500);
  }
});

