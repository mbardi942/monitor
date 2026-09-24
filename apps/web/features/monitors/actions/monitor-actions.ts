"use server";

import { revalidatePath } from "next/cache";
import {
  useMock,
  createMonitorUseCase,
  addMonitorToDashboardUseCase,
  configureMonitorUseCase,
  executeCheckUseCase,
  cloneMonitorUseCase,
  monitorRepository,
  authProfileRepository,
  authTokenManager,
} from "@/infrastructure/backend";
import {
  MonitorId,
  AuthProfileId,
  AuthProfile,
  HttpProbeExecutor,
  PingProbeExecutor,
  HostProbeExecutor,
  HeartbeatProbeExecutor,
  ProbeConfiguration,
  AssertionRule,
  AssertionEngine,
  DataExtractor,
  DataExtractionService,
} from "@monitor/monitoring";
import { mockStore } from "@/infrastructure/gateways/mock-data";
import { simulateMockCheck } from "@/infrastructure/gateways/mock-simulation";
import { MonitorDTO } from "@/core/ports/gateways";
import { nestProbeConfiguration } from "@/core/mappers/probe-configuration-mapper";
import {
  createMonitorInputSchema,
  updateMonitorInputSchema,
  parseOrThrow,
} from "@/core/validation/schemas";

// Invalida solo l'albero della singola dashboard invece dell'intera root
const revalidateDashboard = () => revalidatePath("/[dashboardId]", "layout");

