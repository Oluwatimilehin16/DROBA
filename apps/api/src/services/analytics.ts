import { Prisma, type Seller } from "@prisma/client";
import { PLAN_RULES, type AnalyticsDTO, type AnalyticsListingRow, type AnalyticsPoint, type AnalyticsTotals } from "@droba/shared";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

/* Seller analytics.
   Views and saves are counted per listing per day (Lagos time) in listing_stats_daily as they happen.
   Chats and order requests come straight from their own tables, so they're always exact.
   Every query is one indexed scan over a single seller's rows. */

const TODAY = Prisma.sql`(now() AT TIME ZONE 'Africa/Lagos')::date`;
/** Lagos calendar day of a timestamp column (stored as UTC) */
const day = (col: string) => Prisma.raw(`((${col}) AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Lagos')::date`);

/** Increment today's views or saves for a listing. Fire-and-forget from the request path. */
export function bumpDaily(listingId: string, sellerId: string, field: "views" | "saves") {
  const col = Prisma.raw(field);
  const existing = Prisma.raw(`listing_stats_daily.${field}`);
  return prisma.$executeRaw`
    INSERT INTO listing_stats_daily (listing_id, seller_id, day, ${col}) VALUES (${listingId}, ${sellerId}, ${TODAY}, 1)
    ON CONFLICT (listing_id, day) DO UPDATE SET ${col} = ${existing} + 1`;
}

const emptyTotals = (): AnalyticsTotals => ({ views: 0, saves: 0, chats: 0, requests: 0, sold: 0 });

function isoDay(offsetFromToday: number) {
  // Lagos is UTC+1 all year (no daylight saving)
  const d = new Date(Date.now() + 3600_000 - offsetFromToday * 86400_000);
  return d.toISOString().slice(0, 10);
}

