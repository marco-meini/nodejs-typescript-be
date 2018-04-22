import * as SequelizeNs from 'sequelize';

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
  id?: number;
  name: string;
  surname: string;
  email: string;
  grants?: Array<number>;
}

export interface UserAttributes {
  us_id?: number;
  us_name: string;
  us_surname: string;
  us_email: string;
  us_password: string;
}

export interface UserInstance extends SequelizeNs.Instance<UserAttributes> {
  us_id: number;
  us_name: string;
  us_surname: string;
  us_email: string;
  us_password: string;
}

export function instanceToAliases(user: UserInstance): UserAliases {
  let output: UserAliases = {
    id: user.us_id,
    name: user.us_name,
    surname: user.us_surname,
    email: user.us_email
  };
  return output;
}

export default function defineUser(sequelize: SequelizeNs.Sequelize) {
  let User = sequelize.define<UserInstance, UserAttributes>('users', {
    us_id: {
      type: SequelizeNs.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    us_name: {
      type: SequelizeNs.STRING
    },
    us_surname: {
      type: SequelizeNs.STRING
    },
    us_email: {
      type: SequelizeNs.STRING,
      validate: {
        isEmail: {
          msg: 'Invalid email'
        }
      }
    },
    us_password: {
      type: SequelizeNs.STRING
    }
  }, {
      timestamps: false,
      freezeTableName: true
    });

  return User;
}