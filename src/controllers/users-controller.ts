import * as express from "express";
import { Router, NextFunction, Response } from "express";
import { HttpResponseStatus, Result } from "../enums-interfaces";
import { Environment } from "../environment";
import { SessionPayload } from "../lib/session-manager";
import { SessionRequest } from "../middlewares/session-middleware";
import { IUser } from "../model/postgres/users";

export class UsersController {
  public router: Router;
  public root: string;

  constructor(private env: Environment) {
    this.router = express.Router();
    this.root = "users";
    this.router.patch("/me", this.env.session.checkAuthentication(), async (request, response, next) => this.updateMe(request, response, next));
  }

  private async updateMe(request: SessionRequest, response: Response, next: NextFunction) {
    try {
      let input: {
        fullname?: string;
        email?: string;
      } = request.body;
      let output: Result = {
        success: true,
        message: "Dati salvati con successo"
      };
      if (!input.fullname || !input.fullname) {
        output.success = false;
        output.message = "Dati non validi";
        output.subMessages = [];
        if (!input.fullname) output.subMessages.push("Nome/Cognome obbligatorio");
        if (!input.email) output.subMessages.push("Email obbligatoria");
        return response.status(HttpResponseStatus.MISSING_PARAMS).json(output);
      }
      let user: IUser = {
        id_us: request.session.userId,
        fullname_us: input.fullname,
        email_us: input.email
      };
      await this.env.pgModels.users.updateUser(user);
      let newSession: SessionPayload = {
        userId: user.id_us,
        email: user.email_us,
        fullname: user.fullname_us,
        persistent: request.session.persistent,
        grants: request.session.grants
      };
      let newToken = await this.env.session.sessionManager.refreshToken(request.token, newSession);
      if (newToken !== request.token) {
        this.env.session.updateResponseToken(request, response, newToken, newSession.persistent);
      }
      return response.json(output);
    }
    catch (e) {
      next(e);
    }
  }
}