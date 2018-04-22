import * as express from 'express';
import { NextFunction } from 'express';
import { Environment } from '../environment';
import { Router, Request, Response } from 'express-serve-static-core';
import { SessionRequest } from '../middlewares/session-middleware';
import * as path from 'path';
import * as mime from 'mime-types';

export class FilesController {
  public router: Router;
  public root: string;

  constructor(private env: Environment) {
    this.router = express.Router();
    this.root = 'files';
    this.router.get('/private/:name', this.env.session.checkAuthentication(), (request: SessionRequest, response, next) => this.getFile(request, response, next));
    this.router.get('/public/:name', (request: Request, response, next) => this.getPublicFile(request, response, next));
  }

  public getPrivateFile(request: SessionRequest, response: Response, next: NextFunction) {
    response.sendFile(path.join(this.env.config.fileServerRootPath, this.env.config.fileServerPrivateFolder, path.basename(request.params.name, path.extname(request.params.name))), {
      headers: {
        'Content-Type': mime.lookup(request.params.name).toString()
      }
    });
  }

  public getPublicFile(request: Request, response: Response, next: NextFunction) {
    response.sendFile(path.join(this.env.config.fileServerRootPath, this.env.config.fileServerPublicFolder, path.basename(request.params.name, path.extname(request.params.name))), {
      headers: {
        'Content-Type': mime.lookup(request.params.name).toString()
      }
    });
  }
}