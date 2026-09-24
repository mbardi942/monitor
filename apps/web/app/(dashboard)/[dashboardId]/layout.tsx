import React from "react";
import { notFound } from "next/navigation";
import { DashboardProvider } from "@/features/dashboard/context/DashboardContext";
import { DashboardShell } from "@/features/dashboard/components/DashboardShell";
import { getDashboards } from "@/core/services/dashboard-query-service";
import { getMonitorsForDashboard, computeDashboardMetrics } from "@/core/services/monitor-query-service";
import { getAlarmsForDashboard } from "@/core/services/alarm-query-service";
import { getReportsForDashboard } from "@/core/services/report-query-service";
import { getRecipientsForDashboard } from "@/core/services/recipient-query-service";
import { getAuthProfilesForDashboard } from "@/core/services/auth-profile-query-service";

export const dynamic = "force-dynamic";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ dashboardId: string }>;
}

export default async function DashboardIdLayout({ children, params }: LayoutProps) {
  const { dashboardId } = await params;

  const dashboards = await getDashboards();
  const activeDashboard = dashboards.find((d) => d.id === dashboardId) ?? null;

  if (!activeDashboard) {
    notFound();
  }

  const [monitors, alarms, reports, recipients, authProfiles] = await Promise.all([
    getMonitorsForDashboard(dashboardId),
    getAlarmsForDashboard(dashboardId),
    getReportsForDashboard(dashboardId),
    getRecipientsForDashboard(dashboardId),
    getAuthProfilesForDashboard(dashboardId),
  ]);

  const activeAlarms = alarms.filter((a) => a.status !== "RESOLVED").length;
  const metrics = computeDashboardMetrics(monitors);

  const fullMetrics = {
    ...metrics,
    activeAlarms,
  };


  return (
    <DashboardProvider
      key={dashboardId}
      initialData={{ dashboards, activeDashboard, monitors, alarms, reports, recipients, authProfiles, metrics: fullMetrics }}
    >
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
