import { Prisma } from "@prisma/client";
import { cityByName, type SearchQuery, type SearchResponse, type Facet } from "@droba/shared";
import { prisma } from "../lib/prisma.js";
import { cached, keys, listingsVersion } from "../lib/cache.js";
import { sha256 } from "../lib/crypto.js";
import { listingCard } from "./serialize.js";

/* Search runs as one parameterised SQL statement per question (ids page, total, 4 facets),
   in parallel, all hitting indexes:
     - text:     generated tsvector (GIN) OR trigram word-similarity on title (GIN, catches typos)
     - near me:  ST_DWithin / ST_Distance on the generated geography column (GiST)
     - filters:  btree on status/category/department, partial index on active price
   Facet counts ignore their own filter (picking "Fridges" still shows how many Sofas exist),
   which is what makes the filter panel feel instant. Whole responses are cached in Redis for 30s
   and retired automatically when any listing changes (see bumpListingsVersion). */

type FacetName = "department" | "category" | "condition" | "city";

interface Origin {
  lat: number;
  lng: number;
}

function originOf(q: SearchQuery): Origin | null {
  if (q.lat != null && q.lng != null) return { lat: q.lat, lng: q.lng };
  if (q.city && (q.radiusKm || q.sort === "distance")) {
    const c = cityByName(q.city);
    if (c) return { lat: c.lat, lng: c.lng };
  }
  return null;
}

const point = (o: Origin) => Prisma.sql`ST_SetSRID(ST_MakePoint(${o.lng}::float8, ${o.lat}::float8), 4326)::geography`;

function conditions(q: SearchQuery, origin: Origin | null, skip?: FacetName): Prisma.Sql[] {
  const c: Prisma.Sql[] = [Prisma.sql`l.status = 'ACTIVE'`];
  if (q.q) c.push(Prisma.sql`(l.search_vector @@ websearch_to_tsquery('english', ${q.q}) OR ${q.q} <% l.title)`);
  if (q.department?.length && skip !== "department") c.push(Prisma.sql`l.department = ANY(${q.department}::text[])`);
  if (q.category && skip !== "category") c.push(Prisma.sql`l.category = ${q.category}`);
  if (q.condition?.length && skip !== "condition") c.push(Prisma.sql`l.condition::text = ANY(${q.condition}::text[])`);
  if (q.gender) c.push(Prisma.sql`(l.gender::text = ${q.gender} OR l.gender = 'UNISEX')`);
  if (q.minPrice != null) c.push(Prisma.sql`l.price >= ${q.minPrice}`);
  if (q.maxPrice != null) c.push(Prisma.sql`l.price <= ${q.maxPrice}`);
  if (q.tested) c.push(Prisma.sql`l.tested = true`);
  if (q.sellerId) c.push(Prisma.sql`l.seller_id = ${q.sellerId}`);
  if (q.sellerType) c.push(Prisma.sql`s.type::text = ${q.sellerType}`);
  if (q.verified) c.push(Prisma.sql`s.verified = true`);
  if (origin && q.radiusKm) {
    c.push(Prisma.sql`ST_DWithin(l.location, ${point(origin)}, ${q.radiusKm * 1000}::float8)`);
  } else if (q.city && skip !== "city") {
    c.push(Prisma.sql`l.city = ${q.city}`);
  }
  return c;
}

const whereSql = (c: Prisma.Sql[]) => Prisma.sql`WHERE ${Prisma.join(c, " AND ")}`;
const FROM = Prisma.sql`FROM listings l JOIN sellers s ON s.id = l.seller_id`;

