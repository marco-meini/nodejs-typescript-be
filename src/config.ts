import * as Sequelize from "sequelize";
import { MongoDbConfig } from "./lib/mongo-client-manager";

export interface DbConfig {
  database: string;
  user: string;
  password: string;
  options: Sequelize.Options;
}

export interface Sparkpost {
  api: string;
}

export interface SessionExpiration {
  short: number;
  long: number;
}

export interface Config {
  // common properties
  db: DbConfig;
  mongoDb: MongoDbConfig;
  sessionCookieName: string;
  sessionHeaderName: string;
  logLevel: number;
  sessionExpiration: SessionExpiration;
  // api properties
  apiRoot: string;
  sparkpost: Sparkpost;
  // file server properties
  fileServerRootPath: string;
  fileServerPrivateFolder: string;
  fileServerPublicFolder: string;
}
