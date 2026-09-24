"use client";

import React, { useMemo } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Server, Activity } from "lucide-react";
import { MonitorDTO } from "@/core/ports/gateways";

export interface DashboardMetrics {
  totalMonitors: number;
  activeMonitors: number;
  monitorsDown: number;
  activeAlarms: number;
  globalUptime: number; // calcolato dal backend o aggregato
  avgFleetLatencyMs?: number;
}

interface KpiCardsProps {
  metrics: DashboardMetrics;
  monitors?: MonitorDTO[];
}

export const KpiCards: React.FC<KpiCardsProps> = ({ metrics, monitors = [] }) => {
  const {
    totalMonitors,
    activeMonitors,
    monitorsDown,
    activeAlarms,
    globalUptime,
    avgFleetLatencyMs: initialAvgLatency,
  } = metrics;

  // Calcolo della latenza media flotta calcolata ESCLUSIVAMENTE sui monitor con esito "UP"
  const calculatedFleetLatency = useMemo(() => {
    if (initialAvgLatency !== undefined) return initialAvgLatency;
    const upMonitors = monitors.filter(
      (m) => m.status === "UP" && typeof m.lastResponseTimeMs === "number" && m.lastResponseTimeMs > 0
    );
    if (upMonitors.length === 0) return null;
    const sum = upMonitors.reduce((acc, m) => acc + (m.lastResponseTimeMs || 0), 0);
    return Math.round(sum / upMonitors.length);
  }, [initialAvgLatency, monitors]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* KPI 1: Uptime Globale */}
      <div className="kpi-card">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Uptime Globale</span>
          <div className="p-2 rounded-full bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success))] flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <span className="text-3xl font-bold font-display text-white">{globalUptime}%</span>
          <p className="text-[10px] text-neutral-500 mt-1">Nelle ultime 24 ore aggregato</p>
        </div>
      </div>

      {/* KPI 2: Latenza Media Flotta (UP) */}
      <div className="kpi-card">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Latenza Media Flotta</span>
          <div className="p-2 rounded-full bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <span className="text-3xl font-bold font-mono text-white">
            {calculatedFleetLatency !== null ? `${calculatedFleetLatency} ms` : "--"}
          </span>
          <p className="text-[10px] text-neutral-500 mt-1">Calcolata solo su monitor UP</p>
        </div>
      </div>

      {/* KPI 3: Allarmi Attivi */}
      <div className="kpi-card">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Allarmi Attivi</span>
          <div className={`p-2 rounded-full flex items-center justify-center ${
            activeAlarms > 0 
              ? "bg-[hsl(var(--error)/0.08)] text-[hsl(var(--error))] animate-pulse" 
              : "bg-neutral-900/50 text-neutral-500"
          }`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <span className="text-3xl font-bold font-display text-white">{activeAlarms}</span>
          <p className="text-[10px] text-neutral-500 mt-1">Richiedono attenzione</p>
        </div>
      </div>

      {/* KPI 4: Monitor in Down */}
      <div className="kpi-card">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Monitor in Down</span>
          <div className={`p-2 rounded-full flex items-center justify-center ${
            monitorsDown > 0 
              ? "bg-[hsl(var(--error)/0.08)] text-[hsl(var(--error))] animate-pulse" 
              : "bg-neutral-900/50 text-neutral-500"
          }`}>
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <span className={`text-3xl font-bold font-display ${monitorsDown > 0 ? "text-[hsl(var(--error))]" : "text-white"}`}>
            {monitorsDown}
          </span>
          <p className="text-[10px] text-neutral-500 mt-1">
            {monitorsDown === 1 ? "Monitor non raggiungibile" : "Monitor non raggiungibili"}
          </p>
        </div>
      </div>

      {/* KPI 5: Monitor Attivi */}
      <div className="kpi-card">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Monitor Attivi</span>
          <div className="p-2 rounded-full bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] flex items-center justify-center">
            <Server className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <span className="text-3xl font-bold font-display text-white">
            {activeMonitors} <span className="text-neutral-600 text-lg">/ {totalMonitors}</span>
          </span>
          <p className="text-[10px] text-neutral-500 mt-1">Abilitati sul totale</p>
        </div>
      </div>
    </div>
  );
};
