import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { recipientQueryRepository } from "@/infrastructure/backend-read";

// API di SOLA LETTURA. Le mutazioni sono Server Actions.
export const recipientsRouter = new Hono().get(
  "/recipients",
  zValidator("query", z.object({ dashboardId: z.string().min(1) })),
  async (c) => {
    const { dashboardId } = c.req.valid("query");
    try {
      const formatted = await recipientQueryRepository.findByDashboardId(dashboardId);
      return c.json(formatted);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }
);
