import * as bcrypt from 'bcrypt';
import * as Promise from 'bluebird';


export class Crypt {
  static hash(plain: string): Promise<string> {
    return new Promise((resolve, reject) => {
      bcrypt.hash(plain, 10, (error, hashed) => {
        if (error) {
          reject(error);
        } else {
          resolve(hashed);
        }
      });
    });
  }

  static compare(plain: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      bcrypt.compare(plain, hash)
        .then((res: boolean) => {
          resolve(res);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}