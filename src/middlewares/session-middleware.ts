import * as express from "express";
import { NextFunction, Request, Response } from "express";
import moment from "moment";
import { SessionManager, SessionPayload } from "../lib/session-manager";
import { HttpResponseStatus } from "../enums";
import { MongoClienManager } from "../lib/mongo-client-manager";

declare global {
  namespace Express {
    interface Request {
      token: string;
      tokenSource: TokenSources;
    }
  }
}

export interface SessionRequest extends Request {
  session?: SessionPayload;
}

export enum TokenSources {
  HEADER = "HEADER",
  COOKIE = "COOKIE"
}

export class SessionMiddleware {
  public sessionManager: SessionManager;
  constructor(private sessionCookieName: string, private sessionHeaderName: string, mongoDbMan: MongoClienManager, sessionExpiration: { short: number; long: number; }) {
    this.sessionManager = new SessionManager(mongoDbMan, sessionExpiration);
  }

  getToken(request: SessionRequest) {
    let cookieToken: string = request.cookies && request.cookies[this.sessionCookieName];
    let headerToken: string = request.header(this.sessionHeaderName) as string;
    if (headerToken) {
      request.tokenSource = TokenSources.HEADER;
      return headerToken;
    } else if (cookieToken) {
      request.tokenSource = TokenSources.COOKIE;
      return cookieToken;
    }
    return "";
  }

  updateResponseToken(request: SessionRequest, response: Response, newToken: string, persistent: boolean) {
    let options: express.CookieOptions = {};
    if (request.tokenSource === TokenSources.COOKIE) {
      if (persistent)
        options = {
          expires: moment()
            .add(1, "y")
            .toDate()
        };
      response.cookie(this.sessionCookieName, newToken, options);
    }
    if (request.tokenSource === TokenSources.HEADER) {
      response.setHeader(this.sessionHeaderName, newToken);
    }
  }

  checkAuthentication(): express.RequestHandler {
    return async (request: SessionRequest, response: Response, next: NextFunction) => {
      try {
        let token: string = this.getToken(request);
        if (token) {
          let sessionData: SessionPayload = await this.sessionManager.get(token);
          let newSession = await this.sessionManager.checkRefresh(token);
          if (newSession) {
            sessionData = newSession;
            let newToken = await this.sessionManager.refreshToken(token, newSession);
            if (newToken !== token) {
              token = newToken;
              this.updateResponseToken(request, response, newToken, sessionData.persistent);
            }
          }
          request.session = sessionData;
          request.token = token;
          next();
        } else {
          response.sendStatus(HttpResponseStatus.NOT_AUTHENTICATED);
        }
      } catch (e) {
        response.sendStatus(HttpResponseStatus.NOT_AUTHENTICATED);
      }
    };
  }

  checkPermission(permission: number): express.RequestHandler {
    return async (request: SessionRequest, response: Response, next: NextFunction) => {
      try {
        let token: string = this.getToken(request);
        if (token) {
          let sessionData: SessionPayload = await this.sessionManager.get(token);
          let newSession = await this.sessionManager.checkRefresh(token);
          if (newSession) {
            sessionData = newSession;
            let newToken = await this.sessionManager.refreshToken(token, newSession);
            if (newToken !== token) {
              token = newToken;
              this.updateResponseToken(request, response, newToken, sessionData.persistent);
            }
          }
          if (sessionData!.grants.indexOf(permission) < 0) {
            response.sendStatus(HttpResponseStatus.NOT_AUTHORIZED);
          } else {
            request.session = sessionData;
            request.token = token;
            next();
          }
        } else {
          response.sendStatus(HttpResponseStatus.NOT_AUTHENTICATED);
        }
      } catch (e) {
        response.sendStatus(HttpResponseStatus.NOT_AUTHENTICATED);
      }
    };
  }

  checkAtLeastOnePermission(permissions: number[]): express.RequestHandler {
    return async (request: SessionRequest, response: Response, next: NextFunction) => {
      try {
        let token: string = this.getToken(request);
        let sessionData: SessionPayload = await this.sessionManager.get(token);
        let newSession = await this.sessionManager.checkRefresh(token);
        if (newSession) {
          sessionData = newSession;
          let newToken = await this.sessionManager.refreshToken(token, newSession);
          if (newToken !== token) {
            token = newToken;
            this.updateResponseToken(request, response, newToken, sessionData.persistent);
          }
        }
        let authorized: boolean = false;
        permissions.forEach(permission => {
          if (sessionData!.grants.indexOf(permission) >= 0) {
            authorized = true;
            return;
          }
        });
        if (!authorized) {
          response.sendStatus(HttpResponseStatus.NOT_AUTHORIZED);
        } else {
          request.session = sessionData;
          request.token = token;
          next();
        }
      } catch (e) {
        response.sendStatus(HttpResponseStatus.NOT_AUTHENTICATED);
      }
    };
  }
}
