import type { MonitorQueryRepository, MonitorWithChecksDTO } from "@monitor/monitoring";
import type { AlarmQueryRepository, AlarmDTO } from "@monitor/monitoring";
import type { DashboardQueryRepository, DashboardDTO } from "@monitor/monitoring";
import type { AuthProfileQueryRepository, AuthProfileDTO } from "@monitor/monitoring";
import type { ReportQueryRepository, ReportDTO } from "@monitor/reporting";
import type { RecipientQueryRepository, RecipientDTO, AddRecipientData } from "@monitor/notification";
import { mockStore } from "./mock-data";

export class MockDashboardQueryRepository implements DashboardQueryRepository {
  async findAll(): Promise<DashboardDTO[]> {
    return mockStore.dashboardsList as unknown as DashboardDTO[];
  }
}

export class MockMonitorQueryRepository implements MonitorQueryRepository {
  async findByDashboardId(dashboardId: string): Promise<MonitorWithChecksDTO[]> {
    // Ritorna tutti i monitor (nel mock consideriamo tutti per la dashboard attiva)
    return mockStore.monitorsList as unknown as MonitorWithChecksDTO[];
  }

  async findWithChecksById(monitorId: string): Promise<MonitorWithChecksDTO | null> {
    const monitor = mockStore.monitorsList.find((m) => m.id === monitorId);
    if (!monitor) return null;
    return monitor as unknown as MonitorWithChecksDTO;
  }
}

export class MockAlarmQueryRepository implements AlarmQueryRepository {
  async findByDashboardId(dashboardId: string): Promise<AlarmDTO[]> {
    // Nel mock, gli allarmi sono globali o associati a monitor della dashboard
    return mockStore.alarmsList as unknown as AlarmDTO[];
  }
}

export class MockReportQueryRepository implements ReportQueryRepository {
  async findByDashboardId(dashboardId: string): Promise<ReportDTO[]> {
    return mockStore.reportsList.filter((r) => r.dashboardId === dashboardId) as unknown as ReportDTO[];
  }
}

export class MockRecipientQueryRepository implements RecipientQueryRepository {
  async findByDashboardId(dashboardId: string): Promise<RecipientDTO[]> {
    return mockStore.recipientsList.filter((r) => r.recipientListId === dashboardId) as unknown as RecipientDTO[];
  }

  async findOrCreateListIdByDashboardId(dashboardId: string): Promise<string> {
    // Usiamo dashboardId come listId direttamente nel mock
    return dashboardId;
  }

  async addRecipient(listId: string, data: AddRecipientData): Promise<RecipientDTO> {
    const channels: any[] = [];
    if (data.email) {
      channels.push({ type: "EMAIL", config: { email: data.email } });
    }
    if (data.slackWebhook) {
      channels.push({ type: "SLACK", config: { webhookUrl: data.slackWebhook } });
    }

    const newRec: RecipientDTO = {
      id: `rec-${Math.random().toString(36).substring(2, 9)}`,
      recipientListId: listId,
      name: data.name,
      email: data.email,
      channels,
      createdAt: new Date().toISOString(),
    };
    mockStore.recipientsList.push(newRec as any);
    return newRec;
  }

  async deleteRecipient(recipientId: string): Promise<void> {
    mockStore.recipientsList = mockStore.recipientsList.filter((r) => r.id !== recipientId);
  }
}

export class MockAuthProfileQueryRepository implements AuthProfileQueryRepository {
  async findByDashboardId(dashboardId: string): Promise<AuthProfileDTO[]> {
    return (mockStore.authProfilesList || []).filter(
      (p: any) => p.dashboardId === dashboardId
    ) as AuthProfileDTO[];
  }

  async findById(id: string): Promise<AuthProfileDTO | null> {
    const profile = (mockStore.authProfilesList || []).find((p: any) => p.id === id);
    if (!profile) return null;
    return profile as AuthProfileDTO;
  }
}

