import { Mailer, Mail } from '../src/lib/mailer';
import { Environment } from '../src/environment';
import { expect } from 'chai';
import * as path from 'path';

describe('Mailer', () => {
  const env = new Environment();
  const mailer = new Mailer(env);

  test.skip('Send email with attachment and inline image', (done) => {
    let mail = new Mail('m.meini@ambrogio.com', 'Hello, World!', '<html><body><p>Testing SparkPost - the world\'s most awesomest email service!</p><img src="cid:logo_img" /></body></html>');
    mail.addAttachment(path.join(__dirname, 'files', 'avatar','33fca3d27ef89bf186e5a244c8ba9cba919dda48.jpg'));
    mail.addInlineImage(path.join(__dirname, 'files', 'avatar','33fca3d27ef89bf186e5a244c8ba9cba919dda48.jpg'), 'logo_img');
    mailer.send(mail, ['marco.meini.1979@gmail.com'])
      .then((results) => { 
        expect(results).to.not.be.a('null');
        expect(results.total_accepted_recipients).to.be.equal(1);
        done()
      })
      .catch((error) => { 
        done(error)
      })
  })
})
