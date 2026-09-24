import React from "react";
import { AlertTriangle, AlertOctagon } from "lucide-react";
import { MonitorDTO } from '@/core/ports/gateways';

interface TriageBannerProps {
  monitor: MonitorDTO;
  alarms: any[];
}

export const TriageBanner: React.FC<TriageBannerProps> = ({ monitor, alarms }) => {
  const isDown = monitor.status === "DOWN";
  const isCritical = monitor.dataHealthStatus === "CRITICAL";

  if (!isDown && !isCritical) {
    return null;
  }

  // Trova l'ultimo allarme aperto associato a questo stato (molto basico)
  const activeAlarm = alarms.find(a => a.monitorId === monitor.id && a.status !== "RESOLVED");

  return (
    <div className={`mb-6 p-4 border rounded-[var(--radius)] flex flex-col md:flex-row gap-4 items-start md:items-center ${
      isDown 
        ? "bg-[hsl(var(--error)/0.15)] border-[hsl(var(--error)/0.5)] text-[hsl(var(--error))]" 
        : "bg-[hsl(var(--warning)/0.15)] border-[hsl(var(--warning)/0.5)] text-[hsl(var(--warning))]"
    }`}>
      <div className="flex-shrink-0">
        {isDown ? <AlertOctagon className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
      </div>
      <div className="flex-1">
        <h3 className="text-base font-bold mb-1">
          {isDown ? "EMERGENZA: Check Fallito (Servizio Irraggiungibile)" : "ALLARME CRITICO: Regole Metriche Fallite"}
        </h3>
        <p className="text-sm opacity-90">
          {activeAlarm 
            ? `Dettaglio allarme: ${activeAlarm.severity} - ${activeAlarm.alarmType === 'AVAILABILITY' ? 'Timeout o errore HTTP' : 'Soglie superate'}. Aperto alle ${new Date(activeAlarm.openedAt).toLocaleTimeString()}` 
            : isDown 
              ? "Il servizio non risponde alle richieste del probe (HTTP/TCP)." 
              : "I dati restituiti violano le regole di validazione configurate."}
        </p>
      </div>
      <div className="flex-shrink-0 text-xs font-mono opacity-80 text-right">
        Ultimo Check: {monitor.recentExecutions?.[0] ? new Date(monitor.recentExecutions[0].timestamp).toLocaleTimeString() : "--"}
        <br />
        Errore: {isDown ? "DOWN" : "CRITICAL_DATA"}
      </div>
    </div>
  );
};
