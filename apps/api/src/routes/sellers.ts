import { Router } from "express";
import { z } from "zod";
import { PLAN_RULES, changePlanSchema, createSellerSchema, handleSchema, ratingSchema, updateSellerSchema } from "@droba/shared";
import { prisma } from "../lib/prisma.js";
import { badRequest, conflict, forbidden, notFound, parse } from "../lib/errors.js";
import { cached, invalidate, keys } from "../lib/cache.js";
import { rateLimit } from "../lib/rateLimit.js";
import { optionalAuth, requireAuth, requireSeller, userId } from "../middleware/auth.js";
import { loadMe, sellerCounts, sellerPublic } from "../services/serialize.js";

export const sellersRouter = Router();

async function handleTaken(handle: string, exceptSellerId?: string) {
  const s = await prisma.seller.findUnique({ where: { handle }, select: { id: true } });
  return !!s && s.id !== exceptSellerId;
}

const uniqueHandle = (e: unknown) => {
  if ((e as { code?: string })?.code === "P2002") throw conflict("That store link is taken", { handle: "Already taken" });
  throw e;
};

sellersRouter.get("/handle-available", rateLimit({ name: "handle", windowSec: 60, max: 60 }), async (req, res) => {
  const r = handleSchema.safeParse(req.query.handle);
  if (!r.success) return void res.json({ available: false, reason: r.error.issues[0]?.message });
  res.json({ available: !(await handleTaken(r.data)), handle: r.data });
});

/** Popular stores for the home page: most sold, with three item thumbnails each */
sellersRouter.get("/", async (_req, res) => {
  const stores = await cached("stores:popular", 120, async () => {
    const rows = await prisma.seller.findMany({
      where: { type: "STORE", handle: { not: null }, listings: { some: { status: "ACTIVE" } } },
      orderBy: [{ verified: "desc" }, { soldCount: "desc" }],
      take: 8,
      include: { ...sellerCounts, listings: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, photos: true } } },
    });
    return rows.map((s) => ({
      ...sellerPublic(s),
      thumbs: s.listings.map((l) => ({ id: l.id, photo: Array.isArray(l.photos) ? ((l.photos[0] as { url?: string } | undefined)?.url ?? null) : null })),
    }));
  });
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json({ items: stores });
});

/** Become a seller. Individuals list for free; stores pick Premium or Business. */
sellersRouter.post("/", requireAuth, async (req, res) => {
  const uid = userId(req);
  const input = parse(createSellerSchema, req.body);
  const user = await prisma.user.findUnique({ where: { id: uid }, include: { seller: true } });
  if (!user) throw forbidden();
  if (user.seller) throw conflict("You already have a seller profile");
  if (input.handle && (await handleTaken(input.handle))) throw conflict("That store link is taken", { handle: "Already taken" });
  await prisma.$transaction([
    prisma.seller.create({
      data: {
        userId: uid,
        type: input.type,
        // NOTE: paid plans should be activated by the payment provider's webhook (e.g. Paystack) once billing is added.
        plan: input.plan,
        displayName: input.type === "STORE" ? input.storeName! : user.name,
        handle: input.type === "STORE" ? input.handle! : null,
        city: input.city,
        area: input.area,
        phone: input.phone ?? user.phone,
        bio: input.bio,
        boostCredits: PLAN_RULES[input.plan].boostCredits,
        planRenewsAt: input.plan === "FREE" ? null : new Date(Date.now() + 30 * 86400_000),
      },
    }),
    prisma.user.update({ where: { id: uid }, data: { activeMode: "SELLER" } }),
  ]).catch(uniqueHandle);
  res.status(201).json(await loadMe(uid));
});

