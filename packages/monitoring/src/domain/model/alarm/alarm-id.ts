import { Identifier } from "@monitor/shared-kernel";

export class AlarmId extends Identifier<string> {
  public static create(value: string): AlarmId {
    return new AlarmId(value);
  }

  public static generate(): AlarmId {
    return new AlarmId(crypto.randomUUID());
  }
}
