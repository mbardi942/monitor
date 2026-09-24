import { SlackSender } from "../../domain/ports/notification-sender.js";

export class SlackWebhookSender implements SlackSender {
  public async send(webhookUrl: string, message: string): Promise<void> {
    if (webhookUrl && webhookUrl.startsWith("https://hooks.slack.com")) {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack Webhook Error (HTTP ${response.status}): ${errorText}`);
      }
    } else {
      console.log(`[MOCK SLACK WEBHOOK SUCCESS]
URL: ${webhookUrl || "N/A"}
Message: ${message}
----------------------------------------`);
    }
  }
}
