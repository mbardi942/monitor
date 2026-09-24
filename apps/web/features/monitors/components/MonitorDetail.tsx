"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  RefreshCw,
  Edit2,
  Trash2,
  Copy,
  Check,
  Clock,
  ShieldAlert,
  Globe,
  Activity,
  Gauge,
  TrendingUp,
  AlertTriangle,
  History,
  BellRing,
} from "lucide-react";
import { MonitorDTO, AlarmDTO } from '@/core/ports/gateways';
import { getMonitorPresentation, formatValue } from '../lib/monitor-presentation';
import { calculateLatencyStats } from '../lib/latency-stats';
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { useMonitorActions } from '../hooks/useMonitorActions';
import { getStatusClass, getStatusDotClass } from '@/shared/lib/status-helpers';
import { CloneMonitorModal } from './CloneMonitorModal';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';

// Sotto-componenti Strategy pattern e UI
import { TriageBanner } from "./monitor-detail/TriageBanner";
import { ReachabilityView } from "./monitor-detail/ReachabilityView";
import { MetricValueView } from "./monitor-detail/MetricValueView";
import { MetricGroupView } from "./monitor-detail/MetricGroupView";
import { DataTableView } from "./monitor-detail/DataTableView";
import { DiagnosticsView } from "./monitor-detail/DiagnosticsView";

interface MonitorDetailProps {
  monitorId: string;
  dashboardId: string;
  monitor: MonitorDTO;
  alarms: AlarmDTO[];
  onBack: () => void;
  onEdit: (monitor: MonitorDTO) => void;
  onRefresh: () => void;
}

