"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useDashboard } from "@/features/dashboard/context/DashboardContext";
import { MonitorForm } from "@/features/monitors/components/MonitorForm";
import { ArrowLeft } from "lucide-react";
import { MonitorDTO } from "@/core/ports/gateways";

interface EditMonitorClientProps {
  initialMonitor: MonitorDTO | null;
  monitorId: string;
}

export function EditMonitorClient({ initialMonitor, monitorId }: EditMonitorClientProps) {
  const router = useRouter();
  const params = useParams();
  const { monitors, refreshData } = useDashboard();
  const dashboardId = (params?.dashboardId as string) || "";
  const monitorPath = `/${dashboardId}/monitors/${monitorId}`;

  const monitor = monitors.find((m) => m.id === monitorId) ?? initialMonitor;

  const handleBack = () => {
    router.push(monitorPath);
  };

  const handleSaved = async () => {
    await refreshData();
    router.push(monitorPath);
  };

  if (!monitor) {
    return (
      <div className="glass-panel p-12 text-center text-neutral-400 flex flex-col items-center justify-center gap-3">
        <p className="text-sm font-medium text-white">Monitor non trovato</p>
        <p className="text-xs text-neutral-500">
          Il monitor con ID "{monitorId}" potrebbe non esistere o appartiene ad un'altra dashboard.
        </p>
        <button onClick={handleBack} className="btn-primary flex items-center gap-2 mt-2">
          <ArrowLeft className="w-4 h-4" /> Annulla
        </button>
      </div>
    );
  }

  return (
    <MonitorForm
      dashboardId={dashboardId}
      editingMonitor={monitor}
      onBack={handleBack}
      onSaved={handleSaved}
    />
  );
}
