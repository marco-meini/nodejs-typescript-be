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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  constructor(options: unknown) { }

  public async send(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mail: Mail,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    recipients: Array<string>
  ): Promise<{ id: string; message: string; }> {
    try {
      return Promise.reject("Send mail to Be implemented");
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
