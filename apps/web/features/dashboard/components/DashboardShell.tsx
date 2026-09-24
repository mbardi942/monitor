"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useDashboard } from "../context/DashboardContext";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { error } = useDashboard();
  const params = useParams();
  const dashboardId = (params?.dashboardId as string) || "";
  const base = `/${dashboardId}`;

  const buildUrl = (path: string) => `${base}${path}`;



  return (
    <div className="flex min-h-screen bg-transparent text-neutral-200">
      {/* Sidebar (desktop) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-x-hidden">
        {/* Top Header Mobile */}
        <header className="h-14 bg-[hsl(var(--card-bg))]/30 backdrop-blur-md px-6 flex items-center justify-between md:hidden shrink-0 relative">
          {/* Linea divisoria orizzontale sfumata */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--primary)/0.25)] to-transparent" />
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full pulse-dot-up" />
            </div>
            <span className="font-display font-bold text-white text-sm">API Monitor</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto py-1">
            <Link href={buildUrl("")} className="text-xs text-neutral-400 hover:text-white whitespace-nowrap">Dashboard</Link>
            <Link href={buildUrl("/alarms")} className="text-xs text-neutral-400 hover:text-white whitespace-nowrap">Allarmi</Link>
            <Link href={buildUrl("/reports")} className="text-xs text-neutral-400 hover:text-white whitespace-nowrap">Report</Link>
            <Link href={buildUrl("/recipients")} className="text-xs text-neutral-400 hover:text-white whitespace-nowrap">Destinatari</Link>
            <Link href={buildUrl("/credentials")} className="text-xs text-neutral-400 hover:text-white whitespace-nowrap">Vault</Link>
          </div>
        </header>

        {/* Sync errors notification */}
        {error && (
          <div className="bg-[hsl(var(--error)/0.1)] border-b border-[hsl(var(--error)/0.2)] px-6 py-2 flex items-center gap-2 text-xs text-[hsl(var(--error))]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Pane */}
        <div className="p-6 md:p-8 flex-1 max-w-6xl w-full mx-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};
