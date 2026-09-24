import { DomainEventBus } from "@monitor/shared-kernel";
import { Monitor } from "../../domain/model/monitor/monitor.js";
import { MonitorId } from "../../domain/model/monitor/monitor-id.js";
import { MonitorType } from "../../domain/model/monitor/monitor-type.js";
import { ProbeConfiguration } from "../../domain/model/monitor/probe-configuration.js";
import { Schedule } from "../../domain/model/monitor/schedule.js";
import { AssertionRule } from "../../domain/model/monitor/assertion-rule.js";
import { MetricRule } from "../../domain/model/monitor/metric-rule.js";
import { AlarmPolicy } from "../../domain/model/monitor/alarm-policy.js";
import { DataExtractor } from "../../domain/model/monitor/data-extractor.js";
import { MonitorRepository } from "../../domain/ports/monitor-repository.js";
import crypto from "crypto";

export interface CloneMonitorInput {
  /** ID del monitor da clonare */
  sourceMonitorId: string;
  /** Dashboard di destinazione (può essere la stessa o un'altra) */
  targetDashboardId: string;
  /** Dashboard sorgente, usata per decidere se copiare i recipientIds */
  sourceDashboardId: string;
  /** Nome del clone. Default: "<nome originale> (Copia)" */
  newName?: string;
}

export interface CloneMonitorOutput {
  monitor: Monitor;
  /** true se l'authProfileId è stato rimosso perché la dashboard è diversa */
  authProfileIdDropped: boolean;
}

export class CloneMonitorUseCase {
  constructor(
    private readonly monitorRepository: MonitorRepository,
    private readonly eventBus: DomainEventBus
  ) {}

  public async execute(input: CloneMonitorInput): Promise<CloneMonitorOutput> {
    const source = await this.monitorRepository.findById(
      MonitorId.create(input.sourceMonitorId)
    );

    if (!source) {
      throw new Error(`Monitor sorgente con ID ${input.sourceMonitorId} non trovato.`);
    }

    const newId = MonitorId.generate();
    const newName = input.newName?.trim() || `${source.name} (Copia)`;
    const isSameDashboard = input.sourceDashboardId === input.targetDashboardId;

    // ── ProbeConfiguration ───────────────────────────────────────────────────
    // Per i monitor HEARTBEAT: rigenerare sempre un token univoco.
    // Per tutti gli altri tipi: copiare la configurazione invariata, ad eccezione
    // di authProfileId che viene azzerato se si clona su un'altra dashboard.
    let probeConfigProps = source.probeConfiguration.toValue() as any;
    let authProfileIdDropped = false;

    if (source.type.value === "HEARTBEAT") {
      // Rigenera il token webhook
      const newToken = crypto.randomBytes(20).toString("hex");
      probeConfigProps = {
        type: "HEARTBEAT",
        heartbeat: {
          ...probeConfigProps.heartbeat,
          token: newToken,
          lastPingAt: undefined, // reset: il clone non ha ancora ricevuto ping
        },
      };
    } else if (source.type.value === "HTTP" && !isSameDashboard) {
      // Rimuovi authProfileId cross-dashboard
      if (probeConfigProps.http?.authProfileId) {
        probeConfigProps = {
          ...probeConfigProps,
          http: {
            ...probeConfigProps.http,
            authProfileId: undefined,
          },
        };
        authProfileIdDropped = true;
      }
    }

    const newProbeConfiguration = ProbeConfiguration.create(
      source.type.value,
      probeConfigProps
    );

    // ── recipientIds ─────────────────────────────────────────────────────────
    // Copiati solo se la dashboard di destinazione è la stessa; altrimenti lista vuota.
    const recipientIds = isSameDashboard ? [...source.recipientIds] : [];

    // ── Ricostruzione dei Value Object dal sorgente ───────────────────────────
    const schedule = Schedule.create(source.schedule.toValue());

    const assertionRules = source.assertionRules.map((r) =>
      AssertionRule.create(r.toValue())
    );

    const metricRules = source.metricRules.map((r) =>
      MetricRule.create(r.toValue())
    );

    const alarmPolicy = AlarmPolicy.create(source.alarmPolicy.toValue());

    const dataExtractor = source.dataExtractor
      ? DataExtractor.create(source.dataExtractor.toValue())
      : undefined;

    // ── Creazione del monitor clonato (stato iniziale: UP/attivo) ─────────────
    const clonedMonitor = Monitor.create(
      newId,
      newName,
      MonitorType.create(source.type.value as "HTTP" | "PING" | "HOST" | "HEARTBEAT"),
      newProbeConfiguration,
      schedule,
      assertionRules,
      alarmPolicy,
      dataExtractor,
      metricRules,
      recipientIds
    );

    await this.monitorRepository.save(clonedMonitor);

    // Pubblica MonitorCreated e MonitorConfigured (attiva lo scheduler BullMQ)
    const events = clonedMonitor.pullDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }

    return { monitor: clonedMonitor, authProfileIdDropped };
  }
}
