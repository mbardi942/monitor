import { describe, it, expect, beforeEach, vi } from "vitest";
import { Report } from "../domain/model/report/report.js";
import { ReportId } from "../domain/model/report/report-id.js";
import { ReportPeriod } from "../domain/model/report/report-period.js";
import { ReportContent } from "../domain/model/report/report-content.js";
import { ReportStatus } from "../domain/model/report/report-status.js";
import { ReportTemplate, ReportTemplateId } from "../domain/model/report-template/report-template.js";
import { TemplateLayout } from "../domain/model/report-template/template-layout.js";
import { ReportRepository } from "../domain/ports/report-repository.js";
import { CheckDataReader, MonitorMetrics } from "../domain/ports/check-data-reader.js";
import { ReportAggregationService } from "../domain/services/report-aggregation-service.js";
import { GenerateReportUseCase } from "../application/use-cases/generate-report.js";
import { EditReportUseCase } from "../application/use-cases/edit-report.js";
import { ConfirmReportUseCase } from "../application/use-cases/confirm-report.js";
import { DomainEventBus } from "@monitor/shared-kernel";

// In-memory mock for report repository
class InMemoryReportRepository implements ReportRepository {
  private readonly items = new Map<string, Report>();

  public async save(report: Report): Promise<void> {
    this.items.set(report.id.toString(), report);
  }

  public async findById(id: ReportId): Promise<Report | null> {
    return this.items.get(id.toString()) || null;
  }

  public async findByDashboardId(dashboardId: string): Promise<Report[]> {
    return Array.from(this.items.values()).filter((r) => r.dashboardId === dashboardId);
  }
}

// In-memory mock for CheckDataReader
class InMemoryCheckDataReader implements CheckDataReader {
  public metrics: MonitorMetrics[] = [];

  public async getMetricsForDashboard(
    dashboardId: string,
    from: Date,
    to: Date
  ): Promise<MonitorMetrics[]> {
    return this.metrics;
  }
}

// Mock for DomainEventBus
class MockEventBus implements DomainEventBus {
  public published: any[] = [];
  public async publish(event: any): Promise<void> {
    this.published.push(event);
  }
  public subscribe(eventType: string, handler: any): void {}
}

