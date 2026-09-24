"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { LayoutDashboard, Bell, FileText, Users, KeyRound } from "lucide-react";
import { DashboardSelector } from "./DashboardSelector";
import { ConnectionStatus } from "./ConnectionStatus";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const params = useParams();
  const dashboardId = (params?.dashboardId as string) || "";
  const base = `/${dashboardId}`;

  // Sotto-percorso relativo alla dashboard attiva (es. "/alarms", "" per overview)
  const subPath = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;

  const isActive = (path: string) => {
    if (path === "") {
      return subPath === "" || subPath === "/" || subPath.startsWith("/monitors");
    }
    return subPath.startsWith(path);
  };

  return (
    <aside className="w-64 bg-[hsl(var(--card-bg))] flex flex-col justify-between p-5 hidden md:flex shrink-0 relative">
      {/* Linea divisoria verticale sfumata */}
      <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[hsl(var(--primary)/0.25)] to-transparent" />
      <div className="flex flex-col gap-6">
        {/* Logo / Branding */}
        <div className="flex items-center gap-2 px-2">
          <div className="w-6 h-6 rounded-lg bg-[hsl(var(--card-bg))] border border-[hsl(var(--card-border))] flex items-center justify-center">
            <span className="w-2 h-2 rounded-full pulse-dot-up" />
          </div>
          <span className="font-display font-bold text-white text-base tracking-tight">API Monitor</span>
        </div>

        {/* Selettore Dashboard */}
        <DashboardSelector />

        {/* Link di Navigazione */}
        <nav className="flex flex-col gap-1">
          <Link
            href={`${base}`}
            className={isActive("") ? "nav-item-active" : "nav-item"}
          >
            <LayoutDashboard className="w-4 h-4" /> Panoramica
          </Link>
          <Link
            href={`${base}/alarms`}
            className={isActive("/alarms") ? "nav-item-active" : "nav-item"}
          >
            <Bell className="w-4 h-4" /> Allarmi
          </Link>
          <Link
            href={`${base}/reports`}
            className={isActive("/reports") ? "nav-item-active" : "nav-item"}
          >
            <FileText className="w-4 h-4" /> Report Uptime
          </Link>
          <Link
            href={`${base}/recipients`}
            className={isActive("/recipients") ? "nav-item-active" : "nav-item"}
          >
            <Users className="w-4 h-4" /> Destinatari Alert
          </Link>
          <Link
            href={`${base}/credentials`}
            className={isActive("/credentials") ? "nav-item-active" : "nav-item"}
          >
            <KeyRound className="w-4 h-4" /> Credenziali & Vault
          </Link>
        </nav>
      </div>


      {/* Info Mode / Connection Status */}
      <ConnectionStatus />
    </aside>
  );
};
