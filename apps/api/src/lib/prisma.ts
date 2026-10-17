import { PrismaClient } from "@prisma/client";
import { env } from "../env.js";

/** One client per process. Pool size comes from `connection_limit` in DATABASE_URL. */
export const prisma = new PrismaClient({
  log: env.isProd ? ["error"] : ["error", "warn"],
});
