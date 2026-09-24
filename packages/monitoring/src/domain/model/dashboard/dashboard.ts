import { AggregateRoot } from "@monitor/shared-kernel";
import { DashboardId } from "./dashboard-id.js";
import { MonitorId } from "../monitor/monitor-id.js";
import { DashboardReportConfig } from "./dashboard-report-config.js";
import { DashboardCreated } from "../../events/dashboard-created.js";
import { MonitorAddedToDashboard } from "../../events/monitor-added-to-dashboard.js";

import { DashboardReportConfigured } from "../../events/dashboard-report-configured.js";

export class Dashboard extends AggregateRoot<DashboardId> {
  private _name: string;
  private readonly _tenantId: string;
  private _monitorIds: MonitorId[];
  private _reportConfig: DashboardReportConfig;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: DashboardId,
    name: string,
    tenantId: string,
    monitorIds: MonitorId[],
    reportConfig: DashboardReportConfig,
    createdAt: Date,
    updatedAt: Date
  ) {
    super(id);
    this._name = name;
    this._tenantId = tenantId;
    this._monitorIds = monitorIds;
    this._reportConfig = reportConfig;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  // Getters
  public get name(): string { return this._name; }
  public get tenantId(): string { return this._tenantId; }
  public get monitorIds(): MonitorId[] { return [...this._monitorIds]; }
  public get reportConfig(): DashboardReportConfig { return this._reportConfig; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  /**
   * Factory method per creare una nuova Dashboard
   */
  public static create(
    id: DashboardId,
    name: string,
    tenantId: string,
    reportConfig: DashboardReportConfig = DashboardReportConfig.createDisabled()
  ): Dashboard {
    if (!name) {
      throw new Error("Dashboard name is required.");
    }
    if (!tenantId) {
      throw new Error("Tenant ID is required.");
    }

    const now = new Date();
    const dashboard = new Dashboard(
      id,
      name,
      tenantId,
      [],
      reportConfig,
      now,
      now
    );

    dashboard.addDomainEvent(new DashboardCreated(id.toString(), name, tenantId));
    return dashboard;
  }

  /**
   * Ricostruisce l'aggregato (usato dal Repository / persistenza)
   */
  public static reconstitute(
    id: DashboardId,
    name: string,
    tenantId: string,
    monitorIds: MonitorId[],
    reportConfig: DashboardReportConfig,
    createdAt: Date,
    updatedAt: Date
  ): Dashboard {
    return new Dashboard(
      id,
      name,
      tenantId,
      monitorIds,
      reportConfig,
      createdAt,
      updatedAt
    );
  }

  /**
   * Associa un Monitor alla Dashboard
   */
  public addMonitor(monitorId: MonitorId): void {
    const exists = this._monitorIds.some((id) => id.equals(monitorId));
    if (exists) {
      return;
    }

    this._monitorIds.push(monitorId);
    this._updatedAt = new Date();
    this.addDomainEvent(new MonitorAddedToDashboard(this.id.toString(), monitorId.toString()));
  }

  /**
   * Rimuove un Monitor dalla Dashboard
   */
  public removeMonitor(monitorId: MonitorId): void {
    const index = this._monitorIds.findIndex((id) => id.equals(monitorId));
    if (index === -1) {
      return;
    }

    this._monitorIds.splice(index, 1);
    this._updatedAt = new Date();
  }

  /**
   * Modifica la configurazione dei report
   */
  public configureReports(reportConfig: DashboardReportConfig): void {
    this._reportConfig = reportConfig;
    this._updatedAt = new Date();
    this.addDomainEvent(
      new DashboardReportConfigured(
        this.id.toString(),
        reportConfig.isEnabled,
        reportConfig.cron || null
      )
    );
  }

  /**
   * Rinomina la Dashboard
   */
  public rename(newName: string): void {
    if (!newName) {
      throw new Error("Dashboard name cannot be empty.");
    }
    this._name = newName;
    this._updatedAt = new Date();
  }
}
