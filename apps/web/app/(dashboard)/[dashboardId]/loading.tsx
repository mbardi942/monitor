import React from "react";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* 1. Skeletons per le 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-panel p-6 flex flex-col justify-between h-[120px] bg-neutral-900/35 border-neutral-800/40">
            <div className="flex justify-between items-start">
              <div className="h-3 w-24 bg-neutral-800 rounded" />
              <div className="h-8 w-8 bg-neutral-800 rounded-lg" />
            </div>
            <div className="h-6 w-16 bg-neutral-800 rounded mt-4" />
          </div>
        ))}
      </div>

      {/* 2. Skeleton per i Controlli & Filtri */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-neutral-950/20 p-4 border border-neutral-900 rounded-[var(--radius)]">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 w-14 bg-neutral-900 border border-neutral-800/50 rounded-lg" />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-64 bg-neutral-900 border border-neutral-800/50 rounded-lg" />
          <div className="h-8 w-20 bg-neutral-800 rounded-lg" />
        </div>
      </div>

      {/* 3. Skeleton per la Griglia dei Monitor */}
      <div className="bento-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="glass-panel p-5 flex flex-col justify-between h-[210px] bg-neutral-900/35 border-neutral-800/40"
          >
            <div>
              {/* Card Header Skeleton */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-neutral-800 rounded" />
                  <div className="h-3 w-48 bg-neutral-900 rounded" />
                </div>
                <div className="h-5 w-16 bg-neutral-900 rounded-full" />
              </div>

              {/* Uptime Bar Skeleton */}
              <div className="mt-6">
                <div className="flex justify-between text-[10px] mb-1.5">
                  <div className="h-2 w-12 bg-neutral-900 rounded" />
                  <div className="h-2 w-12 bg-neutral-900 rounded" />
                </div>
                <div className="flex gap-0.5 h-6 items-center">
                  {Array.from({ length: 30 }).map((_, idx) => (
                    <div key={idx} className="h-4 flex-1 bg-neutral-800/70 rounded-xs" />
                  ))}
                </div>
              </div>
            </div>

            {/* Card Footer Skeleton */}
            <div className="flex justify-between items-center border-t border-neutral-900/60 pt-4 mt-4">
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-neutral-900 rounded" />
                <div className="h-2.5 w-24 bg-neutral-900 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-7 w-7 bg-neutral-900 rounded-lg" />
                <div className="h-7 w-7 bg-neutral-900 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
