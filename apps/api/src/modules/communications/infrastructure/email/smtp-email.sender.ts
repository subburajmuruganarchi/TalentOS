import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import {
  EmailSender,
  SendEmailInput,
  SendEmailResult,
} from './email-sender.interface';

interface SendMailResult {
  messageId?: string;
}

@Injectable()
export class SmtpEmailSender implements EmailSender {
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const from = this.configService.get<string>('EMAIL_FROM');
    const host = this.configService.get<string>('SMTP_HOST');

    if (!from || !host) {
      throw new ServiceUnavailableException(
        'Email is not configured. Set SMTP_HOST and EMAIL_FROM before sending.',
      );
    }

    const transporter = this.getTransporter();
    const info = (await transporter.sendMail({
      from,
      to: input.toName ? `"${input.toName}" <${input.to}>` : input.to,
      subject: input.subject,
      text: input.body,
      html: input.bodyHtml ?? undefined,
    })) as SendMailResult;

    return { messageId: info.messageId ?? `smtp-${Date.now()}` };
  }
  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.configService.get<string>('SMTP_HOST', '');
    const port = Number(this.configService.get<string>('SMTP_PORT', '587'));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    return this.transporter;
  }
}
