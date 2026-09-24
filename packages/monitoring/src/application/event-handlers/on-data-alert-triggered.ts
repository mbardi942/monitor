import { DataAlertTriggered } from "../../domain/events/data-alert-triggered.js";

export class OnDataAlertTriggered {
  constructor() {}

  public async handle(event: DataAlertTriggered): Promise<void> {
    console.warn(
      `[Monitoring] [DataAlertTriggered] Alert triggered for monitor "${event.monitorName}" (ID: ${event.monitorId}). ` +
      `Level: ${event.alertLevel}. Failed assertions: ${event.failedAssertions.length}. ` +
      `Details: ${JSON.stringify(event.failedAssertions)}`
    );
  }
}
