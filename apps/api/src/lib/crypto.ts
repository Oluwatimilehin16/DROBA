import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;

/* Password hashing uses Node's built-in scrypt. It runs on libuv's thread pool, so a burst of
   1,000 sign-ups/logins never blocks the event loop (bcryptjs would hash on the main thread).
   Format: scrypt$N$r$p$salt$hash (base64url) so parameters can be raised later. */
const N = 16384, R = 8, P = 1, KEYLEN = 32;
const opts = (n: number, r: number, p: number) => ({ N: n, r, p, maxmem: 128 * n * r * 2 });

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEYLEN, opts(N, R, P));
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scryptAsync(password, Buffer.from(salt, "base64url"), expected.length, opts(+n, +r, +p));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** A hash that always fails, so unknown emails take as long as wrong passwords (no user enumeration by timing) */
export const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("base64url");
export const hmac = (secret: string, s: string) => createHmac("sha256", secret).update(s).digest("base64url");
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
