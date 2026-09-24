export interface MonitorWithChecksDTO {
  id: string;
  name: string;
  type: string;
  status: string;
  probeConfiguration: any;
  schedule: any;
  assertionRules: any[];
  alarmPolicy: any;
  dataExtractor?: any;
  dataHealthStatus?: string;
  metricRules?: any[];
  createdAt: string;
  updatedAt: string;
  lastCheckTime?: string;
  lastResponseTimeMs?: number;
  lastStatus?: string;
  recentExecutions: {
    timestamp: string;
    status: string;
    responseTimeMs: number;
    assertionResults?: any;
    extractedData?: any;
  }[];
}

export interface MonitorQueryRepository {
  findByDashboardId(dashboardId: string): Promise<MonitorWithChecksDTO[]>;
  findWithChecksById(monitorId: string): Promise<MonitorWithChecksDTO | null>;
}
