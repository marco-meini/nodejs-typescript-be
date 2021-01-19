import { } from "jest";
import { expect, should } from "chai";
import { App } from "../src/app";
import * as supertest from "supertest";
import * as path from "path";
import * as cookie from "cookie";
import { Constants } from "./constants";
import { Crypt } from "../src/lib/crypt";
import { IUser } from "../src/model/postgres/users";

const app = new App();
const request = supertest.agent(app.express);
const apiRootPath = path.join(app.env.config.apiRoot, "auth");
let token: string = null;
let user: IUser;

describe("Auth", () => {
  let userId = null;
  beforeAll(async (done: { (arg0: any): void; (): void; (arg0: any): void; }) => {
    try {
      await app.env.mongoClient.connect();
      let hash = await Crypt.hash(Constants.password);
      user = await app.env.pgModels.users.create({
        us_name: "Marco",
        us_surname: "Meini",
        us_password: hash,
        us_email: Constants.email
      });
      done();
    } catch (e) {
      done(e);
    }
  });

  afterAll(async (done: { (): void; (arg0: any): void; }) => {
    try {
      await app.env.pgModels.users.deleteById(user.us_id);
      await app.env.pgConnection.disconnect();
      app.env.mongoClient.disconnect();
      done();
    } catch (e) {
      done(e);
    }
  });

  test("Wrong login", async (done: { (): void; (arg0: any): void; }) => {
    try {
      await request
        .post(path.join(apiRootPath, "login"))
        .send({
          email: "abcd",
          password: "defg"
        })
        .expect(401);
      done();
    } catch (e) {
      done(e);
    }
  });

  test("Right login", async (done: { (): void; (arg0: any): void; }) => {
    try {
      let response = await request
        .post(path.join(apiRootPath, "login"))
        .send({
          email: Constants.email,
          password: Constants.password
        })
        .expect(200);
      expect(response).not.be.undefined;
      expect(response.header).not.be.undefined;
      expect(response.header).not.be.null;
      token = cookie.parse(response.header["set-cookie"][0])[app.env.config.sessionCookieName];
      done();
    } catch (e) {
      done(e);
    }
  });

  test("Wrong password reset - missing parameters", async done => {
    try {
      await request.post(path.join(apiRootPath, "password_reset")).expect(400);
      done();
    } catch (e) {
      done(e);
    }
  });

  test("Wrong password reset - wrong old password", async done => {
    try {
      await request
        .post(path.join(apiRootPath, "password_reset"))
        .send({
          newPassword: "a",
          oldPassword: "b"
        })
        .expect(403);
      done();
    } catch (e) {
      done(e);
    }
  });

  test("Right password reset", async done => {
    try {
      await request
        .post(path.join(apiRootPath, "password_reset"))
        .send({
          newPassword: "abcd",
          oldPassword: Constants.password
        })
        .expect(200);
      done();
    } catch (e) {
      done(e);
    }
  });

  test("Right password reset to previous", async done => {
    try {
      await request
        .post(path.join(apiRootPath, "password_reset"))
        .send({
          newPassword: Constants.password,
          oldPassword: "abcd"
        })
        .expect(200);
      done();
    } catch (e) {
      done(e);
    }
  });

  test("Right logout", async (done: { (): void; (arg0: any): void; }) => {
    try {
      await request.post(path.join(apiRootPath, "logout")).expect(200);
      done();
    } catch (e) {
      done(e);
    }
  });

  test("Logout - not authenticated", async (done: { (): void; (arg0: any): void; }) => {
    try {
      await request.post(path.join(apiRootPath, "logout")).expect(401);
      done();
    } catch (e) {
      done(e);
    }
  });

  test("Password reset - noth authenticated", async done => {
    try {
      await request
        .post(path.join(apiRootPath, "password_reset"))
        .send({
          newPassword: Constants.password,
          oldPassword: "abcd"
        })
        .expect(401);
      done();
    } catch (e) {
      done(e);
    }
  });

  test("Wrong password recovery", () => {
    return request.post(path.join(apiRootPath, "password_recovery")).expect(400);
  });

  test.skip("Right password recovery", () => {
    return request
      .post(path.join(apiRootPath, "password_recovery"))
      .send({
        email: "m.meini@ambrogio.com"
      })
      .expect(200);
  });
});