export async function sellerAnalytics(seller: Seller, requestedDays: number): Promise<AnalyticsDTO> {
  const rules = PLAN_RULES[seller.plan];
  if (!rules.analyticsDays) throw new AppError(403, "PLAN_REQUIRED", "Analytics come with a Premium or Business store");
  const days = Math.min(requestedDays, rules.analyticsDays);
  const span = days * 2 - 1; // this period and the one before, for comparisons
  const startCur = Prisma.sql`(${TODAY} - ${days - 1}::int)`;
  const startPrev = Prisma.sql`(${TODAY} - ${span}::int)`;
  const S = seller.id;
  const U = seller.userId;

  const [viewsByDay, chatsByDay, requestsByDay, sold, perListingStats, perListingChats, perListingRequests, listings] = await Promise.all([
    prisma.$queryRaw<{ d: string; v: number; s: number }[]>`
      SELECT to_char(day, 'YYYY-MM-DD') AS d, sum(views)::int AS v, sum(saves)::int AS s
      FROM listing_stats_daily WHERE seller_id = ${S} AND day >= ${startPrev} GROUP BY day`,
    prisma.$queryRaw<{ d: string; n: number }[]>`
      SELECT to_char(${day("created_at")}, 'YYYY-MM-DD') AS d, count(*)::int AS n
      FROM conversations WHERE seller_user_id = ${U} AND ${day("created_at")} >= ${startPrev} GROUP BY 1`,
    prisma.$queryRaw<{ d: string; n: number }[]>`
      SELECT to_char(${day("created_at")}, 'YYYY-MM-DD') AS d, count(*)::int AS n
      FROM orders WHERE seller_id = ${S} AND ${day("created_at")} >= ${startPrev} GROUP BY 1`,
    prisma.$queryRaw<{ cur: number; prev: number }[]>`
      SELECT count(*) FILTER (WHERE ${day("sold_at")} >= ${startCur})::int AS cur,
             count(*) FILTER (WHERE ${day("sold_at")} < ${startCur})::int AS prev
      FROM listings WHERE seller_id = ${S} AND sold_at IS NOT NULL AND ${day("sold_at")} >= ${startPrev}`,
    prisma.$queryRaw<{ id: string; v: number; s: number }[]>`
      SELECT listing_id AS id, sum(views)::int AS v, sum(saves)::int AS s
      FROM listing_stats_daily WHERE seller_id = ${S} AND day >= ${startCur} GROUP BY listing_id`,
    prisma.$queryRaw<{ id: string; n: number }[]>`
      SELECT listing_id AS id, count(*)::int AS n FROM conversations
      WHERE seller_user_id = ${U} AND listing_id IS NOT NULL AND ${day("created_at")} >= ${startCur} GROUP BY listing_id`,
    prisma.$queryRaw<{ id: string; n: number }[]>`
      SELECT oi.listing_id AS id, count(DISTINCT o.id)::int AS n FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE o.seller_id = ${S} AND oi.listing_id IS NOT NULL AND ${day("o.created_at")} >= ${startCur} GROUP BY oi.listing_id`,
    prisma.listing.findMany({
      where: { sellerId: S, status: { in: ["ACTIVE", "SOLD"] } },
      select: { id: true, title: true, photos: true, price: true, status: true, category: true, soldAt: true },
      take: 2000,
    }),
  ]);

  // Daily series, every day present even when nothing happened
  const byDay = new Map<string, AnalyticsPoint>();
  for (let i = span; i >= 0; i--) {
    const d = isoDay(i);
    byDay.set(d, { day: d, views: 0, saves: 0, chats: 0, requests: 0 });
  }
  for (const r of viewsByDay) {
    const p = byDay.get(r.d);
    if (p) Object.assign(p, { views: r.v, saves: r.s });
  }
  for (const r of chatsByDay) {
    const p = byDay.get(r.d);
    if (p) p.chats = r.n;
  }
  for (const r of requestsByDay) {
    const p = byDay.get(r.d);
    if (p) p.requests = r.n;
  }
  const all = [...byDay.values()];
  const series = all.slice(-days);
  const before = all.slice(0, all.length - days);
  const sum = (pts: AnalyticsPoint[], soldN: number): AnalyticsTotals =>
    pts.reduce((t, p) => ({ views: t.views + p.views, saves: t.saves + p.saves, chats: t.chats + p.chats, requests: t.requests + p.requests, sold: t.sold }), { ...emptyTotals(), sold: soldN });

  // Per-listing table for this period
  const stats = new Map(perListingStats.map((r) => [r.id, r]));
  const chats = new Map(perListingChats.map((r) => [r.id, r.n]));
  const reqs = new Map(perListingRequests.map((r) => [r.id, r.n]));
  const rows: (AnalyticsListingRow & { category: string; soldInRange: boolean })[] = listings.map((l) => ({
    id: l.id,
    title: l.title,
    photo: Array.isArray(l.photos) ? ((l.photos[0] as { url?: string } | undefined)?.url ?? null) : null,
    price: l.price,
    status: l.status,
    views: stats.get(l.id)?.v ?? 0,
    saves: stats.get(l.id)?.s ?? 0,
    chats: chats.get(l.id) ?? 0,
    requests: reqs.get(l.id) ?? 0,
    category: l.category,
    soldInRange: !!l.soldAt && l.soldAt.getTime() >= Date.now() - days * 86400_000,
  }));
  const ranked = rows
    .filter((r) => r.status === "ACTIVE" || r.views || r.requests)
    .sort((a, b) => b.views - a.views || b.requests - a.requests || b.saves - a.saves)
    .slice(0, 50)
    .map(({ category: _c, soldInRange: _s, ...r }) => r);

  let advanced: AnalyticsDTO["advanced"] = null;
  if (rules.advancedAnalytics) {
    const [cities, delivered, weekdays] = await Promise.all([
      prisma.$queryRaw<{ city: string; n: number }[]>`
        SELECT city, count(*)::int AS n FROM orders WHERE seller_id = ${S} AND ${day("created_at")} >= ${startCur}
        GROUP BY city ORDER BY n DESC LIMIT 8`,
      prisma.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM orders WHERE seller_id = ${S} AND status = 'DELIVERED' AND ${day("delivered_at")} >= ${startCur}`,
      prisma.$queryRaw<{ wd: number; v: number }[]>`
        SELECT extract(isodow FROM day)::int AS wd, sum(views)::int AS v FROM listing_stats_daily
        WHERE seller_id = ${S} AND day >= ${startCur} GROUP BY 1`,
    ]);
    const cats = new Map<string, { category: string; listings: number; views: number; saves: number; requests: number; sold: number }>();
    for (const r of rows) {
      const c = cats.get(r.category) ?? { category: r.category, listings: 0, views: 0, saves: 0, requests: 0, sold: 0 };
      if (r.status === "ACTIVE") c.listings++;
      c.views += r.views;
      c.saves += r.saves;
      c.requests += r.requests;
      if (r.soldInRange) c.sold++;
      cats.set(r.category, c);
    }
    const cur = sum(series, sold[0]?.cur ?? 0);
    advanced = {
      categories: [...cats.values()].filter((c) => c.listings || c.views || c.sold).sort((a, b) => b.views - a.views),
      buyerCities: cities.map((c) => ({ city: c.city, requests: c.n })),
      funnel: { views: cur.views, chats: cur.chats, requests: cur.requests, delivered: delivered[0]?.n ?? 0 },
      weekdays: [1, 2, 3, 4, 5, 6, 7].map((wd) => ({ weekday: wd, views: weekdays.find((w) => w.wd === wd)?.v ?? 0 })),
    };
  }

  return {
    days,
    maxDays: rules.analyticsDays,
    series,
    totals: sum(series, sold[0]?.cur ?? 0),
    previous: sum(before, sold[0]?.prev ?? 0),
    listings: ranked,
    advanced,
  };
}
