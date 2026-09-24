import { Resend } from "resend";
import { EmailSender } from "../../domain/ports/notification-sender.js";

export class ResendEmailSender implements EmailSender {
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || "API Monitor <alerts@apimonitor.dev>";
    
    // Inizializza Resend solo se la chiave API è configurata e valida
    if (apiKey && apiKey !== "mock" && apiKey.trim() !== "") {
      this.resend = new Resend(apiKey);
    }
  }

  public async send(to: string, subject: string, htmlContent: string): Promise<void> {
    if (this.resend) {
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html: htmlContent,
      });

      if (response.error) {
        throw new Error(`Resend API Error: ${response.error.message}`);
      }
    } else {
      console.log(`[MOCK EMAIL SENT SUCCESS]
From: ${this.fromEmail}
To: ${to}
Subject: ${subject}
Content length: ${htmlContent.length} characters
----------------------------------------`);
    }
  }
}
