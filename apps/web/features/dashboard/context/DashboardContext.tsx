"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePolling } from "@/shared/hooks/usePolling";
import { useGateways } from "@/context/gateway-context";
import { DashboardDTO, MonitorDTO, AlarmDTO, ReportDTO, RecipientDTO } from "@/core/ports/gateways";
import type { AuthProfileDTO } from "@monitor/monitoring";

export interface DashboardInitialData {
  dashboards: DashboardDTO[];
  activeDashboard: DashboardDTO | null;
  monitors: MonitorDTO[];
  alarms: AlarmDTO[];
  reports: ReportDTO[];
  recipients: RecipientDTO[];
  authProfiles?: AuthProfileDTO[];
  metrics: {
    totalMonitors: number;
    activeMonitors: number;
    monitorsDown: number;
    activeAlarms: number;
    globalUptime: number;
  };
}

interface DashboardContextProps {
  dashboards: DashboardDTO[];
  activeDashboard: DashboardDTO | null;
  setActiveDashboardId: (id: string) => void;
  monitors: MonitorDTO[];
  alarms: AlarmDTO[];
  reports: ReportDTO[];
  recipients: RecipientDTO[];
  authProfiles: AuthProfileDTO[];
  metrics: {
    totalMonitors: number;
    activeMonitors: number;
    monitorsDown: number;
    activeAlarms: number;
    globalUptime: number;
  };
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  updateLocalMonitor: (id: string, updates: Partial<MonitorDTO>) => void;
  updateLocalAlarm: (id: string, updates: Partial<AlarmDTO>) => void;
}

const DashboardContext = createContext<DashboardContextProps | undefined>(undefined);

interface ResourceScope {
  monitors: boolean;
  alarms: boolean;
  reports: boolean;
  recipients: boolean;
}

/**
 * Confronta due liste di monitor per verificare se sono cambiate le proprietà chiave
 * (id, stato, salute dati, timestamp/latenza ultimo check, conteggio esecuzioni).
 * Evita re-render a vuoto durante il polling se i dati sono invariati.
 */
