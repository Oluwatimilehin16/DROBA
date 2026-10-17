import type { Request, RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import { forbidden, unauthorized } from "../lib/errors.js";
import { sessionActive, verifyAccess } from "../services/sessions.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { userId: string; sid: string };
    }
  }
}

function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  return h?.startsWith("Bearer ") ? h.slice(7) : null;
}

/** Attaches req.auth when a valid token is present; never rejects. For public pages that personalise. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const token = bearer(req);
  if (!token) return next();
  try {
    const c = verifyAccess(token);
    if (await sessionActive(c.sid, c.sub)) req.auth = { userId: c.sub, sid: c.sid };
  } catch {
    /* treat as anonymous */
  }
  next();
};

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = bearer(req);
  if (!token) throw unauthorized();
  const c = verifyAccess(token);
  if (!(await sessionActive(c.sid, c.sub))) throw unauthorized("Your session has ended. Please log in again.");
  req.auth = { userId: c.sub, sid: c.sid };
  next();
};

export function userId(req: Request): string {
  if (!req.auth) throw unauthorized();
  return req.auth.userId;
}

/** Loads the caller's seller profile or 403s. Selling requires a verified email. */
export async function requireSeller(req: Request) {
  const id = userId(req);
  const user = await prisma.user.findUnique({ where: { id }, select: { emailVerifiedAt: true, seller: true } });
  if (!user?.seller) throw forbidden("Set up your seller profile first");
  if (!user.emailVerifiedAt) throw forbidden("Confirm your email before selling");
  return user.seller;
}
