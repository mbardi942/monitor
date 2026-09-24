export interface DashboardDTO {
  id: string;
  name: string;
  reportConfig?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardQueryRepository {
  findAll(): Promise<DashboardDTO[]>;
}