function areMonitorsEqual(a: MonitorDTO[], b: MonitorDTO[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ma = a[i];
    const mb = b[i];
    if (
      ma.id !== mb.id ||
      ma.status !== mb.status ||
      ma.dataHealthStatus !== mb.dataHealthStatus ||
      ma.lastCheckTime !== mb.lastCheckTime ||
      ma.lastResponseTimeMs !== mb.lastResponseTimeMs ||
      ma.updatedAt !== mb.updatedAt ||
      (ma.recentExecutions?.length || 0) !== (mb.recentExecutions?.length || 0) ||
      ma.recentExecutions?.[0]?.timestamp !== mb.recentExecutions?.[0]?.timestamp
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Confronta due liste di allarmi per verificare se sono cambiati gli stati.
 */
function areAlarmsEqual(a: AlarmDTO[], b: AlarmDTO[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const aa = a[i];
    const ab = b[i];
    if (
      aa.id !== ab.id ||
      aa.status !== ab.status ||
      aa.severity !== ab.severity ||
      aa.alarmType !== ab.alarmType ||
      aa.confirmedAt !== ab.confirmedAt ||
      aa.resolvedAt !== ab.resolvedAt
    ) {
      return false;
    }
  }
  return true;
}


/**
 * Determina quali risorse la vista corrente ha realmente bisogno di tenere
 * fresche col polling, derivandolo dalla sotto-pagina (dopo /<dashboardId>).
 * Evita di ricaricare l'intero dataset su ogni pagina (es. la pagina Destinatari
 * non deve ricaricare i monitor).
 */
function resourcesForPath(subPath: string): ResourceScope {
  if (subPath.startsWith("/alarms")) {
    return { monitors: false, alarms: true, reports: false, recipients: false };
  }
  if (subPath.startsWith("/reports")) {
    // Il dettaglio report usa anche l'elenco monitor (inclusione/esclusione)
    return { monitors: true, alarms: false, reports: true, recipients: false };
  }
  if (subPath.startsWith("/recipients")) {
    return { monitors: false, alarms: false, reports: false, recipients: true };
  }
  // Overview e dettaglio/forms monitor: stato monitor + allarmi correlati
  return { monitors: true, alarms: true, reports: false, recipients: false };
}

/**
 * Il provider e seminato lato server (SSR) tramite `initialData` passato dal
 * layout `[dashboardId]`. Non esegue fetch al mount: i dati iniziali arrivano
 * gia renderizzati nell'HTML. Il polling successivo mantiene i dati freschi.
 *
 * Il provider viene rimontato (via `key={dashboardId}` nel layout) quando cambia
 * la dashboard attiva: per questo `activeDashboard` e fissato per-mount.
 */
export const DashboardProvider: React.FC<{
  initialData: DashboardInitialData;
  children: React.ReactNode;
}> = ({ initialData, children }) => {
  const {
    monitorGateway,
    alarmGateway,
    reportGateway,
    recipientGateway,
  } = useGateways();

  const router = useRouter();
  const pathname = usePathname();

  const [dashboards] = useState<DashboardDTO[]>(initialData.dashboards);
  const [activeDashboard] = useState<DashboardDTO | null>(initialData.activeDashboard);
  const [monitors, setMonitors] = useState<MonitorDTO[]>(initialData.monitors);
  const [alarms, setAlarms] = useState<AlarmDTO[]>(initialData.alarms);
  const [reports, setReports] = useState<ReportDTO[]>(initialData.reports);
  const [recipients, setRecipients] = useState<RecipientDTO[]>(initialData.recipients);
  const [authProfiles, setAuthProfiles] = useState<AuthProfileDTO[]>(initialData.authProfiles || []);
  const [metrics, setMetrics] = useState(initialData.metrics);
  const [error, setError] = useState<string | null>(null);

  // Refetch della dashboard attiva, limitato alle risorse della vista corrente
  // (usato da polling e refresh manuale).
  const fetchDashboardData = useCallback(async () => {
    if (!activeDashboard) return;
    const base = `/${activeDashboard.id}`;
    const subPath = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
    const scope = resourcesForPath(subPath);
    
    setError(null);
    const results = await Promise.allSettled([
      scope.monitors ? monitorGateway.getMonitors(activeDashboard.id) : Promise.resolve(undefined),
      scope.alarms ? alarmGateway.getAlarms(activeDashboard.id) : Promise.resolve(undefined),
      scope.reports ? reportGateway.getReports(activeDashboard.id) : Promise.resolve(undefined),
      scope.recipients ? recipientGateway.getRecipients(activeDashboard.id) : Promise.resolve(undefined),
    ]);

    let hasError = false;

    const [monitorsRes, alarmsRes, reportsRes, recipientsRes] = results;

    if (monitorsRes.status === "fulfilled" && monitorsRes.value !== undefined) {
      const nextMonitors = monitorsRes.value;
      setMonitors((prev) => (areMonitorsEqual(prev, nextMonitors) ? prev : nextMonitors));
    } else if (monitorsRes.status === "rejected") {
      hasError = true;
    }

    if (alarmsRes.status === "fulfilled" && alarmsRes.value !== undefined) {
      const nextAlarms = alarmsRes.value;
      setAlarms((prev) => (areAlarmsEqual(prev, nextAlarms) ? prev : nextAlarms));
    } else if (alarmsRes.status === "rejected") {
      hasError = true;
    }

    if (reportsRes.status === "fulfilled" && reportsRes.value !== undefined) {
      setReports(reportsRes.value);
    } else if (reportsRes.status === "rejected") {
      hasError = true;
    }

    if (recipientsRes.status === "fulfilled" && recipientsRes.value !== undefined) {
      setRecipients(recipientsRes.value);
    } else if (recipientsRes.status === "rejected") {
      hasError = true;
    }

    if (hasError) {
      const errors = results.filter((r) => r.status === "rejected").map((r) => (r as PromiseRejectedResult).reason);
      console.error("[DashboardProvider] Some fetches failed:", errors);
      setError("Impossibile sincronizzare alcuni dati.");
    }

  }, [activeDashboard, pathname, monitorGateway, alarmGateway, reportGateway, recipientGateway]);


  // Triggera un fetch immediato quando cambia il pathname (per coprire il caso in cui
  // lo scope è aumentato rispetto a prima, es. navigando da /alarms a /).
  React.useEffect(() => {
    fetchDashboardData();
  }, [pathname, fetchDashboardData]);

  // Polling ogni 10 secondi (sospeso in background, con backoff su errore)
  usePolling({
    fn: fetchDashboardData,
    intervalMs: 10000,
    enabled: !!activeDashboard,
  });

  // Cambio dashboard: naviga mantenendo la sotto-pagina corrente
  // (es. /<id>/alarms -> /<nuovoId>/alarms)
  const setActiveDashboardId = useCallback((id: string) => {
    const segments = pathname.split("/");
    if (segments.length > 1) {
      segments[1] = id;
    }
    const target = segments.join("/") || "/";
    router.push(target);
  }, [pathname, router]);

  const updateLocalMonitor = useCallback((id: string, updates: Partial<MonitorDTO>) => {
    setMonitors((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  const updateLocalAlarm = useCallback((id: string, updates: Partial<AlarmDTO>) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  const value = React.useMemo(() => ({
    dashboards,
    activeDashboard,
    setActiveDashboardId,
    monitors,
    alarms,
    reports,
    recipients,
    authProfiles,
    metrics,
    isLoading: false,
    error,
    refreshData: fetchDashboardData,
    updateLocalMonitor,
    updateLocalAlarm,
  }), [
    dashboards,
    activeDashboard,
    setActiveDashboardId,
    monitors,
    alarms,
    reports,
    recipients,
    authProfiles,
    metrics,
    error,
    fetchDashboardData,
    updateLocalMonitor,
    updateLocalAlarm,
  ]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard deve essere utilizzato all'interno di un DashboardProvider");
  }
  return context;
};
