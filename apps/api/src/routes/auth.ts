import { Router, type Response } from "express";
import { emailOnlySchema, loginSchema, resetPasswordSchema, signupSchema, tokenSchema, cityByName, type AuthResponse } from "@droba/shared";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";
import { AppError, badRequest, conflict, parse, unauthorized } from "../lib/errors.js";
import { DUMMY_HASH, hashPassword, randomToken, sha256, verifyPassword } from "../lib/crypto.js";
import { sendEmail, templates } from "../lib/email.js";
import { rateLimit } from "../lib/rateLimit.js";
import { createSession, revokeAllSessions, revokeSession, rotateSession } from "../services/sessions.js";
import { loadMe } from "../services/serialize.js";
import { requireAuth, userId } from "../middleware/auth.js";

export const REFRESH_COOKIE = "droba_rt";
const COOKIE_PATH = "/api/auth";

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: COOKIE_PATH,
    domain: env.COOKIE_DOMAIN,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86400 * 1000,
  });
}
const clearRefreshCookie = (res: Response) => res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH, domain: env.COOKIE_DOMAIN });

async function issueEmailToken(userIdValue: string, type: "VERIFY" | "RESET") {
  const raw = randomToken(32);
  const ttlMs = type === "VERIFY" ? 24 * 3600_000 : 3600_000;
  // Invalidate older unused tokens of the same type so only the newest link works
  await prisma.emailToken.updateMany({ where: { userId: userIdValue, type, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.emailToken.create({ data: { userId: userIdValue, type, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + ttlMs) } });
  return raw;
}

async function sendVerification(user: { id: string; email: string; name: string }) {
  const token = await issueEmailToken(user.id, "VERIFY");
  sendEmail({ to: user.email, ...templates.verify(user.name, `${env.WEB_URL}/verify-email?token=${token}`) });
}

async function authResponse(res: Response, userIdValue: string, userAgent?: string) {
  const s = await createSession(userIdValue, userAgent);
  setRefreshCookie(res, s.refreshToken);
  const user = await loadMe(userIdValue);
  const body: AuthResponse = { accessToken: s.accessToken, expiresIn: env.ACCESS_TOKEN_TTL_SEC, user: user! };
  return body;
}

export const authRouter = Router();

const authLimiter = rateLimit({ name: "auth", windowSec: 60, max: 10 });
const signupLimiter = rateLimit({ name: "signup", windowSec: 3600, max: 20 });

authRouter.post("/signup", signupLimiter, async (req, res) => {
  const input = parse(signupSchema, req.body);
  const exists = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (exists) throw conflict("An account with this email already exists. Try logging in.", { email: "Already registered" });
  const city = input.city ? cityByName(input.city) : undefined;
  const user = await prisma.user
    .create({
      data: {
        email: input.email,
        passwordHash: await hashPassword(input.password),
        name: input.name,
        phone: input.phone,
        city: city?.name,
        lat: city?.lat,
        lng: city?.lng,
      },
      select: { id: true, email: true, name: true },
    })
    .catch((e) => {
      if (e?.code === "P2002") throw conflict("An account with this email already exists. Try logging in.", { email: "Already registered" });
      throw e;
    });
  await sendVerification(user);
  res.status(201).json(await authResponse(res, user.id, req.get("user-agent")));
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const input = parse(loginSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true, passwordHash: true } });
  const ok = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized("That email and password don't match");
  res.json(await authResponse(res, user.id, req.get("user-agent")));
});

authRouter.post("/refresh", rateLimit({ name: "refresh", windowSec: 60, max: 60 }), async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) throw unauthorized();
  try {
    const s = await rotateSession(token);
    setRefreshCookie(res, s.refreshToken);
    const user = await loadMe(s.userId);
    if (!user) throw unauthorized();
    res.json({ accessToken: s.accessToken, expiresIn: env.ACCESS_TOKEN_TTL_SEC, user } satisfies AuthResponse);
  } catch (e) {
    clearRefreshCookie(res);
    throw e;
  }
});

authRouter.post("/logout", async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  const sid = token?.split(".")[0];
  if (sid) await revokeSession(sid);
  clearRefreshCookie(res);
  res.status(204).end();
});

authRouter.post("/logout-all", requireAuth, async (req, res) => {
  await revokeAllSessions(userId(req));
  clearRefreshCookie(res);
  res.status(204).end();
});

authRouter.post("/verify-email", authLimiter, async (req, res) => {
  const { token } = parse(tokenSchema, req.body);
  const t = await prisma.emailToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!t || t.type !== "VERIFY" || t.usedAt || t.expiresAt < new Date()) throw badRequest("This link has expired or was already used. Request a new one.");
  await prisma.$transaction([
    prisma.emailToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: t.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  res.json({ ok: true });
});

authRouter.post("/resend-verification", requireAuth, rateLimit({ name: "resend", windowSec: 600, max: 3, key: (r) => r.auth!.userId }), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: userId(req) }, select: { id: true, email: true, name: true, emailVerifiedAt: true } });
  if (!user) throw unauthorized();
  if (user.emailVerifiedAt) throw new AppError(400, "ALREADY_VERIFIED", "Your email is already confirmed");
  await sendVerification(user);
  res.json({ ok: true });
});

/** Always 200 so the endpoint can't be used to discover which emails have accounts */
authRouter.post("/forgot-password", rateLimit({ name: "forgot", windowSec: 900, max: 5 }), async (req, res) => {
  const { email } = parse(emailOnlySchema, req.body);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (user) {
    const token = await issueEmailToken(user.id, "RESET");
    sendEmail({ to: user.email, ...templates.reset(`${env.WEB_URL}/reset-password?token=${token}`) });
  }
  res.json({ ok: true });
});

authRouter.post("/reset-password", authLimiter, async (req, res) => {
  const { token, password } = parse(resetPasswordSchema, req.body);
  const t = await prisma.emailToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!t || t.type !== "RESET" || t.usedAt || t.expiresAt < new Date()) throw badRequest("This link has expired or was already used. Request a new one.");
  await prisma.$transaction([
    prisma.emailToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    // Reset proves control of the inbox, so it also confirms the email
    prisma.user.update({ where: { id: t.userId }, data: { passwordHash: await hashPassword(password), emailVerifiedAt: new Date() } }),
  ]);
  await revokeAllSessions(t.userId);
  res.json({ ok: true });
});
