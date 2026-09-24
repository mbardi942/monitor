"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useDashboard } from "@/features/dashboard/context/DashboardContext";
import { MonitorDetail } from "@/features/monitors/components/MonitorDetail";
import { ArrowLeft } from "lucide-react";
import { MonitorDTO } from "@/core/ports/gateways";

interface MonitorDetailClientProps {
  initialMonitor: MonitorDTO | null;
  monitorId: string;
}

export function MonitorDetailClient({ initialMonitor, monitorId }: MonitorDetailClientProps) {
  const router = useRouter();
  const params = useParams();
  const { monitors, alarms, refreshData } = useDashboard();

  const dashboardId = (params?.dashboardId as string) || "";
  const basePath = `/${dashboardId}`;

  // Preferisci i dati live dal context (aggiornamenti ottimistici / polling),
  // con fallback al monitor caricato in SSR (che include le esecuzioni recenti).
  const monitor = monitors.find((m) => m.id === monitorId) ?? initialMonitor;

  const handleBack = () => {
    router.push(basePath);
  };

  const handleEdit = () => {
    router.push(`${basePath}/monitors/${monitorId}/edit`);
  };

  if (!monitor) {
    return (
      <div className="glass-panel p-12 text-center text-neutral-400 flex flex-col items-center justify-center gap-3">
        <p className="text-sm font-medium text-white">Monitor non trovato</p>
        <p className="text-xs text-neutral-500">
          Il monitor con ID "{monitorId}" potrebbe non esistere o appartiene ad un'altra dashboard.
        </p>
        <button onClick={handleBack} className="btn-primary flex items-center gap-2 mt-2">
          <ArrowLeft className="w-4 h-4" /> Torna alla Panoramica
        </button>
      </div>
    );
  }

  return (
    <MonitorDetail
      monitorId={monitorId}
      dashboardId={dashboardId}
      monitor={monitor}
      alarms={alarms}
      onBack={handleBack}
      onEdit={handleEdit}
      onRefresh={refreshData}
    />
  );
}
