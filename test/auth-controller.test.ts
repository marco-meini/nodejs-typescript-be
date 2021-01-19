import { expect } from "chai";
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
  beforeAll(async done => {
    try {
      await app.env.mongoClient.connect();
      let hash = await Crypt.hash(Constants.password);
      user = await app.env.pgModels.users.create({
        fullname_us: "Marco Meini",
        password_us: hash,
        email_us: Constants.email
      });
      done();
    } catch (e) {
      done(e);
    }
  });

  afterAll(async done => {
    try {
      await app.env.pgModels.users.deleteById(user.id_us);
      await app.env.pgConnection.disconnect();
      app.env.mongoClient.disconnect();
      done();
    } catch (e) {
      done(e);
    }
  });

  test("Login", async done => {
    try {
      let wrongLoginResponse = await request
        .post(path.join(apiRootPath, "login"))
        .send({
          email: "abcd",
          password: "defg"
        });
      expect(wrongLoginResponse.status).to.be.equal(401);
      let responseOk = await request
        .post(path.join(apiRootPath, "login"))
        .send({
          email: Constants.email,
          password: Constants.password
        });
      expect(responseOk.status).to.be.equal(200);
      expect(responseOk.header).not.be.undefined;
      expect(responseOk.header).not.be.null;
      token = cookie.parse(responseOk.header["set-cookie"][0])[app.env.config.sessionCookieName];
      done();
    } catch (e) {
      done(e);
    }
  });

  test("Password reset", async done => {
    try {
      let badParamsResponse = await request.post(path.join(apiRootPath, "password_reset"));
      expect(badParamsResponse.status).to.be.equal(400);
      let unauthorizedResponse = await request
        .post(path.join(apiRootPath, "password_reset"))
        .send({
          newPassword: "a",
          oldPassword: "b"
        });
      expect(unauthorizedResponse.status).to.be.equal(403);
      let responseOk = await request
        .post(path.join(apiRootPath, "password_reset"))
        .send({
          newPassword: "abcd",
          oldPassword: Constants.password
        });
      expect(responseOk.status).to.be.equal(200);
      let responseOk_2 = await request
        .post(path.join(apiRootPath, "password_reset"))
        .send({
          newPassword: Constants.password,
          oldPassword: "abcd"
        });
      expect(responseOk_2.status).to.be.equal(200);
      done();
    } catch (e) {
      done(e);
    }
  });

  test("Logout", async done => {
    try {
      let responseOk = await request.post(path.join(apiRootPath, "logout"));
      expect(responseOk.status).to.be.equal(200);
      let notAuthenticatedResponse = await request.post(path.join(apiRootPath, "logout"));
      expect(notAuthenticatedResponse.status).to.be.equal(401);
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

  test.skip("Password recovery", async done => {
    try {
      await request.post(path.join(apiRootPath, "password_recovery")).expect(400);
      await request
        .post(path.join(apiRootPath, "password_recovery"))
        .send({
          email: "m.meini@ambrogio.com"
        })
        .expect(200);
      done();
    }
    catch (e) {
      done(e);
    }
  });
});
