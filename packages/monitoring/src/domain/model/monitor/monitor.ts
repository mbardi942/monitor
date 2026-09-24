import { AggregateRoot } from "@monitor/shared-kernel";
import { MonitorId } from "./monitor-id.js";
import { MonitorType } from "./monitor-type.js";
import { MonitorStatus } from "./monitor-status.js";
import { ProbeConfiguration } from "./probe-configuration.js";
import { Schedule } from "./schedule.js";
import { AssertionRule } from "./assertion-rule.js";
import { AlarmPolicy } from "./alarm-policy.js";
import { DataExtractor } from "./data-extractor.js";
import { MetricRule } from "./metric-rule.js";
import { DataHealthStatus } from "./data-health-status.js";
import { MonitorCreated } from "../../events/monitor-created.js";
import { MonitorConfigured } from "../../events/monitor-configured.js";
import { MonitorStatusChanged } from "../../events/monitor-status-changed.js";
import { MonitorDataHealthChanged } from "../../events/monitor-data-health-changed.js";

export class Monitor extends AggregateRoot<MonitorId> {
  private _name: string;
  private _type: MonitorType;
  private _status: MonitorStatus;
  private _dataHealthStatus: DataHealthStatus;
  private _probeConfiguration: ProbeConfiguration;
  private _schedule: Schedule;
  private _assertionRules: AssertionRule[];
  private _metricRules: MetricRule[];
  private _alarmPolicy: AlarmPolicy;
  private _recipientIds: string[];
  private _dataExtractor?: DataExtractor;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: MonitorId,
    name: string,
    type: MonitorType,
    status: MonitorStatus,
    probeConfiguration: ProbeConfiguration,
    schedule: Schedule,
    assertionRules: AssertionRule[],
    alarmPolicy: AlarmPolicy,
    createdAt: Date,
    updatedAt: Date,
    dataExtractor?: DataExtractor,
    metricRules: MetricRule[] = [],
    dataHealthStatus: DataHealthStatus = DataHealthStatus.NONE,
    recipientIds: string[] = []
  ) {
    super(id);
    this._name = name;
    this._type = type;
    this._status = status;
    this._dataHealthStatus = dataHealthStatus;
    this._probeConfiguration = probeConfiguration;
    this._schedule = schedule;
    this._assertionRules = assertionRules;
    this._metricRules = metricRules;
    this._alarmPolicy = alarmPolicy;
    this._recipientIds = recipientIds;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._dataExtractor = dataExtractor;
  }

  // Getters
  public get name(): string { return this._name; }
  public get type(): MonitorType { return this._type; }
  public get status(): MonitorStatus { return this._status; }
  public get dataHealthStatus(): DataHealthStatus { return this._dataHealthStatus; }
  public get probeConfiguration(): ProbeConfiguration { return this._probeConfiguration; }
  public get schedule(): Schedule { return this._schedule; }
  public get assertionRules(): AssertionRule[] { return [...this._assertionRules]; }
  public get metricRules(): MetricRule[] { return [...this._metricRules]; }
  public get alarmPolicy(): AlarmPolicy { return this._alarmPolicy; }
  public get recipientIds(): string[] { return [...this._recipientIds]; }
  public get dataExtractor(): DataExtractor | undefined { return this._dataExtractor; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  /**
   * Factory method per creare un nuovo Monitor
   */
  public static create(
    id: MonitorId,
    name: string,
    type: MonitorType,
    probeConfiguration: ProbeConfiguration,
    schedule: Schedule,
    assertionRules: AssertionRule[],
    alarmPolicy: AlarmPolicy,
    dataExtractor?: DataExtractor,
    metricRules: MetricRule[] = [],
    recipientIds: string[] = []
  ): Monitor {
    if (type.value === "PING" && dataExtractor) {
      throw new Error("PING monitors cannot have a data extractor");
    }

    const now = new Date();
    const monitor = new Monitor(
      id,
      name,
      type,
      MonitorStatus.UP, // Inizialmente UP per default (attivo)
      probeConfiguration,
      schedule,
      assertionRules,
      alarmPolicy,
      now,
      now,
      dataExtractor,
      metricRules,
      DataHealthStatus.NONE, // Nessuno stato dati iniziale
      recipientIds
    );

    monitor.addDomainEvent(new MonitorCreated(id.toString(), name, type.value));
    monitor.addDomainEvent(
      new MonitorConfigured(
        id.toString(),
        name,
        type.value,
        probeConfiguration.toValue(),
        schedule.toValue(),
        assertionRules.map((rule) => rule.toValue()),
        alarmPolicy.toValue(),
        dataExtractor ? dataExtractor.toValue() : undefined
      )
    );

    return monitor;
  }

  /**
   * Ricostruisce un aggregato esistente (usato dal Repository / persistenza)
   */
  public static reconstitute(
    id: MonitorId,
    name: string,
    type: MonitorType,
    status: MonitorStatus,
    probeConfiguration: ProbeConfiguration,
    schedule: Schedule,
    assertionRules: AssertionRule[],
    alarmPolicy: AlarmPolicy,
    createdAt: Date,
    updatedAt: Date,
    dataExtractor?: DataExtractor,
    metricRules: MetricRule[] = [],
    dataHealthStatus: DataHealthStatus = DataHealthStatus.NONE,
    recipientIds: string[] = []
  ): Monitor {
    return new Monitor(
      id,
      name,
      type,
      status,
      probeConfiguration,
      schedule,
      assertionRules,
      alarmPolicy,
      createdAt,
      updatedAt,
      dataExtractor,
      metricRules,
      dataHealthStatus,
      recipientIds
    );
  }

  /**
   * Configura/Aggiorna i parametri del Monitor
   */
  public configure(
    name: string,
    probeConfiguration: ProbeConfiguration,
    schedule: Schedule,
    assertionRules: AssertionRule[],
    alarmPolicy: AlarmPolicy,
    dataExtractor?: DataExtractor,
    metricRules: MetricRule[] = [],
    recipientIds: string[] = []
  ): void {
    if (this._type.value === "PING" && dataExtractor) {
      throw new Error("PING monitors cannot have a data extractor");
    }

    this._name = name;
    this._probeConfiguration = probeConfiguration;
    this._schedule = schedule;
    this._assertionRules = assertionRules;
    this._metricRules = metricRules;
    this._alarmPolicy = alarmPolicy;
    this._dataExtractor = dataExtractor;
    this._recipientIds = recipientIds;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new MonitorConfigured(
        this.id.toString(),
        name,
        this.type.value,
        probeConfiguration.toValue(),
        schedule.toValue(),
        assertionRules.map((rule) => rule.toValue()),
        alarmPolicy.toValue(),
        dataExtractor ? dataExtractor.toValue() : undefined
      )
    );
  }

  /**
   * Sospende temporaneamente il Monitor
   */
  public pause(): void {
    this.updateStatus(MonitorStatus.PAUSED);
  }

  /**
   * Riattiva il Monitor
   */
  public resume(): void {
    if (this._status.value === "PAUSED") {
      this.updateStatus(MonitorStatus.UP);
    }
  }

  /**
   * Aggiorna lo stato del Monitor valutando se è cambiato
   */
  public updateStatus(newStatus: MonitorStatus): void {
    if (this._status.equals(newStatus)) {
      return;
    }

    if (!this._status.canTransitionTo(newStatus)) {
      throw new Error(`Cannot transition monitor status from ${this._status.value} to ${newStatus.value}`);
    }

    const oldStatusValue = this._status.value;
    this._status = newStatus;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new MonitorStatusChanged(this.id.toString(), oldStatusValue, newStatus.value)
    );
  }

  /**
   * Aggiorna lo stato dei dati valutando se è cambiato
   */
  public updateDataHealthStatus(newStatus: DataHealthStatus): void {
    if (this._dataHealthStatus.equals(newStatus)) {
      return;
    }

    const oldStatusValue = this._dataHealthStatus.value;
    this._dataHealthStatus = newStatus;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new MonitorDataHealthChanged(this.id.toString(), oldStatusValue, newStatus.value)
    );
  }

  /**
   * Aggiorna la configurazione della sonda (es. timestamp lastPingAt per Heartbeat)
   */
  public updateProbeConfiguration(probeConfiguration: ProbeConfiguration): void {
    this._probeConfiguration = probeConfiguration;
    this._updatedAt = new Date();
  }
}

