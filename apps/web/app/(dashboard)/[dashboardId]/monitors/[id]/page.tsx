import React from "react";
import { getMonitorById } from "@/core/services/monitor-query-service";
import { MonitorDetailClient } from "./MonitorDetailClient";

interface PageProps {
  params: Promise<{ dashboardId: string; id: string }>;
}

export default async function MonitorDetailPage(props: PageProps) {
  const { id } = await props.params;
  const monitor = await getMonitorById(id);

  return <MonitorDetailClient initialMonitor={monitor} monitorId={id} />;
}
