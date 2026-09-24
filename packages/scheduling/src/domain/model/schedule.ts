import { AggregateRoot, Identifier } from "@monitor/shared-kernel";

export class ScheduleId extends Identifier<string> {
  public static create(value: string): ScheduleId {
    return new ScheduleId(value);
  }

  public static generate(): ScheduleId {
    return new ScheduleId(crypto.randomUUID());
  }
}

export interface ScheduleProps {
  targetId: string;
  targetType: "MONITOR" | "REPORT";
  cron: string | null;
  intervalSeconds: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Schedule extends AggregateRoot<ScheduleId> {
  private _targetId: string;
  private _targetType: "MONITOR" | "REPORT";
  private _cron: string | null;
  private _intervalSeconds: number | null;
  private _isActive: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: ScheduleId,
    props: ScheduleProps
  ) {
    super(id);
    this._targetId = props.targetId;
    this._targetType = props.targetType;
    this._cron = props.cron;
    this._intervalSeconds = props.intervalSeconds;
    this._isActive = props.isActive;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get targetId(): string {
    return this._targetId;
  }

  public get targetType(): "MONITOR" | "REPORT" {
    return this._targetType;
  }

  public get cron(): string | null {
    return this._cron;
  }

  public get intervalSeconds(): number | null {
    return this._intervalSeconds;
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public static create(
    id: ScheduleId,
    targetId: string,
    targetType: "MONITOR" | "REPORT",
    cron: string | null,
    intervalSeconds: number | null
  ): Schedule {
    if (!cron && !intervalSeconds) {
      throw new Error("Either cron or intervalSeconds must be defined");
    }

    const now = new Date();
    return new Schedule(id, {
      targetId,
      targetType,
      cron,
      intervalSeconds,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstitute(
    id: ScheduleId,
    props: ScheduleProps
  ): Schedule {
    return new Schedule(id, props);
  }

  public update(cron: string | null, intervalSeconds: number | null): void {
    if (!cron && !intervalSeconds) {
      throw new Error("Either cron or intervalSeconds must be defined");
    }

    this._cron = cron;
    this._intervalSeconds = intervalSeconds;
    this._updatedAt = new Date();
  }

  public activate(): void {
    if (!this._isActive) {
      this._isActive = true;
      this._updatedAt = new Date();
    }
  }

  public deactivate(): void {
    if (this._isActive) {
      this._isActive = false;
      this._updatedAt = new Date();
    }
  }
}
