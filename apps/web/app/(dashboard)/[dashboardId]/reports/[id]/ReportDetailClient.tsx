"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useDashboard } from "@/features/dashboard/context/DashboardContext";
import { ReportDetail } from "@/features/reports/components/ReportDetail";
import { ArrowLeft } from "lucide-react";

interface ReportDetailClientProps {
  reportId: string;
}

export function ReportDetailClient({ reportId }: ReportDetailClientProps) {
  const router = useRouter();
  const params = useParams();
  const { reports, monitors, refreshData } = useDashboard();
  const dashboardId = (params?.dashboardId as string) || "";
  const basePath = `/${dashboardId}`;

  const report = reports.find((r) => r.id === reportId) ?? null;

  const handleBack = () => {
    router.push(`${basePath}/reports`);
  };

  if (!report) {
    return (
      <div className="glass-panel p-12 text-center text-neutral-400 flex flex-col items-center justify-center gap-3">
        <p className="text-sm font-medium text-white">Report non trovato</p>
        <p className="text-xs text-neutral-500">
          Il report con ID "{reportId}" potrebbe non esistere o appartiene ad un'altra dashboard.
        </p>
        <button onClick={handleBack} className="btn-primary flex items-center gap-2 mt-2">
          <ArrowLeft className="w-4 h-4" /> Torna ai Report
        </button>
      </div>
    );
  }

  return (
    <ReportDetail
      report={report}
      allMonitors={monitors}
      onBack={handleBack}
      onRefresh={refreshData}
    />
  );
}
