export interface AlarmDTO {
  id: string;
  monitorId: string;
  monitorName: string;
  status: string;
  severity: string;
  alarmType?: string;
  openedAt: string;
  confirmedAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AlarmQueryRepository {
  findByDashboardId(dashboardId: string): Promise<AlarmDTO[]>;
}
