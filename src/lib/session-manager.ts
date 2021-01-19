import * as jwt from "jsonwebtoken";
import { v1 } from "uuid";
import * as _ from "lodash";
import { MongoClienManager } from "./mongo-client-manager";
import * as moment from "moment";
import { ObjectId } from "mongodb";

export interface SessionPayload {
  userId: number;
  fullname: string;
  email: string;
  grants?: Array<number>;
  persistent: boolean;
}

interface ISession {
  _id?: ObjectId;
  jwt: string;
  secret: string;
  userId?: number;
  newPayload?: SessionPayload;
  expireIn: number;
}

export class SessionManager {
  constructor(private dbMan: MongoClienManager, private sessionExpiration: { short: number; long: number }, private collectionName: string = "sessions") {}

  /**
   * Create JWT token
   * @param sessionData session data
   * @param expireIn expiration in seconds
   */
  private signToken(sessionData: SessionPayload, secret: string, expireIn: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      jwt.sign(sessionData, secret, { expiresIn: expireIn }, (error, token) => {
        if (error) {
          reject(error);
        } else {
          resolve(token);
        }
      });
    });
  }

  /**
   * Verify if token is a valid JWT
   * @param token JWT token
   * @param secret private key with which the token is signed
   */
  private verifyToken(token: string, secret: string): Promise<SessionPayload> {
    return new Promise<SessionPayload>((resolve, reject) => {
      jwt.verify(token, secret, (error, decoded) => {
        if (error) {
          reject(error);
        } else if (!decoded) {
          reject(new Error("Token is invalid"));
        } else {
          resolve(decoded as SessionPayload);
        }
      });
    });
  }

  /**
   * Store new Token into Mongodb
   * @param userId User's identity
   * @param token JWT token
   * @param secret private key with which the token is signed
   * @param expireIn Token expiration in seconds
   */
  private async storeNewToken(userId: number, token: string, secret: string, expireIn: number): Promise<void> {
    try {
      let sessionCollection = this.dbMan.db.collection(this.collectionName);
      let document: ISession = {
        userId: userId,
        jwt: token,
        secret: secret,
        expireIn: moment()
          .utc()
          .add(expireIn, "seconds")
          .valueOf()
      };
      await sessionCollection.insertOne(document);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Get secret with wich token is signed
   * @param token JWT token
   */
  private async getSecret(token: string): Promise<string> {
    try {
      if (token) {
        let sessionCollection = this.dbMan.db.collection(this.collectionName);
        let session = (await sessionCollection.findOne({
          jwt: token
        })) as ISession;
        if (session) {
          return Promise.resolve(session.secret);
        } else {
          return Promise.reject(new Error("Session not found"));
        }
      } else {
        return Promise.reject(new Error("Empty token"));
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Create a new JWT and store it into Redis
   * @param sessionData session data
   * @param rememberMe If true the session will expire in 1 year, otherwise in 3 months
   */
  public async set(sessionData: SessionPayload): Promise<string> {
    try {
      let expireIn: number = sessionData.persistent ? this.sessionExpiration.long : this.sessionExpiration.short;
      let secret: string = v1();
      let jwtToken = await this.signToken(sessionData, secret, expireIn);
      await this.storeNewToken(sessionData.userId, jwtToken, secret, expireIn);
      return Promise.resolve(jwtToken);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Check if JWT token is signed as "To be refreshed"
   * @param token JWT token
   */
  public async checkRefresh(token: string): Promise<SessionPayload | undefined> {
    try {
      let sessionCollection = this.dbMan.db.collection(this.collectionName);
      let session = (await sessionCollection.findOne({
        jwt: token
      })) as ISession;
      if (session) {
        return Promise.resolve(session.newPayload);
      } else {
        return Promise.reject(new Error("Session not found"));
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Remove old JWT token and create a new one with new data
   * @param token JWT token to be refreshed
   * @param sessionData Session data
   */
  public async refreshToken(token: string, sessionData: SessionPayload): Promise<string> {
    try {
      await this.removeToken(token);
      let newToken = await this.set(sessionData);
      return Promise.resolve(newToken);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Get session data from a JWT
   * @param token JWT token
   */
  public async get(token: string): Promise<SessionPayload> {
    try {
      let secret = await this.getSecret(token);
      let data = await this.verifyToken(token, secret);
      return Promise.resolve(data);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Remove JWT token from MongoDB
   * @param token JWT token
   * @param userId User's identity
   */
  public async removeToken(token: string): Promise<void> {
    try {
      let sessionCollection = this.dbMan.db.collection(this.collectionName);
      await sessionCollection.deleteOne({
        jwt: token
      });
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Loop all active tokens of an user and check if grants have been modified.
   * If yes mark these tokens as to be refreshed
   * @param grants Array of grants
   */
  public async updateUserGrants(userId: number, grants: Array<string>): Promise<void> {
    try {
      let sessionCollection = this.dbMan.db.collection(this.collectionName);
      let result = await sessionCollection.find({ userId: userId });
      let sessions = (await result.toArray()) as ISession[];
      for (let session of sessions) {
        let payload: SessionPayload = <SessionPayload>jwt.decode(session.jwt);
        if (!_.isEqual(payload.grants, grants)) {
          await sessionCollection.updateOne(
            { _id: session._id },
            {
              $set: {
                newPayload: {
                  userId: payload.userId,
                  fullname: payload.fullname,
                  email: payload.email,
                  grants: grants,
                  persistent: payload.persistent
                }
              }
            }
          );
        }
      }
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
