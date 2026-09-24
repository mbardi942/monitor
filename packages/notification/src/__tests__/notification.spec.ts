import { describe, it, expect, beforeEach } from "vitest";
import { RecipientList, RecipientListId, RecipientId, Recipient, NotificationChannel } from "../domain/model/recipient-list.js";
import { Notification, DeliveryAttemptId, DeliveryAttempt } from "../domain/model/notification.js";
import { NotificationRoutingService } from "../domain/services/notification-routing-service.js";
import { DeliverNotificationUseCase } from "../application/use-cases/deliver-notification.js";
import { AlarmConfirmedTranslator } from "../infrastructure/acl/alarm-confirmed-translator.js";
import { AlarmResolvedTranslator } from "../infrastructure/acl/alarm-resolved-translator.js";
import { RecipientListRepository } from "../domain/ports/recipient-list-repository.js";
import { NotificationRepository } from "../domain/ports/notification-repository.js";
import { EmailSender, SlackSender } from "../domain/ports/notification-sender.js";
import { AlarmConfirmed, AlarmResolved } from "@monitor/monitoring";
import { DomainEventBus } from "@monitor/shared-kernel";

class MockEventBus implements DomainEventBus {
  public published: any[] = [];
  public async publish(event: any): Promise<void> {
    this.published.push(event);
  }
  public subscribe(eventType: string, handler: any): void {}
}

// Mock Repositories
class InMemoryRecipientListRepository implements RecipientListRepository {
  private readonly items = new Map<string, RecipientList>();

  public async save(list: RecipientList): Promise<void> {
    this.items.set(list.dashboardId, list);
  }

  public async findByDashboardId(dashboardId: string): Promise<RecipientList | null> {
    return this.items.get(dashboardId) || null;
  }

  public async findById(id: string): Promise<RecipientList | null> {
    for (const list of this.items.values()) {
      if (list.id.toString() === id) return list;
    }
    return null;
  }
}

class InMemoryNotificationRepository implements NotificationRepository {
  public readonly notifications = new Map<string, Notification>();

  public async save(notification: Notification): Promise<void> {
    this.notifications.set(notification.id.toString(), notification);
  }

  public async findById(id: string): Promise<Notification | null> {
    return this.notifications.get(id) || null;
  }
}

// Mock Senders
class MockEmailSender implements EmailSender {
  public sent: Array<{ to: string; subject: string; htmlContent: string }> = [];

  public async send(to: string, subject: string, htmlContent: string): Promise<void> {
    this.sent.push({ to, subject, htmlContent });
  }
}

class MockSlackSender implements SlackSender {
  public sent: Array<{ webhookUrl: string; message: string }> = [];

  public async send(webhookUrl: string, message: string): Promise<void> {
    this.sent.push({ webhookUrl, message });
  }
}

