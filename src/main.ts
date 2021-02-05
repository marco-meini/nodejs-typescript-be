import { App } from "./app";

const app = new App();
let port = 9201;
if (process.argv.length > 2) {
  port = parseInt(process.argv[2]);
}

(async () => {
  try {
    await app.env.mongoClient.connect();
  } catch (e) {
    app.env.logger.error(`Error starting mongodb client: ${e}`);
  }
  app.express.listen(port, () => {
    app.env.logger.info("### Server started on port", port.toString(), " ###");
  });
})();

process.on("beforeExit", async () => {
  await app.env.pgConnection.disconnect();
  app.env.mongoClient.disconnect();
});
