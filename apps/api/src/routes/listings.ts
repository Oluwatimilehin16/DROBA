import { Router } from "express";
import { z } from "zod";
import { createListingSchema, searchQuerySchema, updateListingSchema } from "@droba/shared";
import { prisma } from "../lib/prisma.js";
import { notFound, parse } from "../lib/errors.js";
import { rateLimit } from "../lib/rateLimit.js";
import { invalidate, keys } from "../lib/cache.js";
import { optionalAuth, requireAuth, requireSeller, userId } from "../middleware/auth.js";
import { search } from "../services/search.js";
import { boostListing, countView, createListing, getListingDetail, removeListing, updateListing } from "../services/listings.js";
import { listingCard } from "../services/serialize.js";

export const listingsRouter = Router();

listingsRouter.get("/", optionalAuth, async (req, res) => {
  const q = parse(searchQuerySchema, req.query);
  const result = await search(q, req.auth?.userId);
  res.setHeader("Cache-Control", req.auth ? "private, no-store" : "public, max-age=15, stale-while-revalidate=60");
  res.json(result);
});

listingsRouter.post("/", requireAuth, rateLimit({ name: "list-create", windowSec: 3600, max: 120, key: (r) => r.auth!.userId }), async (req, res) => {
  const input = parse(createListingSchema, req.body);
  // Drafts can be saved before the email is confirmed; publishing needs it
  const seller = await requireSeller(req, { verified: input.status !== "DRAFT" });
  const l = await createListing(seller, input);
  res.status(201).json(await getListingDetail(l.id) ?? { id: l.id, status: l.status });
});

listingsRouter.get("/:id", optionalAuth, async (req, res) => {
  const detail = await getListingDetail(String(req.params.id));
  if (!detail) throw notFound("This listing is no longer available");
  countView(detail.id, req.auth?.userId ?? req.ip ?? "anon");
  let saved: boolean | undefined;
  let isFollowing: boolean | undefined;
  if (req.auth) {
    const [s, f] = await Promise.all([
      prisma.save.findUnique({ where: { userId_listingId: { userId: req.auth.userId, listingId: detail.id } } }),
      prisma.follow.findUnique({ where: { userId_sellerId: { userId: req.auth.userId, sellerId: detail.seller.id } } }),
    ]);
    saved = !!s;
    isFollowing = !!f;
  }
  res.json({ ...detail, saved, seller: { ...detail.seller, isFollowing } });
});

listingsRouter.get("/:id/similar", async (req, res) => {
  const base = await prisma.listing.findUnique({ where: { id: String(req.params.id) }, select: { id: true, category: true, price: true, city: true } });
  if (!base) throw notFound();
  const rows = await prisma.listing.findMany({
    where: { status: "ACTIVE", category: base.category, id: { not: base.id }, price: { gte: Math.floor(base.price * 0.4), lte: Math.ceil(base.price * 2.5) } },
    include: { seller: true },
    orderBy: [{ createdAt: "desc" }],
    take: 12,
  });
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json({ items: rows.map((r) => listingCard(r)) });
});

listingsRouter.patch("/:id", requireAuth, async (req, res) => {
  const input = parse(updateListingSchema, req.body);
  const seller = await requireSeller(req, { verified: input.status !== "DRAFT" });
  const l = await updateListing(seller, String(req.params.id), input);
  res.json((await getListingDetail(l.id)) ?? { id: l.id, status: l.status });
});

listingsRouter.delete("/:id", requireAuth, async (req, res) => {
  const seller = await requireSeller(req);
  await removeListing(seller, String(req.params.id));
  res.status(204).end();
});

listingsRouter.post("/:id/boost", requireAuth, async (req, res) => {
  const seller = await requireSeller(req);
  const { days } = parse(z.object({ days: z.union([z.literal(3), z.literal(7), z.literal(14)]) }), req.body);
  const l = await boostListing(seller, String(req.params.id), days);
  res.json({ id: l.id, boostedUntil: l.boostedUntil });
});

listingsRouter.put("/:id/save", requireAuth, async (req, res) => {
  const uid = userId(req);
  const id = String(req.params.id);
  const exists = await prisma.listing.findFirst({ where: { id, status: "ACTIVE" }, select: { id: true } });
  if (!exists) throw notFound();
  const created = await prisma.save.createMany({ data: [{ userId: uid, listingId: id }], skipDuplicates: true });
  if (created.count) {
    await prisma.listing.update({ where: { id }, data: { savesCount: { increment: 1 } } });
    await invalidate(keys.listing(id));
  }
  res.json({ saved: true });
});

listingsRouter.delete("/:id/save", requireAuth, async (req, res) => {
  const uid = userId(req);
  const id = String(req.params.id);
  const removed = await prisma.save.deleteMany({ where: { userId: uid, listingId: id } });
  if (removed.count) {
    await prisma.listing.update({ where: { id }, data: { savesCount: { decrement: 1 } } });
    await invalidate(keys.listing(id));
  }
  res.json({ saved: false });
});
