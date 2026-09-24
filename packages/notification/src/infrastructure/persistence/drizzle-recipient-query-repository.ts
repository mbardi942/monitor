import { eq } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";
import { RecipientQueryRepository, RecipientDTO, AddRecipientData } from "../../domain/ports/recipient-query-repository.js";
import { recipients, recipientLists } from "@monitor/db";

export class DrizzleRecipientQueryRepository implements RecipientQueryRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  public async findOrCreateListIdByDashboardId(dashboardId: string): Promise<string> {
    const list = await this.db
      .select()
      .from(recipientLists)
      .where(eq(recipientLists.dashboardId, dashboardId))
      .limit(1);

    if (list.length === 0) {
      const generatedId = randomUUID();
      const [inserted] = await this.db
        .insert(recipientLists)
        .values({
          id: generatedId,
          name: `Destinatari Dashboard`,
          dashboardId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return inserted.id;
    }
    return list[0].id;
  }

  public async findByDashboardId(dashboardId: string): Promise<RecipientDTO[]> {
    const listId = await this.findOrCreateListIdByDashboardId(dashboardId);
    
    const recs = await this.db
      .select()
      .from(recipients)
      .where(eq(recipients.recipientListId, listId));

    return recs.map((r: any) => ({
      id: r.id,
      recipientListId: r.recipientListId,
      name: r.name,
      email: r.email || undefined,
      channels: (r.channels as any[]) || [],
      createdAt: r.createdAt.toISOString(),
    }));
  }

  public async addRecipient(listId: string, data: AddRecipientData): Promise<RecipientDTO> {
    const channels: any[] = [];
    if (data.email) {
      channels.push({ type: "EMAIL", config: { email: data.email } });
    }
    if (data.slackWebhook) {
      channels.push({ type: "SLACK", config: { webhookUrl: data.slackWebhook } });
    }

    const [inserted] = await this.db
      .insert(recipients)
      .values({
        id: randomUUID(),
        recipientListId: listId,
        name: data.name,
        email: data.email || null,
        channels,
      })
      .returning();

    return {
      id: inserted.id,
      recipientListId: inserted.recipientListId,
      name: inserted.name,
      email: inserted.email || undefined,
      channels: (inserted.channels as any[]) || [],
      createdAt: inserted.createdAt.toISOString(),
    };
  }

  public async deleteRecipient(recipientId: string): Promise<void> {
    await this.db.delete(recipients).where(eq(recipients.id, recipientId));
  }
}
