import { AggregateRoot, Identifier } from "@monitor/shared-kernel";
import { TemplateLayout } from "./template-layout.js";

export class ReportTemplateId extends Identifier<string> {
  public static create(value: string): ReportTemplateId {
    return new ReportTemplateId(value);
  }

  public static generate(): ReportTemplateId {
    return new ReportTemplateId(crypto.randomUUID());
  }
}

export interface ReportTemplateProps {
  name: string;
  layout: TemplateLayout;
  createdAt: Date;
  updatedAt: Date;
}

export class ReportTemplate extends AggregateRoot<ReportTemplateId> {
  private _name: string;
  private _layout: TemplateLayout;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(id: ReportTemplateId, props: ReportTemplateProps) {
    super(id);
    this._name = props.name;
    this._layout = props.layout;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // Getters
  public get name(): string {
    return this._name;
  }

  public get layout(): TemplateLayout {
    return this._layout;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public static create(id: ReportTemplateId, name: string, layout: TemplateLayout): ReportTemplate {
    if (!name) {
      throw new Error("Report template name is required.");
    }
    const now = new Date();
    return new ReportTemplate(id, {
      name,
      layout,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstitute(id: ReportTemplateId, props: ReportTemplateProps): ReportTemplate {
    return new ReportTemplate(id, props);
  }

  public update(name: string, layout: TemplateLayout): void {
    if (!name) {
      throw new Error("Report template name is required.");
    }
    this._name = name;
    this._layout = layout;
    this._updatedAt = new Date();
  }
}