function orderBy(q: SearchQuery, origin: Origin | null): Prisma.Sql {
  const boosted = Prisma.sql`(l.boosted_until IS NOT NULL AND l.boosted_until > now()) DESC`;
  const sort = q.sort ?? (q.q ? "relevance" : origin ? "distance" : "relevance");
  switch (sort) {
    case "newest":
      return Prisma.sql`ORDER BY l.created_at DESC, l.id`;
    case "popular":
      // Saves per day, so a fresh item with 40 saves beats an old one with 100
      return Prisma.sql`ORDER BY l.saves_count::float8 / (EXTRACT(EPOCH FROM (now() - l.created_at)) / 86400 + 2) DESC, l.id`;
    case "price_asc":
      return Prisma.sql`ORDER BY l.price ASC, l.id`;
    case "price_desc":
      return Prisma.sql`ORDER BY l.price DESC, l.id`;
    case "distance":
      if (origin) return Prisma.sql`ORDER BY ST_Distance(l.location, ${point(origin)}) ASC, l.id`;
      return Prisma.sql`ORDER BY ${boosted}, l.created_at DESC, l.id`;
    case "relevance":
    default:
      if (q.q)
        return Prisma.sql`ORDER BY ${boosted},
          ts_rank(l.search_vector, websearch_to_tsquery('english', ${q.q})) + word_similarity(${q.q}, l.title) DESC,
          l.created_at DESC, l.id`;
      return Prisma.sql`ORDER BY ${boosted}, l.created_at DESC, l.id`;
  }
}

async function facet(column: FacetName, q: SearchQuery, origin: Origin | null): Promise<Facet[]> {
  const col = Prisma.raw(`l.${column}${column === "condition" ? "::text" : ""}`);
  const rows = await prisma.$queryRaw<{ value: string; count: number }[]>`
    SELECT ${col} AS value, count(*)::int AS count ${FROM} ${whereSql(conditions(q, origin, column))}
    GROUP BY 1 ORDER BY 2 DESC LIMIT 60`;
  return rows;
}

/** Cache key: the normalised query, with coordinates rounded to ~1km so neighbours share entries */
function cacheKey(q: SearchQuery, version: string) {
  const norm = { ...q, lat: q.lat != null ? +q.lat.toFixed(2) : undefined, lng: q.lng != null ? +q.lng.toFixed(2) : undefined, q: q.q?.toLowerCase() };
  return keys.search(version, sha256(JSON.stringify(norm, Object.keys(norm).sort())));
}

export async function search(q: SearchQuery, viewerId?: string): Promise<SearchResponse> {
  const origin = originOf(q);
  if (origin) {
    q = { ...q, lat: +origin.lat.toFixed(2), lng: +origin.lng.toFixed(2) };
  }
  const result = await cached(cacheKey(q, await listingsVersion()), 30, () => runSearch(q, originOf(q)));
  if (viewerId && result.items.length) {
    const saved = await prisma.save.findMany({ where: { userId: viewerId, listingId: { in: result.items.map((i) => i.id) } }, select: { listingId: true } });
    const set = new Set(saved.map((s) => s.listingId));
    return { ...result, items: result.items.map((i) => ({ ...i, saved: set.has(i.id) })) };
  }
  return result;
}

async function runSearch(q: SearchQuery, origin: Origin | null): Promise<SearchResponse> {
  const where = whereSql(conditions(q, origin));
  const offset = (q.page - 1) * q.limit;
  const dist = origin ? Prisma.sql`ST_Distance(l.location, ${point(origin)})` : Prisma.sql`NULL::float8`;

  const [page, totalRows, department, category, condition, city] = await Promise.all([
    prisma.$queryRaw<{ id: string; dist: number | null }[]>`
      SELECT l.id, ${dist} AS dist ${FROM} ${where} ${orderBy(q, origin)} LIMIT ${q.limit} OFFSET ${offset}`,
    prisma.$queryRaw<{ total: number }[]>`SELECT count(*)::int AS total ${FROM} ${where}`,
    facet("department", q, origin),
    facet("category", q, origin),
    facet("condition", q, origin),
    facet("city", q, origin),
  ]);

  const rows = await prisma.listing.findMany({ where: { id: { in: page.map((p) => p.id) } }, include: { seller: true } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items = page.flatMap((p) => {
    const row = byId.get(p.id);
    return row ? [listingCard(row, { distanceM: p.dist != null ? Math.round(p.dist) : null })] : [];
  });

  return { items, total: totalRows[0]?.total ?? 0, page: q.page, pageSize: q.limit, facets: { department, category, condition, city } };
}
