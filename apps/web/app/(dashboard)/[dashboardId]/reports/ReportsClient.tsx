"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useDashboard } from "@/features/dashboard/context/DashboardContext";
import { ReportsList } from "@/features/reports/components/ReportsList";
import { ReportDTO } from "@/core/ports/gateways";

export function ReportsClient() {
  const router = useRouter();
  const params = useParams();
  const { reports, refreshData } = useDashboard();
  const dashboardId = (params?.dashboardId as string) || "";

  const handleSelectReport = (report: ReportDTO) => {
    router.push(`/${dashboardId}/reports/${report.id}`);
  };

  return (
    <ReportsList
      dashboardId={dashboardId}
      reports={reports}
      onSelectReport={handleSelectReport}
      onRefresh={refreshData}
    />
  );
}
