"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface MonitorChartProps {
  chartData: Array<{
    time: string;
    [key: string]: any;
  }>;
  dataKey?: string;
  unit?: string;
  label?: string;
  referenceLines?: Array<{
    value: number;
    label: string;
    stroke?: string;
  }>;
}

export default function MonitorChart({
  chartData,
  dataKey = "responseTime",
  unit = "ms",
  label = "Risposta",
  referenceLines = [],
}: MonitorChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-color))" vertical={false} opacity={0.5} />
        <XAxis dataKey="time" stroke="hsl(var(--muted))" fontSize={10} tickLine={false} opacity={0.8} />
        <YAxis stroke="hsl(var(--muted))" fontSize={10} tickLine={false} opacity={0.8} />
        <Tooltip
          contentStyle={{ 
            backgroundColor: "hsl(var(--card-bg))", 
            borderColor: "hsl(var(--border-color))", 
            borderRadius: "var(--radius-inner)",
            boxShadow: "var(--shadow-glow)"
          }}
          labelStyle={{ fontSize: "11px", color: "hsl(var(--muted))" }}
          itemStyle={{ fontSize: "12px", color: "hsl(var(--foreground))" }}
          formatter={(value) => [`${value} ${unit}`, label]}
          isAnimationActive={false}
        />
        {referenceLines.map((line, idx) => (
          <ReferenceLine
            key={idx}
            y={line.value}
            stroke={line.stroke || "hsl(var(--error))"}
            strokeDasharray="3 3"
            label={{
              value: line.label,
              fill: line.stroke || "hsl(var(--error))",
              fontSize: 9,
              position: "top",
            }}
          />
        ))}
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorResponse)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
