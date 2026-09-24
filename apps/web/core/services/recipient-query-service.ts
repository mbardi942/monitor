import "server-only";
import { recipientQueryRepository } from "@/infrastructure/backend-read";
import { RecipientDTO } from "@/core/ports/gateways";

export function mapToRecipientDTO(item: any): RecipientDTO {
  return {
    id: item.id,
    recipientListId: item.recipientListId,
    name: item.name,
    email: item.email,
    channels: item.channels || [],
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
  };
}

export async function getRecipientsForDashboard(dashboardId: string): Promise<RecipientDTO[]> {
  const recipients = await recipientQueryRepository.findByDashboardId(dashboardId);
  return recipients.map(mapToRecipientDTO);
}
