import "server-only";
import { mockStore } from "./mock-data";

/**
 * Simulazione di un check in modalita mock (lato server, unica fonte di verita).
 * Replica fedelmente il comportamento atteso: valutazione delle metricRules,
 * aggiornamento di `dataHealthStatus` e gestione differenziata degli allarmi
 * AVAILABILITY vs DATA_METRIC. Muta lo `mockStore` condiviso.
 *
 * Ritorna il risultato del check oppure `null` se il monitor e in pausa / assente.
 */
export function simulateMockCheck(monitorId: string) {
  const monitor = mockStore.monitorsList.find((m) => m.id === monitorId);
  if (!monitor) throw new Error("Monitor non trovato");
  if (monitor.status === "PAUSED") return null;

  const success = Math.random() > 0.15; // 85% di probabilita di successo
  const time = success ? Math.floor(80 + Math.random() * 150) : 0;
  const timestamp = new Date().toISOString();

  const cpuVal = Math.floor(20 + Math.random() * 60);
  const ramVal = Math.floor(40 + Math.random() * 40);
  const diskVal = Math.floor(50 + Math.random() * 30);

  let extractedData: any = undefined;
  if (success) {
    if (monitor.type === "HOST") {
      if (monitor.dataExtractor) {
        const schema = monitor.dataExtractor.schema;
        if (schema.type === "SINGLE_VALUE") {
          const label = schema.label || "valore";
          const val = label.toLowerCase().includes("cpu") ? cpuVal : label.toLowerCase().includes("ram") ? ramVal : diskVal;
          extractedData = {
            extractionType: "SINGLE_VALUE",
            values: { [label]: val },
            extractedAt: timestamp,
          };
        } else if (schema.type === "KEY_VALUE_PAIRS") {
          const values: any = {};
          (schema.pairs || []).forEach((p: any) => {
            values[p.label] = p.label.toLowerCase().includes("cpu") ? cpuVal : p.label.toLowerCase().includes("ram") ? ramVal : diskVal;
          });
          extractedData = {
            extractionType: "KEY_VALUE_PAIRS",
            values,
            extractedAt: timestamp,
          };
        }
      } else {
        extractedData = {
          extractionType: "SINGLE_VALUE",
          values: {
            cpu: { usagePercent: cpuVal },
            ram: { usagePercent: ramVal },
            disks: [{ usagePercent: diskVal }],
          },
          extractedAt: timestamp,
        };
      }
    } else if (monitor.dataExtractor) {
      const schema = monitor.dataExtractor.schema;
      if (schema.type === "SINGLE_VALUE") {
        const val = schema.format === "percentage" ? Math.floor(60 + Math.random() * 35) : Math.floor(100 + Math.random() * 900);
        const label = schema.label || "valore";
        extractedData = {
          extractionType: "SINGLE_VALUE",
          values: { [label]: val },
          extractedAt: timestamp,
        };
      } else if (schema.type === "KEY_VALUE_PAIRS") {
        const values: any = {};
        (schema.pairs || []).forEach((p: any) => {
          values[p.label] = p.format === "percentage" ? `${Math.floor(40 + Math.random() * 50)}%` : Math.floor(50 + Math.random() * 100);
        });
        extractedData = {
          extractionType: "KEY_VALUE_PAIRS",
          values,
          extractedAt: timestamp,
        };
      }
    }
  }

  // Valutazione delle metricRules nel mock
  let metricRulesPassed = true;
  if (success && extractedData && monitor.metricRules && monitor.metricRules.length > 0) {
    for (const rule of monitor.metricRules) {
      if (rule.operator === "CUSTOM_SCRIPT") {
        // 15% di probabilita di fallire uno script personalizzato
        if (Math.random() < 0.15) {
          metricRulesPassed = false;
        }
      } else {
        const propName = rule.property;
        const extractedVal = extractedData.values?.[propName] ||
                             extractedData.values?.[Object.keys(extractedData.values)[0]];

        if (extractedVal !== undefined) {
          const expected = Number(rule.value);
          const val = Number(extractedVal);
          if (!isNaN(expected) && !isNaN(val)) {
            if (rule.operator === "GREATER_THAN" && val <= expected) metricRulesPassed = false;
            if (rule.operator === "LESS_THAN" && val >= expected) metricRulesPassed = false;
            if (rule.operator === "EQUALS" && val !== expected) metricRulesPassed = false;
            if (rule.operator === "NOT_EQUALS" && val === expected) metricRulesPassed = false;
          }
        }
      }
    }
  }

  const result = {
    timestamp,
    status: success ? "UP" : "DOWN",
    responseTimeMs: time,
    extractedData,
  };

  monitor.lastCheckTime = timestamp;
  monitor.lastResponseTimeMs = time;
  monitor.lastStatus = result.status;

  if ((monitor.status as string) !== "PAUSED") {
    monitor.status = result.status as any;
  }

  if (success) {
    monitor.dataHealthStatus = monitor.dataExtractor
      ? (metricRulesPassed ? "OK" : "CRITICAL")
      : "NONE";
  } else {
    monitor.dataHealthStatus = "NONE";
  }

  if (!monitor.recentExecutions) monitor.recentExecutions = [];
  monitor.recentExecutions.unshift(result);
  if (monitor.recentExecutions.length > 30) monitor.recentExecutions.pop();

  // Gestione allarmi mock
  if (!success) {
    // Fallimento connettivita -> allarme AVAILABILITY (risolvi eventuali DATA_METRIC)
    mockStore.alarmsList = mockStore.alarmsList.filter(
      (a) => !(a.monitorId === monitorId && a.alarmType === "DATA_METRIC" && a.status !== "RESOLVED")
    );

    const activeAvailAlarm = mockStore.alarmsList.find(
      (a) => a.monitorId === monitorId && a.alarmType === "AVAILABILITY" && a.status !== "RESOLVED"
    );
    if (!activeAvailAlarm) {
      mockStore.alarmsList.unshift({
        id: `ala-${Math.random().toString(36).substring(2, 9)}`,
        monitorId,
        monitorName: monitor.name,
        status: "OPEN",
        severity: "CRITICAL",
        alarmType: "AVAILABILITY",
        openedAt: timestamp,
        createdAt: timestamp,
      });
    }
  } else if (!metricRulesPassed) {
    // Fallimento regole metriche -> allarme DATA_METRIC (risolvi eventuali AVAILABILITY)
    const activeAvailAlarm = mockStore.alarmsList.find(
      (a) => a.monitorId === monitorId && a.alarmType === "AVAILABILITY" && a.status !== "RESOLVED"
    );
    if (activeAvailAlarm) {
      activeAvailAlarm.status = "RESOLVED";
      activeAvailAlarm.resolvedAt = timestamp;
    }

    const activeDataAlarm = mockStore.alarmsList.find(
      (a) => a.monitorId === monitorId && a.alarmType === "DATA_METRIC" && a.status !== "RESOLVED"
    );
    if (!activeDataAlarm) {
      mockStore.alarmsList.unshift({
        id: `ala-${Math.random().toString(36).substring(2, 9)}`,
        monitorId,
        monitorName: monitor.name,
        status: "OPEN",
        severity: "WARNING",
        alarmType: "DATA_METRIC",
        openedAt: timestamp,
        createdAt: timestamp,
      });
    }
  } else {
    // Tutto OK -> risolvi tutti gli allarmi del monitor
    mockStore.alarmsList.forEach((alarm) => {
      if (alarm.monitorId === monitorId && alarm.status !== "RESOLVED") {
        alarm.status = "RESOLVED";
        alarm.resolvedAt = timestamp;
      }
    });
  }

  return result;
}
