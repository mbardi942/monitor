"use client";

import React from "react";
import { useDashboard } from "@/features/dashboard/context/DashboardContext";
import { RecipientSettings } from "@/features/recipients/components/RecipientSettings";
import { useParams } from "next/navigation";

export function RecipientsClient() {
  const params = useParams();
  const { recipients, refreshData } = useDashboard();
  const dashboardId = (params?.dashboardId as string) || "";

  return (
    <RecipientSettings
      dashboardId={dashboardId}
      recipients={recipients}
      onRefresh={refreshData}
    />
  );
}
