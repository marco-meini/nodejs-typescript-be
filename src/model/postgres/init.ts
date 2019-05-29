import { Sequelize } from "sequelize/types";
import { UserModel } from "./user-model";

export const initPostgresModels = (connection: Sequelize) => {
  UserModel.initModel(connection);
};
