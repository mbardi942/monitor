"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useDashboard } from "@/features/dashboard/context/DashboardContext";
import { MonitorForm } from "@/features/monitors/components/MonitorForm";

export function NewMonitorClient() {
  const router = useRouter();
  const params = useParams();
  const { refreshData } = useDashboard();
  const dashboardId = (params?.dashboardId as string) || "";
  const basePath = `/${dashboardId}`;

  const handleBack = () => {
    router.push(basePath);
  };

  const handleSaved = async () => {
    await refreshData();
    router.push(basePath);
  };

  return (
    <MonitorForm
      dashboardId={dashboardId}
      editingMonitor={undefined}
      onBack={handleBack}
      onSaved={handleSaved}
    />
  );
}
