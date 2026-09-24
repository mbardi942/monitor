import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { monitorQueryRepository } from "@/infrastructure/backend-read";
import { flattenProbeConfiguration } from "@/core/mappers/probe-configuration-mapper";

// API di SOLA LETTURA per il polling client. Le mutazioni sono Server Actions.
// I metodi sono concatenati (.get) per consentire l'inferenza dei tipi RPC (hc).
export const monitorsRouter = new Hono()
  .get(
    "/monitors",
    zValidator("query", z.object({ dashboardId: z.string().min(1) })),
    async (c) => {
      const { dashboardId } = c.req.valid("query");
      try {
        const monitorDTOs = await monitorQueryRepository.findByDashboardId(dashboardId);
        const formattedDTOs = monitorDTOs.map((mon) => ({
          ...mon,
          probeConfiguration: flattenProbeConfiguration(mon.probeConfiguration),
        }));
        return c.json(formattedDTOs);
      } catch (error: any) {
        console.error("[API] Error fetching monitors:", error);
        return c.json({ error: error.message }, 500);
      }
    }
  )
  .get(
    "/monitors/:id",
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      try {
        const mon = await monitorQueryRepository.findWithChecksById(id);
        if (!mon) return c.json({ error: "Monitor not found" }, 404);

        return c.json({
          ...mon,
          probeConfiguration: flattenProbeConfiguration(mon.probeConfiguration),
        });
      } catch (error: any) {
        return c.json({ error: error.message }, 500);
      }
    }
  );
