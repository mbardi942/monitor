"use client";

import React, { useState, useMemo } from "react";
import { Plus, Server, Search, RefreshCw, CheckCircle2 } from "lucide-react";
import { MonitorDTO, AlarmDTO } from '@/core/ports/gateways';
import { MonitorCard } from '@/features/monitors/components/MonitorCard';
import { MonitorListItem } from '@/features/monitors/components/MonitorListItem';
import { KpiCards, DashboardMetrics } from './KpiCards';
import { executeCheckAction } from '@/features/monitors/actions/monitor-actions';
import { CloneMonitorModal } from '@/features/monitors/components/CloneMonitorModal';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useMonitorActions } from '@/features/monitors/hooks/useMonitorActions';

interface OverviewProps {
  monitors: MonitorDTO[];
  alarms: AlarmDTO[];
  metrics: DashboardMetrics;
  currentDashboardId: string;
  onSelectMonitor: (id: string) => void;
  onCreateMonitorClick: () => void;
  onRefresh: () => void;
  onPrefetchMonitor?: (id: string) => void;
}

type FilterStatus = "ALL" | "UP" | "DOWN" | "PAUSED";

export const Overview: React.FC<OverviewProps> = ({
  monitors,
  alarms,
  metrics,
  currentDashboardId,
  onSelectMonitor,
  onCreateMonitorClick,
  onRefresh,
  onPrefetchMonitor,
}) => {
  const { dashboards } = useDashboard();
  const { cloneMonitor, isPending: isClonePending } = useMonitorActions(onRefresh);

  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"GRID" | "COMPACT">("GRID");

  // Stato per il modal di clonazione condiviso tra tutte le card
  const [cloneTargetMonitor, setCloneTargetMonitor] = useState<MonitorDTO | null>(null);

  // Stato per l'esecuzione bulk dei controlli
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkSuccessFeedback, setBulkSuccessFeedback] = useState(false);

  // Filtra e ordina la lista dei monitor (memoizzata: DOWN e DEGRADED per primi)
  const filteredMonitors = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const statusWeight: Record<string, number> = {
      DOWN: 4,
      DEGRADED: 3,
      UP: 2,
      PAUSED: 1,
    };

    return monitors
      .filter((m) => {
        const matchesFilter = filter === "ALL" ? true : m.status === filter;
        const matchesSearch =
          m.name.toLowerCase().includes(query) ||
          (m.probeConfiguration?.url || "").toLowerCase().includes(query) ||
          (m.probeConfiguration?.host || "").toLowerCase().includes(query);
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        const weightA = statusWeight[a.status] || 0;
        const weightB = statusWeight[b.status] || 0;
        if (weightA !== weightB) {
          return weightB - weightA; // DOWN e DEGRADED prima
        }
        return a.name.localeCompare(b.name);
      });
  }, [monitors, filter, searchQuery]);

  // Esecuzione bulk concorrente (batch di 3 alla volta)
  const handleExecuteAll = async () => {
    const activeMonitors = monitors.filter((m) => m.status !== "PAUSED");
    if (activeMonitors.length === 0) return;

    setIsBulkRunning(true);
    setBulkSuccessFeedback(false);
    setBulkProgress({ current: 0, total: activeMonitors.length });

    const batchSize = 3;
    for (let i = 0; i < activeMonitors.length; i += batchSize) {
      const batch = activeMonitors.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (m) => {
          try {
            await executeCheckAction(m.id);
          } finally {
            setBulkProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }
        })
      );
    }

    setIsBulkRunning(false);
    setBulkSuccessFeedback(true);
    setTimeout(() => setBulkSuccessFeedback(false), 3000);
    onRefresh();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. KPI Cards Macro-statistiche */}
      <KpiCards metrics={metrics} monitors={monitors} />

      {/* 2. Controlli & Filtri */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 glass-panel p-4">
        {/* Pulsanti Filtro */}
        <div className="flex flex-wrap gap-1">
          {(["ALL", "UP", "DOWN", "PAUSED"] as FilterStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={filter === st ? "filter-pill-active" : "filter-pill"}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Barra di ricerca + View Mode + Azioni Bulk + Aggiungi */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca monitor o URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 form-input !text-xs"
            />
          </div>
          
          <div className="flex bg-[hsl(260_25%_4.5%)] p-1 rounded-[var(--radius-inner)] border border-[hsl(var(--border-color))]/50 select-none">
            <button
              onClick={() => setViewMode("GRID")}
              className={`px-3 py-1 rounded-[var(--radius-inner)] text-[10px] font-medium uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "GRID"
                  ? "bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] shadow-[0_0_12px_rgba(139,92,246,0.08)]"
                  : "text-neutral-500 hover:text-white"
              }`}
            >
              Griglia
            </button>
            <button
              onClick={() => setViewMode("COMPACT")}
              className={`px-3 py-1 rounded-[var(--radius-inner)] text-[10px] font-medium uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "COMPACT"
                  ? "bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] shadow-[0_0_12px_rgba(139,92,246,0.08)]"
                  : "text-neutral-500 hover:text-white"
              }`}
            >
              Compatta
            </button>
          </div>

          {/* Pulsante Esegui Tutti (Bulk Check) */}
          <button
            type="button"
            onClick={handleExecuteAll}
            disabled={isBulkRunning || monitors.filter((m) => m.status !== "PAUSED").length === 0}
            className="btn-secondary flex items-center gap-1.5 !text-xs"
            title="Esegui check immediato su tutti i monitor attivi"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBulkRunning ? "animate-spin text-[hsl(var(--primary))]" : ""}`} />
            {isBulkRunning ? (
              <span className="font-mono">
                Esecuzione {bulkProgress.current}/{bulkProgress.total}...
              </span>
            ) : bulkSuccessFeedback ? (
              <span className="text-[hsl(var(--success))] inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completato
              </span>
            ) : (
              <span>Esegui Tutti</span>
            )}
          </button>

          <button onClick={onCreateMonitorClick} className="btn-primary flex items-center gap-1.5 !text-xs">
            <Plus className="w-4 h-4" /> Aggiungi
          </button>
        </div>
      </div>

      {/* 3. Elenco/Griglia dei Monitor */}
      {filteredMonitors.length === 0 ? (
        <div className="glass-panel p-12 text-center text-neutral-400 flex flex-col items-center justify-center gap-3">
          <Server className="w-10 h-10 text-neutral-600" />
          <div>
            <p className="text-sm font-medium text-white">Nessun monitor trovato</p>
            <p className="text-xs text-neutral-500 mt-1">Nessun risultato per i filtri correnti.</p>
          </div>
          <button onClick={onCreateMonitorClick} className="btn-primary mt-2">
            Crea Nuovo
          </button>
        </div>
      ) : viewMode === "GRID" ? (
        <div className="bento-grid">
          {filteredMonitors.map((monitor) => (
            <MonitorCard
              key={monitor.id}
              monitor={monitor}
              onSelect={onSelectMonitor}
              onRefresh={onRefresh}
              onPrefetch={onPrefetchMonitor}
              onClone={setCloneTargetMonitor}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredMonitors.map((monitor) => (
            <MonitorListItem
              key={monitor.id}
              monitor={monitor}
              onSelect={onSelectMonitor}
              onRefresh={onRefresh}
              onPrefetch={onPrefetchMonitor}
              onClone={setCloneTargetMonitor}
            />
          ))}
        </div>
      )}

      {/* Modal di clonazione condiviso tra tutte le card della lista */}
      <CloneMonitorModal
        isOpen={!!cloneTargetMonitor}
        monitor={cloneTargetMonitor}
        dashboards={dashboards}
        currentDashboardId={currentDashboardId}
        isPending={isClonePending}
        onClose={() => setCloneTargetMonitor(null)}
        onConfirm={async (targetDashboardId, newName) => {
          if (!cloneTargetMonitor) return;
          const result = await cloneMonitor(
            cloneTargetMonitor.id,
            currentDashboardId,
            targetDashboardId,
            newName
          );
          if (result) setCloneTargetMonitor(null);
        }}
      />

    </div>
  );
};
