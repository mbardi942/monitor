import { RecipientList } from "../model/recipient-list.js";

export interface RecipientListRepository {
  save(list: RecipientList): Promise<void>;
  findByDashboardId(dashboardId: string): Promise<RecipientList | null>;
  findById(id: string): Promise<RecipientList | null>;
}