export const MonitorDetail: React.FC<MonitorDetailProps> = ({
  monitorId,
  dashboardId,
  monitor,
  alarms,
  onBack,
  onEdit,
  onRefresh,
}) => {
  const { pauseToggle, executeCheck, deleteMonitor, cloneMonitor, isExecuting, isPending } = useMonitorActions(onRefresh);
  const { dashboards } = useDashboard();
  const presentation = getMonitorPresentation(monitor);

  // Stato per la metrica attiva se si tratta di un gruppo (es. HOST)
  const [activeMetricKey, setActiveMetricKey] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"overview" | "diagnostics">("overview");

  // Stato per la paginazione della tabella
  const [currentPage, setCurrentPage] = useState(1);

  // Stato per la tab attiva del grafico ("metrics" | "latency")
  const [chartTab, setChartTab] = useState<"metrics" | "latency">("metrics");

  // Stato per la modale di conferma cancellazione
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Stato per la modale di clonazione
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);

  // Inizializza la tab attiva per METRIC_GROUP
  useEffect(() => {
    if (presentation.kind === "METRIC_GROUP" && presentation.pairs.length > 0) {
      if (!activeMetricKey || !presentation.pairs.some((p: any) => p.label === activeMetricKey)) {
        setActiveMetricKey(presentation.pairs[0].label);
      }
    }
  }, [presentation, activeMetricKey]);

  const handlePauseToggle = async () => {
    await pauseToggle(monitor.id, monitor.status);
  };

  const handleExecuteCheck = async () => {
    await executeCheck(monitor.id);
  };

  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    const deleted = await deleteMonitor(monitor.id);
    if (deleted) {
      setIsDeleteConfirmOpen(false);
      onBack();
    }
  };

  // Stato per il feedback di copia URL
  const [copied, setCopied] = useState(false);

  const handleCopyTarget = () => {
    const target =
      monitor.type === "HEARTBEAT"
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/heartbeats/${monitor.probeConfiguration?.heartbeatToken || ""}`
        : monitor.probeConfiguration?.url || monitor.probeConfiguration?.host || "";
    if (target) {
      navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filtra allarmi specifici per questo monitor
  const monitorAlarms = useMemo(() => alarms.filter((a) => a.monitorId === monitorId), [alarms, monitorId]);

  // Calcolo statistiche estese (rigorosamente calcolate su check UP)
  const executions = monitor.recentExecutions || [];
  const stats = useMemo(() => calculateLatencyStats(executions), [executions]);

  // Prepara i dati del grafico secondario di latenza
  const latencyChartData = useMemo(() => {
    return (monitor.recentExecutions || [])
      .slice()
      .reverse()
      .map((e) => ({
        time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        responseTime: e.status === "UP" ? e.responseTimeMs : 0,
        status: e.status,
      }));
  }, [monitor.recentExecutions]);

  const targetAddress =
    monitor.type === "HEARTBEAT"
      ? `/api/heartbeats/${monitor.probeConfiguration?.heartbeatToken || ""}`
      : monitor.probeConfiguration?.url || monitor.probeConfiguration?.host || "";
  const targetPort = monitor.probeConfiguration?.port ? `:${monitor.probeConfiguration.port}` : "";
  const fullTarget = targetAddress ? `${targetAddress}${targetPort}` : "--";

  return (
    <div className="flex flex-col gap-6">
      {/* Triage Banner di emergenza in cima (se down/critical) */}
      <TriageBanner monitor={monitor} alarms={monitorAlarms} />

      {/* Back & Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <button
          onClick={onBack}
          className="text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white flex items-center gap-2 select-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Torna alla Dashboard
        </button>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button onClick={handlePauseToggle} disabled={isPending} className="btn-secondary">
            {monitor.status === "PAUSED" ? (
              <>
                <Play className="w-4 h-4 fill-current" /> Attiva
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 fill-current" /> Sospendi
              </>
            )}
          </button>
          <button
            onClick={handleExecuteCheck}
            disabled={monitor.status === "PAUSED" || isExecuting || isPending}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${isExecuting ? "animate-spin" : ""}`} /> Esegui Check
          </button>
          <button onClick={() => onEdit(monitor)} className="btn-secondary">
            <Edit2 className="w-4 h-4" /> Modifica
          </button>
          <button onClick={() => setIsCloneModalOpen(true)} disabled={isPending} className="btn-secondary">
            <Copy className="w-4 h-4" /> Duplica
          </button>
          <button onClick={handleDeleteClick} disabled={isPending} className="btn-danger">
            <Trash2 className="w-4 h-4" /> Elimina
          </button>
        </div>
      </div>

      {/* Monitor Header Info & Metadati Rapidi */}
      <div className="glass-panel p-6 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${getStatusDotClass(monitor.status)}`} />
              <h1 className="text-xl font-bold text-white">{monitor.name}</h1>
              <span className={`badge ${getStatusClass(monitor.status)} uppercase text-[10px]`}>
                {monitor.status}
              </span>
              {monitor.dataHealthStatus && monitor.dataHealthStatus !== "NONE" && (
                <span
                  className={`badge uppercase text-[10px] ${
                    monitor.dataHealthStatus === "CRITICAL"
                      ? "bg-[hsl(var(--error))/0.15] text-[hsl(var(--error))]"
                      : monitor.dataHealthStatus === "WARNING"
                      ? "bg-[hsl(var(--warning))/0.15] text-[hsl(var(--warning))]"
                      : "bg-[hsl(var(--success))/0.15] text-[hsl(var(--success))]"
                  }`}
                >
                  DATI: {monitor.dataHealthStatus}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <span className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 uppercase font-semibold">
              Tipo: {monitor.type === "HEARTBEAT" ? "Heartbeat (Push)" : monitor.type}
            </span>
          </div>
        </div>

        {/* Metadati essenziali del monitor a colpo d'occhio */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-neutral-800/60 text-xs">
          {/* Target URL / Host / Heartbeat Webhook */}
          <div className="inline-flex items-center gap-2 bg-neutral-900/90 px-3 py-1.5 rounded-md border border-neutral-800 text-neutral-300 font-mono">
            {monitor.type === "HEARTBEAT" ? (
              <Clock className="w-3.5 h-3.5 text-[hsl(var(--primary))] shrink-0" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            )}
            <span className="truncate max-w-[320px]">
              {monitor.probeConfiguration?.method ? <strong className="text-neutral-400 mr-1">{monitor.probeConfiguration.method}</strong> : ""}
              {fullTarget}
            </span>
            <button
              type="button"
              onClick={handleCopyTarget}
              title="Copia negli appunti"
              className="hover:text-white ml-1 text-neutral-500 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[hsl(var(--success))]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Frequenza attesa o di polling */}
          {monitor.type === "HEARTBEAT" ? (
            <div className="inline-flex items-center gap-1.5 bg-neutral-900/90 px-3 py-1.5 rounded-md border border-neutral-800 text-neutral-300">
              <Clock className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
              <span>
                Frequenza:{" "}
                <strong className="text-white font-mono">
                  {Math.round((monitor.probeConfiguration?.expectedIntervalSeconds || 3600) / 60)}m (+{Math.round((monitor.probeConfiguration?.gracePeriodSeconds || 300) / 60)}m grazia)
                </strong>
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-neutral-900/90 px-3 py-1.5 rounded-md border border-neutral-800 text-neutral-300">
              <Clock className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
              <span>Frequenza: <strong className="text-white font-mono">{monitor.schedule?.intervalSeconds || 60}s</strong></span>
            </div>
          )}

          {/* Ultimo ping o Timeout */}
          {monitor.type === "HEARTBEAT" ? (
            <div className="inline-flex items-center gap-1.5 bg-neutral-900/90 px-3 py-1.5 rounded-md border border-neutral-800 text-neutral-300">
              <span className="text-neutral-500">Ultimo Ping:</span>
              <strong className="text-white font-mono">
                {monitor.probeConfiguration?.lastPingAt
                  ? new Date(monitor.probeConfiguration.lastPingAt).toLocaleTimeString()
                  : "In attesa"}
              </strong>
            </div>
          ) : (
            monitor.probeConfiguration?.timeoutMs && (
              <div className="inline-flex items-center gap-1.5 bg-neutral-900/90 px-3 py-1.5 rounded-md border border-neutral-800 text-neutral-300">
                <span className="text-neutral-500">Timeout:</span>
                <strong className="text-white font-mono">{monitor.probeConfiguration.timeoutMs}ms</strong>
              </div>
            )
          )}

          {/* Politica di Allarme */}
          <div className="inline-flex items-center gap-1.5 bg-neutral-900/90 px-3 py-1.5 rounded-md border border-neutral-800 text-neutral-300">
            <ShieldAlert className="w-3.5 h-3.5 text-[hsl(var(--warning))]" />
            <span>Soglia Allarme: <strong className="text-white">{monitor.alarmPolicy?.consecutiveFailures || 1} falliment{(monitor.alarmPolicy?.consecutiveFailures || 1) === 1 ? 'o' : 'i'}</strong></span>
          </div>
        </div>
      </div>

      {/* 1. KPI Ribbon (Micro-statistiche calcolate su check UP) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Uptime & Tasso Successo */}
        <div className="glass-panel p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Tasso Successo</span>
            <Activity className="w-4 h-4 text-[hsl(var(--success))]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">{stats.successRate}%</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              {stats.successChecks} su {stats.totalChecks} check riusciti
            </div>
          </div>
        </div>

        {/* KPI 2: Latenza P50 (Mediana) */}
        <div className="glass-panel p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Latenza P50 (Mediana)</span>
            <Gauge className="w-4 h-4 text-[hsl(var(--primary))]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">
              {stats.p50LatencyMs !== null ? `${stats.p50LatencyMs} ms` : "--"}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              Tempo mediano su check UP
            </div>
          </div>
        </div>

        {/* KPI 3: Latenza P95 (Picco 95%) */}
        <div className="glass-panel p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Latenza P95</span>
            <TrendingUp className="w-4 h-4 text-[hsl(var(--warning))]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">
              {stats.p95LatencyMs !== null ? `${stats.p95LatencyMs} ms` : "--"}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              95° percentile sui check UP
            </div>
          </div>
        </div>

        {/* KPI 4: Latenza Media & Metrica */}
        <div className="glass-panel p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
              {presentation.kind === "METRIC_VALUE" ? presentation.label : "Latenza Media"}
            </span>
            {presentation.kind === "METRIC_VALUE" ? (
              <Activity className="w-4 h-4 text-[hsl(var(--primary))]" />
            ) : (
              <Clock className="w-4 h-4 text-neutral-400" />
            )}
          </div>
          <div className="mt-3">
            {presentation.kind === "METRIC_VALUE" ? (
              <>
                <div className="text-2xl font-bold font-mono text-[hsl(var(--primary))] truncate" title={presentation.displayValue}>
                  {presentation.displayValue} {presentation.unit}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  Media Latenza: {stats.avgLatencyMs !== null ? `${stats.avgLatencyMs} ms` : "--"}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold font-mono text-white">
                  {stats.avgLatencyMs !== null ? `${stats.avgLatencyMs} ms` : "--"}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  Ultimo: {monitor.lastResponseTimeMs !== undefined ? `${monitor.lastResponseTimeMs} ms` : "--"}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs di Navigazione (Progressive Disclosure) */}
      <div className="flex border-b border-neutral-800/80 mb-2 mt-2">
        <button
          onClick={() => setActiveViewTab("overview")}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeViewTab === "overview"
              ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
              : "border-transparent text-neutral-400 hover:text-white"
          }`}
        >
          Panoramica & Grafici
        </button>
        <button
          onClick={() => setActiveViewTab("diagnostics")}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeViewTab === "diagnostics"
              ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
              : "border-transparent text-neutral-400 hover:text-white"
          }`}
        >
          Dettagli & Diagnostica
          {(monitor.status !== "PAUSED" && monitor.dataHealthStatus && monitor.dataHealthStatus !== "OK" && monitor.dataHealthStatus !== "NONE") && (
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--error))]"></span>
          )}
        </button>
      </div>

      {/* 2. Sezione Grafico & Dati Estratti Full-Width */}
      {activeViewTab === "overview" && (
        <div className="flex flex-col gap-6">
          {/* PATTERN STRATEGY: Renderizza la view a tutta larghezza */}
          {presentation.kind === "REACHABILITY" && (
            <ReachabilityView latencyChartData={latencyChartData} />
          )}

          {presentation.kind === "METRIC_VALUE" && (
            <MetricValueView 
              monitor={monitor} 
              presentation={presentation} 
              chartTab={chartTab} 
              setChartTab={setChartTab} 
              latencyChartData={latencyChartData} 
            />
          )}
          
          {presentation.kind === "METRIC_GROUP" && (
            <MetricGroupView 
              monitor={monitor} 
              presentation={presentation} 
              chartTab={chartTab} 
              setChartTab={setChartTab} 
              activeMetricKey={activeMetricKey} 
              setActiveMetricKey={setActiveMetricKey} 
              latencyChartData={latencyChartData} 
            />
          )}
          
          {presentation.kind === "DATA_TABLE" && (
            <DataTableView 
              monitor={monitor} 
              presentation={presentation} 
              currentPage={currentPage} 
              setCurrentPage={setCurrentPage} 
              latencyChartData={latencyChartData} 
            />
          )}

          {/* 3. Griglia Inferiore a 2 Colonne: Cronologia Esecuzioni + Storico Allarmi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cronologia Check Recenti */}
            <div className="glass-panel p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                    <History className="w-4 h-4 text-neutral-400" /> Cronologia Esecuzioni Recenti
                  </h3>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Ultimi {executions.length} check
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {executions.length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-8">Nessun check registrato.</p>
                  ) : (
                    executions.map((e, idx) => {
                      const timeStr = new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      const isUp = e.status === "UP";

                      let mainInfo = "";
                      let subInfo = "";

                      if (presentation.kind === "METRIC_VALUE") {
                        const label = presentation.label;
                        const rawVal = e.extractedData?.values?.[label];
                        const schema = monitor.dataExtractor?.schema;
                        const format = schema?.type === "SINGLE_VALUE" ? schema.format : undefined;
                        const unit = presentation.unit;
                        mainInfo = rawVal !== undefined ? `${formatValue(rawVal, format)}${unit ? ` ${unit}` : ""}` : "--";
                        subInfo = isUp ? `${e.responseTimeMs} ms` : "Check fallito";
                      } else if (presentation.kind === "METRIC_GROUP") {
                        const schema = monitor.dataExtractor?.schema;
                        const pairsSchema = (schema?.type === "KEY_VALUE_PAIRS" ? schema.pairs : []) || [];
                        mainInfo = pairsSchema.map((p: any) => {
                          const rawVal = e.extractedData?.values?.[p.label];
                          return `${p.label}: ${formatValue(rawVal, p.format)}`;
                        }).join("  |  ");
                        subInfo = isUp ? `${e.responseTimeMs} ms` : "Check fallito";
                      } else {
                        mainInfo = isUp ? `${e.responseTimeMs} ms` : "Fallito";
                        if (presentation.kind === "DATA_TABLE" && e.extractedData?.rows) {
                          subInfo = `${e.extractedData.rows.length} righe`;
                        }
                      }

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 rounded-[var(--radius-inner)] text-xs hover:border-[hsl(var(--primary)/0.25)] transition-colors"
                        >
                          <div className="flex flex-col gap-0.5 max-w-[70%]">
                            <span className="text-neutral-500 font-mono text-[10px]">{timeStr}</span>
                            <span className="text-white font-semibold font-mono text-[11px] truncate block" title={mainInfo}>
                              {mainInfo}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {subInfo && <span className="text-neutral-400 font-mono text-[10px]">{subInfo}</span>}
                            <span
                              className={`badge ${
                                isUp ? "badge-up" : "badge-down"
                              } !px-2 !py-0.5 !text-[10px]`}
                            >
                              {e.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Storico Allarmi del Monitor */}
            <div className="glass-panel p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-neutral-400" /> Storico Allarmi del Servizio
                  </h3>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {monitorAlarms.length} allarm{monitorAlarms.length === 1 ? "e" : "i"}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {monitorAlarms.length === 0 ? (
                    <div className="py-8 text-center text-neutral-500 text-xs">
                      Nessun allarme generato per questo monitor.
                    </div>
                  ) : (
                    monitorAlarms.map((alarm) => (
                      <div
                        key={alarm.id}
                        className="flex flex-col gap-1.5 p-3 bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 rounded-[var(--radius-inner)] text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`badge ${
                                alarm.status === "RESOLVED" ? "badge-up" : "badge-down"
                              } !px-1.5 !py-0.5 !text-[9px]`}
                            >
                              {alarm.status}
                            </span>
                            {alarm.alarmType && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono">
                                {alarm.alarmType === "AVAILABILITY" ? "CONNETTIVITÀ" : "METRICA / DATI"}
                              </span>
                            )}
                          </div>
                          <span className="text-neutral-500 text-[10px]">
                            {new Date(alarm.openedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-neutral-300">
                          Allarme {alarm.severity} ({alarm.alarmType === "AVAILABILITY" ? "Rete/Servizio DOWN" : "Soglia Dati Superata"}) aperto alle {new Date(alarm.openedAt).toLocaleTimeString()}
                        </p>
                        {alarm.resolvedAt && (
                          <p className="text-neutral-500 text-[10px]">
                            Risolto alle {new Date(alarm.resolvedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeViewTab === "diagnostics" && (
        <DiagnosticsView monitor={monitor} />
      )}

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Elimina Monitor"
        message="Sei sicuro di voler eliminare questo monitor? L'operazione non è reversibile e tutti i dati storici andranno persi."
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        isPending={isPending}
      />

      <CloneMonitorModal
        isOpen={isCloneModalOpen}
        monitor={monitor}
        dashboards={dashboards}
        currentDashboardId={dashboardId}
        isPending={isPending}
        onClose={() => setIsCloneModalOpen(false)}
        onConfirm={async (targetDashboardId, newName) => {
          const result = await cloneMonitor(monitor.id, dashboardId, targetDashboardId, newName);
          if (result) setIsCloneModalOpen(false);
        }}
      />
    </div>
  );
};
