export enum HttpResponseStatus {
  NO_CONTENT = 204,
  NOT_AUTHENTICATED = 401,
  NOT_AUTHORIZED = 403,
  MISSING_PARAMS = 400,
  NOT_FOUND = 404,
  CONFLICT = 409,
  SERVER_ERROR = 500
}

export interface Result {
  success: boolean;
  message: string;
  subMessages?: Array<string>;
}