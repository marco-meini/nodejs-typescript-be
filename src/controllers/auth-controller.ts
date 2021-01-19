import * as express from "express";
import { NextFunction, Router, Request, Response } from "express";
import * as _ from "lodash";
import * as moment from "moment";
import { Environment } from "../environment";
import { SessionRequest } from "../middlewares/session-middleware";
import { Crypt } from "../lib/crypt";
import { HttpResponseStatus } from "../enums";
import { IUser } from "../model/postgres/users";

interface LoginData {
  email: string;
  password: string;
}

interface RecoveryData {
  email: string;
}

interface PasswordReset {
  oldPassword: string;
  newPassword: string;
}

export class AuthController {
  public router: Router;
  public root: string;

  constructor(private env: Environment) {
    this.router = express.Router();
    this.root = "auth";
    this.router.post("/login", async (request, response, next) => this.login(request, response, next));
    this.router.post("/logout", this.env.session.checkAuthentication(), (request: SessionRequest, response, next) => this.logout(request, response, next));
    this.router.post("/password_recovery", (request, response, next) => this.passwordRecovery(request, response, next));
    this.router.post("/password_reset", this.env.session.checkAuthentication(), (request: SessionRequest, response, next) => this.passwordReset(request, response, next));
  }

  private async login(request: Request, response: Response, next: NextFunction) {
    try {
      let loginData: LoginData = request.body;
      if (loginData) {
        let user: IUser = await this.env.pgModels.users.getUserByEmail(loginData.email);
        if (user) {
          let authenticated = await this.env.pgModels.users.checkPassword(user, loginData.password);
          if (authenticated) {
            let token = await this.env.session.sessionManager.set({
              userId: user.id_us,
              fullname: user.fullname_us,
              email: user.email_us,
              persistent: true,
              grants: [] // TODO
            });
            // add cookie to the response
            let options: express.CookieOptions = null;
            if (true /*loginData.persistent*/)
              options = {
                expires: moment()
                  .add(1, "y")
                  .toDate()
              };
            response.cookie(this.env.config.sessionCookieName, token, options);
            response.send();
          } else {
            response.sendStatus(HttpResponseStatus.NOT_AUTHENTICATED);
          }
        } else {
          response.sendStatus(HttpResponseStatus.NOT_AUTHENTICATED);
        }
      } else {
        response.sendStatus(HttpResponseStatus.MISSING_PARAMS);
      }
    } catch (e) {
      next(e);
    }
  }

  private async logout(request: SessionRequest, response: Response, next: NextFunction) {
    try {
      // remove token from the session
      await this.env.session.sessionManager.removeToken(request.token);
      // clear cookie
      response.clearCookie(this.env.config.sessionCookieName).send();
    } catch (e) {
      next(e);
    }
  }

  private async passwordRecovery(request: Request, response: Response, next: NextFunction) {
    try {
      let recoveryData: RecoveryData = request.body;
      if (recoveryData && recoveryData.email) {
        let user = await this.env.pgModels.users.getUserByEmail(recoveryData.email);
        if (user) {
          let t = await this.env.pgConnection.startTransaction();
          try {
            // generate the new password
            let newPassword = await this.env.pgModels.users.generateNewPassword(user, t);
            // send the new password by email
            await this.env.pgModels.users.sendPasswordRecoveryEmail(user, newPassword, this.env.mailer);
            await this.env.pgConnection.commit(t);
            response.send();
          } catch (e) {
            try {
              await this.env.pgConnection.rollback(t);
            } catch (e) {
              this.env.logger.error(e);
            }
            next(e);
          }
        } else {
          response.sendStatus(HttpResponseStatus.NOT_AUTHORIZED);
        }
      } else {
        response.sendStatus(HttpResponseStatus.MISSING_PARAMS);
      }
    } catch (e) {
      next(e);
    }
  }

  private async passwordReset(request: SessionRequest, response: Response, next: NextFunction) {
    try {
      let passwordResetData: PasswordReset = request.body;
      if (passwordResetData && passwordResetData.newPassword && passwordResetData.oldPassword) {
        let user = await this.env.pgModels.users.getUserById(request.session.userId);
        let valid = await this.env.pgModels.users.checkPassword(user, passwordResetData.oldPassword);
        if (valid) {
          let hash = await Crypt.hash(passwordResetData.newPassword);
          await this.env.pgModels.users.updatePassword(user, hash);
          response.send();
        } else {
          response.sendStatus(HttpResponseStatus.NOT_AUTHORIZED);
        }
      } else {
        response.sendStatus(HttpResponseStatus.MISSING_PARAMS);
      }
    } catch (e) {
      next(e);
    }
  }
}
