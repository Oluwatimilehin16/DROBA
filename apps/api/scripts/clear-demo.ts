/* Removes the demo accounts that `npm run db:seed` creates (the 16 example sellers, their 66 listings,
   buyer@droba.ng and admin@droba.ng) and everything attached to them: orders, chats, ratings, reports.
   Run this once before launch so real buyers only see real sellers.
   Usage (from the repo folder):  npm run db:clear-demo -- --yes */
import "../src/loadEnv.js";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";

const prisma = new PrismaClient();
const DEMO = { endsWith: "@seed.droba.ng" };
const EXTRA = ["buyer@droba.ng", "admin@droba.ng"];

async function main() {
  const where = { OR: [{ email: DEMO }, { email: { in: EXTRA } }] };
  const users = await prisma.user.findMany({ where, select: { id: true } });
  const listings = await prisma.listing.count({ where: { seller: { user: where } } });
  if (!users.length) {
    console.log("No demo accounts found. Nothing to do.");
    return;
  }
  if (!process.argv.includes("--yes")) {
    console.log(`This will permanently delete ${users.length} demo accounts and ${listings} demo listings.`);
    console.log("Real accounts are not touched. To go ahead, run:  npm run db:clear-demo -- --yes");
    return;
  }
  // Deleting the users cascades to their seller profiles, listings, chats, orders, ratings and reports
  const { count } = await prisma.user.deleteMany({ where });
  // Empty the cache so search and store pages stop showing the old items straight away
  if (process.env.REDIS_URL) {
    const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
    await redis.incr("v:listings").catch(() => {});
    const stale = await redis.keys("listing:*").catch(() => [] as string[]);
    const stores = await redis.keys("store*").catch(() => [] as string[]);
    const sellers = await redis.keys("seller:*").catch(() => [] as string[]);
    const all = [...stale, ...stores, ...sellers];
    if (all.length) await redis.del(...all).catch(() => {});
    await redis.quit().catch(() => {});
  }
  console.log(`Deleted ${count} demo accounts and ${listings} demo listings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
