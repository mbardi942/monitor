"use server";

import { revalidatePath } from "next/cache";
import { recipientQueryRepository } from "@/infrastructure/backend-read";
import { addRecipientInputSchema, parseOrThrow } from "@/core/validation/schemas";

export async function addRecipientAction(dashboardId: string, name: string, email?: string, slackWebhook?: string) {
  parseOrThrow(addRecipientInputSchema, { dashboardId, name, email, slackWebhook });

  const listId = await recipientQueryRepository.findOrCreateListIdByDashboardId(dashboardId);
  const result = await recipientQueryRepository.addRecipient(listId, { name, email, slackWebhook });
  revalidatePath("/", "layout");
  return {
    id: result.id,
    recipientListId: result.recipientListId,
    name: result.name,
    email: result.email,
    channels: result.channels,
    createdAt: result.createdAt,
  };
}

export async function deleteRecipientAction(recipientId: string) {
  await recipientQueryRepository.deleteRecipient(recipientId);
  revalidatePath("/", "layout");
}
