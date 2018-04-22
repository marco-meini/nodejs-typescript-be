import * as Sparkpost from 'sparkpost';
import { Recipient, SparkPostError } from 'sparkpost';
import * as mime from 'mime-types';
import * as fs from 'fs';
import * as path from 'path';
import { Environment } from '../environment';
import * as Promise from 'bluebird';
import { reject, resolve } from 'bluebird';

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
    this.content.attachments.push({
      type: mime.contentType(filePath).toString(),
      name: path.basename(filePath),
      data: fs.readFileSync(filePath).toString('base64')
    });
  }

  public addInlineImage(filePath: string, cidName: string) {
    this.content.inline_images.push({
      type: mime.contentType(filePath).toString(),
      name: cidName,
      data: fs.readFileSync(filePath).toString('base64')
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
  constructor(env: Environment) {
    this.client = new Sparkpost(env.config.sparkpost.api);
  }

  public send(mail: Mail, recipients: Array<string>): Promise<{ total_rejected_recipients: number, total_accepted_recipients: number, id: string }> {
    return new Promise((resolve, reject) => {
      let _recipients: Array<Recipient> = [];
      recipients.forEach((recipient) => {
        _recipients.push({
          address: recipient
        });
      });
      this.client.transmissions.send({
        content: mail.getContent(),
        recipients: _recipients
      }).then((result: SendResult) => {
        if (result.results) {
          resolve(result.results);
        } else {
          reject(new Error('No results'));
        }
      }).catch((error) => {
        reject(error);
      });
    });
  }

  public getEvents(transmissionId: string): Promise<Sparkpost.MessageEvent[]> {
    return new Promise((resolve, reject) => {
      this.client.messageEvents.search({
        transmission_ids: transmissionId
      }).then((data: EventsResult) => {
        if (data && data.results) {
          resolve(data.results);
        } else {
          reject(new Error('No results'));
        }
      }).catch((error) => {
        reject(error);
      });
    });
  }
}