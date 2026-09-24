"use client";

import React from "react";
import { MonitorDTO } from '@/core/ports/gateways';
import { useMonitorActions } from '../hooks/useMonitorActions';
import { UptimeBar } from './UptimeBar';
import { getMonitorPresentation } from '../lib/monitor-presentation';
import { MonitorCardHeader } from "./monitor-card/MonitorCardHeader";
import { MonitorCardBackground } from "./monitor-card/MonitorCardBackground";
import { MonitorCardBody } from "./monitor-card/MonitorCardBody";
import { MonitorCardFooter } from "./monitor-card/MonitorCardFooter";

interface MonitorCardProps {
  monitor: MonitorDTO;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  onPrefetch?: (id: string) => void;
  onClone?: (monitor: MonitorDTO) => void;
}

const getStatusCardClasses = (status: string) => {
  switch (status) {
    case "UP":
      return "!border-t-2 !border-t-[hsl(var(--success))] bg-[hsl(var(--success)/0.01)]";
    case "DOWN":
      return "!border-t-2 !border-t-[hsl(var(--error))] bg-[hsl(var(--error)/0.02)]";
    case "DEGRADED":
      return "!border-t-2 !border-t-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.015)]";
    case "PAUSED":
      return "!border-t-2 !border-t-[hsl(var(--muted)/0.3)]";
    default:
      return "";
  }
};

const MonitorCardComponent: React.FC<MonitorCardProps> = ({ monitor, onSelect, onRefresh, onPrefetch, onClone }) => {
  const { pauseToggle, executeCheck, isExecuting, isPending } = useMonitorActions(onRefresh);
  const presentation = getMonitorPresentation(monitor);

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
      className={`glass-panel glass-panel-hover p-5 flex flex-col justify-between cursor-pointer relative overflow-hidden group min-h-[160px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] ${getStatusCardClasses(monitor.status)}`}
    >
      <MonitorCardBackground monitor={monitor} presentation={presentation} />

      <div className="relative z-10 flex flex-col justify-between h-full flex-grow">
        <div>
          <MonitorCardHeader monitor={monitor} />
          <MonitorCardBody monitor={monitor} presentation={presentation} />
        </div>
 
        {presentation.kind === "REACHABILITY" && (
          <div className="mb-2">
            <UptimeBar recentExecutions={monitor.recentExecutions} />
          </div>
        )}
 
        <MonitorCardFooter
          monitor={monitor}
          isPending={isPending}
          isExecuting={isExecuting}
          onPauseToggle={handlePauseToggle}
          onExecuteCheck={handleExecuteCheck}
          onClone={handleClone}
        />
      </div>
    </div>
  );
};
 
export const MonitorCard = React.memo(MonitorCardComponent);

