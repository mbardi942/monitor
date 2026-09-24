import "server-only";
import { reportQueryRepository } from "@/infrastructure/backend-read";
import { ReportDTO } from "@/core/ports/gateways";

export function mapToReportDTO(item: any): ReportDTO {
  return {
    id: item.id,
    dashboardId: item.dashboardId,
    status: item.status,
    periodFrom: item.periodFrom instanceof Date ? item.periodFrom.toISOString() : item.periodFrom,
    periodTo: item.periodTo instanceof Date ? item.periodTo.toISOString() : item.periodTo,
    content: item.content,
    customText: item.customText,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
  };
}

export async function getReportsForDashboard(dashboardId: string): Promise<ReportDTO[]> {
  const reports = await reportQueryRepository.findByDashboardId(dashboardId);
  return reports.map(mapToReportDTO);
}
