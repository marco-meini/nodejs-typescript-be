import * as express from "express";
import { NextFunction, Router, Request, Response } from "express";
import * as Sequelize from "sequelize";
import * as SequelizeButler from "sequelize-butler";
import _ from "lodash";
import moment from "moment";
import { Environment } from "../environment";
import { SessionRequest } from "../middlewares/session-middleware";
import { Mailer } from "../lib/mail-manager";
import { Crypt } from "../lib/crypt";
import { HttpResponseStatus } from "../enums";
import { UserAliases, UserModel } from "../model/postgres/user-model";

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
        let filter = new SequelizeButler.Filter(this.env.connection);
        filter.addEqual("us_email", loginData.email, Sequelize.STRING);
        let user: UserModel = await UserModel.findOne({
          where: filter.getWhere()
        });
        if (user) {
          let authenticated = await user.checkPassword(loginData.password);
          if (authenticated) {
            let token = await this.env.session.sessionManager.set({
              userId: user.us_id,
              name: user.us_name,
              surname: user.us_surname,
              email: user.us_email,
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
        let filter = new SequelizeButler.Filter(this.env.connection);
        filter.addEqual("us_email", recoveryData.email, Sequelize.STRING);
        let t = await this.env.connection.transaction();
        try {
          let user: UserModel = await UserModel.findOne({
            where: filter.getWhere()
          });
          if (user) {
            // generate the new password
            let newPassword = await user.generateNewPassword(t);
            // send the new password by email
            await user.sendPasswordRecoveryEmail(newPassword, this.env.mailer);
            await t.commit();
            response.send();
          } else {
            response.sendStatus(HttpResponseStatus.NOT_AUTHORIZED);
          }
        } catch (e) {
          try {
            await t.rollback();
          } catch (e) {
            this.env.logger.error(e);
          }
          next(e);
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
        let user: UserModel = await UserModel.findByPk(request.session.userId);
        let valid = await user.checkPassword(passwordResetData.oldPassword);
        if (valid) {
          let hash = await Crypt.hash(passwordResetData.newPassword);
          user.us_password = hash;
          await user.save({ fields: ["us_password"] });
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
