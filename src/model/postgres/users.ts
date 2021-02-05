import { isEmpty } from "lodash";
import { PoolClient } from "pg";
import * as randomstring from "randomstring";
import * as path from "path";
import * as fs from "fs";
import * as handlebars from "handlebars";
import { Crypt } from "../../lib/crypt";
import { Mail, Mailer } from "../../lib/mail-manager";
import { PgConnection } from "../../lib/pg-connection";

export interface IUser {
  id_us?: number;
  fullname_us: string;
  email_us: string;
  password_us?: string;
}

export class Users {
  private tableName: string;
  constructor(private connection: PgConnection) {
    this.tableName = "users_us";
  }

  async getUserByEmail(email: string): Promise<IUser> {
    try {
      let data = await this.connection.query({ sql: `select * from ${this.tableName} where email_us=$1`, replacements: [email] });
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
      let data = await this.connection.query({ sql: `select * from ${this.tableName} where id_us=$1`, replacements: [id] });
      if (data.rowCount > 0) {
        return Promise.resolve(data.rows[0] as IUser);
      }
      return Promise.resolve(null);
    }
    catch (e) {
      return Promise.reject(e);
    }
  }

  async updatePassword(user: IUser, hash: string, transactionClient?: PoolClient): Promise<void> {
    try {
      if (user && user.id_us) {
        await this.connection.query({ sql: `UPDATE ${this.tableName} SET password_us=$1 WHERE id_us=$2`, replacements: [hash, user.id_us], transactionClient: transactionClient });
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
      let sql = `insert into ${this.tableName} (fullname_us,email_us,password_us) values ($1,$2,$3) returning *`;
      let data = await this.connection.query({ sql: sql, replacements: [user.fullname_us, user.email_us, user.password_us], transactionClient: transactionClient });
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
      await this.connection.query({ sql: `delete from ${this.tableName} where id_us=$1`, replacements: [id] });
      return Promise.resolve();
    }
    catch (e) {
      return Promise.reject(e);
    }
  }


  /**
   * Check if provided password is correct
   * @param provided provided password
   */
  async checkPassword(user: IUser, provided: string): Promise<boolean> {
    try {
      if (isEmpty(provided)) {
        return Promise.resolve(false);
      } else if (isEmpty(user.password_us)) {
        return Promise.resolve(false);
      } else {
        let result = await Crypt.compare(provided, user.password_us);
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
        fullname: user.fullname_us,
        password: password
      });
      let mail = new Mail("marco@marcomeini.it", "Reset password", html);
      await mailer.send(mail, [user.email_us]);
      Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async updateUser(user: IUser) {
    try {
      let sql = `update ${this.tableName} 
      set fullname_us=$1
      , email_us=$2
      where id_us=$3`;
      await this.connection.query({ sql: sql, replacements: [user.fullname_us, user.email_us, user.id_us] });
      return Promise.resolve();
    }
    catch (e) {
      return Promise.reject(e);
    }
  }
}