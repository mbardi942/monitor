import { Notification, NotificationId, DeliveryAttempt } from "../../domain/model/notification.js";
import { NotificationRequest } from "../../infrastructure/acl/alarm-confirmed-translator.js";
import { NotificationRoutingService } from "../../domain/services/notification-routing-service.js";
import { NotificationRepository } from "../../domain/ports/notification-repository.js";
import { EmailSender, SlackSender } from "../../domain/ports/notification-sender.js";
import { DomainEventBus } from "@monitor/shared-kernel";
import { NotificationDelivered } from "../../domain/events/notification-delivered.js";

export class DeliverNotificationUseCase {
  constructor(
    private readonly routingService: NotificationRoutingService,
    private readonly notificationRepository: NotificationRepository,
    private readonly emailSender: EmailSender,
    private readonly slackSender: SlackSender,
    private readonly eventBus: DomainEventBus
  ) {}

  public async execute(request: NotificationRequest): Promise<Notification> {
    // 1. Crea l'aggregato Notification
    const notificationId = NotificationId.generate();
    const notification = Notification.create(
      notificationId,
      request.type,
      request.sourceId,
      request.title,
      request.payload
    );

    // 2. Risolvi i destinatari registrati per le dashboard collegate
    const recipients = await this.routingService.resolveRecipients(request.dashboardIds);

    if (recipients.length === 0) {
      console.log(`[DeliverNotificationUseCase] No recipients found for dashboards: ${request.dashboardIds.join(", ")}`);
      await this.notificationRepository.save(notification);
      return notification;
    }

    // 3. Esegui il dispatch per ciascun destinatario e canale abilitato
    for (const recipient of recipients) {
      for (const channel of recipient.channels) {
        let attemptStatus: "SENT" | "FAILED" = "SENT";
        let attemptError: string | null = null;

        try {
          if (channel.type === "EMAIL") {
            if (!recipient.email) {
              throw new Error(`Recipient ${recipient.name} does not have an email configured.`);
            }
            const htmlContent = this.generateEmailTemplate(request);
            await this.emailSender.send(recipient.email, request.title, htmlContent);
          } else if (channel.type === "SLACK") {
            const webhookUrl = channel.config.webhookUrl;
            if (!webhookUrl) {
              throw new Error(`Slack channel configured for ${recipient.name} lacks webhookUrl.`);
            }
            const slackMessage = this.generateSlackMessage(request);
            await this.slackSender.send(webhookUrl, slackMessage);
          } else {
            throw new Error(`Unsupported channel type: ${channel.type}`);
          }
        } catch (error: any) {
          attemptStatus = "FAILED";
          attemptError = error.message || "Unknown error during delivery";
          console.error(`[DeliverNotificationUseCase] Delivery failed to ${recipient.name} via ${channel.type}:`, error);
        }

        // Crea e registra il tentativo di consegna
        const attempt = DeliveryAttempt.create(
          recipient.id.toString(),
          channel.type,
          attemptStatus,
          attemptError
        );
        notification.addAttempt(attempt);
      }
    }

    // 4. Salva lo stato finale della notifica e i suoi tentativi
    await this.notificationRepository.save(notification);

    // 5. Se almeno un tentativo di notifica ha avuto successo, pubblichiamo NotificationDelivered
    const deliveredChannels = notification.attempts
      .filter((att) => att.status === "SENT")
      .map((att) => att.channel);

    if (deliveredChannels.length > 0) {
      await this.eventBus.publish(
        new NotificationDelivered(
          notification.id.toString(),
          request.type,
          request.sourceId,
          request.dashboardIds,
          deliveredChannels
        )
      );
    }

    return notification;
  }

