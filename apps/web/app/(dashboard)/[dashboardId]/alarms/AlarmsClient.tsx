"use client";

import React from "react";
import { useDashboard } from "@/features/dashboard/context/DashboardContext";
import { AlarmsList } from "@/features/alarms/components/AlarmsList";

export function AlarmsClient() {
  const { alarms, refreshData } = useDashboard();

  return <AlarmsList alarms={alarms} onRefresh={refreshData} />;
}
