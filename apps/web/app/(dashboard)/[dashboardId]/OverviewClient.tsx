"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useDashboard } from "@/features/dashboard/context/DashboardContext";
import { Overview } from "@/features/dashboard/components/Overview";

export function OverviewClient() {
  const router = useRouter();
  const params = useParams();
  const { monitors, alarms, metrics, refreshData } = useDashboard();

  const dashboardId = (params?.dashboardId as string) || "";
  const basePath = `/${dashboardId}`;

  const handleSelectMonitor = React.useCallback((id: string) => {
    router.push(`${basePath}/monitors/${id}`);
  }, [router, basePath]);

  const handlePrefetchMonitor = React.useCallback((id: string) => {
    router.prefetch(`${basePath}/monitors/${id}`);
  }, [router, basePath]);

  const handleCreateMonitor = React.useCallback(() => {
    router.push(`${basePath}/monitors/new`);
  }, [router, basePath]);

  return (
    <Overview
      monitors={monitors}
      alarms={alarms}
      metrics={metrics}
      currentDashboardId={dashboardId}
      onSelectMonitor={handleSelectMonitor}
      onPrefetchMonitor={handlePrefetchMonitor}
      onCreateMonitorClick={handleCreateMonitor}
      onRefresh={refreshData}
    />
  );
}

