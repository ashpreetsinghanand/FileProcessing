
import next from "next";
import { createBullBoard } from "@bull-board/api";
import { ExpressAdapter } from "@bull-board/express";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { logProcessingQueue } from "@/lib/queue";


const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
let serverAdapter: any;
if(!serverAdapter) {
 
   serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/api/bull-board');
  createBullBoard({
    queues: [new BullMQAdapter(logProcessingQueue)],
    serverAdapter: serverAdapter,
  });

}

export default function handler(req: any, res: any) {
  return serverAdapter.getRouter()(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};