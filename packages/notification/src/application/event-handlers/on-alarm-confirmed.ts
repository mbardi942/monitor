import { AlarmConfirmed } from "@monitor/monitoring";
import { DeliverNotificationUseCase } from "../use-cases/deliver-notification.js";
import { AlarmConfirmedTranslator } from "../../infrastructure/acl/alarm-confirmed-translator.js";

export class OnAlarmConfirmed {
  constructor(private readonly deliverNotificationUseCase: DeliverNotificationUseCase) {}

  public async handle(event: AlarmConfirmed): Promise<void> {
    const request = AlarmConfirmedTranslator.translate(event);
    await this.deliverNotificationUseCase.execute(request);
  }
}