describe("Notification Context Unit Tests", () => {
  let recipientListRepo: InMemoryRecipientListRepository;
  let notificationRepo: InMemoryNotificationRepository;
  let emailSender: MockEmailSender;
  let slackSender: MockSlackSender;
  let routingService: NotificationRoutingService;
  let eventBus: MockEventBus;
  let useCase: DeliverNotificationUseCase;

  beforeEach(() => {
    recipientListRepo = new InMemoryRecipientListRepository();
    notificationRepo = new InMemoryNotificationRepository();
    emailSender = new MockEmailSender();
    slackSender = new MockSlackSender();
    routingService = new NotificationRoutingService(recipientListRepo);
    eventBus = new MockEventBus();
    useCase = new DeliverNotificationUseCase(
      routingService,
      notificationRepo,
      emailSender,
      slackSender,
      eventBus
    );
  });

  describe("RecipientList and Recipient Domain", () => {
    it("should create a RecipientList and add/remove recipients", () => {
      const listId = RecipientListId.generate();
      const list = RecipientList.create(listId, "Team Dev", "dashboard-1");

      const channel = NotificationChannel.create({ type: "EMAIL", config: {} });
      const recipient = Recipient.create(RecipientId.create("rec-1"), "Mario Rossi", "mario@example.com", [channel]);

      list.addRecipient(recipient);
      expect(list.recipients.length).toBe(1);
      expect(list.recipients[0].name).toBe("Mario Rossi");

      list.removeRecipient("rec-1");
      expect(list.recipients.length).toBe(0);
    });
  });

  describe("Notification Routing Service", () => {
    it("should resolve and de-duplicate recipients across multiple dashboards", async () => {
      const emailChannel = NotificationChannel.create({ type: "EMAIL", config: {} });
      const mario = Recipient.create(RecipientId.create("rec-1"), "Mario Rossi", "mario@example.com", [emailChannel]);
      const luigi = Recipient.create(RecipientId.create("rec-2"), "Luigi Verdi", "luigi@example.com", [emailChannel]);

      const list1 = RecipientList.create(RecipientListId.generate(), "List 1", "dashboard-1", [mario, luigi]);
      const list2 = RecipientList.create(RecipientListId.generate(), "List 2", "dashboard-2", [mario]);

      await recipientListRepo.save(list1);
      await recipientListRepo.save(list2);

      // Risolviamo per dashboard-1 e dashboard-2
      const resolved = await routingService.resolveRecipients(["dashboard-1", "dashboard-2"]);

      // Mario Rossi deve apparire una sola volta (de-duplicato)
      expect(resolved.length).toBe(2);
      const names = resolved.map((r) => r.name);
      expect(names).toContain("Mario Rossi");
      expect(names).toContain("Luigi Verdi");
    });
  });

  describe("ACL Translators", () => {
    it("should translate AlarmConfirmed event into NotificationRequest", () => {
      const event = new AlarmConfirmed(
        "alarm-1",
        "monitor-1",
        "Prod database",
        "CRITICAL",
        ["dashboard-1"],
        new Date(),
        { error: "Connection Timeout" }
      );

      const request = AlarmConfirmedTranslator.translate(event);

      expect(request.type).toBe("ALARM");
      expect(request.sourceId).toBe("alarm-1");
      expect(request.dashboardIds).toContain("dashboard-1");
      expect(request.payload.monitorName).toBe("Prod database");
      expect(request.payload.extractedDataSummary.error).toBe("Connection Timeout");
    });

    it("should translate AlarmResolved event into NotificationRequest", () => {
      const event = new AlarmResolved(
        "alarm-1",
        "monitor-1",
        "Prod database",
        120000, // 2 minuti
        true,
        true
      );

      const request = AlarmResolvedTranslator.translate(event, ["dashboard-1"]);

      expect(request.type).toBe("RECOVERY");
      expect(request.sourceId).toBe("alarm-1");
      expect(request.dashboardIds).toContain("dashboard-1");
      expect(request.payload.durationText).toBe("2 min");
      expect(request.payload.monitorName).toBe("Prod database");
    });
  });

  describe("DeliverNotificationUseCase", () => {
    it("should send notifications via correct channels and save notification with attempts", async () => {
      const emailChannel = NotificationChannel.create({ type: "EMAIL", config: {} });
      const slackChannel = NotificationChannel.create({
        type: "SLACK",
        config: { webhookUrl: "https://hooks.slack.com/services/123" },
      });

      const mario = Recipient.create(RecipientId.create("rec-1"), "Mario Rossi", "mario@example.com", [emailChannel, slackChannel]);
      const list = RecipientList.create(RecipientListId.generate(), "List", "dashboard-1", [mario]);
      await recipientListRepo.save(list);

      const request = {
        type: "ALARM",
        sourceId: "alarm-1",
        title: "ALLARME CONFERMATO: Il monitor Prod database è DOWN!",
        dashboardIds: ["dashboard-1"],
        payload: {
          alarmId: "alarm-1",
          monitorId: "monitor-1",
          monitorName: "Prod database",
          severity: "CRITICAL",
          occurredAt: new Date(),
        },
      };

      const notification = await useCase.execute(request);

      expect(notification).not.toBeNull();
      expect(notification.attempts.length).toBe(2);

      // Controlla che gli invii sui canali siano avvenuti
      expect(emailSender.sent.length).toBe(1);
      expect(emailSender.sent[0].to).toBe("mario@example.com");
      expect(emailSender.sent[0].subject).toBe(request.title);

      expect(slackSender.sent.length).toBe(1);
      expect(slackSender.sent[0].webhookUrl).toBe("https://hooks.slack.com/services/123");
      expect(slackSender.sent[0].message).toContain("Prod database");

      // Controlla che i tentativi siano registrati come SENT
      expect(notification.attempts[0].status).toBe("SENT");
      expect(notification.attempts[1].status).toBe("SENT");

      const saved = await notificationRepo.findById(notification.id.toString());
      expect(saved).not.toBeNull();
      expect(saved?.attempts.length).toBe(2);
    });
  });
});
