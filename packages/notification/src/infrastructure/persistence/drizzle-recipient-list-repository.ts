import { eq, inArray, notInArray } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { RecipientListRepository } from "../../domain/ports/recipient-list-repository.js";
import { RecipientList, RecipientListId, RecipientId, Recipient, NotificationChannel } from "../../domain/model/recipient-list.js";
import { recipientLists, recipients } from "@monitor/db";

export class DrizzleRecipientListRepository implements RecipientListRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  public async findByDashboardId(dashboardId: string): Promise<RecipientList | null> {
    const listsResult = await this.db
      .select()
      .from(recipientLists)
      .where(eq(recipientLists.dashboardId, dashboardId));

    if (listsResult.length === 0) {
      return null;
    }

    const row = listsResult[0];
    return this.reconstituteList(row);
  }

  public async findById(id: string): Promise<RecipientList | null> {
    const listsResult = await this.db
      .select()
      .from(recipientLists)
      .where(eq(recipientLists.id, id));

    if (listsResult.length === 0) {
      return null;
    }

    const row = listsResult[0];
    return this.reconstituteList(row);
  }

  public async save(list: RecipientList): Promise<void> {
    const listId = list.id.toString();

    // 1. Salva la lista principale
    await this.db
      .insert(recipientLists)
      .values({
        id: listId,
        name: list.name,
        dashboardId: list.dashboardId,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      })
      .onConflictDoUpdate({
        target: recipientLists.id,
        set: {
          name: list.name,
          updatedAt: list.updatedAt,
        },
      });

    // 2. Rimuovi i destinatari rimossi (non presenti nell'aggregato)
    const recipientIds = list.recipients.map((r) => r.id.toString());
    if (recipientIds.length > 0) {
      await this.db
        .delete(recipients)
        .where(
          and(
            eq(recipients.recipientListId, listId),
            notInArray(recipients.id, recipientIds)
          )
        );
    } else {
      await this.db
        .delete(recipients)
        .where(eq(recipients.recipientListId, listId));
    }

    // 3. Salva i destinatari correnti
    for (const recipient of list.recipients) {
      const channelsVal = recipient.channels.map((c) => c.toValue());

      await this.db
        .insert(recipients)
        .values({
          id: recipient.id.toString(),
          recipientListId: listId,
          name: recipient.name,
          email: recipient.email,
          channels: channelsVal,
          createdAt: recipient.createdAt,
          updatedAt: recipient.updatedAt,
        })
        .onConflictDoUpdate({
          target: recipients.id,
          set: {
            name: recipient.name,
            email: recipient.email,
            channels: channelsVal,
            updatedAt: recipient.updatedAt,
          },
        });
    }
  }

  private async reconstituteList(row: any): Promise<RecipientList> {
    const recipientsRows = await this.db
      .select()
      .from(recipients)
      .where(eq(recipients.recipientListId, row.id));

    const domainRecipients = recipientsRows.map((rRow) => {
      const channelsRaw = (rRow.channels as any[]) || [];
      const domainChannels = channelsRaw.map((c: any) =>
        NotificationChannel.create({
          type: c.type,
          config: c.config || {},
        })
      );

      return Recipient.reconstitute(RecipientId.create(rRow.id), {
        name: rRow.name,
        email: rRow.email,
        channels: domainChannels,
        createdAt: rRow.createdAt,
        updatedAt: rRow.updatedAt,
      });
    });

    return RecipientList.reconstitute(RecipientListId.create(row.id), {
      name: row.name,
      dashboardId: row.dashboardId,
      recipients: domainRecipients,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

// Helper per supportare "and" in Drizzle se non importato
import { and } from "drizzle-orm";
