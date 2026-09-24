import { AggregateRoot, Entity, Identifier } from "@monitor/shared-kernel";

export class NotificationId extends Identifier<string> {
  public static create(value: string): NotificationId {
    return new NotificationId(value);
  }

  public static generate(): NotificationId {
    return new NotificationId(crypto.randomUUID());
  }
}

export class DeliveryAttemptId extends Identifier<string> {
  public static create(value: string): DeliveryAttemptId {
    return new DeliveryAttemptId(value);
  }

  public static generate(): DeliveryAttemptId {
    return new DeliveryAttemptId(crypto.randomUUID());
  }
}

export interface DeliveryAttemptProps {
  recipientId: string;
  channel: "EMAIL" | "SLACK" | "WEBHOOK";
  status: "PENDING" | "SENT" | "FAILED";
  error: string | null;
  attemptedAt: Date;
}

export class DeliveryAttempt extends Entity<DeliveryAttemptId> {
  private _recipientId: string;
  private _channel: "EMAIL" | "SLACK" | "WEBHOOK";
  private _status: "PENDING" | "SENT" | "FAILED";
  private _error: string | null;
  private _attemptedAt: Date;

  constructor(id: DeliveryAttemptId, props: DeliveryAttemptProps) {
    super(id);
    this._recipientId = props.recipientId;
    this._channel = props.channel;
    this._status = props.status;
    this._error = props.error;
    this._attemptedAt = props.attemptedAt;
  }

  public get recipientId(): string {
    return this._recipientId;
  }

  public get channel(): "EMAIL" | "SLACK" | "WEBHOOK" {
    return this._channel;
  }

  public get status(): "PENDING" | "SENT" | "FAILED" {
    return this._status;
  }

  public get error(): string | null {
    return this._error;
  }

  public get attemptedAt(): Date {
    return this._attemptedAt;
  }

  public static create(
    recipientId: string,
    channel: "EMAIL" | "SLACK" | "WEBHOOK",
    status: "PENDING" | "SENT" | "FAILED",
    error: string | null = null
  ): DeliveryAttempt {
    return new DeliveryAttempt(DeliveryAttemptId.generate(), {
      recipientId,
      channel,
      status,
      error,
      attemptedAt: new Date(),
    });
  }

  public static reconstitute(id: DeliveryAttemptId, props: DeliveryAttemptProps): DeliveryAttempt {
    return new DeliveryAttempt(id, props);
  }
}

export interface NotificationProps {
  type: string;
  sourceId: string;
  title: string;
  payload: Record<string, any>;
  attempts: DeliveryAttempt[];
  createdAt: Date;
}

export class Notification extends AggregateRoot<NotificationId> {
  private _type: string;
  private _sourceId: string;
  private _title: string;
  private _payload: Record<string, any>;
  private _attempts: DeliveryAttempt[];
  private _createdAt: Date;

  private constructor(id: NotificationId, props: NotificationProps) {
    super(id);
    this._type = props.type;
    this._sourceId = props.sourceId;
    this._title = props.title;
    this._payload = props.payload;
    this._attempts = props.attempts;
    this._createdAt = props.createdAt;
  }

  public get type(): string {
    return this._type;
  }

  public get sourceId(): string {
    return this._sourceId;
  }

  public get title(): string {
    return this._title;
  }

  public get payload(): Record<string, any> {
    return { ...this._payload };
  }

  public get attempts(): DeliveryAttempt[] {
    return [...this._attempts];
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public static create(
    id: NotificationId,
    type: string,
    sourceId: string,
    title: string,
    payload: Record<string, any>
  ): Notification {
    return new Notification(id, {
      type,
      sourceId,
      title,
      payload,
      attempts: [],
      createdAt: new Date(),
    });
  }

  public static reconstitute(id: NotificationId, props: NotificationProps): Notification {
    return new Notification(id, props);
  }

  public addAttempt(attempt: DeliveryAttempt): void {
    this._attempts.push(attempt);
  }
}
