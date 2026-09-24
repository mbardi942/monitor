"use server";

import { revalidatePath } from "next/cache";
import { useMock, resolveAlarmUseCase } from "@/infrastructure/backend";
import { mockStore } from "@/infrastructure/gateways/mock-data";

export async function resolveAlarmAction(alarmId: string) {
  if (useMock) {
    const alarm = mockStore.alarmsList.find((a) => a.id === alarmId);
    if (alarm) {
      alarm.status = "RESOLVED";
      alarm.resolvedAt = new Date().toISOString();
      const monitor = mockStore.monitorsList.find((m) => m.id === alarm.monitorId);
      if (monitor && monitor.status === "DOWN") {
        monitor.status = "UP";
      }
    }
    revalidatePath("/", "layout");
    return;
  }

  await resolveAlarmUseCase.execute({ alarmId });
  revalidatePath("/", "layout");
}
