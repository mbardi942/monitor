import {
  DashboardDTO,
  MonitorDTO,
  AlarmDTO,
  ReportDTO,
  RecipientDTO,
} from '@/core/ports/gateways';

export const mockStore = {
  dashboardsList: [
    {
      id: "dash-1",
      name: "Dashboard di Produzione",
      reportConfig: { isEnabled: true, cron: "0 9 * * *" },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "dash-2",
      name: "Dashboard di Staging",
      reportConfig: { isEnabled: false },
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ] as DashboardDTO[],

  monitorsList: [
    {
      id: "mon-1",
      name: "Sito Web Principale",
      type: "HTTP",
      status: "UP",
      dataHealthStatus: "NONE",
      probeConfiguration: { url: "https://example.com", method: "GET", timeoutMs: 5000 },
      schedule: { intervalSeconds: 30 },
      assertionRules: [
        { target: "STATUS_CODE", operator: "EQUALS", value: "200" },
        { target: "RESPONSE_TIME", operator: "LESS_THAN", value: "800" },
      ],
      alarmPolicy: { consecutiveFailures: 3 },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      lastCheckTime: new Date(Date.now() - 15000).toISOString(),
      lastResponseTimeMs: 124,
      lastStatus: "UP",
      recentExecutions: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 60 * 1000).toISOString(),
        status: "UP",
        responseTimeMs: Math.floor(100 + Math.random() * 50),
      })),
    },
    {
      id: "mon-2",
      name: "API Servizio Autenticazione",
      type: "HTTP",
      status: "UP",
      dataHealthStatus: "WARNING",
      probeConfiguration: { url: "https://api.example.com/v1/auth/health", method: "GET", timeoutMs: 3000 },
      schedule: { intervalSeconds: 60 },
      assertionRules: [
        { target: "STATUS_CODE", operator: "EQUALS", value: "200" },
        { target: "RESPONSE_TIME", operator: "LESS_THAN", value: "500" },
        { target: "JSON_BODY", operator: "CONTAINS", property: "status", value: "healthy" },
      ],
      metricRules: [
        { property: "active_sessions", operator: "LESS_THAN", value: "1000" }
      ],
      alarmPolicy: { consecutiveFailures: 2 },
      dataExtractor: {
        displayHint: "SINGLE_VALUE",
        maxRows: 10,
        pageSize: 10,
        retainHistory: false,
        schema: {
          type: "SINGLE_VALUE",
          valuePath: "sessions.active",
          label: "Sessioni Attive",
          unit: "users",
          format: "number"
        }
      },
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      lastCheckTime: new Date(Date.now() - 45000).toISOString(),
      lastResponseTimeMs: 245,
      lastStatus: "UP",
      recentExecutions: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 2 * 60 * 1000).toISOString(),
        status: i === 12 || i === 13 ? "DOWN" : "UP",
        responseTimeMs: i === 12 || i === 13 ? 0 : Math.floor(200 + Math.random() * 100),
        extractedData: {
          values: {
            "Sessioni Attive": i === 0 ? 1250 : 850
          }
        }
      })),
    },
    {
      id: "mon-3",
      name: "Gateway di Pagamento (Stripe)",
      type: "HTTP",
      status: "DOWN",
      dataHealthStatus: "NONE",
      probeConfiguration: { url: "https://api.stripe.com/healthcheck", method: "GET", timeoutMs: 10000 },
      schedule: { intervalSeconds: 30 },
      assertionRules: [{ target: "STATUS_CODE", operator: "EQUALS", value: "200" }],
      alarmPolicy: { consecutiveFailures: 3 },
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      lastCheckTime: new Date(Date.now() - 5000).toISOString(),
      lastResponseTimeMs: 0,
      lastStatus: "DOWN",
      recentExecutions: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 60 * 1000).toISOString(),
        status: i < 5 ? "DOWN" : "UP",
        responseTimeMs: i < 5 ? 0 : Math.floor(350 + Math.random() * 120),
      })),
    },
    {
      id: "mon-4",
      name: "Database PostgreSQL (Replica)",
      type: "PING",
      status: "PAUSED",
      dataHealthStatus: "NONE",
      probeConfiguration: { host: "db-replica.local", port: 5432 },
      schedule: { intervalSeconds: 120 },
      assertionRules: [{ target: "STATUS_CODE", operator: "EQUALS", value: "0" }],
      alarmPolicy: { consecutiveFailures: 5 },
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      lastCheckTime: undefined,
      lastResponseTimeMs: undefined,
      lastStatus: undefined,
      recentExecutions: [],
    },
  ] as MonitorDTO[],
 
  alarmsList: [
    {
      id: "ala-1",
      monitorId: "mon-3",
      monitorName: "Gateway di Pagamento (Stripe)",
      status: "CONFIRMED",
      severity: "CRITICAL",
      alarmType: "AVAILABILITY",
      openedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      confirmedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ala-2",
      monitorId: "mon-2",
      monitorName: "API Servizio Autenticazione",
      status: "RESOLVED",
      severity: "WARNING",
      alarmType: "DATA_METRIC",
      openedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      confirmedAt: new Date(Date.now() - 23.8 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ] as AlarmDTO[],

  recipientsList: [
    {
      id: "rec-1",
      recipientListId: "dash-1",
      name: "Marco Bardelli",
      email: "marco@example.com",
      channels: [
        { type: "EMAIL", config: { email: "marco@example.com" } },
        { type: "SLACK", config: { webhookUrl: "https://hooks.slack.com/services/T00/B00/X00" } },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: "rec-2",
      recipientListId: "dash-1",
      name: "DevOps Alert Group",
      email: "devops-alerts@example.com",
      channels: [{ type: "EMAIL", config: { email: "devops-alerts@example.com" } }],
      createdAt: new Date().toISOString(),
    },
  ] as RecipientDTO[],

  reportsList: [
    {
      id: "rep-1",
      dashboardId: "dash-1",
      status: "DRAFT",
      periodFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      periodTo: new Date().toISOString(),
      content: {
        uptimePercent: 98.4,
        avgResponseTimeMs: 184,
        p95ResponseTimeMs: 310,
        p99ResponseTimeMs: 450,
        totalMonitors: 3,
        monitors: [
          { 
            id: "mon-1", name: "Sito Web Principale", uptimePercent: 100, avgResponseTimeMs: 120, p95ResponseTimeMs: 180, p99ResponseTimeMs: 250,
            timeSeries: Array.from({ length: 12 }, (_, i) => ({ timestamp: new Date(Date.now() - (11 - i) * 3600000).toISOString(), value: 100 + Math.random() * 50 }))
          },
          { 
            id: "mon-2", name: "API Servizio Autenticazione", uptimePercent: 99.2, avgResponseTimeMs: 232, p95ResponseTimeMs: 340, p99ResponseTimeMs: 480,
            timeSeries: Array.from({ length: 12 }, (_, i) => ({ timestamp: new Date(Date.now() - (11 - i) * 3600000).toISOString(), value: 200 + Math.random() * 100 }))
          },
          { 
            id: "mon-3", name: "Gateway di Pagamento (Stripe)", uptimePercent: 96.0, avgResponseTimeMs: 410, p95ResponseTimeMs: 850, p99ResponseTimeMs: 1200,
            timeSeries: Array.from({ length: 12 }, (_, i) => ({ timestamp: new Date(Date.now() - (11 - i) * 3600000).toISOString(), value: i === 5 || i === 6 ? 0 : 350 + Math.random() * 150 }))
          },
        ],
      },
      customText: "Tutto regolare tranne una temporanea degradazione sui servizi di pagamento.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "rep-2",
      dashboardId: "dash-1",
      status: "SENT",
      periodFrom: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      periodTo: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      content: {
        uptimePercent: 99.8,
        avgResponseTimeMs: 145,
        p95ResponseTimeMs: 220,
        p99ResponseTimeMs: 350,
        totalMonitors: 3,
        monitors: [
          { 
            id: "mon-1", name: "Sito Web Principale", uptimePercent: 100, avgResponseTimeMs: 115, p95ResponseTimeMs: 160, p99ResponseTimeMs: 210,
            timeSeries: Array.from({ length: 12 }, (_, i) => ({ timestamp: new Date(Date.now() - (35 - i) * 3600000).toISOString(), value: 110 + Math.random() * 20 }))
          },
          { 
            id: "mon-2", name: "API Servizio Autenticazione", uptimePercent: 100, avgResponseTimeMs: 210, p95ResponseTimeMs: 300, p99ResponseTimeMs: 420,
            timeSeries: Array.from({ length: 12 }, (_, i) => ({ timestamp: new Date(Date.now() - (35 - i) * 3600000).toISOString(), value: 200 + Math.random() * 40 }))
          },
          { 
            id: "mon-3", name: "Gateway di Pagamento (Stripe)", uptimePercent: 99.4, avgResponseTimeMs: 375, p95ResponseTimeMs: 500, p99ResponseTimeMs: 700,
            timeSeries: Array.from({ length: 12 }, (_, i) => ({ timestamp: new Date(Date.now() - (35 - i) * 3600000).toISOString(), value: 360 + Math.random() * 50 }))
          },
        ],
      },
      customText: "Giornata eccellente con uptime globale del 99.8%.",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ] as ReportDTO[],

  authProfilesList: [
    {
      id: "auth-1",
      dashboardId: "dash-1",
      name: "Token Servizi Interni",
      type: "BEARER",
      maskedData: { token: "sec_••••••••4f2a" },
      headersSummary: ["Authorization: Bearer sec_••••••••4f2a"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "auth-2",
      dashboardId: "dash-1",
      name: "Chiave Gateway Partner",
      type: "API_KEY",
      maskedData: { headerName: "X-API-Key", headerValue: "gw_••••••••99bb" },
      headersSummary: ["X-API-Key: gw_••••••••99bb"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ] as any[],
};

