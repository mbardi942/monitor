import { Recipient } from "../model/recipient-list.js";
import { RecipientListRepository } from "../ports/recipient-list-repository.js";

export class NotificationRoutingService {
  constructor(private readonly recipientListRepository: RecipientListRepository) {}

  /**
   * Risolve tutti i destinatari associati alle dashboard specificate,
   * de-duplicandoli per evitare invii multipli alla stessa persona.
   */
  public async resolveRecipients(dashboardIds: string[]): Promise<Recipient[]> {
    const recipientsMap = new Map<string, Recipient>();

    for (const dashboardId of dashboardIds) {
      const list = await this.recipientListRepository.findByDashboardId(dashboardId);
      if (list) {
        for (const recipient of list.recipients) {
          // De-duplichiamo usando l'ID o l'email
          const key = recipient.email || recipient.id.toString();
          if (!recipientsMap.has(key)) {
            recipientsMap.set(key, recipient);
          }
        }
      }
    }

    return Array.from(recipientsMap.values());
  }
}
