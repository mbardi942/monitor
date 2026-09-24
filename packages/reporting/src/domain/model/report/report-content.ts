import { ValueObject } from "@monitor/shared-kernel";

export interface MonitorReportItem {
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

export interface ReportContentProps {
  monitors: MonitorReportItem[];
}

export class ReportContent extends ValueObject<ReportContentProps> {
  public get monitors(): MonitorReportItem[] {
    // Ritorna una copia profonda per garantire l'immutabilità del VO
    return this.props.monitors.map((item) => ({
      ...item,
      recentExecutions: item.recentExecutions.map((exec) => ({
        ...exec,
        timestamp: new Date(exec.timestamp),
        extractedData: exec.extractedData ? { ...exec.extractedData } : null,
      })),
    }));
  }

  public static create(monitors: MonitorReportItem[]): ReportContent {
    return new ReportContent({ monitors });
  }

  public toValue(): ReportContentProps {
    return {
      monitors: this.monitors,
    };
  }
}
