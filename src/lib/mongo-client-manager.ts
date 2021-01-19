import { MongoClient, Db } from "mongodb";

export interface MongoDbConfig {
  host: string;
  port: number;
  db: string;
  auth?: {
    user: string;
    password: string;
  };
}

export class MongoClienManager {
  private client!: MongoClient;
  public db!: Db;
  constructor(private dbconfig: MongoDbConfig | string) { }

  async connect(): Promise<void> {
    try {
      if (typeof this.dbconfig === "string") {
        this.client = await MongoClient.connect(this.dbconfig, { useNewUrlParser: true, useUnifiedTopology: true });
        this.db = this.client.db();
      } else {
        this.client = await MongoClient.connect(`mongodb://${this.dbconfig.host}:${this.dbconfig.port}/${this.dbconfig.db}`, {
          auth: this.dbconfig.auth,
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
        this.db = this.client.db(this.dbconfig.db);
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  disconnect() {
    this.client.close();
  }
}
