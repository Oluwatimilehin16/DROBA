import type { Request, RequestHandler } from "express";
import { env } from "../env.js";
import { redis } from "./redis.js";
import { AppError } from "./errors.js";

/** Fixed-window counter in Redis, shared by every API instance. */
export async function hit(key: string, windowSec: number): Promise<number> {
  const k = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const [[, count]] = (await redis.multi().incr(k).expire(k, windowSec + 1).exec()) as [[null, number], [null, number]];
  return count;
}

export function rateLimit(opts: { name: string; windowSec: number; max: number; key?: (req: Request) => string }): RequestHandler {
  return async (req, res, next) => {
    if (env.RATE_LIMIT_DISABLED) return next();
    const who = opts.key ? opts.key(req) : req.ip ?? "unknown";
    let count: number;
    try {
      count = await hit(`${opts.name}:${who}`, opts.windowSec);
    } catch {
      return next(); // fail open if Redis is unavailable
    }
    res.setHeader("RateLimit-Limit", opts.max);
    res.setHeader("RateLimit-Remaining", Math.max(0, opts.max - count));
    if (count > opts.max) {
      res.setHeader("Retry-After", opts.windowSec);
      return next(new AppError(429, "RATE_LIMITED", "Too many attempts. Please wait a moment and try again."));
    }
    next();
  };
}

/** Same counter for socket events; returns false when over the limit */
export async function allow(name: string, who: string, windowSec: number, max: number): Promise<boolean> {
  if (env.RATE_LIMIT_DISABLED) return true;
  try {
    return (await hit(`${name}:${who}`, windowSec)) <= max;
  } catch {
    return true;
  }
}
