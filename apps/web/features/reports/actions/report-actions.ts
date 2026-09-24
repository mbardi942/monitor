"use server";

import { revalidatePath } from "next/cache";
import { useMock, generateReportUseCase, editReportUseCase, confirmReportUseCase } from "@/infrastructure/backend";
import { mockStore } from "@/infrastructure/gateways/mock-data";
import { ReportDTO } from "@/core/ports/gateways";
import { toReportDTO } from "@/core/mappers/report-mapper";
import { generateReportInputSchema, parseOrThrow } from "@/core/validation/schemas";

export async function generateReportAction(dashboardId: string, from: string, to: string) {
  parseOrThrow(generateReportInputSchema, { dashboardId, from, to });

  if (useMock) {
    const newReport: ReportDTO = {
      id: `rep-${Math.random().toString(36).substring(2, 9)}`,
      dashboardId,
      status: "DRAFT",
      periodFrom: from,
      periodTo: to,
      content: {
        uptimePercent: 97.8,
        avgResponseTimeMs: 165,
        totalMonitors: mockStore.monitorsList.length,
        monitors: mockStore.monitorsList.map((m) => ({
          id: m.id,
          name: m.name,
          uptimePercent: m.status === "DOWN" ? 92.5 : 100,
          avgResponseTimeMs: m.lastResponseTimeMs || 150,
        })),
      },
      customText: "",
      createdAt: new Date().toISOString(),
    };
    mockStore.reportsList.unshift(newReport);
    revalidatePath("/", "layout");
    return newReport;
  }

  const report = await generateReportUseCase.execute({
    dashboardId,
    from: new Date(from),
    to: new Date(to),
  });
  revalidatePath("/", "layout");
  return toReportDTO(report);
}

export async function editReportAction(id: string, customText: string, excludeMonitorIds: string[]) {
  if (useMock) {
    const report = mockStore.reportsList.find((r) => r.id === id);
    if (!report) throw new Error("Report non trovato");
    report.customText = customText;
    if (report.content && report.content.monitors) {
      const originalMonitors = mockStore.monitorsList.map((m) => ({
        id: m.id,
        name: m.name,
        uptimePercent: m.status === "DOWN" ? 92.5 : 100,
        avgResponseTimeMs: m.lastResponseTimeMs || 150,
      }));
      report.content.monitors = originalMonitors.filter((m) => !excludeMonitorIds.includes(m.id));
      report.content.totalMonitors = report.content.monitors.length;
    }
    revalidatePath("/", "layout");
    return report;
  }

  const report = await editReportUseCase.execute({ reportId: id, customText, excludeMonitorIds });
  revalidatePath("/", "layout");
  return toReportDTO(report);
}

export async function confirmReportAction(id: string) {
  if (useMock) {
    const report = mockStore.reportsList.find((r) => r.id === id);
    if (report) {
      report.status = "SENT";
    }
    revalidatePath("/", "layout");
    return;
  }

  await confirmReportUseCase.execute({ reportId: id });
  revalidatePath("/", "layout");
}
