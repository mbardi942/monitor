import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only per consentire l'import nei test Vitest
vi.mock("server-only", () => ({}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  createDashboardAction,
  renameDashboardAction,
  deleteDashboardAction,
} from "./dashboard-actions";
import { mockStore } from "@/infrastructure/gateways/mock-data";

describe("dashboard-actions", () => {
  beforeEach(() => {
    mockStore.dashboardsList = [
      {
        id: "dash-1",
        name: "Dashboard di Produzione",
        reportConfig: { isEnabled: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "dash-2",
        name: "Dashboard di Staging",
        reportConfig: { isEnabled: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  });

  it("creates a new dashboard successfully", async () => {
    const res = await createDashboardAction("Nuova Dashboard Test");
    expect(res.name).toBe("Nuova Dashboard Test");
    expect(mockStore.dashboardsList.some((d) => d.name === "Nuova Dashboard Test")).toBe(true);
  });

  it("throws an error if the dashboard name is empty", async () => {
    await expect(createDashboardAction("   ")).rejects.toThrow(
      "Il nome della dashboard è obbligatorio."
    );
  });

  it("renames an existing dashboard", async () => {
    const res = await renameDashboardAction("dash-1", "Dashboard Principale");
    expect(res.name).toBe("Dashboard Principale");
    const target = mockStore.dashboardsList.find((d) => d.id === "dash-1");
    expect(target?.name).toBe("Dashboard Principale");
  });

  it("deletes an existing dashboard when others remain", async () => {
    const res = await deleteDashboardAction("dash-2");
    expect(res.success).toBe(true);
    expect(mockStore.dashboardsList.find((d) => d.id === "dash-2")).toBeUndefined();
  });

  it("prevents deleting the only remaining dashboard", async () => {
    mockStore.dashboardsList = [mockStore.dashboardsList[0]];
    await expect(deleteDashboardAction("dash-1")).rejects.toThrow(
      "Impossibile eliminare l'unica dashboard rimanente."
    );
  });
});
