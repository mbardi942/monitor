import { Identifier } from "@monitor/shared-kernel";

export class AuthProfileId extends Identifier<string> {
  public static create(value: string): AuthProfileId {
    return new AuthProfileId(value);
  }

  public static generate(): AuthProfileId {
    return new AuthProfileId(crypto.randomUUID());
  }
}
