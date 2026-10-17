import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";
import { errorHandler, notFoundHandler } from "./lib/errors.js";
import { rateLimit } from "./lib/rateLimit.js";
import { LOCAL_DIR } from "./lib/storage.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { sellersRouter } from "./routes/sellers.js";
import { listingsRouter } from "./routes/listings.js";
import { conversationsRouter } from "./routes/conversations.js";
import { uploadsRouter } from "./routes/uploads.js";
import { metaRouter } from "./routes/meta.js";
import { ordersRouter } from "./routes/orders.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", env.TRUST_PROXY);
  app.disable("x-powered-by");

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.corsOrigins, credentials: true, maxAge: 600 }));
  app.use(compression());
  if (!env.isTest) app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));

  app.get("/health", async (_req, res) => {
    const [db, cache] = await Promise.allSettled([prisma.$queryRaw`SELECT 1`, redis.ping()]);
    const ok = db.status === "fulfilled" && cache.status === "fulfilled";
    res.status(ok ? 200 : 503).json({ ok, db: db.status === "fulfilled", redis: cache.status === "fulfilled" });
  });

  // Local uploads (dev/CI only; production serves photos from S3/R2 + CDN)
  app.use("/media", express.static(LOCAL_DIR, { maxAge: "365d", immutable: true, fallthrough: false }));

  const api = express.Router();
  api.use(express.json({ limit: "200kb" }));
  api.use(cookieParser());
  // Generous per-IP ceiling (shared mobile IPs); writes have tighter per-user limits on their routes
  api.use(rateLimit({ name: "api", windowSec: 60, max: 1500 }));
  api.use("/auth", authRouter);
  api.use("/me", meRouter);
  api.use("/sellers", sellersRouter);
  api.use("/listings", listingsRouter);
  api.use("/conversations", conversationsRouter);
  api.use("/uploads", uploadsRouter);
  api.use("/meta", metaRouter);
  api.use("/orders", ordersRouter);
  app.use("/api", api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