describe("Reporting Context Unit Tests", () => {
  let reportRepository: InMemoryReportRepository;
  let checkDataReader: InMemoryCheckDataReader;
  let reportAggregationService: ReportAggregationService;
  let eventBus: MockEventBus;

  beforeEach(() => {
    reportRepository = new InMemoryReportRepository();
    checkDataReader = new InMemoryCheckDataReader();
    reportAggregationService = new ReportAggregationService();
    eventBus = new MockEventBus();
  });

  describe("Report Aggregate Root & Value Objects", () => {
    it("should create a draft report with correct period and content", () => {
      const reportId = ReportId.generate();
      const period = ReportPeriod.create(new Date("2026-06-01T00:00:00Z"), new Date("2026-06-02T00:00:00Z"));
      const content = ReportContent.create([
        {
          monitorId: "monitor-1",
          monitorName: "Monitor Stazione A",
          uptimePercentage: 98.5,
          avgResponseTimeMs: 120,
          totalChecks: 100,
          failedChecks: 2,
          recentExecutions: [
            {
              timestamp: new Date("2026-06-01T12:00:00Z"),
              status: "UP",
              extractedData: { battery: 92, memory: 45 },
            },
          ],
        },
      ]);

      const report = Report.create(reportId, "dashboard-1", period, content);

      expect(report.id.equals(reportId)).toBe(true);
      expect(report.dashboardId).toBe("dashboard-1");
      expect(report.status.isDraft()).toBe(true);
      expect(report.period.from.toISOString()).toBe("2026-06-01T00:00:00.000Z");
      expect(report.period.to.toISOString()).toBe("2026-06-02T00:00:00.000Z");
      expect(report.content.monitors).toHaveLength(1);
      expect(report.content.monitors[0].recentExecutions[0].extractedData).toEqual({ battery: 92, memory: 45 });
    });

    it("should throw error if report period end is equal or prior to start", () => {
      expect(() => {
        ReportPeriod.create(new Date("2026-06-02T00:00:00Z"), new Date("2026-06-01T00:00:00Z"));
      }).toThrow();
    });

    it("should allow editing content and notes only when DRAFT", () => {
      const period = ReportPeriod.create(new Date("2026-06-01T00:00:00Z"), new Date("2026-06-02T00:00:00Z"));
      const content = ReportContent.create([]);
      const report = Report.create(ReportId.generate(), "dashboard-1", period, content);

      const newContent = ReportContent.create([
        {
          monitorId: "monitor-2",
          monitorName: "Monitor Stazione B",
          uptimePercentage: 100,
          avgResponseTimeMs: 80,
          totalChecks: 50,
          failedChecks: 0,
          recentExecutions: [],
        },
      ]);

      report.editContent(newContent, "Note aggiornate.");
      expect(report.content.monitors).toHaveLength(1);
      expect(report.customText).toBe("Note aggiornate.");

      report.confirm();
      expect(report.status.isConfirmed()).toBe(true);

      expect(() => {
        report.editContent(newContent, "Altra modifica.");
      }).toThrow("Cannot edit report: only reports in DRAFT status can be modified.");
    });

    it("should allow transitioning from CONFIRMED to SENT", () => {
      const period = ReportPeriod.create(new Date("2026-06-01T00:00:00Z"), new Date("2026-06-02T00:00:00Z"));
      const report = Report.create(ReportId.generate(), "dashboard-1", period, ReportContent.create([]));

      expect(() => report.markSent()).toThrow(); // not yet confirmed

      report.confirm();
      report.markSent();

      expect(report.status.isSent()).toBe(true);
    });
  });

  describe("ReportAggregationService", () => {
    it("should aggregate monitor metrics correctly", () => {
      const rawMetrics: MonitorMetrics[] = [
        {
          monitorId: "m1",
          monitorName: "M1",
          uptimePercentage: 99.456,
          avgResponseTimeMs: 145.2,
          totalChecks: 1000,
          failedChecks: 5,
          recentExecutions: [
            {
              timestamp: new Date("2026-06-01T15:00:00Z"),
              status: "UP",
              extractedData: { battery: 85 },
            },
          ],
        },
      ];

      const content = reportAggregationService.aggregate(rawMetrics);

      expect(content.monitors[0].uptimePercentage).toBe(99.46); // Rounded to 2 decimals
      expect(content.monitors[0].avgResponseTimeMs).toBe(145); // Rounded to integer
      expect(content.monitors[0].recentExecutions[0].extractedData).toEqual({ battery: 85 });
    });
  });

  describe("Use Cases", () => {
    it("should generate a draft report successfully via GenerateReportUseCase", async () => {
      checkDataReader.metrics = [
        {
          monitorId: "m1",
          monitorName: "M1Name",
          uptimePercentage: 95,
          avgResponseTimeMs: 200,
          totalChecks: 100,
          failedChecks: 5,
          recentExecutions: [{ timestamp: new Date(), status: "UP", extractedData: { delay: 12 } }],
        },
      ];

      const useCase = new GenerateReportUseCase(reportRepository, checkDataReader, reportAggregationService);
      const report = await useCase.execute({
        dashboardId: "dashboard-123",
        from: new Date("2026-06-01T00:00:00Z"),
        to: new Date("2026-06-02T00:00:00Z"),
        customText: "Test report generation",
      });

      expect(report.dashboardId).toBe("dashboard-123");
      expect(report.status.isDraft()).toBe(true);
      expect(report.content.monitors).toHaveLength(1);
      expect(report.content.monitors[0].recentExecutions[0].extractedData).toEqual({ delay: 12 });
      expect(report.customText).toBe("Test report generation");

      const saved = await reportRepository.findById(report.id);
      expect(saved).not.toBeNull();
    });

    it("should edit draft report successfully via EditReportUseCase", async () => {
      const period = ReportPeriod.create(new Date("2026-06-01T00:00:00Z"), new Date("2026-06-02T00:00:00Z"));
      const report = Report.create(
        ReportId.generate(),
        "dashboard-1",
        period,
        ReportContent.create([
          {
            monitorId: "m1",
            monitorName: "M1",
            uptimePercentage: 100,
            avgResponseTimeMs: 50,
            totalChecks: 10,
            failedChecks: 0,
            recentExecutions: [],
          },
          {
            monitorId: "m2",
            monitorName: "M2",
            uptimePercentage: 100,
            avgResponseTimeMs: 60,
            totalChecks: 10,
            failedChecks: 0,
            recentExecutions: [],
          },
        ])
      );
      await reportRepository.save(report);

      const useCase = new EditReportUseCase(reportRepository);
      const updatedReport = await useCase.execute({
        reportId: report.id.toString(),
        customText: "Test edit notes",
        excludeMonitorIds: ["m2"],
      });

      expect(updatedReport.customText).toBe("Test edit notes");
      expect(updatedReport.content.monitors).toHaveLength(1);
      expect(updatedReport.content.monitors[0].monitorId).toBe("m1");
    });

    it("should confirm draft report and publish event via ConfirmReportUseCase", async () => {
      const period = ReportPeriod.create(new Date("2026-06-01T00:00:00Z"), new Date("2026-06-02T00:00:00Z"));
      const report = Report.create(ReportId.generate(), "dashboard-1", period, ReportContent.create([]));
      await reportRepository.save(report);

      const useCase = new ConfirmReportUseCase(reportRepository, eventBus);
      const confirmedReport = await useCase.execute({ reportId: report.id.toString() });

      expect(confirmedReport.status.isConfirmed()).toBe(true);
      expect(eventBus.published).toHaveLength(1);
      expect(eventBus.published[0].eventType).toBe("ReportConfirmed");
      expect(eventBus.published[0].reportId).toBe(report.id.toString());
    });
  });
});
