import * as express from 'express';
import { NextFunction } from 'express';
import { Router, Request, Response } from 'express-serve-static-core';
import * as Sequelize from 'sequelize';
import * as SequelizeButler from 'sequelize-butler';
import * as Promise from 'bluebird';
import * as _ from 'lodash';
import * as randomstring from 'randomstring';
import * as path from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as moment from 'moment';

import { Environment, HttpResponseStatus } from '../environment';
import * as UserModel from '../model/user-model';
import { UserInstance, UserAliases } from '../model/user-model';
import { SessionRequest } from '../middlewares/session-middleware';
import { Mailer, Mail } from '../lib/mailer';
import { Crypt } from '../lib/crypt';

const uuidv1 = require('uuid/v1');

interface LoginData {
  email: string;
  password: string;
}

interface LoginOutput {
  sid: string;
  data: UserAliases;
}

interface RecoveryData {
  email: string;
}

interface NewPassword {
  value: string;
  hashed: string;
}

interface PasswordReset {
  oldPassword: string;
  newPassword: string;
}

export class AuthController {
  public router: Router;
  public root: string;
  private user: Sequelize.Model<UserModel.UserInstance, UserModel.UserAttributes>;
  private mailer: Mailer;

  constructor(private env: Environment) {
    this.user = UserModel.default(env.connection);
    this.mailer = new Mailer(this.env);
    this.router = express.Router();
    this.root = 'auth';
    this.router.post('/login', (request, response, next) => this.login(request, response, next));
    this.router.post('/logout', this.env.session.checkAuthentication(), (request: SessionRequest, response, next) => this.logout(request, response, next));
    this.router.get('/me', this.env.session.checkAuthentication(), (request: SessionRequest, response, next) => this.authenticated(request, response, next));
    this.router.post('/password_recovery', (request, response, next) => this.passwordRecovery(request, response, next));
    this.router.post('/password_reset', this.env.session.checkAuthentication(), (request: SessionRequest, response, next) => this.passwordReset(request, response, next));
  }

  private checkPassword(provided: string, user: UserInstance): Promise<boolean> {
    if (user) {
      if (_.isEmpty(provided)) {
        return Promise.resolve(false);
      } else {
        return Crypt.compare(provided, user.us_password);
      }
    } else {
      return Promise.resolve(false);
    }
  }

  private generateNewPassord(): Promise<NewPassword> {
    return new Promise((resolve, reject) => {
      let newPassword: NewPassword = {
        value: randomstring.generate(8),
        hashed: undefined
      };
      Crypt.hash(newPassword.value)
        .then((hash: string) => {
          newPassword.hashed = hash;
          resolve(newPassword);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  private sendPasswordRecoveryEmail(user: UserInstance, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let templatePath: string = path.join(__dirname, '../../templates', 'password_recovery.html');
      fs.readFile(templatePath, { encoding: 'utf8' }, (error, file) => {
        if (error) {
          reject(error);
        } else {
          let html = handlebars.compile(file)({
            name: user.us_name,
            surname: user.us_surname,
            password: password
          });
          // send email
          let mail = new Mail('marco@marcomeini.it', 'Reset password', html);
          this.mailer.send(mail, [user.us_email])
            .then((result) => {
              if (result.total_accepted_recipients === 1) {
                resolve();
              } else {
                reject(new Error('Email recipient rejected'));
              }
            })
            .catch((error) => {
              reject(error);
            });
        }
      });
    });
  }

  private login(request: Request, response: Response, next: NextFunction) {
    let loginData: LoginData = request.body;
    if (loginData) {
      let filter = new SequelizeButler.Filter(this.env.connection);
      filter.addEqual('us_email', loginData.email, Sequelize.STRING);
      let _user: UserAliases;
      this.user.findOne({
        where: filter.getWhere()
      }).then((user: UserInstance) => {
        if (user) _user = UserModel.instanceToAliases(user);
        return this.checkPassword(loginData.password, user);
      }).then((authenticated: boolean) => {
        if (authenticated) {
          return this.env.session.sessionManager.set(_user);
        } else {
          return Promise.reject({ status: HttpResponseStatus.NOT_AUTHENTICATED });
        }
      }).then((token: string) => {
        response.cookie(this.env.config.accessCookieName, token, {
          expires: moment().add(2, 'M').toDate()
        }).send();
      }).catch((error) => {
        next(error);
      });
    } else {
      response.sendStatus(HttpResponseStatus.MISSING_PARAMS);
    }
  }

  private logout(request: SessionRequest, response: Response, next: NextFunction) {
    this.env.session.sessionManager.delete(request.token)
      .then(() => {
        response.send();
      }).catch((error) => {
        next(error);
      });
  }

  private authenticated(request: SessionRequest, response: Response, next: NextFunction) {
    response.send(request.session.user);
  }

  private passwordRecovery(request: Request, response: Response, next: NextFunction) {
    let recoveryData: RecoveryData = request.body;
    if (recoveryData && recoveryData.email) {
      let filter = new SequelizeButler.Filter(this.env.connection);
      filter.addEqual('us_email', recoveryData.email, Sequelize.STRING);
      let _user: UserInstance;
      let _newPassword: NewPassword;
      this.env.connection.transaction()
        .then((t: Sequelize.Transaction) => {
          this.user.findOne({
            where: filter.getWhere()
          }).then((user: UserInstance) => {
            if (user) {
              _user = user;
              return this.generateNewPassord();
            } else {
              return Promise.reject({ status: HttpResponseStatus.MISSING_PARAMS });
            }
          }).then((newPassword: NewPassword) => {
            _newPassword = newPassword;
            _user.us_password = newPassword.hashed;
            return _user.save({ transaction: t });
          }).then(() => {
            return this.sendPasswordRecoveryEmail(_user, _newPassword.value);
          }).then(() => {
            return t.commit();
          }).then(() => {
            response.send();
          }).catch((error) => {
            t.rollback().finally(() => { next(error); });
          });
        }).catch((error) => {
          next(error);
        });
    } else {
      response.sendStatus(HttpResponseStatus.MISSING_PARAMS);
    }
  }

  private passwordReset(request: SessionRequest, response: Response, next: NextFunction) {
    let passwordResetData: PasswordReset = request.body;
    if (passwordResetData && passwordResetData.newPassword && passwordResetData.oldPassword) {
      let _user: UserInstance;
      this.user.findById(request.session.user.id)
        .then((user: UserInstance) => {
          _user = user;
          return this.checkPassword(passwordResetData.oldPassword, user);
        })
        .then((valid: boolean) => {
          if (valid) {
            return Crypt.hash(passwordResetData.newPassword);
          } else {
            return Promise.reject({ status: HttpResponseStatus.NOT_AUTHORIZED });
          }
        })
        .then((hash: string) => {
          _user.us_password = hash;
          return _user.save();
        })
        .then(() => {
          response.send();
        })
        .catch((error) => {
          next(error);
        });
    } else {
      response.sendStatus(HttpResponseStatus.MISSING_PARAMS);
    }
  }
}