  private generateEmailTemplate(request: NotificationRequest): string {
    const payload = request.payload;

    if (request.type === "REPORT") {
      const monitorsList = payload.reportContent.monitors || [];
      const monitorsHtml = monitorsList.map((m: any) => {
        const executionsHtml = (m.recentExecutions || []).map((exec: any) => {
          const dataStr = exec.extractedData ? JSON.stringify(exec.extractedData) : "Nessun dato";
          return `
            <tr style="font-size: 11px;">
              <td style="padding: 4px; border: 1px solid #e5e7eb;">${new Date(exec.timestamp).toLocaleTimeString()}</td>
              <td style="padding: 4px; border: 1px solid #e5e7eb; font-weight: bold; color: ${exec.status === "UP" ? "#16a34a" : "#dc2626"};">${exec.status}</td>
              <td style="padding: 4px; border: 1px solid #e5e7eb;"><code>${dataStr}</code></td>
            </tr>
          `;
        }).join("");

        return `
          <div style="margin-bottom: 25px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 6px;">
            <h3 style="margin-top: 0; color: #1e3a8a;">${m.monitorName}</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 13px;">
              <tr>
                <td style="padding: 6px; font-weight: bold; width: 50%;">Uptime %</td>
                <td style="padding: 6px; text-align: right; font-weight: bold; color: ${m.uptimePercentage >= 99 ? "#16a34a" : "#d97706"};">${m.uptimePercentage}%</td>
              </tr>
              <tr>
                <td style="padding: 6px; font-weight: bold;">Tempo di risposta medio</td>
                <td style="padding: 6px; text-align: right;">${m.avgResponseTimeMs} ms</td>
              </tr>
              <tr>
                <td style="padding: 6px; font-weight: bold;">Totale check (Falliti)</td>
                <td style="padding: 6px; text-align: right;">${m.totalChecks} (${m.failedChecks})</td>
              </tr>
            </table>
            ${m.recentExecutions && m.recentExecutions.length > 0 ? `
              <h4 style="margin-bottom: 5px; color: #4b5563; font-size: 12px;">Ultimi Check ed Estratti</h4>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f3f4f6; font-size: 11px; text-align: left;">
                    <th style="padding: 4px; border: 1px solid #e5e7eb;">Ora</th>
                    <th style="padding: 4px; border: 1px solid #e5e7eb;">Stato</th>
                    <th style="padding: 4px; border: 1px solid #e5e7eb;">Dati Custom</th>
                  </tr>
                </thead>
                <tbody>
                  ${executionsHtml}
                </tbody>
              </table>
            ` : ""}
          </div>
        `;
      }).join("");

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #333333; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #2563eb; }
            .badge { display: inline-block; padding: 6px 12px; font-weight: bold; color: #ffffff; background-color: #2563eb; border-radius: 4px; text-transform: uppercase; }
            .content { padding: 20px 0; }
            .custom-text { background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px; margin-bottom: 20px; font-style: italic; border-radius: 0 4px 4px 0; }
            .footer { text-align: center; font-size: 12px; color: #9ca3af; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="badge">Report Periodico</span>
              <h2 style="margin-top: 15px; margin-bottom: 0;">${request.title}</h2>
              <p style="font-size: 14px; color: #4b5563; margin-top: 5px;">Periodo: ${new Date(payload.periodFrom).toLocaleString()} - ${new Date(payload.periodTo).toLocaleString()}</p>
            </div>
            <div class="content">
              ${payload.customText ? `<div class="custom-text"><strong>Note dell'operatore:</strong><br/>${payload.customText}</div>` : ""}
              ${monitorsHtml}
            </div>
            <div class="footer">
              <p>Ricevi questa email perché sei iscritto alla ricezione dei report per questa Dashboard.</p>
              <p>&copy; ${new Date().getFullYear()} API Monitor</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const isAlarm = request.type === "ALARM";
    const accentColor = isAlarm ? "#dc2626" : "#16a34a";
    const statusText = isAlarm ? "DOWN" : "UP";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #333333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
          .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid ${accentColor}; }
          .status-badge { display: inline-block; padding: 6px 12px; font-weight: bold; color: #ffffff; background-color: ${accentColor}; border-radius: 4px; text-transform: uppercase; }
          .content { padding: 20px 0; }
          .details-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .details-table td { padding: 8px 12px; border: 1px solid #f3f4f6; }
          .details-table td.label { font-weight: bold; color: #4b5563; width: 150px; }
          .footer { text-align: center; font-size: 12px; color: #9ca3af; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="status-badge">Monitor is ${statusText}</span>
            <h2 style="margin-top: 15px; margin-bottom: 0;">${request.title}</h2>
          </div>
          <div class="content">
            <p>Ciao,</p>
            <p>Il sistema di monitoraggio ha rilevato una variazione di stato per uno dei tuoi monitor associati.</p>
            <table class="details-table">
              <tr>
                <td class="label">Monitor</td>
                <td>${payload.monitorName}</td>
              </tr>
              <tr>
                <td class="label">ID Monitor</td>
                <td><code>${payload.monitorId}</code></td>
              </tr>
              ${isAlarm ? `
              <tr>
                <td class="label">Severità</td>
                <td><strong style="color: #dc2626">${payload.severity}</strong></td>
              </tr>
              ` : `
              <tr>
                <td class="label">Tempo offline</td>
                <td>${payload.durationText}</td>
              </tr>
              `}
              <tr>
                <td class="label">Rilevato il</td>
                <td>${new Date(payload.occurredAt).toLocaleString()}</td>
              </tr>
              ${payload.extractedDataSummary ? `
              <tr>
                <td class="label">Dettagli Errore</td>
                <td><pre style="margin: 0; background-color: #f9fafb; padding: 6px; border-radius: 4px; font-size: 12px;">${JSON.stringify(payload.extractedDataSummary, null, 2)}</pre></td>
              </tr>
              ` : ""}
            </table>
          </div>
          <div class="footer">
            <p>Ricevi questa email perché sei iscritto alla notifica degli allarmi per questa Dashboard.</p>
            <p>&copy; ${new Date().getFullYear()} API Monitor</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateSlackMessage(request: NotificationRequest): string {
    const payload = request.payload;

    if (request.type === "REPORT") {
      let msg = `📊 *REPORT API MONITOR* 📊\n` +
                `*Periodo:* ${new Date(payload.periodFrom).toLocaleString()} - ${new Date(payload.periodTo).toLocaleString()}\n` +
                (payload.customText ? `*Note:* _${payload.customText}_\n\n` : "\n");

      const monitorsList = payload.reportContent.monitors || [];
      for (const m of monitorsList) {
        msg += `*Monitor:* ${m.monitorName}\n` +
               `• Uptime: ${m.uptimePercentage}%\n` +
               `• Tempo di risposta medio: ${m.avgResponseTimeMs} ms\n` +
               `• Totale check (Falliti): ${m.totalChecks} (${m.failedChecks})\n`;

        if (m.recentExecutions && m.recentExecutions.length > 0) {
          const lastExec = m.recentExecutions[0];
          msg += `• Ultimo check: ${lastExec.status} (${new Date(lastExec.timestamp).toLocaleTimeString()}) - Dati: \`${JSON.stringify(lastExec.extractedData || {})}\`\n`;
        }
        msg += `\n`;
      }
      return msg;
    }

    const isAlarm = request.type === "ALARM";
    const emoji = isAlarm ? "🚨" : "✅";

    if (isAlarm) {
      return `${emoji} *ALLARME ATTIVO* ${emoji}\n` +
             `*Monitor:* ${payload.monitorName}\n` +
             `*Stato:* DOWN\n` +
             `*Severità:* ${payload.severity}\n` +
             `*Rilevato il:* ${new Date(payload.occurredAt).toLocaleString()}\n` +
             (payload.extractedDataSummary ? `*Dettaglio:* \`${JSON.stringify(payload.extractedDataSummary)}\`` : "");
    } else {
      return `${emoji} *ALLARME RISOLTO* ${emoji}\n` +
             `*Monitor:* ${payload.monitorName}\n` +
             `*Stato:* UP (Ripristinato)\n` +
             `*Tempo offline:* ${payload.durationText}\n` +
             `*Risolto il:* ${new Date(payload.occurredAt).toLocaleString()}`;
    }
  }
}
