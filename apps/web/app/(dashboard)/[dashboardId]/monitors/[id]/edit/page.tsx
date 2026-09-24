import React from "react";
import { getMonitorById } from "@/core/services/monitor-query-service";
import { EditMonitorClient } from "./EditMonitorClient";

interface PageProps {
  params: Promise<{ dashboardId: string; id: string }>;
}

export default async function EditMonitorPage(props: PageProps) {
  const { id } = await props.params;
  const monitor = await getMonitorById(id);

  return <EditMonitorClient initialMonitor={monitor} monitorId={id} />;
}