sellersRouter.patch("/me", requireAuth, async (req, res) => {
  const seller = await requireSeller(req, { verified: false });
  const input = parse(updateSellerSchema, req.body);
  if (seller.type === "INDIVIDUAL" && (input.handle || input.storeName || input.bannerUrl)) {
    throw forbidden("Store name, link and banner come with a Premium or Business store");
  }
  if (input.handle && (await handleTaken(input.handle, seller.id))) throw conflict("That store link is taken", { handle: "Already taken" });
  const { storeName, ...rest } = input;
  await prisma.seller.update({ where: { id: seller.id }, data: { ...rest, ...(storeName ? { displayName: storeName } : {}) } }).catch(uniqueHandle);
  await invalidate(keys.seller(seller.id), ...(seller.handle ? [keys.store(seller.handle)] : []), ...(input.handle ? [keys.store(input.handle)] : []));
  res.json(await loadMe(seller.userId));
});

/** Change plan. Upgrading an individual to a store needs a store name and link. */
sellersRouter.post("/me/plan", requireAuth, async (req, res) => {
  const seller = await requireSeller(req, { verified: false });
  const input = parse(changePlanSchema.extend({ storeName: z.string().trim().min(2).max(60).optional(), handle: handleSchema.optional() }), req.body);
  const toStore = input.plan !== "FREE";
  const data: Record<string, unknown> = { plan: input.plan, type: toStore ? "STORE" : "INDIVIDUAL", planRenewsAt: toStore ? new Date(Date.now() + 30 * 86400_000) : null };
  if (toStore && seller.type === "INDIVIDUAL") {
    if (!input.storeName || !input.handle) throw badRequest("Name your store and choose its link", { storeName: input.storeName ? "" : "Required", handle: input.handle ? "" : "Required" });
    if (await handleTaken(input.handle)) throw conflict("That store link is taken", { handle: "Already taken" });
    data.displayName = input.storeName;
    data.handle = input.handle;
  }
  if (!toStore && seller.type === "STORE") {
    // Downgrading keeps listings but retires the storefront link
    const owner = await prisma.user.findUnique({ where: { id: seller.userId }, select: { name: true } });
    data.handle = null;
    data.displayName = owner?.name ?? seller.displayName;
    data.bannerUrl = null;
  }
  if (PLAN_RULES[input.plan].boostCredits > PLAN_RULES[seller.plan].boostCredits) data.boostCredits = Math.max(seller.boostCredits, PLAN_RULES[input.plan].boostCredits);
  await prisma.seller.update({ where: { id: seller.id }, data }).catch(uniqueHandle);
  await invalidate(keys.seller(seller.id), ...(seller.handle ? [keys.store(seller.handle)] : []));
  res.json(await loadMe(seller.userId));
});

async function storeView(where: { id: string } | { handle: string }) {
  const s = await prisma.seller.findUnique({ where: where as { id: string }, include: sellerCounts });
  if (!s) return null;
  // One row per category: how many items, and the newest item's photo as the collection cover
  const collections = await prisma.$queryRaw<{ category: string; count: number; cover: string | null }[]>`
    SELECT category, n::int AS count, cover FROM (
      SELECT DISTINCT ON (category) category, count(*) OVER (PARTITION BY category) AS n, photos->0->>'url' AS cover
      FROM listings WHERE seller_id = ${s.id} AND status = 'ACTIVE'
      ORDER BY category, created_at DESC
    ) c ORDER BY n DESC, category`;
  return {
    seller: sellerPublic(s),
    collections,
    storeSearch: PLAN_RULES[s.plan].storeSearch,
  };
}

async function withFollow<T extends { seller: { id: string } }>(view: T, viewer?: string) {
  if (!viewer) return view;
  const f = await prisma.follow.findUnique({ where: { userId_sellerId: { userId: viewer, sellerId: view.seller.id } } });
  return { ...view, seller: { ...view.seller, isFollowing: !!f } };
}

/** Personal store link: droba.ng/<handle> resolves here */
sellersRouter.get("/by-handle/:handle", optionalAuth, async (req, res) => {
  const handle = String(req.params.handle).toLowerCase();
  const view = await cached(keys.store(handle), 60, () => storeView({ handle }));
  if (!view || view.seller.type !== "STORE") throw notFound("We couldn't find that store");
  res.json(await withFollow(view, req.auth?.userId));
});

