import { Sequelize } from "sequelize";
import { Config } from "./config";
import { SessionMiddleware } from "./middlewares/session-middleware";
import { Logger } from "./lib/logger";
import { MongoClienManager } from "./lib/mongo-client-manager";

export class Environment {
  public config: Config;
  public connection: Sequelize;
  public logger: Logger;
  public session: SessionMiddleware;
  public mongoClient: MongoClienManager;

  constructor() {
    this.config = require("../config/config.json");
    this.logger = new Logger(this.config.logLevel);
    this.config.db.options.logging = this.logger.sql.bind(this.logger);
    this.connection = new Sequelize(this.config.db.database, this.config.db.user, this.config.db.password, this.config.db.options);
    this.mongoClient = new MongoClienManager(this.config.mongoDb);
    this.session = new SessionMiddleware(this.config.sessionCookieName, this.config.sessionHeaderName, this.mongoClient, this.config.sessionExpiration);
  }
}
