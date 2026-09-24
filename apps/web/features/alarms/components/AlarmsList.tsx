"use client";

import React, { useState, useMemo } from "react";
import { CheckCircle, Clock, Check, Bell, Globe, Database, Filter } from "lucide-react";
import { AlarmDTO } from '@/core/ports/gateways';
import { useAlarmActions } from '../hooks/useAlarmActions';

interface AlarmsListProps {
  alarms: AlarmDTO[];
  onRefresh: () => void;
}

type StatusFilter = "ALL" | "ACTIVE" | "RESOLVED";
type CategoryFilter = "ALL" | "AVAILABILITY" | "DATA_METRIC";

export const AlarmsList: React.FC<AlarmsListProps> = ({ alarms, onRefresh }) => {
  const { resolveAlarm, isResolving } = useAlarmActions(onRefresh);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>("ALL");

  const handleResolve = async (alarmId: string) => {
    await resolveAlarm(alarmId);
  };

  // Estrai i monitor unici presenti negli allarmi per il filtro a tendina
  const uniqueMonitors = useMemo(() => {
    const map = new Map<string, string>();
    alarms.forEach((a) => {
      if (a.monitorId && a.monitorName) {
        map.set(a.monitorId, a.monitorName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [alarms]);

  // Conteggi per i badge delle categorie
  const counts = useMemo(() => {
    const active = alarms.filter(a => a.status !== "RESOLVED");
    return {
      all: alarms.length,
      allActive: active.length,
      availability: alarms.filter(a => a.alarmType !== "DATA_METRIC").length,
      dataMetric: alarms.filter(a => a.alarmType === "DATA_METRIC").length,
    };
  }, [alarms]);

  // Filtraggio combinato: Stato + Categoria + Monitor
  const filteredAlarms = useMemo(() => {
    return alarms.filter((a) => {
      // 1. Filtro Stato
      if (statusFilter === "ACTIVE" && a.status === "RESOLVED") return false;
      if (statusFilter === "RESOLVED" && a.status !== "RESOLVED") return false;

      // 2. Filtro Categoria
      if (categoryFilter === "AVAILABILITY" && a.alarmType === "DATA_METRIC") return false;
      if (categoryFilter === "DATA_METRIC" && a.alarmType !== "DATA_METRIC") return false;

      // 3. Filtro Monitor
      if (selectedMonitorId !== "ALL" && a.monitorId !== selectedMonitorId) return false;

      return true;
    });
  }, [alarms, statusFilter, categoryFilter, selectedMonitorId]);

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return "text-[hsl(var(--error))]";
      case "WARNING":
        return "text-[hsl(var(--warning))]";
      default:
        return "text-neutral-400";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return "badge-down bg-[hsl(var(--error)/0.08)] text-[hsl(var(--error))]";
      case "CONFIRMED":
        return "badge-down bg-[hsl(var(--error)/0.12)] text-[hsl(var(--error))] font-bold shadow-[0_0_8px_rgba(239,68,68,0.05)]";
      case "RESOLVED":
        return "badge-up";
      default:
        return "badge-paused";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Principale & Categorie Tab */}
      <div className="glass-panel p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))/0.1] border border-[hsl(var(--primary))/0.2] flex items-center justify-center text-[hsl(var(--primary))]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base text-white font-bold">Registro Allarmi</h2>
              <p className="text-xs text-neutral-400">
                Storico e gestione degli allarmi di connettività e violazioni delle regole dati.
              </p>
            </div>
          </div>

          {/* Filtro Stato (Tutti / Attivi / Risolti) */}
          <div className="flex bg-[hsl(260_25%_4.5%)] p-1 rounded-[var(--radius-inner)] border border-[hsl(var(--border-color))]/50 select-none">
            {(["ALL", "ACTIVE", "RESOLVED"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setStatusFilter(mode)}
                className={`px-3 py-1 rounded-[var(--radius-inner)] text-xs font-medium transition-all cursor-pointer ${
                  statusFilter === mode
                    ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] font-bold shadow-[0_0_12px_rgba(139,92,246,0.08)]"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                {mode === "ALL" ? `Tutti (${counts.all})` : mode === "ACTIVE" ? `Attivi (${counts.allActive})` : "Risolti"}
              </button>
            ))}
          </div>
        </div>

        {/* Barra Filtri: Tab Categorie + Tendina Monitor */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 pt-3 border-t border-neutral-800/60">
          {/* Categorie: Tutti / Connettività / Metriche */}
          <div className="flex gap-1.5 overflow-x-auto select-none">
            <button
              onClick={() => setCategoryFilter("ALL")}
              className={categoryFilter === "ALL" ? "filter-pill-active text-xs" : "filter-pill text-xs"}
            >
              Tutte le Categorie
            </button>
            <button
              onClick={() => setCategoryFilter("AVAILABILITY")}
              className={`text-xs flex items-center gap-1.5 ${
                categoryFilter === "AVAILABILITY" ? "filter-pill-active" : "filter-pill"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Connettività ({counts.availability})
            </button>
            <button
              onClick={() => setCategoryFilter("DATA_METRIC")}
              className={`text-xs flex items-center gap-1.5 ${
                categoryFilter === "DATA_METRIC" ? "filter-pill-active" : "filter-pill"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Metriche & Dati ({counts.dataMetric})
            </button>
          </div>

          {/* Filtro per Monitor */}
          {uniqueMonitors.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <select
                value={selectedMonitorId}
                onChange={(e) => setSelectedMonitorId(e.target.value)}
                className="form-select !text-xs !py-1.5 !px-2.5 max-w-[220px]"
              >
                <option value="ALL">Tutti i Monitor</option>
                {uniqueMonitors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Alarms Grid/List */}
      {filteredAlarms.length === 0 ? (
        <div className="glass-panel p-12 text-center text-neutral-400 flex flex-col items-center justify-center gap-3">
          <CheckCircle className="w-10 h-10 text-[hsl(var(--success))]" />
          <div>
            <p className="text-sm font-medium text-white">Nessun allarme trovato</p>
            <p className="text-xs text-neutral-500 mt-1">
              {statusFilter === "ACTIVE"
                ? "Ottimo lavoro! Tutte le tue API e regole dati sono in stato ottimale."
                : "Nessun elemento corrisponde ai criteri di filtro selezionati."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredAlarms.map((alarm) => {
            const isActive = alarm.status !== "RESOLVED";
            const isDataMetric = alarm.alarmType === "DATA_METRIC";

            return (
              <div
                key={alarm.id}
                className={`glass-panel p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                  isActive ? "shadow-[inset_3px_0_0_0_hsl(var(--error))]" : "shadow-[inset_3px_0_0_0_hsl(var(--success))]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`icon-container mt-0.5 ${getSeverityColor(alarm.severity)}`} title={alarm.alarmType}>
                    {isDataMetric ? (
                      <Database className="w-5 h-5" />
                    ) : (
                      <Globe className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm text-white font-semibold">{alarm.monitorName}</h3>
                      <span className={`badge ${getStatusBadge(alarm.status)}`}>{alarm.status}</span>
                      <span className={`badge ${
                        isDataMetric
                          ? "bg-[hsl(var(--warning)/0.08)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.2)]"
                          : "bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]"
                      } !text-[9px] !px-2 !py-0.5 font-mono`}>
                        {isDataMetric ? "METRICA / DATI" : "CONNETTIVITÀ"}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">ID: {alarm.id}</span>
                    </div>

                    <p className="text-xs text-neutral-400 mt-1.5">
                      {!isDataMetric
                        ? "La sonda ha rilevato problemi di raggiungibilità o le asserzioni di connessione (es. HTTP status code o timeout) sono fallite."
                        : "La sonda ha risposto con successo, ma una o più regole metriche applicate ai dati estratti sono state violate."}
                    </p>

                    <div className="flex gap-4 items-center mt-2.5 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-neutral-600" />
                        Aperto: {new Date(alarm.openedAt).toLocaleString()}
                      </span>
                      {alarm.resolvedAt && (
                        <span className="flex items-center gap-1 text-[hsl(var(--success))]">
                          <Check className="w-3.5 h-3.5" />
                          Risolto: {new Date(alarm.resolvedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resolve Action */}
                {isActive && (
                  <button
                    onClick={() => handleResolve(alarm.id)}
                    disabled={isResolving === alarm.id}
                    className="btn-secondary text-white font-semibold flex items-center gap-1.5 self-end sm:self-center !py-2 !px-4 shrink-0"
                  >
                    {isResolving === alarm.id ? (
                      "Risoluzione..."
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Risolvi Manualmente
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
