"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logga l'errore su servizi di monitoraggio se presenti (o in console)
    console.error("Route Error caught in Dashboard:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="p-4 bg-[hsl(var(--error)/0.08)] border border-[hsl(var(--error)/0.18)] text-[hsl(var(--error))] rounded-full mb-6 animate-pulse">
        <AlertCircle className="w-12 h-12" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-3 tracking-tight font-display">
        Qualcosa è andato storto nella Dashboard
      </h1>
      
      <p className="text-neutral-400 text-sm max-w-md mb-8 leading-relaxed">
        Non è stato possibile caricare questa pagina della dashboard. Si è verificato un errore imprevisto. 
        {error.message && (
          <span className="block mt-2 font-mono text-xs text-neutral-500 bg-neutral-950 p-2 rounded border border-neutral-900/60 max-w-full overflow-auto text-ellipsis">
            {error.message}
          </span>
        )}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
        <button
          onClick={() => reset()}
          className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <RefreshCw className="w-4 h-4" /> Riprova a caricare
        </button>
        
        <Link
          href="/"
          className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Home className="w-4 h-4" /> Torna alla Home
        </Link>
      </div>
    </div>
  );
}
