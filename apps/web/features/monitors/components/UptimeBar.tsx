"use client";

import React, { useMemo } from "react";
import { calculateLatencyStats, ExecutionItem } from "../lib/latency-stats";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface UptimeBarProps {
  recentExecutions?: ExecutionItem[];
}

export const UptimeBar: React.FC<UptimeBarProps> = ({ recentExecutions = [] }) => {
  const stats = useMemo(() => calculateLatencyStats(recentExecutions), [recentExecutions]);

  if (stats.totalChecks === 0) {
    return (
      <div className="flex items-center justify-between text-[11px] text-neutral-500 py-1.5 border-t border-neutral-800/40">
        <span>Esito ultimi controlli</span>
        <span className="font-mono text-neutral-600">Nessun check</span>
      </div>
    );
  }

  const isAllOk = stats.failedChecks === 0;

  return (
    <div className="flex items-center justify-between text-[11px] py-1.5 border-t border-neutral-800/40">
      <span className="text-neutral-400 font-medium flex items-center gap-1.5">
        {isAllOk ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5 text-[hsl(var(--error))]" />
        )}
        Esito ultimi controlli:
      </span>

      <div className="flex items-center gap-1.5 font-mono text-[11px]">
        {isAllOk ? (
          <span className="text-[hsl(var(--success))] font-semibold">
            {stats.successChecks}/{stats.totalChecks} OK ({stats.successRate}%)
          </span>
        ) : (
          <span className="text-[hsl(var(--error))] font-semibold">
            {stats.successChecks}/{stats.totalChecks} OK ({stats.failedChecks} fallit{stats.failedChecks === 1 ? "o" : "i"})
          </span>
        )}
      </div>
    </div>
  );
};
