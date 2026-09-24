import { ValueObject } from "@monitor/shared-kernel";

export interface DashboardReportConfigProps {
  isEnabled: boolean;
  cron?: string; // Es. "0 9 * * *" per report ogni mattina alle 9
}

export class DashboardReportConfig extends ValueObject<DashboardReportConfigProps> {
  public get isEnabled(): boolean {
    return this.props.isEnabled;
  }

  public get cron(): string | undefined {
    return this.props.cron;
  }

  public static create(props: DashboardReportConfigProps): DashboardReportConfig {
    if (props.isEnabled && !props.cron) {
      throw new Error("Cron expression is required if report sending is enabled.");
    }
    return new DashboardReportConfig({
      isEnabled: props.isEnabled,
      cron: props.cron,
    });
  }

  public static createDisabled(): DashboardReportConfig {
    return new DashboardReportConfig({ isEnabled: false });
  }
}
