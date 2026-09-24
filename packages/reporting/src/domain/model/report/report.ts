import { AggregateRoot } from "@monitor/shared-kernel";
import { ReportId } from "./report-id.js";
import { ReportStatus } from "./report-status.js";
import { ReportPeriod } from "./report-period.js";
import { ReportContent } from "./report-content.js";
import { ReportConfirmed } from "../../events/report-confirmed.js";

export interface ReportProps {
  dashboardId: string;
  status: ReportStatus;
  period: ReportPeriod;
  content: ReportContent;
  customText: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Report extends AggregateRoot<ReportId> {
  private _dashboardId: string;
  private _status: ReportStatus;
  private _period: ReportPeriod;
  private _content: ReportContent;
  private _customText: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(id: ReportId, props: ReportProps) {
    super(id);
    this._dashboardId = props.dashboardId;
    this._status = props.status;
    this._period = props.period;
    this._content = props.content;
    this._customText = props.customText;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // Getters
  public get dashboardId(): string {
    return this._dashboardId;
  }

  public get status(): ReportStatus {
    return this._status;
  }

  public get period(): ReportPeriod {
    return this._period;
  }

  public get content(): ReportContent {
    return this._content;
  }

  public get customText(): string | null {
    return this._customText;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Factory method per creare un nuovo Report in stato DRAFT
   */
  public static create(
    id: ReportId,
    dashboardId: string,
    period: ReportPeriod,
    content: ReportContent,
    customText: string | null = null
  ): Report {
    const now = new Date();
    return new Report(id, {
      dashboardId,
      status: ReportStatus.draft(),
      period,
      content,
      customText,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Ricostituisce l'aggregato dalla persistenza
   */
  public static reconstitute(id: ReportId, props: ReportProps): Report {
    return new Report(id, props);
  }

  /**
   * Modifica il contenuto e le note del report (consentito solo in DRAFT)
   */
  public editContent(newContent: ReportContent, customText: string | null): void {
    if (!this._status.isDraft()) {
      throw new Error("Cannot edit report: only reports in DRAFT status can be modified.");
    }
    this._content = newContent;
    this._customText = customText;
    this._updatedAt = new Date();
  }

  /**
   * Conferma il report (transizione DRAFT -> CONFIRMED) ed emette l'evento ReportConfirmed
   */
  public confirm(): void {
    if (!this._status.isDraft()) {
      throw new Error("Cannot confirm report: only reports in DRAFT status can be confirmed.");
    }
    this._status = ReportStatus.confirmed();
    this._updatedAt = new Date();

    this.addDomainEvent(
      new ReportConfirmed(
        this.id.toString(),
        this._dashboardId,
        this._content.toValue(),
        this._customText,
        this._period.from,
        this._period.to
      )
    );
  }

  /**
   * Segna il report come spedito (transizione CONFIRMED -> SENT)
   */
  public markSent(): void {
    if (!this._status.isConfirmed()) {
      throw new Error("Cannot mark report as sent: only CONFIRMED reports can be marked as sent.");
    }
    this._status = ReportStatus.sent();
    this._updatedAt = new Date();
  }
}
