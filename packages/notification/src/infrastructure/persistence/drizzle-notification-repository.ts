import { eq } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { NotificationRepository } from "../../domain/ports/notification-repository.js";
import { Notification, NotificationId, DeliveryAttempt, DeliveryAttemptId } from "../../domain/model/notification.js";
import { notifications, deliveryAttempts } from "@monitor/db";

export class DrizzleNotificationRepository implements NotificationRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  public async findById(id: string): Promise<Notification | null> {
    const notifResult = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));

    if (notifResult.length === 0) {
      return null;
    }

    const row = notifResult[0];

    const attemptsResult = await this.db
      .select()
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.notificationId, row.id));

    const domainAttempts = attemptsResult.map((aRow) =>
      DeliveryAttempt.reconstitute(DeliveryAttemptId.create(aRow.id), {
        recipientId: aRow.recipientId,
        channel: aRow.channel as "EMAIL" | "SLACK" | "WEBHOOK",
        status: aRow.status as "PENDING" | "SENT" | "FAILED",
        error: aRow.error,
        attemptedAt: aRow.attemptedAt,
      })
    );

    return Notification.reconstitute(NotificationId.create(row.id), {
      type: row.type,
      sourceId: row.sourceId,
      title: row.title,
      payload: row.payload as Record<string, any>,
      attempts: domainAttempts,
      createdAt: row.createdAt,
    });
  }

  public async save(notification: Notification): Promise<void> {
    const notifId = notification.id.toString();

    // 1. Salva la notifica principale
    await this.db
      .insert(notifications)
      .values({
        id: notifId,
        type: notification.type,
        sourceId: notification.sourceId,
        title: notification.title,
        payload: notification.payload,
        createdAt: notification.createdAt,
      })
      .onConflictDoNothing(); // La notifica in sé non cambia una volta creata, ma per sicurezza

    // 2. Salva i tentativi di invio associati
    for (const attempt of notification.attempts) {
      await this.db
        .insert(deliveryAttempts)
        .values({
          id: attempt.id.toString(),
          notificationId: notifId,
          recipientId: attempt.recipientId,
          channel: attempt.channel,
          status: attempt.status,
          error: attempt.error,
          attemptedAt: attempt.attemptedAt,
        })
        .onConflictDoUpdate({
          target: deliveryAttempts.id,
          set: {
            status: attempt.status,
            error: attempt.error,
          },
        });
    }
  }
}
