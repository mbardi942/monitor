import React from "react";
import { Play, Pause, RefreshCw, ChevronRight, Copy } from "lucide-react";
import { MonitorDTO } from '@/core/ports/gateways';

interface MonitorCardFooterProps {
  monitor: MonitorDTO;
  isPending: boolean;
  isExecuting: boolean;
  onPauseToggle: (e: React.MouseEvent) => void;
  onExecuteCheck: (e: React.MouseEvent) => void;
  onClone?: (e: React.MouseEvent) => void;
}

export const MonitorCardFooter: React.FC<MonitorCardFooterProps> = ({
  monitor,
  isPending,
  isExecuting,
  onPauseToggle,
  onExecuteCheck,
  onClone,
}) => {
  return (
    <div className="flex items-center justify-between border-t border-[hsl(var(--border-color))]/40 pt-3 mt-1">
      <div className="flex gap-2">
        <button
          onClick={onPauseToggle}
          disabled={isPending}
          className={`btn-icon ${
            isPending ? "opacity-55 cursor-not-allowed" : ""
          }`}
          title={monitor.status === "PAUSED" ? "Attiva Monitor" : "Metti in Pausa"}
        >
          {monitor.status === "PAUSED" ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
        </button>
        <button
          onClick={onExecuteCheck}
          disabled={monitor.status === "PAUSED" || isExecuting || isPending}
          className={`btn-icon ${monitor.status === "PAUSED" || isPending ? "opacity-40 cursor-not-allowed" : ""}`}
          title="Esegui Check Ora"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isExecuting ? "animate-spin text-white" : ""}`} />
        </button>
        {onClone && (
          <button
            onClick={onClone}
            disabled={isPending}
            className={`btn-icon ${isPending ? "opacity-40 cursor-not-allowed" : ""}`}
            title="Duplica Monitor"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <span className="text-[10px] text-neutral-500 font-medium inline-flex items-center gap-1 transition-colors">
        Dettagli <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </div>
  );
};
