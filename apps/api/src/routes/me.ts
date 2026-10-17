import { Router } from "express";
import { z } from "zod";
import { analyticsQuerySchema, bagIdsSchema, campaignSchema, cityByName, switchModeSchema, updateProfileSchema, LISTING_STATUSES, type BagItemDTO } from "@droba/shared";
import { prisma } from "../lib/prisma.js";
import { AppError, notFound, parse, unauthorized } from "../lib/errors.js";
import { rateLimit } from "../lib/rateLimit.js";
import { sellerAnalytics } from "../services/analytics.js";
import { createCampaign, listCampaigns } from "../services/promotions.js";
import { requireAuth, requireSeller, userId } from "../middleware/auth.js";
import { listingCard, listingDetail, loadMe, sellerCounts } from "../services/serialize.js";

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
  const seller = await requireSeller(req, { verified: false });
  const status = z.enum(LISTING_STATUSES).optional().parse(req.query.status);
  const rows = await prisma.listing.findMany({
    where: { sellerId: seller.id, status: status ?? { not: "REMOVED" } },
    include: { seller: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const totals = rows.reduce((t, l) => ({ views: t.views + l.views, saves: t.saves + l.savesCount }), { views: 0, saves: 0 });
  const [chats, removed] = await Promise.all([
    prisma.conversation.count({ where: { sellerUserId: seller.userId } }),
    // Listings Droba took down in the last 30 days, so the seller knows why they vanished
    prisma.listing.findMany({ where: { sellerId: seller.id, status: "REMOVED", removedReason: { not: null }, updatedAt: { gte: new Date(Date.now() - 30 * 86400_000) } }, select: { id: true, title: true, removedReason: true }, take: 20 }),
  ]);
  res.json({
    items: rows.map((l) => ({ ...listingCard(l), views: l.views, savesCount: l.savesCount, boostedUntil: l.boostedUntil?.toISOString() ?? null })),
    stats: { active: rows.filter((l) => l.status === "ACTIVE").length, sold: seller.soldCount, views: totals.views, saves: totals.saves, chats, boostCredits: seller.boostCredits },
    removedByDroba: removed,
  });
});

/** Full listing for its owner, including drafts (the edit form loads this) */
meRouter.get("/listings/:id", async (req, res) => {
  const seller = await requireSeller(req, { verified: false });
  const l = await prisma.listing.findFirst({ where: { id: String(req.params.id), sellerId: seller.id, status: { not: "REMOVED" } }, include: { seller: { include: sellerCounts } } });
  if (!l) throw notFound("Listing not found");
  res.json({ ...listingDetail(l), location: { lat: l.lat, lng: l.lng } });
});

/** Seller analytics (Premium: 30 days; Business: 90 days plus breakdowns) */
meRouter.get("/analytics", async (req, res) => {
  const seller = await requireSeller(req, { verified: false });
  const { days } = parse(analyticsQuerySchema, req.query);
  res.setHeader("Cache-Control", "private, max-age=30");
  res.json(await sellerAnalytics(seller, days));
});

/** Business campaigns: boost a group of listings at once */
meRouter.get("/campaigns", async (req, res) => {
  const seller = await requireSeller(req, { verified: false });
  res.json({ items: await listCampaigns(seller.id) });
});

meRouter.post("/campaigns", rateLimit({ name: "campaign", windowSec: 3600, max: 30, key: (r) => r.auth!.userId }), async (req, res) => {
  const seller = await requireSeller(req);
  const input = parse(campaignSchema, req.body);
  res.status(201).json(await createCampaign(seller, input));
});

/* The bag, synced across devices. The browser keeps a copy so the bag also works before signing in;
   on sign-in it merges that copy into the account's bag. */
async function bagOf(uid: string): Promise<BagItemDTO[]> {
  const rows = await prisma.bagItem.findMany({ where: { userId: uid }, include: { listing: { include: { seller: true } } }, orderBy: { createdAt: "asc" } });
  const gone = rows.filter((r) => r.listing.status !== "ACTIVE" || r.listing.seller.suspended);
  if (gone.length) await prisma.bagItem.deleteMany({ where: { userId: uid, listingId: { in: gone.map((g) => g.listingId) } } });
  return rows
    .filter((r) => !gone.includes(r))
    .map(({ listing: l }) => {
      const card = listingCard(l);
      return { id: l.id, title: l.title, price: l.price, photo: card.photo, condition: l.condition, city: l.city, seller: { id: l.seller.id, displayName: l.seller.displayName, verified: l.seller.verified } };
    });
}

async function addToBag(uid: string, ids: string[]) {
  if (!ids.length) return;
  const ok = await prisma.listing.findMany({ where: { id: { in: ids }, status: "ACTIVE", seller: { suspended: false, userId: { not: uid } } }, select: { id: true } });
  await prisma.bagItem.createMany({ data: ok.map((l) => ({ userId: uid, listingId: l.id })), skipDuplicates: true });
  // Keep bags a sensible size
  const count = await prisma.bagItem.count({ where: { userId: uid } });
  if (count > 100) {
    const oldest = await prisma.bagItem.findMany({ where: { userId: uid }, orderBy: { createdAt: "asc" }, take: count - 100, select: { listingId: true } });
    await prisma.bagItem.deleteMany({ where: { userId: uid, listingId: { in: oldest.map((o) => o.listingId) } } });
  }
}

const bagLimit = rateLimit({ name: "bag", windowSec: 60, max: 120, key: (r) => r.auth!.userId });

meRouter.get("/bag", async (req, res) => {
  res.json({ items: await bagOf(userId(req)) });
});

meRouter.post("/bag/merge", bagLimit, async (req, res) => {
  const { ids } = parse(bagIdsSchema, req.body);
  await addToBag(userId(req), ids);
  res.json({ items: await bagOf(userId(req)) });
});

meRouter.put("/bag/:listingId", bagLimit, async (req, res) => {
  await addToBag(userId(req), [String(req.params.listingId)]);
  res.status(204).end();
});

meRouter.post("/bag/remove", bagLimit, async (req, res) => {
  const { ids } = parse(bagIdsSchema, req.body);
  await prisma.bagItem.deleteMany({ where: { userId: userId(req), listingId: { in: ids } } });
  res.status(204).end();
});
