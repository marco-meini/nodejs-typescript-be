import { App } from './app';

const app = new App();
let port: number = 9201;
if (process.argv.length > 2) {
  port = parseInt(process.argv[2]);
}

app.express.listen(port, () => {
  app.env.logger.info('### Server started on port', port.toString(), ' ###');
});
