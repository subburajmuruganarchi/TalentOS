export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface SendEmailInput {
  to: string;
  toName: string;
  subject: string;
  body: string;
  bodyHtml?: string | null;
}

export interface SendEmailResult {
  messageId: string;
}

export interface EmailSender {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
