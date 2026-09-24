export interface ReportDTO {
  id: string;
  dashboardId: string;
  status: string;
  periodFrom: string;
  periodTo: string;
  content: any;
  customText?: string;
  createdAt: string;
}

export interface ReportQueryRepository {
  findByDashboardId(dashboardId: string): Promise<ReportDTO[]>;
}
