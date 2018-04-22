import * as Sequelize from 'sequelize';
import { ClientOpts } from 'redis';

export interface DbConfig {
  database: string;
  user: string;
  password: string;
  options: Sequelize.Options;
}

export interface Sparkpost {
  api: string;
}

export interface Config {
  // common properties
  db: DbConfig;
  redisOptions?: ClientOpts;
  accessCookieName: string;
  logLevel: number;
  jwtExpiration?: number;
  // api properties
  apiRoot: string;
  applicationHeader: string;
  sparkpost: Sparkpost;
  // file server properties
  fsApiRoot: string;
  fileServerRootPath: string;
  fileServerPrivateFolder: string;
  fileServerPublicFolder: string;
}