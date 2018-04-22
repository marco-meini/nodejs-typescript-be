import { UserAliases } from '../model/user-model';
import { NextFunction } from 'express';
import { Request, Response } from 'express-serve-static-core';
import * as express from 'express';
import * as moment from 'moment';
import { Config } from '../config';
import { SessionManager, SessionData } from '../lib/session-manager';
import { Sequelize } from 'sequelize';
import { HttpResponseStatus } from '../environment';

export interface SessionRequest extends Request {
  session?: SessionData;
  token: string;
}

export class SessionMiddleware {
  public sessionManager: SessionManager;
  constructor(private connection: Sequelize, private config: Config) {
    this.sessionManager = new SessionManager(this.connection, this.config);
  }

  checkAuthentication(): express.RequestHandler {
    return (request: SessionRequest, response: Response, next: NextFunction) => {
      let token: string = request.cookies[this.config.accessCookieName];
      if (token) {
        this.sessionManager.get(token)
          .then((data: SessionData) => {
            request.session = data;
            request.token = token;
            next();
          })
          .catch((error) => {
            response.sendStatus(HttpResponseStatus.NOT_AUTHENTICATED);
          });
      } else { 
        response.sendStatus(HttpResponseStatus.NOT_AUTHENTICATED);
      }
    };
  }

  checkPermission(permission: number): express.RequestHandler {
    return (request: SessionRequest, response: Response, next: NextFunction) => {
      let token: string = request.cookies[this.config.accessCookieName];
      if (token) {
        this.sessionManager.get(token)
          .then((data: SessionData) => {
            let _session: SessionData = data;
            if (_session.user.grants.indexOf(permission) < 0) {
              response.sendStatus(HttpResponseStatus.NOT_AUTHORIZED);
              return;
            }
            request.session = _session;
            request.token = token;
            next();
          })
          .catch((error) => {
            response.sendStatus(HttpResponseStatus.NOT_AUTHENTICATED);
          });
      } else {
        response.sendStatus(HttpResponseStatus.NOT_AUTHENTICATED);
      }
    };
  }
}