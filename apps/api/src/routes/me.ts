import { Router } from "express";
import { z } from "zod";
import { cityByName, switchModeSchema, updateProfileSchema, LISTING_STATUSES } from "@droba/shared";
import { prisma } from "../lib/prisma.js";
import { AppError, parse, unauthorized } from "../lib/errors.js";
import { requireAuth, requireSeller, userId } from "../middleware/auth.js";
import { listingCard, loadMe } from "../services/serialize.js";

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get("/", async (req, res) => {
  const me = await loadMe(userId(req));
  if (!me) throw unauthorized();
  res.json(me);
});

meRouter.patch("/", async (req, res) => {
  const input = parse(updateProfileSchema, req.body);
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.city !== undefined) {
    data.city = input.city;
    // Choosing a city without sharing GPS puts "near me" at the city centre
    if (input.city && input.location === undefined) {
      const c = cityByName(input.city)!;
      data.lat = c.lat;
      data.lng = c.lng;
    }
  }
  if (input.location !== undefined) {
    data.lat = input.location?.lat ?? null;
    data.lng = input.location?.lng ?? null;
  }
  await prisma.user.update({ where: { id: userId(req) }, data });
  res.json(await loadMe(userId(req)));
});

/** One account, two views. Seller view needs a seller profile; the client routes to setup on 409. */
meRouter.post("/mode", async (req, res) => {
  const { mode } = parse(switchModeSchema, req.body);
  const uid = userId(req);
  if (mode === "SELLER") {
    const seller = await prisma.seller.findUnique({ where: { userId: uid }, select: { id: true } });
    if (!seller) throw new AppError(409, "NEEDS_SELLER_PROFILE", "Set up your seller profile to switch to selling");
  }
  await prisma.user.update({ where: { id: uid }, data: { activeMode: mode } });
  res.json(await loadMe(uid));
});

meRouter.get("/saved", async (req, res) => {
  const saves = await prisma.save.findMany({
    where: { userId: userId(req), listing: { status: { in: ["ACTIVE", "SOLD"] } } },
    include: { listing: { include: { seller: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ items: saves.map((s) => listingCard(s.listing, { saved: true })) });
});

meRouter.get("/following", async (req, res) => {
  const f = await prisma.follow.findMany({ where: { userId: userId(req) }, include: { seller: true }, orderBy: { createdAt: "desc" }, take: 200 });
  res.json({ items: f.map((x) => ({ id: x.seller.id, displayName: x.seller.displayName, handle: x.seller.handle, city: x.seller.city, logoUrl: x.seller.logoUrl, verified: x.seller.verified })) });
});

/** Seller dashboard: my listings (any status except removed) + headline numbers */
meRouter.get("/listings", async (req, res) => {
  const seller = await requireSeller(req);
  const status = z.enum(LISTING_STATUSES).optional().parse(req.query.status);
  const rows = await prisma.listing.findMany({
    where: { sellerId: seller.id, status: status ?? { not: "REMOVED" } },
    include: { seller: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const totals = rows.reduce((t, l) => ({ views: t.views + l.views, saves: t.saves + l.savesCount }), { views: 0, saves: 0 });
  const chats = await prisma.conversation.count({ where: { sellerUserId: seller.userId } });
  res.json({
    items: rows.map((l) => ({ ...listingCard(l), views: l.views, savesCount: l.savesCount })),
    stats: { active: rows.filter((l) => l.status === "ACTIVE").length, sold: seller.soldCount, views: totals.views, saves: totals.saves, chats, boostCredits: seller.boostCredits },
  });
});
