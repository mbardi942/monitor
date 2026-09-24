import { CheckExecution } from "../model/check-execution/check-execution.js";

export interface CheckExecutionRepository {
  save(checkExecution: CheckExecution): Promise<void>;
}
