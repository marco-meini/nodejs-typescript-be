import { PgConnection } from "../../lib/pg-connection";
import { Users } from "./users";

export class PgModels {
  public users: Users;

  constructor(pgConnection: PgConnection) {
    this.users = new Users(pgConnection);
  }
}