import { Config } from "./config";
import { SessionMiddleware } from "./middlewares/session-middleware";
import { Logger } from "./lib/logger";
import { MongoClienManager } from "./lib/mongo-client-manager";
import { Mailer } from "./lib/mail-manager";
import { PgConnection } from "./lib/pg-connection";
import { PgModels } from "./model/postgres/pg-models";

export class Environment {
  public config: Config;
  public pgConnection: PgConnection;
  public pgModels: PgModels;
  public logger: Logger;
  public session: SessionMiddleware;
  public mongoClient: MongoClienManager;
  public mailer: Mailer;

  constructor() {
    this.config = require("../config/config.json");
    this.logger = new Logger(this.config.logLevel);
    this.pgConnection = new PgConnection(this.config.db, this.logger.sql);
    this.pgModels = new PgModels(this.pgConnection);
    this.mongoClient = new MongoClienManager(this.config.mongoDb);
    this.session = new SessionMiddleware(this.config.sessionCookieName, this.config.sessionHeaderName, this.mongoClient, this.config.sessionExpiration);
    this.mailer = new Mailer(this.config.mailerOptions);
  }
}
