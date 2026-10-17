import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { keys } from "../lib/cache.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { unauthorized } from "../lib/errors.js";

/* Sessions
   - Access token: short-lived JWT { sub, sid } sent as a Bearer header (and in the socket handshake).
   - Refresh token: opaque "<sid>.<secret>" in an httpOnly cookie; only its sha256 is stored in Postgres.
     Rotated on every refresh. Re-using an old one (stolen cookie) revokes the session.
   - Redis holds "sess:<sid>" → userId so every request can check revocation in ~0.2ms
     without touching Postgres; logout takes effect immediately on every API instance. */

export interface AccessClaims {
  sub: string;
  sid: string;
}

const refreshTtlSec = () => env.REFRESH_TOKEN_TTL_DAYS * 86400;
const GRACE_SEC = 30;

export function signAccess(userId: string, sid: string) {
  return jwt.sign({ sid } satisfies Omit<AccessClaims, "sub">, env.JWT_ACCESS_SECRET, { subject: userId, expiresIn: env.ACCESS_TOKEN_TTL_SEC, algorithm: "HS256" });
}

export function verifyAccess(token: string): AccessClaims {
  try {
    const p = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    if (typeof p.sub !== "string" || typeof p.sid !== "string") throw new Error("bad claims");
    return { sub: p.sub, sid: p.sid };
  } catch {
    throw unauthorized("Your session has expired. Please log in again.");
  }
}

/** True if the session is live. Redis first, Postgres as the source of truth on a miss. */
export async function sessionActive(sid: string, userId: string): Promise<boolean> {
  try {
    const v = await redis.get(keys.session(sid));
    if (v === userId) return true;
    if (v === "revoked") return false;
  } catch {
    /* fall through to the database */
  }
  const s = await prisma.session.findUnique({ where: { id: sid }, select: { userId: true, revokedAt: true, expiresAt: true } });
  const ok = !!s && s.userId === userId && !s.revokedAt && s.expiresAt > new Date();
  const ttl = ok ? Math.max(60, Math.floor((s!.expiresAt.getTime() - Date.now()) / 1000)) : 3600;
  redis.set(keys.session(sid), ok ? userId : "revoked", "EX", ttl).catch(() => {});
  return ok;
}

export async function createSession(userId: string, userAgent?: string) {
  // The id is generated here so the refresh token (and its hash) exist before the insert: one round trip
  const sid = randomToken(16);
  const refreshToken = `${sid}.${randomToken(32)}`;
  await prisma.session.create({
    data: { id: sid, userId, tokenHash: sha256(refreshToken), userAgent: userAgent?.slice(0, 200), expiresAt: new Date(Date.now() + refreshTtlSec() * 1000) },
    select: { id: true },
  });
  await redis.set(keys.session(sid), userId, "EX", refreshTtlSec()).catch(() => {});
  return { sid, refreshToken, accessToken: signAccess(userId, sid) };
}

export async function rotateSession(refreshToken: string) {
  const sid = refreshToken.split(".")[0];
  if (!sid) throw unauthorized();
  const presentedHash = sha256(refreshToken);

  // Two tabs often refresh at the same moment with the same token. The first one to claim the
  // grace key rotates it; everyone else presenting that token in the next 30s gets the same new
  // token instead of tripping reuse detection. The claim happens before the database write, so a
  // racer that sees the new hash in Postgres will always find the grace entry.
  const graceKey = `rt-grace:${presentedHash}`;
  const fromGrace = async () => {
    const v = await redis.get(graceKey).catch(() => null);
    const [userId, token] = v?.split("|") ?? [];
    return userId && token ? { userId, sid, refreshToken: token, accessToken: signAccess(userId, sid) } : null;
  };

  const early = await fromGrace();
  if (early) return early;

  const s = await prisma.session.findUnique({ where: { id: sid } });
  if (!s || s.revokedAt || s.expiresAt < new Date()) throw unauthorized();
  if (s.tokenHash !== presentedHash) {
    const raced = await fromGrace();
    if (raced) return raced;
    await revokeSession(sid); // an old token was replayed: assume theft, end the session
    throw unauthorized("Your session was ended for security. Please log in again.");
  }

  const next = `${sid}.${randomToken(32)}`;
  const claimed = await redis.set(graceKey, `${s.userId}|${next}`, "EX", GRACE_SEC, "NX").catch(() => "OK");
  if (claimed !== "OK") {
    const other = await fromGrace();
    if (other) return other;
    throw unauthorized();
  }
  const updated = await prisma.session.updateMany({
    where: { id: sid, tokenHash: presentedHash },
    data: { tokenHash: sha256(next), lastUsedAt: new Date(), expiresAt: new Date(Date.now() + refreshTtlSec() * 1000) },
  });
  if (updated.count === 0) {
    await redis.del(graceKey).catch(() => {});
    throw unauthorized();
  }
  await redis.set(keys.session(sid), s.userId, "EX", refreshTtlSec()).catch(() => {});
  return { userId: s.userId, sid, refreshToken: next, accessToken: signAccess(s.userId, sid) };
}

export async function revokeSession(sid: string) {
  await prisma.session.updateMany({ where: { id: sid, revokedAt: null }, data: { revokedAt: new Date() } });
  await redis.set(keys.session(sid), "revoked", "EX", refreshTtlSec()).catch(() => {});
}

export async function revokeAllSessions(userId: string) {
  const live = await prisma.session.findMany({ where: { userId, revokedAt: null }, select: { id: true } });
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  if (live.length) {
    const m = redis.multi();
    for (const s of live) m.set(keys.session(s.id), "revoked", "EX", refreshTtlSec());
    await m.exec().catch(() => {});
  }
}
