import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { processHeartbeatUseCase } from "@/infrastructure/backend";

// Endpoint universale di ingestione per sonde Push / Heartbeat
export const heartbeatsRouter = new Hono()
  .get(
    "/heartbeats/:token",
    zValidator("param", z.object({ token: z.string().min(1) })),
    async (c) => {
      const { token } = c.req.valid("param");
      try {
        const execution = await processHeartbeatUseCase.execute({ token });
        if (!execution) {
          return c.json({ success: false, message: "Monitor paused or inactive" }, 200);
        }
        return c.json({
          success: true,
          monitorId: execution.monitorId.toString(),
          status: execution.status,
          timestamp: execution.timestamp,
        });
      } catch (error: any) {
        console.error("[API] Error processing GET heartbeat:", error);
        return c.json({ error: error.message || "Heartbeat token not found" }, 404);
      }
    }
  )
  .post(
    "/heartbeats/:token",
    zValidator("param", z.object({ token: z.string().min(1) })),
    async (c) => {
      const { token } = c.req.valid("param");
      try {
        let bodyText: string | undefined = undefined;
        try {
          bodyText = await c.req.text();
        } catch {
          // Nessun body
        }

        const execution = await processHeartbeatUseCase.execute({
          token,
          body: bodyText && bodyText.trim().length > 0 ? bodyText : undefined,
        });

        if (!execution) {
          return c.json({ success: false, message: "Monitor paused or inactive" }, 200);
        }

        return c.json({
          success: true,
          monitorId: execution.monitorId.toString(),
          status: execution.status,
          dataStatus: execution.dataStatus,
          extractedData: execution.extractedData?.value,
          timestamp: execution.timestamp,
        });
      } catch (error: any) {
        console.error("[API] Error processing POST heartbeat:", error);
        return c.json({ error: error.message || "Heartbeat token not found" }, 404);
      }
    }
  );
