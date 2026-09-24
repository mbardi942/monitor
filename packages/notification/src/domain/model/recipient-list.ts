import { AggregateRoot, Entity, Identifier, ValueObject } from "@monitor/shared-kernel";

export class RecipientListId extends Identifier<string> {
  public static create(value: string): RecipientListId {
    return new RecipientListId(value);
  }

  public static generate(): RecipientListId {
    return new RecipientListId(crypto.randomUUID());
  }
}

export class RecipientId extends Identifier<string> {
  public static create(value: string): RecipientId {
    return new RecipientId(value);
  }

  public static generate(): RecipientId {
    return new RecipientId(crypto.randomUUID());
  }
}

export interface NotificationChannelProps {
  type: "EMAIL" | "SLACK" | "WEBHOOK";
  config: Record<string, any>;
}

export class NotificationChannel extends ValueObject<NotificationChannelProps> {
  public get type(): "EMAIL" | "SLACK" | "WEBHOOK" {
    return this.props.type;
  }

  public get config(): Record<string, any> {
    return { ...this.props.config };
  }

  public static create(props: NotificationChannelProps): NotificationChannel {
    if (!props.type) {
      throw new Error("Channel type is required");
    }
    return new NotificationChannel(props);
  }
}

export interface RecipientProps {
  name: string;
  email: string | null;
  channels: NotificationChannel[];
  createdAt: Date;
  updatedAt: Date;
}

export class Recipient extends Entity<RecipientId> {
  private _name: string;
  private _email: string | null;
  private _channels: NotificationChannel[];
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(id: RecipientId, props: RecipientProps) {
    super(id);
    this._name = props.name;
    this._email = props.email;
    this._channels = props.channels;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get name(): string {
    return this._name;
  }

  public get email(): string | null {
    return this._email;
  }

  public get channels(): NotificationChannel[] {
    return [...this._channels];
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public static create(
    id: RecipientId,
    name: string,
    email: string | null,
    channels: NotificationChannel[]
  ): Recipient {
    const now = new Date();
    return new Recipient(id, {
      name,
      email,
      channels,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstitute(id: RecipientId, props: RecipientProps): Recipient {
    return new Recipient(id, props);
  }

  public update(name: string, email: string | null, channels: NotificationChannel[]): void {
    this._name = name;
    this._email = email;
    this._channels = channels;
    this._updatedAt = new Date();
  }
}

export interface RecipientListProps {
  name: string;
  dashboardId: string;
  recipients: Recipient[];
  createdAt: Date;
  updatedAt: Date;
}

export class RecipientList extends AggregateRoot<RecipientListId> {
  private _name: string;
  private _dashboardId: string;
  private _recipients: Recipient[];
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(id: RecipientListId, props: RecipientListProps) {
    super(id);
    this._name = props.name;
    this._dashboardId = props.dashboardId;
    this._recipients = props.recipients;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get name(): string {
    return this._name;
  }

  public get dashboardId(): string {
    return this._dashboardId;
  }

  public get recipients(): Recipient[] {
    return [...this._recipients];
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public static create(
    id: RecipientListId,
    name: string,
    dashboardId: string,
    recipients: Recipient[] = []
  ): RecipientList {
    const now = new Date();
    return new RecipientList(id, {
      name,
      dashboardId,
      recipients,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstitute(id: RecipientListId, props: RecipientListProps): RecipientList {
    return new RecipientList(id, props);
  }

  public addRecipient(recipient: Recipient): void {
    const exists = this._recipients.some((r) => r.id.equals(recipient.id));
    if (exists) {
      throw new Error(`Recipient with ID ${recipient.id.toString()} already exists in this list`);
    }
    this._recipients.push(recipient);
    this._updatedAt = new Date();
  }

  public removeRecipient(recipientId: string): void {
    const index = this._recipients.findIndex((r) => r.id.toString() === recipientId);
    if (index === -1) {
      return;
    }
    this._recipients.splice(index, 1);
    this._updatedAt = new Date();
  }

  public updateRecipient(recipientId: string, name: string, email: string | null, channels: NotificationChannel[]): void {
    const recipient = this._recipients.find((r) => r.id.toString() === recipientId);
    if (!recipient) {
      throw new Error(`Recipient with ID ${recipientId} not found in this list`);
    }
    recipient.update(name, email, channels);
    this._updatedAt = new Date();
  }
}
