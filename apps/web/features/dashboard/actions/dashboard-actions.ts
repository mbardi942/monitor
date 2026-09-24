"use server";

import { revalidatePath } from "next/cache";
import {
  useMock,
  db,
  dashboardRepository,
  createDashboardUseCase,
} from "@/infrastructure/backend";
import { DashboardId } from "@monitor/monitoring";
import { dashboards } from "@monitor/db";
import { eq } from "drizzle-orm";
import { mockStore } from "@/infrastructure/gateways/mock-data";

const revalidateAll = () => {
  revalidatePath("/", "layout");
  revalidatePath("/[dashboardId]", "layout");
};

export async function createDashboardAction(name: string) {
  if (!name || !name.trim()) {
    throw new Error("Il nome della dashboard è obbligatorio.");
  }

  const trimmedName = name.trim();

  if (useMock) {
    const newDash = {
      id: `dash-${Math.random().toString(36).substring(2, 9)}`,
      name: trimmedName,
      reportConfig: { isEnabled: false },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore.dashboardsList.push(newDash);
    revalidateAll();
    return newDash;
  }

  const dashboard = await createDashboardUseCase.execute({
    name: trimmedName,
    tenantId: "default-tenant",
  });

  revalidateAll();
  return {
    id: dashboard.id.toString(),
    name: dashboard.name,
  };
}

export async function renameDashboardAction(id: string, newName: string) {
  if (!id) throw new Error("ID dashboard non specificato.");
  if (!newName || !newName.trim()) throw new Error("Il nuovo nome non può essere vuoto.");

  const trimmedName = newName.trim();

  if (useMock) {
    const target = mockStore.dashboardsList.find((d) => d.id === id);
    if (!target) throw new Error("Dashboard non trovata.");
    target.name = trimmedName;
    target.updatedAt = new Date().toISOString();
    revalidateAll();
    return target;
  }

  const dashboard = await dashboardRepository.findById(DashboardId.create(id));
  if (!dashboard) throw new Error("Dashboard non trovata.");

  dashboard.rename(trimmedName);
  await dashboardRepository.save(dashboard);

  revalidateAll();
  return {
    id: dashboard.id.toString(),
    name: dashboard.name,
  };
}

export async function deleteDashboardAction(id: string) {
  if (!id) throw new Error("ID dashboard non specificato.");

  if (useMock) {
    if (mockStore.dashboardsList.length <= 1) {
      throw new Error("Impossibile eliminare l'unica dashboard rimanente.");
    }
    mockStore.dashboardsList = mockStore.dashboardsList.filter((d) => d.id !== id);
    revalidateAll();
    return { success: true };
  }

  // Verifica che rimanga almeno un'altra dashboard
  const allDashboards = await db.select().from(dashboards);
  if (allDashboards.length <= 1) {
    throw new Error("Impossibile eliminare l'unica dashboard rimanente.");
  }

  await db.delete(dashboards).where(eq(dashboards.id, id));
  revalidateAll();
  return { success: true };
}
