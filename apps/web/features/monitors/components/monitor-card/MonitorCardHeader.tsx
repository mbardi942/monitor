import React from "react";
import { MonitorDTO } from '@/core/ports/gateways';
import { getStatusDotClass } from "@/shared/lib/status-helpers";
import { AlertTriangle } from "lucide-react";

interface MonitorCardHeaderProps {
  monitor: MonitorDTO;
}

export const MonitorCardHeader: React.FC<MonitorCardHeaderProps> = ({ monitor }) => {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 mt-0.5">
        <span className={`${getStatusDotClass(monitor.status)} shrink-0`} />
        <h3 
          className="text-base text-white transition-colors duration-200 truncate max-w-[170px]" 
          title={`${monitor.name} (Stato: ${monitor.status})`}
        >
          {monitor.name}
        </h3>
      </div>
      <div className="flex items-center gap-1.5">
        {(monitor.dataHealthStatus === "WARNING" || monitor.dataHealthStatus === "CRITICAL") && (
          <div 
            className={`p-1 rounded-[var(--radius-inner)] bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))] ${
              monitor.dataHealthStatus === "CRITICAL" ? "text-[hsl(var(--error))]" : "text-[hsl(var(--warning))]"
            }`}
            title={`Allarme dati attivo: salute dati ${monitor.dataHealthStatus}`}
          >
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};
