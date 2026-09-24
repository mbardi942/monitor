"use client";

import React from "react";
import { useGateways } from "@/context/gateway-context";

export const ConnectionStatus: React.FC = () => {
  const { useMock } = useGateways();

  return (
    <div className="bg-neutral-950 p-3.5 border border-neutral-900 rounded-[var(--radius-inner)] flex flex-col gap-2">
      <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Stato di Connessione</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${useMock ? "bg-amber-500 animate-pulse shadow-[0_0_8px_1px_rgba(245,158,11,0.4)]" : "bg-[hsl(var(--success))] animate-pulse shadow-[0_0_8px_1px_rgba(16,185,129,0.4)]"}`} />
        <span className="text-xs font-semibold text-white font-mono uppercase">
          {useMock ? "Modalità Mock" : "Real-time (DB)"}
        </span>
      </div>
      <p className="text-[9px] text-neutral-500 leading-normal">
        {useMock
          ? "Usa dati in memoria locali. Cambia NEXT_PUBLIC_USE_MOCK=false per connetterti al database PostgreSQL."
          : "Connesso all'infrastruttura PostgreSQL e BullMQ."}
      </p>
    </div>
  );
};
