import { Model, Sequelize, INTEGER, STRING, Transaction } from "sequelize";
import _ from "lodash";
import * as randomstring from "randomstring";
import * as path from "path";
import * as handlebars from "handlebars";
import * as fs from "fs";
import { Crypt } from "../../lib/crypt";
import { Mail } from "../../lib/mail-manager";
import { Mailer } from "../../lib/mail-manager";

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

export interface UserAliases {
  id: number;
  name: string;
  surname: string;
  email: string;
  grants?: Array<number>;
}

export class UserModel extends Model {
  us_id?: number;
  us_name: string;
  us_surname: string;
  us_email: string;
  us_password: string;
  grants?: Array<number>;

  static initModel(connection: Sequelize) {
    UserModel.init(
      {
        us_id: {
          type: INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        us_name: {
          type: STRING
        },
        us_surname: {
          type: STRING
        },
        us_email: {
          type: STRING,
          validate: {
            isEmail: {
              msg: "Invalid email"
            }
          }
        },
        us_password: {
          type: STRING
        }
      },
      {
        sequelize: connection,
        timestamps: false,
        freezeTableName: true,
        tableName: "users"
      }
    );
  }

  /**
   * Check if provided password is correct
   * @param provided provided password
   */
  async checkPassword(provided: string): Promise<boolean> {
    try {
      if (_.isEmpty(provided)) {
        return Promise.resolve(false);
      } else if (_.isEmpty(this.us_password)) {
        return Promise.resolve(false);
      } else {
        let result = await Crypt.compare(provided, this.us_password);
        return Promise.resolve(result);
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Generate a new password
   */
  async generateNewPassword(transaction: Transaction): Promise<string> {
    try {
      let newPassword = randomstring.generate(8);
      let hash = await Crypt.hash(newPassword);
      this.us_password = hash;
      // save the new password
      await this.save({ fields: ["us_password"], transaction: transaction });
      return Promise.resolve(newPassword);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async sendPasswordRecoveryEmail(password: string, mailer: Mailer): Promise<void> {
    try {
      let templatePath: string = path.join(__dirname, "../../../templates", "password_recovery.html");
      let file = fs.readFileSync(templatePath, { encoding: "utf8" });
      let html = handlebars.compile(file)({
        name: this.us_name,
        surname: this.us_surname,
        password: password
      });
      let mail = new Mail("marco@marcomeini.it", "Reset password", html);
      await mailer.send(mail, [this.us_email]);
      Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  aliases(): UserAliases {
    return {
      id: this.us_id,
      name: this.us_name,
      surname: this.us_surname,
      email: this.us_surname
    };
  }
}
