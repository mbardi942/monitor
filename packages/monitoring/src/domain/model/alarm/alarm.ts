import { AggregateRoot } from "@monitor/shared-kernel";
import { AlarmId } from "./alarm-id.js";
import { MonitorId } from "../monitor/monitor-id.js";
import { CheckExecutionId } from "../check-execution/check-execution-id.js";
import { Severity } from "./severity.js";
import { AlarmConfirmationStatus } from "./alarm-confirmation-status.js";
import { AlarmPeriod } from "./alarm-period.js";
import { FailureAccumulator } from "./failure-accumulator.js";
import { AlarmRaised } from "../../events/alarm-raised.js";
import { AlarmConfirmed } from "../../events/alarm-confirmed.js";
import { AlarmNotified } from "../../events/alarm-notified.js";
import { AlarmResolved } from "../../events/alarm-resolved.js";
import { AlarmEscalated } from "../../events/alarm-escalated.js";

export type AlarmType = "AVAILABILITY" | "DATA_METRIC";

export class Alarm extends AggregateRoot<AlarmId> {
  private readonly _monitorId: MonitorId;
  private readonly _alarmType: AlarmType;
  private _severity: Severity;
  private _confirmationStatus: AlarmConfirmationStatus;
  private _period: AlarmPeriod;
  private _failureAccumulator: FailureAccumulator;
  private readonly _triggerCheckExecutionId: CheckExecutionId;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: AlarmId,
    monitorId: MonitorId,
    severity: Severity,
    confirmationStatus: AlarmConfirmationStatus,
    period: AlarmPeriod,
    failureAccumulator: FailureAccumulator,
    triggerCheckExecutionId: CheckExecutionId,
    createdAt: Date,
    updatedAt: Date,
    alarmType: AlarmType = "AVAILABILITY"
  ) {
    super(id);
    this._monitorId = monitorId;
    this._alarmType = alarmType;
    this._severity = severity;
    this._confirmationStatus = confirmationStatus;
    this._period = period;
    this._failureAccumulator = failureAccumulator;
    this._triggerCheckExecutionId = triggerCheckExecutionId;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  // Getters
  public get monitorId(): MonitorId { return this._monitorId; }
  public get alarmType(): AlarmType { return this._alarmType; }
  public get severity(): Severity { return this._severity; }
  public get confirmationStatus(): AlarmConfirmationStatus { return this._confirmationStatus; }
  public get period(): AlarmPeriod { return this._period; }
  public get failureAccumulator(): FailureAccumulator { return this._failureAccumulator; }
  public get triggerCheckExecutionId(): CheckExecutionId { return this._triggerCheckExecutionId; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  /**
   * Factory statica per alzare un allarme in stato OPEN.
   */
  public static raise(
    id: AlarmId,
    monitorId: MonitorId,
    severity: Severity,
    triggerCheckId: CheckExecutionId,
    alarmType: AlarmType = "AVAILABILITY"
  ): Alarm {
    const now = new Date();
    const alarm = new Alarm(
      id,
      monitorId,
      severity,
      AlarmConfirmationStatus.OPEN,
      AlarmPeriod.create({ openedAt: now }),
      FailureAccumulator.create({ consecutiveFailureCount: 1, firstFailureAt: now }),
      triggerCheckId,
      now,
      now,
      alarmType
    );

    alarm.addDomainEvent(
      new AlarmRaised(
        id.toString(),
        monitorId.toString(),
        severity.value,
        triggerCheckId.toString(),
        alarmType
      )
    );

    return alarm;
  }

  /**
   * Ricostruisce un allarme esistente (usato dal Repository / persistenza).
   */
  public static reconstitute(
    id: AlarmId,
    monitorId: MonitorId,
    severity: Severity,
    confirmationStatus: AlarmConfirmationStatus,
    period: AlarmPeriod,
    failureAccumulator: FailureAccumulator,
    triggerCheckExecutionId: CheckExecutionId,
    createdAt: Date,
    updatedAt: Date,
    alarmType: AlarmType = "AVAILABILITY"
  ): Alarm {
    return new Alarm(
      id,
      monitorId,
      severity,
      confirmationStatus,
      period,
      failureAccumulator,
      triggerCheckExecutionId,
      createdAt,
      updatedAt,
      alarmType
    );
  }

  /**
   * Incrementa il FailureAccumulator (solo se l'allarme è in stato OPEN).
   */
  public accumulateFailure(checkExecutionId: CheckExecutionId): void {
    if (this._confirmationStatus.value !== "OPEN") {
      return;
    }

    this._failureAccumulator = this._failureAccumulator.increment();
    this._updatedAt = new Date();
  }

  /**
   * Conferma l'allarme transendo a CONFIRMED.
   */
  public confirm(
    monitorName: string,
    dashboardIds: string[],
    extractedDataSummary?: any
  ): void {
    if (this._confirmationStatus.value !== "OPEN") {
      throw new Error(`Cannot confirm alarm that is in status ${this._confirmationStatus.value}`);
    }

    const now = new Date();
    this._confirmationStatus = AlarmConfirmationStatus.CONFIRMED;
    this._period = this._period.confirm(now);
    this._updatedAt = now;

    this.addDomainEvent(
      new AlarmConfirmed(
        this.id.toString(),
        this._monitorId.toString(),
        monitorName,
        this._severity.value,
        dashboardIds,
        now,
        extractedDataSummary
      )
    );
  }

  /**
   * Segna l'allarme come notificato transendo a NOTIFIED.
   */
  public markNotified(): void {
    if (this._confirmationStatus.value !== "CONFIRMED") {
      throw new Error(`Cannot mark notified alarm that is in status ${this._confirmationStatus.value}`);
    }

    const now = new Date();
    this._confirmationStatus = AlarmConfirmationStatus.NOTIFIED;
    this._period = this._period.markNotified(now);
    this._updatedAt = now;

    this.addDomainEvent(new AlarmNotified(this.id.toString(), this._monitorId.toString()));
  }

  /**
   * Risolve l'allarme transendo a RESOLVED.
   */
  public resolve(monitorName: string, recoveryEnabled: boolean): void {
    if (this._confirmationStatus.value === "RESOLVED") {
      return;
    }

    const now = new Date();
    const wasNotified = this._confirmationStatus.value === "NOTIFIED";
    const openedAt = this._period.openedAt;
    const durationMs = now.getTime() - openedAt.getTime();

    this._confirmationStatus = AlarmConfirmationStatus.RESOLVED;
    this._period = this._period.resolve(now);
    this._updatedAt = now;

    this.addDomainEvent(
      new AlarmResolved(
        this.id.toString(),
        this._monitorId.toString(),
        monitorName,
        durationMs,
        wasNotified,
        recoveryEnabled
      )
    );
  }

  /**
   * Aumenta la severità dell'allarme (solo se non risolto).
   */
  public escalate(newSeverity: Severity): void {
    if (this._confirmationStatus.value === "RESOLVED") {
      throw new Error("Cannot escalate a resolved alarm.");
    }

    const currentLevel = this.getSeverityLevel(this._severity);
    const newLevel = this.getSeverityLevel(newSeverity);

    if (newLevel <= currentLevel) {
      throw new Error(`Cannot escalate alarm from ${this._severity.value} to ${newSeverity.value} (must be higher severity).`);
    }

    const previous = this._severity.value;
    this._severity = newSeverity;
    this._updatedAt = new Date();

    this.addDomainEvent(new AlarmEscalated(this.id.toString(), previous, newSeverity.value));
  }

  private getSeverityLevel(severity: Severity): number {
    switch (severity.value) {
      case "INFO": return 0;
      case "WARNING": return 1;
      case "CRITICAL": return 2;
    }
  }
}
