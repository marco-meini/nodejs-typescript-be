import * as Sparkpost from "sparkpost";
import { Recipient } from "sparkpost";
import * as mime from "mime-types";
import * as fs from "fs";
import * as path from "path";

export class Mail {
  private content: Sparkpost.InlineContent;

  constructor(from: string, subject: string, html: string) {
    this.content = {
      from: from,
      subject: subject,
      html: html,
      attachments: [],
      inline_images: []
    };
  }

  public addAttachment(filePath: string) {
    this.content.attachments!.push({
      type: mime.contentType(filePath).toString(),
      name: path.basename(filePath),
      data: fs.readFileSync(filePath).toString("base64")
    });
  }

  public addInlineImage(filePath: string, cidName: string) {
    this.content.inline_images!.push({
      type: mime.contentType(filePath).toString(),
      name: cidName,
      data: fs.readFileSync(filePath).toString("base64")
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

export interface EventsResult {
  results: Array<Sparkpost.MessageEvent>;
}

export class Mailer {
  private client: Sparkpost;
  constructor(sparkpostApi: string) {
    this.client = new Sparkpost(sparkpostApi);
  }

  public async send(
    mail: Mail,
    recipients: Array<string>
  ): Promise<{
    total_rejected_recipients: number;
    total_accepted_recipients: number;
    id: string;
  }> {
    try {
      let _recipients: Array<Recipient> = [];
      recipients.forEach(recipient => {
        _recipients.push({
          address: recipient
        });
      });
      let result = await this.client.transmissions.send({
        content: mail.getContent(),
        recipients: _recipients
      });
      if (result.results) {
        return Promise.resolve(result.results);
      }
      return Promise.reject(new Error("No results"));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  public async getEvents(transmissionId: string): Promise<Sparkpost.MessageEvent[]> {
    try {
      let data = await this.client.messageEvents.search({
        transmission_ids: transmissionId
      });
      if (data && data.results) {
        return Promise.resolve(data.results);
      }
      return Promise.reject(new Error("No results"));
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
