import { Router } from "express";
import { reportSchema } from "@droba/shared";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound, parse } from "../lib/errors.js";
import { rateLimit } from "../lib/rateLimit.js";
import { requireAuth, userId } from "../middleware/auth.js";

export const reportsRouter = Router();

/** Flag a listing or a seller for Droba to review */
reportsRouter.post("/", requireAuth, rateLimit({ name: "report", windowSec: 3600, max: 10, key: (r) => r.auth!.userId }), async (req, res) => {
  const uid = userId(req);
  const input = parse(reportSchema, req.body);
  let sellerId: string;
  let listingId: string | null = null;
  if (input.listingId) {
    const l = await prisma.listing.findUnique({ where: { id: input.listingId }, select: { id: true, sellerId: true, seller: { select: { userId: true } } } });
    if (!l) throw notFound("Listing not found");
    if (l.seller.userId === uid) throw badRequest("You can't report your own listing");
    sellerId = l.sellerId;
    listingId = l.id;
  } else {
    const s = await prisma.seller.findUnique({ where: { id: input.sellerId! }, select: { id: true, userId: true } });
    if (!s) throw notFound("Seller not found");
    if (s.userId === uid) throw badRequest("You can't report yourself");
    sellerId = s.id;
  }
  // One open report per person per thing: a second tap just confirms the first
  const existing = await prisma.report.findFirst({ where: { reporterId: uid, sellerId, listingId, status: "OPEN" }, select: { id: true } });
  if (existing) return void res.json({ ok: true, id: existing.id });
  const r = await prisma.report.create({ data: { reporterId: uid, sellerId, listingId, reason: input.reason, details: input.details || null } });
  res.status(201).json({ ok: true, id: r.id });
});
