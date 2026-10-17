import { redis } from "./redis.js";
import { logger } from "./logger.js";

/* Read-through JSON cache on Redis.
   - In-process "single flight": 200 concurrent requests for the same cold key run the loader once.
   - Redis failures degrade to calling the loader (the site stays up if Redis blips). */

const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlSec: number, load: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch (e) {
    logger.warn({ err: (e as Error).message, key }, "cache read failed");
    return load();
  }
  const running = inflight.get(key);
  if (running) return running as Promise<T>;
  const p = (async () => {
    try {
      const value = await load();
      redis.set(key, JSON.stringify(value), "EX", ttlSec).catch(() => {});
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export async function invalidate(...keys: string[]) {
  if (keys.length) await redis.del(...keys).catch(() => {});
}

/* Search and feed results are keyed by a version number. Any listing write bumps the version,
   which retires every cached search page at once without scanning keys. */
const LISTINGS_VERSION = "v:listings";
let localVersion: { value: string; at: number } | null = null;

export async function listingsVersion(): Promise<string> {
  if (localVersion && Date.now() - localVersion.at < 1000) return localVersion.value;
  try {
    const v = (await redis.get(LISTINGS_VERSION)) ?? "0";
    localVersion = { value: v, at: Date.now() };
    return v;
  } catch {
    return "x" + Math.floor(Date.now() / 30000);
  }
}

export async function bumpListingsVersion() {
  localVersion = null;
  await redis.incr(LISTINGS_VERSION).catch(() => {});
}

export const keys = {
  listing: (id: string) => `listing:${id}`,
  store: (handle: string) => `store:${handle}`,
  seller: (id: string) => `seller:${id}`,
  search: (version: string, hash: string) => `search:${version}:${hash}`,
  session: (sid: string) => `sess:${sid}`,
  convo: (id: string) => `convo:${id}`,
  meta: "meta:v1",
};
