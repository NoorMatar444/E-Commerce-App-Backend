import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';

@Injectable()
export class EmailServices {
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'noormatar480@gmail.com',
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
    await this.transporter.sendMail({
      from: 'noormatar480@gmail.com',
      to,
      subject,
      text,
      attachments,
    });
  }
}
