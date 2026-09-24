import { hc } from "hono/client";
import {
  DashboardGateway,
  MonitorGateway,
  AlarmGateway,
  ReportGateway,
  RecipientGateway,
  DashboardDTO,
  MonitorDTO,
  AlarmDTO,
  ReportDTO,
  RecipientDTO,
} from '@/core/ports/gateways';

import { AppType } from "@/app/api/[[...route]]/route";

// Client Hono RPC tipizzato (sola lettura) ricavato da AppType.
const client = hc<AppType>("/");

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }
  return res.json() as Promise<T>;
};

export class HttpDashboardGateway implements DashboardGateway {
  async getDashboards(): Promise<DashboardDTO[]> {
    const res = await client.api.dashboards.$get();
    return handleResponse<DashboardDTO[]>(res);
  }
}

export class HttpMonitorGateway implements MonitorGateway {
  async getMonitors(dashboardId: string): Promise<MonitorDTO[]> {
    const res = await client.api.monitors.$get({
      query: { dashboardId },
    });
    return handleResponse<MonitorDTO[]>(res);
  }

  async getMonitor(id: string): Promise<MonitorDTO> {
    const res = await client.api.monitors[":id"].$get({
      param: { id },
    });
    return handleResponse<MonitorDTO>(res);
  }
}

export class HttpAlarmGateway implements AlarmGateway {
  async getAlarms(dashboardId: string): Promise<AlarmDTO[]> {
    const res = await client.api.alarms.$get({
      query: { dashboardId },
    });
    return handleResponse<AlarmDTO[]>(res);
  }
}

export class HttpReportGateway implements ReportGateway {
  async getReports(dashboardId: string): Promise<ReportDTO[]> {
    const res = await client.api.reports.$get({
      query: { dashboardId },
    });
    return handleResponse<ReportDTO[]>(res);
  }
}

export class HttpRecipientGateway implements RecipientGateway {
  async getRecipients(dashboardId: string): Promise<RecipientDTO[]> {
    const res = await client.api.recipients.$get({
      query: { dashboardId },
    });
    return handleResponse<RecipientDTO[]>(res);
  }
}
