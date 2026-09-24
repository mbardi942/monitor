import { Identifier } from "@monitor/shared-kernel";

export class CheckExecutionId extends Identifier<string> {
  public static create(value: string): CheckExecutionId {
    return new CheckExecutionId(value);
  }

  public static generate(): CheckExecutionId {
    return new CheckExecutionId(crypto.randomUUID());
  }
}
