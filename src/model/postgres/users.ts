import { isEmpty } from "lodash";
import { PoolClient } from "pg";
import * as randomstring from "randomstring";
import * as path from "path";
import * as fs from "fs";
import * as handlebars from "handlebars";
import { Crypt } from "../../lib/crypt";
import { Mail, Mailer } from "../../lib/mail-manager";
import { PgConnection } from "../../lib/pg-connection";


/**
 * USERS TABLE
 *
 CREATE TABLE IF NOT EXISTS users (
  us_id serial NOT NULL,
  us_name character varying NOT NULL,
  us_surname character varying NOT NULL,
  us_email character varying NOT NULL,
  us_password character varying NOT NULL,
  PRIMARY KEY(us_id)
 );
 */

export interface IUser {
  us_id?: number;
  us_name: string;
  us_surname: string;
  us_email: string;
  us_password?: string;
}

export class Users {
  private tableName: string;
  constructor(private connection: PgConnection) {
    this.tableName = "users";
  }

  async getUserByEmail(email: string): Promise<IUser> {
    try {
      let data = await this.connection.query({ sql: `select * from ${this.tableName} where us_email=$1`, replacements: [email] });
      if (data.rowCount > 0) {
        return Promise.resolve(data.rows[0] as IUser);
      }
      return Promise.resolve(null);
    }
    catch (e) {
      return Promise.reject(e);
    }
  }

  async getUserById(id: number): Promise<IUser> {
    try {
      let data = await this.connection.query({ sql: `select * from ${this.tableName} where us_id=$1`, replacements: [id] });
      if (data.rowCount > 0) {
        return Promise.resolve(data.rows[0] as IUser);
      }
      return Promise.resolve(null);
    }
    catch (e) {
      return Promise.reject(e);
    }
  };

  async updatePassword(user: IUser, hash: string, transactionClient?: PoolClient): Promise<void> {
    try {
      if (user && user.us_id) {
        await this.connection.query({ sql: `UPDATE ${this.tableName} SET us_password=$1 WHERE us_id=$2`, replacements: [hash, user.us_id], transactionClient: transactionClient });
        return Promise.resolve();
      } else {
        return Promise.reject(new Error("User id is null or undefined"));
      }
    }
    catch (e) {
      return Promise.reject(e);
    }
  }

  async create(user: IUser, transactionClient?: PoolClient): Promise<IUser> {
    try {
      let sql = `insert into ${this.tableName} (us_name,us_surname,us_email,us_password) values ($1,$2,$3,$4) returning *`;
      let data = await this.connection.query({ sql: sql, replacements: [user.us_name, user.us_surname, user.us_email, user.us_password], transactionClient: transactionClient });
      if (data.rowCount > 0) {
        return Promise.resolve(data.rows[0] as IUser);
      }
      return Promise.resolve(null);
    }
    catch (e) {
      return Promise.reject(e);
    }
  }

  async deleteById(id: number): Promise<void> {
    try {
      await this.connection.query({ sql: `delete from ${this.tableName} where us_id=$1`, replacements: [id] });
      return Promise.resolve();
    }
    catch (e) {
      return Promise.reject(e);
    }
  };


  /**
   * Check if provided password is correct
   * @param provided provided password
   */
  async checkPassword(user: IUser, provided: string): Promise<boolean> {
    try {
      if (isEmpty(provided)) {
        return Promise.resolve(false);
      } else if (isEmpty(user.us_password)) {
        return Promise.resolve(false);
      } else {
        let result = await Crypt.compare(provided, user.us_password);
        return Promise.resolve(result);
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Generate a new password
   */
  async generateNewPassword(user: IUser, transactionClient?: PoolClient): Promise<string> {
    try {
      let newPassword = randomstring.generate(8);
      let hash = await Crypt.hash(newPassword);
      await this.updatePassword(user, hash, transactionClient);
      return Promise.resolve(newPassword);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async sendPasswordRecoveryEmail(user: IUser, password: string, mailer: Mailer): Promise<void> {
    try {
      let templatePath: string = path.join(__dirname, "../../../templates", "password_recovery.html");
      let file = fs.readFileSync(templatePath, { encoding: "utf8" });
      let html = handlebars.compile(file)({
        name: user.us_name,
        surname: user.us_surname,
        password: password
      });
      let mail = new Mail("marco@marcomeini.it", "Reset password", html);
      await mailer.send(mail, [user.us_email]);
      Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }
}