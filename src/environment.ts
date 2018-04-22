import * as Sequelize from 'sequelize';
import { Config } from './config';
import { SessionMiddleware } from './middlewares/session-middleware';
import { Logger, LogLevel } from './lib/logger';
import * as moment from 'moment';
import * as chalk from 'chalk';

export enum HttpResponseStatus {
  NOT_AUTHENTICATED = 401,
  NOT_AUTHORIZED = 403,
  MISSING_PARAMS = 400,
  NOT_FOUND = 404
}

export class Environment {

  public config: Config;
  public connection: Sequelize.Sequelize;
  public logger: Logger;
  public session: SessionMiddleware;

  constructor() {
    this.config = require('../config/config.json');
    this.logger = new Logger(this.config.logLevel);
    this.config.db.options.logging = this.logger.sql.bind(this.logger);
    this.connection = new Sequelize(this.config.db.database,
      this.config.db.user,
      this.config.db.password,
      this.config.db.options);
    this.session = new SessionMiddleware(this.connection, this.config);
  }
}