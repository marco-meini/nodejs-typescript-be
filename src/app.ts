import * as express from "express";
import { Express, NextFunction } from "express";
import { Request, Response } from "express-serve-static-core";
import * as cookieParser from "cookie-parser";
import * as path from "path";
import { Environment } from "./environment";
import { AuthController } from "./controllers/auth-controller";
import * as bodyParser from "body-parser";
import { HttpResponseStatus } from "./enums-interfaces";
import { FilesController } from "./controllers/files-controller";
import { UsersController } from "./controllers/users-controller";

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
    const users = new UsersController(this.env);
    this.express.use(path.join(this.env.config.apiRoot, auth.root), auth.router);
    this.express.use(path.join(this.env.config.apiRoot, files.root), files.router);
    this.express.use(path.join(this.env.config.apiRoot, users.root), users.router);
    this.express.use((error: Error, request: Request, response: Response, next: NextFunction) => {
      if (!error) {
        next();
      } else {
        console.error(error);
        this.env.logger.error(request.url, error.stack);
        response.sendStatus(HttpResponseStatus.SERVER_ERROR);
      }
    });
  }
}
