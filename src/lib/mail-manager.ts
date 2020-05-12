import * as mailgun from "mailgun-js";
import { Mailgun } from "mailgun-js";
import * as mime from "mime-types";
import * as fs from "fs";
import * as path from "path";

export interface MailContent {
  from: string;
  subject: string;
  html: string;
}

export class Mail {
  private content: MailContent;
  private attachments: Array<{
    data: string | Buffer | NodeJS.ReadWriteStream;
    filename?: string;
    knownLength?: number;
    contentType?: string;
  }>;
  private inlineImages: Array<{
    data: string | Buffer | NodeJS.ReadWriteStream;
    filename?: string;
    knownLength?: number;
    contentType?: string;
  }>;

  constructor(from: string, subject: string, html: string) {
    this.content = {
      from: from,
      subject: subject,
      html: html
    };
  }

  public addAttachment(filePath: string) {
    this.attachments.push({
      contentType: mime.contentType(filePath).toString(),
      filename: path.basename(filePath),
      data: fs.readFileSync(filePath)
    });
  }

  public addInlineImage(filePath: string, cidName: string) {
    this.inlineImages.push({
      contentType: mime.contentType(filePath).toString(),
      filename: cidName,
      data: fs.readFileSync(filePath)
    });
  }

  public getAttachments(mailgun: Mailgun) {
    return this.attachments.map(item => new mailgun.Attachment(item));
  }

  public getInlineImages(mailgun: Mailgun) {
    return this.inlineImages.map(item => new mailgun.Attachment(item));
  }

  public getContent() {
    return this.content;
  }
}

export interface SendResult {
  results: {
    total_rejected_recipients: number;
    total_accepted_recipients: number;
    id: string;
  };
}

export class Mailer {
  private client: Mailgun;
  constructor(options: { apiKey: string, domain: string}) {
    this.client = new mailgun({
      apiKey: options.apiKey,
      domain: options.domain
    });
  }

  public async send(
    mail: Mail,
    recipients: Array<string>
  ): Promise<{ id: string; message: string; }> {
    try {
      let result = await this.client.messages().send({
        to: recipients.join(','),
        ...mail.getContent(),
        attachment: mail.getAttachments(this.client),
        inline: mail.getInlineImages(this.client)
      });
      return result;
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
