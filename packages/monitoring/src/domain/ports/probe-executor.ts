import { ProbeConfiguration } from "../model/monitor/probe-configuration.js";
import { CheckResult } from "../model/check-execution/check-result.js";

export interface ProbeExecutor {
  execute(config: ProbeConfiguration): Promise<CheckResult>;
}
