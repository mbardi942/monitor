import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { alarmQueryRepository } from "@/infrastructure/backend-read";

// API di SOLA LETTURA. Le mutazioni sono Server Actions.
export const alarmsRouter = new Hono().get(
  "/alarms",
  zValidator("query", z.object({ dashboardId: z.string().min(1) })),
  async (c) => {
    const { dashboardId } = c.req.valid("query");
    try {
      const formatted = await alarmQueryRepository.findByDashboardId(dashboardId);
      return c.json(formatted);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }
);
