import * as express from 'express';
import { Express, NextFunction } from 'express';
import { Router, Request, Response } from 'express-serve-static-core';
import { Environment } from './environment';
import { AuthController } from './controllers/auth-controller';
import * as bodyParser from 'body-parser';

const cookieParser = require('cookie-parser');
const Promise = require('bluebird');
const config = require('../config/config.json');
const path = require('path');

class ExpressError extends Error {
  status: number;
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
    this.express.use(path.join(this.env.config.apiRoot, auth.root), auth.router);
    this.express.use((error: ExpressError, request: Request, response: Response, next: NextFunction) => {
      if (!error) {
        next();
      } else if (error.status) {
        response.status(error.status).send();
      } else {
        this.env.logger.error(request.url, error.stack);
        response.status(500).send();
      }
    });
  }
}