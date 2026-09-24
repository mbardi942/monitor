import React from "react";
import { AlertTriangle } from "lucide-react";
import { MonitorDTO } from '@/core/ports/gateways';
import { getStatusDotClass } from "@/shared/lib/status-helpers";

interface MonitorListItemBadgeProps {
  monitor: MonitorDTO;
}

export const MonitorListItemBadge: React.FC<MonitorListItemBadgeProps> = ({ monitor }) => {
  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <span className={`${getStatusDotClass(monitor.status)} shrink-0`} />
      <h3 className="text-sm font-semibold text-white truncate" title={monitor.name}>
        {monitor.name}
      </h3>
      {(monitor.dataHealthStatus === "WARNING" || monitor.dataHealthStatus === "CRITICAL") && (
        <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${monitor.dataHealthStatus === "CRITICAL" ? "text-[hsl(var(--error))]" : "text-[hsl(var(--warning))]"} animate-pulse`} />
      )}
    </div>
  );
};
