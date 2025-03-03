const { parse } = require("url");
const express = require("express");
const next = require("next");
const { createServer } = require("http");
const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const { logProcessingQueue } = require("./queue");


const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const serverAdapter = new ExpressAdapter();
  createBullBoard({
    queues: [new BullMQAdapter(logProcessingQueue)],
    serverAdapter: serverAdapter,
  });

  server.use("/api/bull-board", serverAdapter.getRouter());

  server.all("*", (req:any, res:any) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  server.listen(3001, () => {
    console.log("> Ready on http://localhost:3001/api/bull-board");
  });
});