sellersRouter.get("/:id", optionalAuth, async (req, res) => {
  const view = await cached(keys.seller(String(req.params.id)), 60, () => storeView({ id: String(req.params.id) }));
  if (!view) throw notFound("Seller not found");
  res.json(await withFollow(view, req.auth?.userId));
});

/** Reveal a seller's phone number to a signed-in buyer (kept out of public pages to stop scraping) */
sellersRouter.get("/:id/contact", requireAuth, rateLimit({ name: "contact", windowSec: 3600, max: 60, key: (r) => r.auth!.userId }), async (req, res) => {
  const s = await prisma.seller.findUnique({ where: { id: String(req.params.id) }, select: { phone: true, user: { select: { phone: true } } } });
  if (!s) throw notFound();
  res.json({ phone: s.phone ?? s.user.phone ?? null });
});

sellersRouter.put("/:id/follow", requireAuth, async (req, res) => {
  const uid = userId(req);
  const s = await prisma.seller.findUnique({ where: { id: String(req.params.id) }, select: { id: true, userId: true, handle: true } });
  if (!s) throw notFound();
  if (s.userId === uid) throw badRequest("You can't follow your own store");
  await prisma.follow.createMany({ data: [{ userId: uid, sellerId: s.id }], skipDuplicates: true });
  await invalidate(keys.seller(s.id), ...(s.handle ? [keys.store(s.handle)] : []));
  res.json({ following: true });
});

sellersRouter.delete("/:id/follow", requireAuth, async (req, res) => {
  const s = await prisma.seller.findUnique({ where: { id: String(req.params.id) }, select: { id: true, handle: true } });
  await prisma.follow.deleteMany({ where: { userId: userId(req), sellerId: String(req.params.id) } });
  if (s) await invalidate(keys.seller(s.id), ...(s.handle ? [keys.store(s.handle)] : []));
  res.json({ following: false });
});

sellersRouter.get("/:id/ratings", async (req, res) => {
  const rows = await prisma.rating.findMany({ where: { sellerId: String(req.params.id) }, include: { rater: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 });
  res.json({
    items: rows.map((r) => ({ id: r.id, stars: r.stars, comment: r.comment, createdAt: r.createdAt.toISOString(), rater: shortName(r.rater.name) })),
  });
});

/** Rate a seller. Only people who have actually chatted with the seller can rate, one rating each (editable). */
sellersRouter.post("/:id/ratings", requireAuth, rateLimit({ name: "rate", windowSec: 3600, max: 20, key: (r) => r.auth!.userId }), async (req, res) => {
  const uid = userId(req);
  const input = parse(ratingSchema, req.body);
  const s = await prisma.seller.findUnique({ where: { id: String(req.params.id) } });
  if (!s) throw notFound();
  if (s.userId === uid) throw badRequest("You can't rate yourself");
  const talked = await prisma.conversation.findFirst({ where: { buyerId: uid, sellerUserId: s.userId }, select: { id: true } });
  if (!talked) throw forbidden("Chat with the seller about an item before rating them");
  await prisma.$transaction(async (tx) => {
    await tx.rating.upsert({
      where: { sellerId_raterId: { sellerId: s.id, raterId: uid } },
      create: { sellerId: s.id, raterId: uid, stars: input.stars, comment: input.comment, listingId: input.listingId },
      update: { stars: input.stars, comment: input.comment, listingId: input.listingId },
    });
    const agg = await tx.rating.aggregate({ where: { sellerId: s.id }, _avg: { stars: true }, _count: { _all: true } });
    await tx.seller.update({ where: { id: s.id }, data: { ratingAvg: agg._avg.stars ?? 0, ratingCount: agg._count._all } });
  });
  await invalidate(keys.seller(s.id), ...(s.handle ? [keys.store(s.handle)] : []));
  res.status(201).json({ ok: true });
});

function shortName(name: string) {
  const [first, last] = name.split(/\s+/);
  return last ? `${first} ${last[0]}.` : (first ?? "Buyer");
}
