import * as jwt from 'jsonwebtoken';
import * as SequelizeButler from 'sequelize-butler';
import * as Promise from 'bluebird';
import * as Sequelize from 'sequelize';
import * as moment from 'moment';
import { Config } from '../config';
import * as UserModel from '../model/user-model';
import { UserAliases } from '../model/user-model';
import * as redis from 'redis';
import { RedisClient } from 'redis';
const uuidv1 = require('uuid/v1');

export interface SessionData {
  user: UserAliases;
}

export class SessionManager {
  private redisClient: RedisClient;
  constructor(private connection: Sequelize.Sequelize, private config: Config) {
    if (this.config.redisOptions)
      this.redisClient = redis.createClient(this.config.redisOptions);
  }

  private saveToken(token: string, secret: string, userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.redisClient.hset(token, 'secret', secret, (err) => {
        if (err) {
          reject(err);
          return;
        }
        this.redisClient.hset(token, 'user', userId.toString(), (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    })
  }

  private getSecret(token: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.redisClient.hget(token, 'secret', (err, reply) => {
        if (err) {
          reject(err);
        } else if (!reply) {
          reject(new Error('The token has been revoked'));
        } else {
          resolve(reply);
        }
      });
    })
  }

  private sign(sessionData: SessionData, secret: string): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(sessionData, secret, {
        expiresIn: this.config.jwtExpiration
      }, (error, token) => {
        if (error) {
          reject(error);
        } else {
          resolve(token);
        }
      });
    })
  }

  private verify(token: string, secret: string): Promise<SessionData> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, secret, (error, decoded: SessionData) => {
        if (error) {
          reject(error);
        } else {
          resolve(decoded);
        }
      });
    })
  }

  set(user: UserAliases): Promise<string> {
    return new Promise((resolve, reject) => {
      let sessionData: SessionData = {
        user: user
      };
      let secret: string = uuidv1()
      let _token: string = null;
      this.sign(sessionData, secret)
        .then((token) => {
          _token = token
          return this.saveToken(token, secret, user.id);
        })
        .then(() => {
          resolve(_token);
        })
        .catch((error) => {
          reject(error);
        })
    });
  }

  get(token: string): Promise<SessionData> {
    return new Promise((resolve, reject) => {
      this.getSecret(token)
        .then((secret) => {
          return this.verify(token, secret);
        })
        .then((sessionData: SessionData) => {
          resolve(sessionData);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  delete(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.redisClient.hdel(token, ['secret', 'user'], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}