export async function createMonitorAction(
  dashboardId: string,
  data: Omit<MonitorDTO, "id" | "createdAt" | "updatedAt">
) {
  parseOrThrow(createMonitorInputSchema, data);

  if (useMock) {
    const newMon: MonitorDTO = {
      ...data,
      id: `mon-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recentExecutions: [],
    };
    mockStore.monitorsList.push(newMon);
    revalidateDashboard();
    return newMon;
  }

  const nestedProbe = nestProbeConfiguration(data.type as any, data.probeConfiguration);
  const monitor = await createMonitorUseCase.execute({
    name: data.name,
    type: data.type as any,
    probeConfiguration: nestedProbe,
    schedule: data.schedule,
    assertionRules: data.assertionRules,
    metricRules: data.metricRules,
    alarmPolicy: data.alarmPolicy,
    dataExtractor: data.dataExtractor,
  });

  await addMonitorToDashboardUseCase.execute({
    dashboardId,
    monitorId: monitor.id.toValue(),
  });

  revalidateDashboard();
  return { id: monitor.id.toValue() };
}

export async function updateMonitorAction(id: string, data: Partial<MonitorDTO>) {
  parseOrThrow(updateMonitorInputSchema, data);

  if (useMock) {
    const index = mockStore.monitorsList.findIndex((m) => m.id === id);
    if (index === -1) throw new Error("Monitor non trovato");
    mockStore.monitorsList[index] = {
      ...mockStore.monitorsList[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    revalidateDashboard();
    return mockStore.monitorsList[index];
  }

  const existing = await monitorRepository.findById(MonitorId.create(id));
  if (!existing) throw new Error("Monitor non trovato");

  const finalName = data.name || existing.name;
  const finalType = (data.type || existing.type.value) as "HTTP" | "PING" | "HOST" | "HEARTBEAT";
  const nestedProbe = nestProbeConfiguration(finalType, data.probeConfiguration);

  const configuredMonitor = await configureMonitorUseCase.execute({
    monitorId: id,
    name: finalName,
    probeConfiguration: nestedProbe,
    schedule: data.schedule as any,
    assertionRules: data.assertionRules as any,
    metricRules: data.metricRules as any,
    alarmPolicy: data.alarmPolicy as any,
    dataExtractor: data.dataExtractor,
  });

  revalidateDashboard();
  return { id: configuredMonitor.id.toValue() };
}

export async function deleteMonitorAction(id: string) {
  if (useMock) {
    mockStore.monitorsList = mockStore.monitorsList.filter((m) => m.id !== id);
    revalidateDashboard();
    return;
  }

  await monitorRepository.delete(MonitorId.create(id));
  revalidateDashboard();
}

export async function executeCheckAction(id: string) {
  if (useMock) {
    const result = simulateMockCheck(id);
    revalidateDashboard();
    return result;
  }

  const execution = await executeCheckUseCase.execute({ monitorId: id });
  revalidateDashboard();
  return execution ? {
    timestamp: execution.timestamp.toISOString(),
    status: execution.status,
    responseTimeMs: execution.responseTimeMs,
  } : null;
}

export async function pauseMonitorAction(id: string) {
  if (useMock) {
    const monitor = mockStore.monitorsList.find((m) => m.id === id);
    if (monitor) monitor.status = "PAUSED";
    revalidateDashboard();
    return;
  }

  const monitor = await monitorRepository.findById(MonitorId.create(id));
  if (!monitor) throw new Error("Monitor non trovato");
  monitor.pause();
  await monitorRepository.save(monitor);
  revalidateDashboard();
}

export async function resumeMonitorAction(id: string) {
  if (useMock) {
    const monitor = mockStore.monitorsList.find((m) => m.id === id);
    if (monitor) monitor.status = "UP";
    revalidateDashboard();
    return;
  }

  const monitor = await monitorRepository.findById(MonitorId.create(id));
  if (!monitor) throw new Error("Monitor non trovato");
  monitor.resume();
  await monitorRepository.save(monitor);
  revalidateDashboard();
}

export async function testTargetAction(data: any) {
  const finalType = data.type as "HTTP" | "PING" | "HOST" | "HEARTBEAT";
  const nestedProbe = nestProbeConfiguration(finalType, data.probeConfiguration);

  // Risoluzione credenziali condivise nel test target
  if (finalType === "HTTP" && data.probeConfiguration?.authProfileId) {
    try {
      if (useMock) {
        const found = (mockStore.authProfilesList || []).find((p: any) => p.id === data.probeConfiguration.authProfileId);
        if (found) {
          const inst = AuthProfile.reconstitute(AuthProfileId.create(found.id), {
            dashboardId: found.dashboardId,
            name: found.name,
            type: found.type,
            data: found.maskedData || {},
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          const authHdrs = await authTokenManager.resolveHeaders(inst);
          nestedProbe.http.headers = { ...authHdrs, ...(nestedProbe.http.headers || {}) };
        }
      } else {
        const profile = await authProfileRepository.findById(AuthProfileId.create(data.probeConfiguration.authProfileId));
        if (profile) {
          const authHdrs = await authTokenManager.resolveHeaders(profile);
          nestedProbe.http.headers = { ...authHdrs, ...(nestedProbe.http.headers || {}) };
        }
      }
    } catch {
      // Procedi con gli header correnti se la risoluzione fallisce
    }
  }

  const pc = ProbeConfiguration.create(finalType, nestedProbe);
  
  let executor;
  if (finalType === "HTTP") executor = new HttpProbeExecutor();
  else if (finalType === "PING") executor = new PingProbeExecutor();
  else if (finalType === "HOST") executor = new HostProbeExecutor();
  else executor = new HeartbeatProbeExecutor();

  const result = await executor.execute(pc);
  
  let assertionResults: any[] = [];
  if (data.assertionRules && data.assertionRules.length > 0) {
    const rules = data.assertionRules.map((r: any) => AssertionRule.create(r));
    const engine = new AssertionEngine();
    assertionResults = engine.evaluate(rules, result);
  }

  let extractedData = null;
  if (data.dataExtractor) {
    try {
      const extractor = DataExtractor.create(data.dataExtractor);
      const service = new DataExtractionService();
      const extracted = service.extract(result, extractor);
      if (extracted) {
        const val = extracted.toValue();
        extractedData = {
          ...val,
          extractedAt: val.extractedAt instanceof Date ? val.extractedAt.toISOString() : val.extractedAt,
        };
      }
    } catch (e: any) {
      extractedData = { error: e.message };
    }
  }

  return {
    success: !result.error,
    error: result.error,
    responseTimeMs: result.responseTimeMs,
    statusCode: result.statusCode,
    body: result.body,
    assertionResults: assertionResults.map(r => ({
      passed: r.passed,
      actualValue: r.actualValue,
      error: r.error,
      rule: r.rule.toValue()
    })),
    extractedData,
  };
}

/**
 * Clona un monitor nella stessa dashboard o in un'altra dashboard.
 *
 * Comportamenti per clonazione cross-dashboard:
 * - authProfileId rimosso (credenziale non appartenente alla dashboard di destinazione)
 * - recipientIds azzerati (i destinatari appartengono alla dashboard sorgente)
 * - Token Heartbeat rigenerato automaticamente
 *
 * Restituisce l'ID del monitor clonato e un flag se il profilo di autenticazione è stato rimosso.
 */
export async function cloneMonitorAction(
  sourceMonitorId: string,
  sourceDashboardId: string,
  targetDashboardId: string,
  newName?: string
): Promise<{ id: string; authProfileIdDropped: boolean }> {
  if (!sourceMonitorId) throw new Error("ID monitor sorgente non specificato.");
  if (!targetDashboardId) throw new Error("Dashboard di destinazione non specificata.");

  if (useMock) {
    const { mockStore } = await import("@/infrastructure/gateways/mock-data");
    const source = mockStore.monitorsList.find((m) => m.id === sourceMonitorId);
    if (!source) throw new Error("Monitor sorgente non trovato.");

    const isSameDashboard = sourceDashboardId === targetDashboardId;
    let authProfileIdDropped = false;

    // Clona deep la probeConfiguration
    let probeConfiguration = JSON.parse(JSON.stringify(source.probeConfiguration || {}));

    if (source.type === "HEARTBEAT") {
      // Rigenera il token heartbeat nel mock
      probeConfiguration.heartbeatToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      probeConfiguration.lastPingAt = undefined;
    } else if (source.type === "HTTP" && !isSameDashboard && probeConfiguration.authProfileId) {
      probeConfiguration.authProfileId = undefined;
      authProfileIdDropped = true;
    }

    const cloned = {
      ...JSON.parse(JSON.stringify(source)),
      id: `mon-${Math.random().toString(36).substring(2, 9)}`,
      name: newName?.trim() || `${source.name} (Copia)`,
      probeConfiguration,
      recipientIds: isSameDashboard ? (source as any).recipientIds || [] : [],
      status: "UP" as const,
      recentExecutions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockStore.monitorsList.push(cloned);
    revalidateDashboard();
    return { id: cloned.id, authProfileIdDropped };
  }

  const result = await cloneMonitorUseCase.execute({
    sourceMonitorId,
    sourceDashboardId,
    targetDashboardId,
    newName,
  });

  await addMonitorToDashboardUseCase.execute({
    dashboardId: targetDashboardId,
    monitorId: result.monitor.id.toValue(),
  });

  revalidateDashboard();
  return { id: result.monitor.id.toValue(), authProfileIdDropped: result.authProfileIdDropped };
}
