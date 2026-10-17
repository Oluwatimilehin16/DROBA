import { Router } from "express";
import { CITIES, CONDITION_INFO, DEPARTMENTS, PLAN_RULES } from "@droba/shared";
import { prisma } from "../lib/prisma.js";
import { cached, keys, listingsVersion } from "../lib/cache.js";

export const metaRouter = Router();

/** Everything the home page and filter panel need that rarely changes. CDN-cacheable. */
metaRouter.get("/", async (_req, res) => {
  const counts = await cached(`${keys.meta}:${await listingsVersion()}`, 300, async () => {
    const rows = await prisma.listing.groupBy({ by: ["department"], where: { status: "ACTIVE" }, _count: { _all: true } });
    return Object.fromEntries(rows.map((r) => [r.department, r._count._all]));
  });
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({
    departments: DEPARTMENTS.map((d) => ({ ...d, count: counts[d.id] ?? 0 })),
    conditions: CONDITION_INFO,
    cities: CITIES,
    plans: PLAN_RULES,
  });
});
