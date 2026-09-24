export interface EmailSender {
  send(to: string, subject: string, htmlContent: string): Promise<void>;
}

export interface SlackSender {
  send(webhookUrl: string, message: string): Promise<void>;
}
