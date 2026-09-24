export interface DashboardDTO {
  id: string;
  name: string;
  reportConfig?: any;
  createdAt: string;
  updatedAt: string;
}

export interface FlatHttpProbeConfig {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  authProfileId?: string;
  body?: string;
  timeoutMs?: number;
}

export interface FlatPingProbeConfig {
  host?: string;
  port?: number;
  timeoutMs?: number;
}

export interface FlatHostProbeConfig {
  url?: string;
  token?: string;
  timeoutMs?: number;
}

export interface FlatHeartbeatProbeConfig {
  heartbeatToken?: string;
  expectedIntervalSeconds?: number;
  gracePeriodSeconds?: number;
  lastPingAt?: string;
}

export type FlatProbeConfiguration = FlatHttpProbeConfig &
  FlatPingProbeConfig &
  FlatHostProbeConfig &
  FlatHeartbeatProbeConfig;


export interface MonitorSchedule {
  intervalSeconds: number;
}

export interface AssertionRule {
  target: 'STATUS_CODE' | 'RESPONSE_TIME' | 'JSON_BODY' | 'TEXT_BODY';
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'LESS_THAN' | 'GREATER_THAN';
  value: string;
  property?: string;
}

export interface MetricRule {
  property: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'LESS_THAN' | 'GREATER_THAN' | 'CUSTOM_SCRIPT';
  value: string;
  script?: string;
  aggregation?: string;
}

export interface AlarmPolicy {
  consecutiveFailures: number;
}

export interface DataExtractor {
  displayHint: 'SINGLE_VALUE' | 'KEY_VALUE_PAIRS' | 'SERIES' | 'STATUS_BADGE' | 'KEY_VALUE_LIST' | 'TABLE' | 'SPARKLINE';
  maxRows?: number;
  pageSize?: number;
  retainHistory?: boolean;
  schema: {
    type: 'SINGLE_VALUE' | 'KEY_VALUE_PAIRS' | 'SERIES' | 'TABLE';
    label?: string;
    unit?: string;
    format?: string;
    decimalPlaces?: number;
    valuePath?: string;
    dataPath?: string;
    pairs?: { label: string; valuePath: string; format?: string; decimalPlaces?: number }[];
    columns?: { label: string; valuePath: string; format?: string; decimalPlaces?: number }[];
  };
}

export interface MonitorDTO {
  id: string;
  name: string;
  type: 'HTTP' | 'PING' | 'HOST' | 'HEARTBEAT';
  status: 'UP' | 'DOWN' | 'DEGRADED' | 'PAUSED';

  dataHealthStatus?: 'OK' | 'WARNING' | 'CRITICAL' | 'NONE';
  probeConfiguration: FlatProbeConfiguration;
  schedule: MonitorSchedule;
  assertionRules: AssertionRule[];
  metricRules?: MetricRule[];
  alarmPolicy: AlarmPolicy;
  recipientIds?: string[];
  dataExtractor?: DataExtractor;
  createdAt: string;
  updatedAt: string;
  lastCheckTime?: string;
  lastResponseTimeMs?: number;
  lastStatus?: string;
  recentExecutions?: { timestamp: string; status: string; responseTimeMs: number; extractedData?: any; assertionResults?: any[] }[];
}

export interface AlarmDTO {
  id: string;
  monitorId: string;
  monitorName: string;
  status: string; // 'OPEN' | 'CONFIRMED' | 'NOTIFIED' | 'RESOLVED'
  severity: string; // 'CRITICAL' | 'WARNING' | 'INFO'
  alarmType?: string; // 'AVAILABILITY' | 'DATA_METRIC'
  openedAt: string;
  confirmedAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ReportDTO {
  id: string;
  dashboardId: string;
  status: string; // 'DRAFT' | 'CONFIRMED' | 'SENT'
  periodFrom: string;
  periodTo: string;
  content: {
    uptimePercent: number;
    avgResponseTimeMs: number;
    p95ResponseTimeMs?: number;
    p99ResponseTimeMs?: number;
    totalMonitors: number;
    monitors: {
      id: string;
      name: string;
      uptimePercent: number;
      avgResponseTimeMs: number;
      p95ResponseTimeMs?: number;
      p99ResponseTimeMs?: number;
      timeSeries?: { timestamp: string; value: number }[];
    }[];
  };
  customText?: string;
  createdAt: string;
}

export interface RecipientDTO {
  id: string;
  recipientListId: string;
  name: string;
  email?: string;
  channels: {
    type: 'EMAIL' | 'SLACK' | 'WEBHOOK';
    config: any;
  }[];
  createdAt: string;
}

// I Gateway sono la porta di SOLA LETTURA usata dal client (polling).
// Le mutazioni (comandi) passano esclusivamente dalle Server Actions
// (`features/*/actions/*`), unica porta canonica per i comandi.

export interface DashboardGateway {
  getDashboards(): Promise<DashboardDTO[]>;
}

export interface MonitorGateway {
  getMonitors(dashboardId: string): Promise<MonitorDTO[]>;
  getMonitor(id: string): Promise<MonitorDTO>;
}

export interface AlarmGateway {
  getAlarms(dashboardId: string): Promise<AlarmDTO[]>;
}

export interface ReportGateway {
  getReports(dashboardId: string): Promise<ReportDTO[]>;
}

export interface RecipientGateway {
  getRecipients(dashboardId: string): Promise<RecipientDTO[]>;
}
