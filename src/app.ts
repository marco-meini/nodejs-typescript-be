import * as express from "express";
import { Express, NextFunction } from "express";
import { Request, Response } from "express-serve-static-core";
import * as cookieParser from "cookie-parser";
import * as path from "path";
import { Environment } from "./environment";
import { AuthController } from "./controllers/auth-controller";
import * as bodyParser from "body-parser";
import { HttpResponseStatus } from "./enums";
import { FilesController } from "./controllers/files-controller";

class ExpressError extends Error {
  status: number;
  errors?: any;
}

export class App {
  public express: Express;
  public env: Environment;

  constructor() {
    this.env = new Environment();
    this.express = express();
    this.express.use(cookieParser());
    this.express.use(bodyParser.json());
    const auth = new AuthController(this.env);
    const files = new FilesController(this.env);
    this.express.use(path.join(this.env.config.apiRoot, auth.root), auth.router);
    this.express.use(path.join(this.env.config.apiRoot, files.root), files.router);
    this.express.use((error: ExpressError, request: Request, response: Response, next: NextFunction) => {
      if (!error) {
        next();
      } else {
        if (error.name && (error.name === "SequelizeValidationError" || error.name === "SequelizeUniqueConstraintError")) {
          error.status = HttpResponseStatus.MISSING_PARAMS;
        }
        if (error.status && error.status !== HttpResponseStatus.SERVER_ERROR) {
          if (error.errors && error.errors.length) {
            let data = error.errors.map((item: any) => {
              return item.message;
            });
            response.status(error.status).send(data);
          } else {
            response.sendStatus(error.status);
          }
        } else {
          this.env.logger.error(request.url, error.stack);
          response.sendStatus(HttpResponseStatus.SERVER_ERROR);
        }
      }
    });
  }
}
