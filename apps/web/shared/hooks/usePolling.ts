"use client";

import { useEffect, useRef } from "react";

interface UsePollingOptions {
  fn: () => Promise<void> | void;
  intervalMs?: number;
  enabled?: boolean;
}

export function usePolling({ fn, intervalMs = 10000, enabled = true }: UsePollingOptions) {
  const fnRef = useRef(fn);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveErrorsRef = useRef(0);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    let isStopped = false;

    const run = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        // Se la tab è in background, non facciamo fetch, riproviamo tra 2 secondi a controllare
        if (!isStopped) {
          timeoutRef.current = setTimeout(run, 2000);
        }
        return;
      }

      try {
        await fnRef.current();
        consecutiveErrorsRef.current = 0;
      } catch (error) {
        console.error("[usePolling] Errore di polling:", error);
        consecutiveErrorsRef.current += 1;
      }

      // Backoff esponenziale su errore (max 5x dell'intervallo di base)
      const multiplier = Math.min(Math.pow(2, consecutiveErrorsRef.current), 5);
      const nextInterval = intervalMs * multiplier;

      if (!isStopped) {
        timeoutRef.current = setTimeout(run, nextInterval);
      }
    };

    timeoutRef.current = setTimeout(run, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        consecutiveErrorsRef.current = 0;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        run();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isStopped = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [intervalMs, enabled]);
}

