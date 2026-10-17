import { Redis } from "ioredis";
import { env } from "../env.js";
import { logger } from "./logger.js";

function make(name: string) {
  const r = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, enableAutoPipelining: true, lazyConnect: false });
  r.on("error", (e) => logger.warn({ err: e.message, conn: name }, "redis error"));
  return r;
}

/** General commands: cache, rate limits, sessions, presence */
export const redis = make("main");

/** Pub/sub pair for the Socket.io adapter (a subscribed connection can't run normal commands) */
export function makeAdapterClients() {
  return { pub: make("io-pub"), sub: make("io-sub") };
}
