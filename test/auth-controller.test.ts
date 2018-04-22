import { } from 'jest';
import { expect, should } from 'chai';
import { App } from '../src/app';
import * as supertest from 'supertest';
import * as path from 'path';
import * as cookie from 'cookie';
import * as UserModel from '../src/model/user-model';
import { Constants } from './constants';
import { Crypt } from '../src/lib/crypt';

const app = new App();
const request = supertest.agent(app.express);
const apiRootPath = path.join(app.env.config.apiRoot, 'auth');
let token: string = null;
let user = UserModel.default(app.env.connection);

describe('Auth', () => {
  let userId = null;
  beforeAll((done) => {
    Crypt.hash(Constants.password)
      .then((hash: string) => {
        return user.create({
          us_name: 'Marco',
          us_surname: 'Meini',
          us_password: hash,
          us_email: Constants.email
        })
      })
      .then((user: UserModel.UserInstance) => {
        userId = user.us_id;
        done();
      })
      .catch((error) => {
        done(error)
      })
  });

  afterAll((done) => {
    user.findById(userId)
      .then((user: UserModel.UserInstance) => {
        return user.destroy();
      })
      .then(() => {
        done();
      })
      .catch((error) => { 
        done(error)
      })
  });

  test('Wrong login', () => {
    return request
      .post(path.join(apiRootPath, 'login'))
      .send({
        email: 'abcd',
        password: 'defg'
      })
      .expect(401);
  });

  test('Right login', () => {
    return request
      .post(path.join(apiRootPath, 'login'))
      .send({
        email: Constants.email,
        password: Constants.password
      })
      .expect(200)
      .then((response) => {
        expect(response).not.be.undefined;
        expect(response.header).not.be.undefined;
        expect(response.header).not.be.null;
        token = cookie.parse(response.header['set-cookie'][0])[app.env.config.accessCookieName];
      });
  });

  test('Authenticated user data', () => {
    return request
      .get(path.join(apiRootPath, 'me'))
      .set('Cookie', app.env.config.accessCookieName + '=' + token)
      .expect(200)
      .then((response) => {
        expect(response).not.be.undefined;
        expect(response.body).to.not.be.a('null');
        expect(response.body.name).to.be.equal(Constants.name);
        expect(response.body.surname).to.be.equal(Constants.surname);
        expect(response.body.email).to.be.equal(Constants.email);
      });
  });

  test('Wrong password reset - missing parameters', () => {
    return request
      .post(path.join(apiRootPath, 'password_reset'))
      .set('Cookie', app.env.config.accessCookieName + '=' + token)
      .expect(400);
  });

  test('Wrong password reset - wrong old password', () => {
    return request
      .post(path.join(apiRootPath, 'password_reset'))
      .set('Cookie', app.env.config.accessCookieName + '=' + token)
      .send({
        newPassword: 'a',
        oldPassword: 'b'
      })
      .expect(403);
  });

  test('Right password reset', () => {
    return request
      .post(path.join(apiRootPath, 'password_reset'))
      .set('Cookie', app.env.config.accessCookieName + '=' + token)
      .send({
        newPassword: 'abcd',
        oldPassword: Constants.password
      })
      .expect(200);
  });

  test('Right password reset to previous', () => {
    return request
      .post(path.join(apiRootPath, 'password_reset'))
      .set('Cookie', app.env.config.accessCookieName + '=' + token)
      .send({
        newPassword: Constants.password,
        oldPassword: 'abcd'
      })
      .expect(200);
  });

  test('Wrong logout - null sid', () => {
    return request
      .post(path.join(apiRootPath, 'logout'))
      .set('Cookie', null)
      .expect(401);
  });

  test('Right logout', () => {
    return request
      .post(path.join(apiRootPath, 'logout'))
      .set('Cookie', app.env.config.accessCookieName + '=' + token)
      .expect(200);
  });

  test('Wrong sid logout', () => {
    return request
      .post(path.join(apiRootPath, 'logout'))
      .set('Cookie', app.env.config.accessCookieName + '=' + token)
      .expect(401);
  });

  test('Wrong password recovery', () => {
    return request
      .post(path.join(apiRootPath, 'password_recovery'))
      .expect(400);
  });

  test.skip('Right password recovery', () => {
    return request
      .post(path.join(apiRootPath, 'password_recovery'))
      .send({
        email: 'm.meini@ambrogio.com'
      })
      .expect(200);
  });
});