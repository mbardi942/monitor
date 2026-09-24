import { describe, it, expect } from "vitest";
import {
  createMonitorInputSchema,
  updateMonitorInputSchema,
  generateReportInputSchema,
  addRecipientInputSchema,
  parseOrThrow,
} from "@/core/validation/schemas";

const validMonitor = {
  name: "Sito Web",
  type: "HTTP",
  probeConfiguration: { url: "https://example.com", method: "GET" },
  schedule: { intervalSeconds: 30 },
  assertionRules: [{ target: "STATUS_CODE", operator: "EQUALS", value: "200" }],
  alarmPolicy: { consecutiveFailures: 3 },
};

describe("createMonitorInputSchema", () => {
  it("accepts a valid monitor", () => {
    expect(() => parseOrThrow(createMonitorInputSchema, validMonitor)).not.toThrow();
  });

  it("rejects an empty name", () => {
    expect(() => parseOrThrow(createMonitorInputSchema, { ...validMonitor, name: "" })).toThrow();
  });

  it("rejects an invalid type", () => {
    expect(() => parseOrThrow(createMonitorInputSchema, { ...validMonitor, type: "FTP" })).toThrow();
  });

  it("rejects a non-positive interval", () => {
    expect(() =>
      parseOrThrow(createMonitorInputSchema, { ...validMonitor, schedule: { intervalSeconds: 0 } })
    ).toThrow();
  });

  it("preserves extra fields (passthrough)", () => {
    const parsed = parseOrThrow(createMonitorInputSchema, { ...validMonitor, status: "UP" });
    expect((parsed as { status?: string }).status).toBe("UP");
  });
});

describe("updateMonitorInputSchema", () => {
  it("accepts a partial update", () => {
    expect(() => parseOrThrow(updateMonitorInputSchema, { name: "Nuovo nome" })).not.toThrow();
  });
});

describe("generateReportInputSchema", () => {
  it("accepts a valid period", () => {
    expect(() =>
      parseOrThrow(generateReportInputSchema, {
        dashboardId: "dash-1",
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-01-31T00:00:00.000Z",
      })
    ).not.toThrow();
  });

  it("rejects an inverted range (from > to)", () => {
    expect(() =>
      parseOrThrow(generateReportInputSchema, {
        dashboardId: "dash-1",
        from: "2026-02-01T00:00:00.000Z",
        to: "2026-01-01T00:00:00.000Z",
      })
    ).toThrow();
  });

  it("rejects unparseable dates", () => {
    expect(() =>
      parseOrThrow(generateReportInputSchema, { dashboardId: "dash-1", from: "non-una-data", to: "altro" })
    ).toThrow();
  });
});

describe("addRecipientInputSchema", () => {
  it("accepts a recipient with a valid email", () => {
    expect(() =>
      parseOrThrow(addRecipientInputSchema, { dashboardId: "dash-1", name: "Mario", email: "mario@example.com" })
    ).not.toThrow();
  });

  it("rejects a malformed email", () => {
    expect(() =>
      parseOrThrow(addRecipientInputSchema, { dashboardId: "dash-1", name: "Mario", email: "non-email" })
    ).toThrow();
  });

  it("rejects an empty name", () => {
    expect(() =>
      parseOrThrow(addRecipientInputSchema, { dashboardId: "dash-1", name: "" })
    ).toThrow();
  });
});
