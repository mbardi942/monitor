import { MonitorMetrics } from "../ports/check-data-reader.js";
import { ReportContent } from "../model/report/report-content.js";

export class ReportAggregationService {
  /**
   * Aggrega le metriche grezze dei check in un oggetto ReportContent pronto per essere salvato.
   */
  public aggregate(metrics: MonitorMetrics[]): ReportContent {
    const reportItems = metrics.map((m) => ({
      monitorId: m.monitorId,
      monitorName: m.monitorName,
      uptimePercentage: Number(m.uptimePercentage.toFixed(2)),
      avgResponseTimeMs: Math.round(m.avgResponseTimeMs),
      totalChecks: m.totalChecks,
      failedChecks: m.failedChecks,
      recentExecutions: m.recentExecutions.map((exec) => ({
        timestamp: new Date(exec.timestamp),
        status: exec.status,
        extractedData: exec.extractedData ? { ...exec.extractedData } : null,
      })),
    }));

    return ReportContent.create(reportItems);
  }
}
