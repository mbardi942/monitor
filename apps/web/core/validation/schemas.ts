import { z } from "zod";

// Schemi di validazione condivisi per gli input dei comandi (Server Actions).
// Sono volutamente permissivi sui campi derivati/opzionali (passthrough),
// ma garantiscono i vincoli essenziali del dominio.

export const monitorScheduleSchema = z.object({
  intervalSeconds: z.number().int().positive(),
});

export const assertionRuleSchema = z.object({
  target: z.enum(["STATUS_CODE", "RESPONSE_TIME", "JSON_BODY", "TEXT_BODY"]),
  operator: z.enum(["EQUALS", "NOT_EQUALS", "CONTAINS", "LESS_THAN", "GREATER_THAN"]),
  value: z.string(),
  property: z.string().optional(),
});

export const metricRuleSchema = z.object({
  property: z.string(),
  operator: z.enum(["EQUALS", "NOT_EQUALS", "LESS_THAN", "GREATER_THAN", "CUSTOM_SCRIPT"]),
  value: z.string(),
  script: z.string().optional(),
  aggregation: z.string().optional(),
});

export const alarmPolicySchema = z.object({
  consecutiveFailures: z.number().int().nonnegative(),
});

export const createMonitorInputSchema = z
  .object({
    name: z.string().min(1, "Il nome del monitor e obbligatorio"),
    type: z.enum(["HTTP", "PING", "HOST", "HEARTBEAT"]),
    probeConfiguration: z.record(z.string(), z.any()).default({}),
    schedule: monitorScheduleSchema,

    assertionRules: z.array(assertionRuleSchema).default([]),
    metricRules: z.array(metricRuleSchema).optional(),
    alarmPolicy: alarmPolicySchema,
    recipientIds: z.array(z.string()).optional(),
    dataExtractor: z.any().optional(),
  })
  .passthrough();

export const updateMonitorInputSchema = createMonitorInputSchema.partial();

export const generateReportInputSchema = z
  .object({
    dashboardId: z.string().min(1),
    from: z.string().min(1, "Data di inizio non valida"),
    to: z.string().min(1, "Data di fine non valida"),
  })
  .refine((v) => !Number.isNaN(Date.parse(v.from)) && !Number.isNaN(Date.parse(v.to)), {
    message: "Le date del periodo non sono valide",
  })
  .refine((v) => Date.parse(v.from) <= Date.parse(v.to), {
    message: "La data di inizio deve precedere la data di fine",
  });

export const addRecipientInputSchema = z.object({
  dashboardId: z.string().min(1),
  name: z.string().min(1, "Il nome del destinatario e obbligatorio"),
  email: z.email("Email non valida").optional().or(z.literal("")),
  slackWebhook: z.url("URL Slack non valido").optional().or(z.literal("")),
});

/**
 * Esegue il parse di uno schema lanciando un Error con messaggio leggibile
 * (adatto a essere mostrato dalla UI) in caso di input non valido.
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join("; ");
    throw new Error(message || "Input non valido");
  }
  return result.data;
}
