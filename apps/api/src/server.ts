import "./threadpool.js";
import { createServer } from "node:http";
import { env } from "./env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";
import { createApp } from "./app.js";
import { attachSocket } from "./realtime/socket.js";

const app = createApp();
const http = createServer(app);
http.keepAliveTimeout = 65_000; // longer than typical load-balancer idle timeouts
http.headersTimeout = 66_000;
const realtime = attachSocket(http);

http.listen(env.PORT, () => logger.info({ port: env.PORT, env: env.NODE_ENV }, "Droba API listening"));

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");
  const force = setTimeout(() => process.exit(1), 15_000);
  force.unref();
  http.close();
  await realtime.close().catch(() => {});
  await prisma.$disconnect().catch(() => {});
  redis.disconnect();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (err) => logger.error({ err }, "unhandled rejection"));
