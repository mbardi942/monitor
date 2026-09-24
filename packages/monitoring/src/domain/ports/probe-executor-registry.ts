import { ProbeExecutor } from "./probe-executor.js";

export interface ProbeExecutorRegistry {
  getExecutor(type: string): ProbeExecutor;
}
