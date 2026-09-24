import React from "react";
import { MonitorDTO } from '@/core/ports/gateways';
import { MonitorPresentation } from '../../lib/monitor-presentation';

interface MonitorCardBackgroundProps {
  monitor: MonitorDTO;
  presentation: MonitorPresentation;
}

export const MonitorCardBackground: React.FC<MonitorCardBackgroundProps> = ({ monitor, presentation }) => {
  if (presentation.kind === "METRIC_VALUE" && presentation.showTrend && presentation.trendPoints.length > 1) {
    const vals = presentation.trendPoints.map((t) => t.value);
    const width = 100;
    const height = 40;
    const padding = 2;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min === 0 ? 1 : max - min;

    const points = vals.map((val, idx) => {
      const x = (idx / (vals.length - 1)) * width;
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    });
    const svgPath = `M ${points.join(" L ")}`;
    const areaPath = `${svgPath} L ${width},${height} L 0,${height} Z`;

    const isWarning = monitor.dataHealthStatus === "WARNING" || monitor.status === "DEGRADED";
    const isError = monitor.dataHealthStatus === "CRITICAL" || monitor.status === "DOWN";
    const themeColor = isError ? "hsl(var(--error))" : isWarning ? "hsl(var(--warning))" : "hsl(var(--primary))";

    return (
      <div className="absolute inset-x-0 bottom-0 top-1/4 opacity-10 group-hover:opacity-20 pointer-events-none transition-opacity duration-300 z-0">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
          <defs>
            <linearGradient id={`card-bg-grad-${monitor.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={themeColor} stopOpacity={0.4} />
              <stop offset="100%" stopColor={themeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <path
            d={areaPath}
            fill={`url(#card-bg-grad-${monitor.id})`}
          />
          <path
            d={svgPath}
            fill="none"
            stroke={themeColor}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }
  return null;
};
