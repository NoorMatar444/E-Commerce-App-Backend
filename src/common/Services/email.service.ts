import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';

@Injectable()
export class EmailServices {
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    const gmailUser = this.configService.get<string>('GMAIL_USER');

    if (!gmailUser) {
      throw new Error('GMAIL_USER is not configured');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: this.configService.get<string>('GMAIL_PASS_KEY'),
      },
    });
  }
  async sendEmail({
    to,
    subject,
    text,
    attachments,
  }: {
    to: string | string[];
    subject: string;
    text?: string;
    attachments?: Attachment[];
  }) {
    const gmailUser = this.configService.get<string>('GMAIL_USER');

    await this.transporter.sendMail({
      from: gmailUser,
      to,
      subject,
      text,
      attachments,
    });
  }
}
