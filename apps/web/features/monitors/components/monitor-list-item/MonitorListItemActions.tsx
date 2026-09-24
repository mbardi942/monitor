import React from "react";
import { Play, Pause, RefreshCw, ChevronRight, Copy } from "lucide-react";
import { MonitorDTO } from '@/core/ports/gateways';

interface MonitorListItemActionsProps {
  monitor: MonitorDTO;
  isPending: boolean;
  isExecuting: boolean;
  onPauseToggle: (e: React.MouseEvent) => void;
  onExecuteCheck: (e: React.MouseEvent) => void;
  onClone?: (e: React.MouseEvent) => void;
}

export const MonitorListItemActions: React.FC<MonitorListItemActionsProps> = ({
  monitor,
  isPending,
  isExecuting,
  onPauseToggle,
  onExecuteCheck,
  onClone,
}) => {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <div className="flex items-center gap-1">
        <button
          onClick={onPauseToggle}
          disabled={isPending}
          className="btn-icon"
          title={monitor.status === "PAUSED" ? "Attiva Monitor" : "Metti in Pausa"}
        >
          {monitor.status === "PAUSED" ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
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
      <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors" />
    </div>
  );
};
