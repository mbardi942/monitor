import { ProbeExecutorRegistry } from "../../domain/ports/probe-executor-registry.js";
import { ProbeExecutor } from "../../domain/ports/probe-executor.js";

export class MapProbeExecutorRegistry implements ProbeExecutorRegistry {
  private readonly executors = new Map<string, ProbeExecutor>();

  public register(type: string, executor: ProbeExecutor): void {
    this.executors.set(type, executor);
  }

  public getExecutor(type: string): ProbeExecutor {
    const executor = this.executors.get(type);
    if (!executor) {
      throw new Error(`No executor registered for probe type: ${type}`);
    }
    return executor;
  }
}
