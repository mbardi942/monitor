export interface MonitorMetrics {
  monitorId: string;
  monitorName: string;
  uptimePercentage: number;
  avgResponseTimeMs: number;
  totalChecks: number;
  failedChecks: number;
  recentExecutions: Array<{
    timestamp: Date;
    status: "UP" | "DOWN" | "DEGRADED";
    extractedData: Record<string, any> | null;
  }>;
}

export interface CheckDataReader {
  getMetricsForDashboard(dashboardId: string, from: Date, to: Date): Promise<MonitorMetrics[]>;
}
