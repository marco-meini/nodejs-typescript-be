import * as express from 'express';
import { Express, NextFunction } from 'express';
import { Router, Request, Response } from 'express-serve-static-core';
import { Environment } from './environment';
import { AvatarController } from './fs-controllers/avatar-controller';
import * as bodyParser from 'body-parser';

const cookieParser = require('cookie-parser');
const Promise = require('bluebird');
const config = require('../config/config.json');
const path = require('path');

export class App {
  public express: Express;
  public env: Environment;

  constructor() {
    this.env = new Environment();
    this.express = express();
    this.express.use(cookieParser());
    this.express.use(bodyParser.json());  
    const avatar = new AvatarController(this.env);
    this.express.use(path.join(this.env.config.fsApiRoot, avatar.root), avatar.router);  
    this.express.use((error: Error, request: Request, response: Response, next: NextFunction) => {
      if (!error) {
        next();
      } else {
        this.env.logger.error(request.url, error.stack);
        response.status(500).send();
      }
    });
  }
}