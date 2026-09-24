import { DomainEventBus } from "@monitor/shared-kernel";
import { Monitor } from "../../domain/model/monitor/monitor.js";
import { MonitorId } from "../../domain/model/monitor/monitor-id.js";
import { ProbeConfiguration, ProbeProps } from "../../domain/model/monitor/probe-configuration.js";
import { Schedule, ScheduleProps } from "../../domain/model/monitor/schedule.js";
import { AssertionRule, AssertionRuleProps } from "../../domain/model/monitor/assertion-rule.js";
import { MetricRule, MetricRuleProps } from "../../domain/model/monitor/metric-rule.js";
import { AlarmPolicy, AlarmPolicyProps } from "../../domain/model/monitor/alarm-policy.js";
import { DataExtractor, DataExtractorProps } from "../../domain/model/monitor/data-extractor.js";
import { MonitorRepository } from "../../domain/ports/monitor-repository.js";

export interface ConfigureMonitorInput {
  monitorId: string;
  name: string;
  probeConfiguration: ProbeProps;
  schedule: ScheduleProps;
  assertionRules: AssertionRuleProps[];
  metricRules?: MetricRuleProps[];
  alarmPolicy: AlarmPolicyProps;
  recipientIds?: string[];
  dataExtractor?: DataExtractorProps;
}

export class ConfigureMonitorUseCase {
  constructor(
    private readonly monitorRepository: MonitorRepository,
    private readonly eventBus: DomainEventBus
  ) {}

  public async execute(input: ConfigureMonitorInput): Promise<Monitor> {
    const monitorId = MonitorId.create(input.monitorId);
    const monitor = await this.monitorRepository.findById(monitorId);

    if (!monitor) {
      throw new Error(`Monitor with ID ${input.monitorId} not found.`);
    }

    const probeConfiguration = ProbeConfiguration.create(
      input.probeConfiguration.type,
      input.probeConfiguration
    );

    const schedule = Schedule.create(input.schedule);
    const assertionRules = input.assertionRules.map((r) => AssertionRule.create(r));
    const metricRules = (input.metricRules || []).map((r) => MetricRule.create(r));
    const alarmPolicy = AlarmPolicy.create(input.alarmPolicy);
    const dataExtractor = input.dataExtractor
      ? DataExtractor.create(input.dataExtractor)
      : undefined;

    monitor.configure(
      input.name,
      probeConfiguration,
      schedule,
      assertionRules,
      alarmPolicy,
      dataExtractor,
      metricRules,
      input.recipientIds || []
    );

    await this.monitorRepository.save(monitor);

    // Pubblica gli eventi accumulati
    const events = monitor.pullDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }

    return monitor;
  }
}
