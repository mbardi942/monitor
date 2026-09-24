"use client";

import React from "react";
import { MonitorDTO } from '@/core/ports/gateways';
import { useMonitorActions } from '../hooks/useMonitorActions';
import { getMonitorPresentation } from '../lib/monitor-presentation';
import { MonitorListItemBadge } from "./monitor-list-item/MonitorListItemBadge";
import { MonitorListItemDetails } from "./monitor-list-item/MonitorListItemDetails";
import { MonitorListItemActions } from "./monitor-list-item/MonitorListItemActions";

interface MonitorListItemProps {
  monitor: MonitorDTO;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  onPrefetch?: (id: string) => void;
  onClone?: (monitor: MonitorDTO) => void;
}

export const MonitorListItem: React.FC<MonitorListItemProps> = ({ monitor, onSelect, onRefresh, onPrefetch, onClone }) => {
  const { pauseToggle, executeCheck, isExecuting, isPending } = useMonitorActions(onRefresh);

  const handlePauseToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await pauseToggle(monitor.id, monitor.status);
  };

  const handleExecuteCheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await executeCheck(monitor.id);
  };

  const handleClone = onClone
    ? (e: React.MouseEvent) => {
        e.stopPropagation();
        onClone(monitor);
      }
    : undefined;

  const presentation = getMonitorPresentation(monitor);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(monitor.id)}
      onMouseEnter={() => onPrefetch && onPrefetch(monitor.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(monitor.id);
        }
      }}

      aria-label={`Dettagli del monitor ${monitor.name}`}
      className="flex items-center justify-between p-3 bg-[hsl(260_25%_4.5%)] hover:bg-neutral-800/40 border border-[hsl(var(--border-color))]/50 hover:border-[hsl(var(--primary)/0.4)] rounded-[var(--radius-inner)] transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <MonitorListItemBadge monitor={monitor} />
        <MonitorListItemDetails monitor={monitor} presentation={presentation} />
      </div>

      <MonitorListItemActions
        monitor={monitor}
        isPending={isPending}
        isExecuting={isExecuting}
        onPauseToggle={handlePauseToggle}
        onExecuteCheck={handleExecuteCheck}
        onClone={handleClone}
      />
    </div>
  );
};

