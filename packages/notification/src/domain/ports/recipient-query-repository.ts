export interface RecipientDTO {
  id: string;
  recipientListId: string;
  name: string;
  email?: string;
  channels: any[];
  createdAt: string;
}

export interface AddRecipientData {
  name: string;
  email?: string;
  slackWebhook?: string;
}

export interface RecipientQueryRepository {
  findByDashboardId(dashboardId: string): Promise<RecipientDTO[]>;
  findOrCreateListIdByDashboardId(dashboardId: string): Promise<string>;
  addRecipient(listId: string, data: AddRecipientData): Promise<RecipientDTO>;
  deleteRecipient(recipientId: string): Promise<void>;
}
