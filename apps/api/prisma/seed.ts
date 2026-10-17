/* Seeds the database with the prototype's sellers and 66 listings so the app is browsable on day one.
   Safe to re-run: seed accounts are upserted and their listings recreated.
   Every seed account's password is SEED_PASSWORD (default "droba-demo-123"). */
import "../src/loadEnv.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
import { PLAN_RULES, cityByName } from "@droba/shared";
import { hashPassword } from "../src/lib/crypto.js";

interface SeedSeller { key: string; type: "STORE" | "INDIVIDUAL"; plan: "FREE" | "PREMIUM" | "BUSINESS"; name: string; handle: string | null; city: string; area: string; phone: string; bio: string | null; verified: boolean; rating: number; reviews: number; sold: number; joined: string; banner: string | null }
interface SeedProduct { key: number; seller: string; title: string; brand: string | null; price: number; category: string; department: string; gender: "WOMEN" | "MEN" | "UNISEX" | null; size: string | null; condition: "LIKE_NEW" | "FIRST_GRADE" | "FAIRLY_USED" | "FAIR"; extra: boolean; origin: "TOKUNBO" | "NIGERIAN_USED" | null; tested: boolean; color: string | null; flaws: string[]; description: string; specs: [string, string][]; photo: string; daysAgo: number; saves: number; openToOffers: boolean; canDeliver: boolean; allowPickup: boolean; boosted: boolean }

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, "seed-data.json"), "utf8")) as { sellers: SeedSeller[]; products: SeedProduct[] };
const prisma = new PrismaClient();

/** Deterministic jitter (up to ~4km) so items in one city don't stack on a single point */
function jitter(seed: number, span = 0.035) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return (x - Math.floor(x) - 0.5) * 2 * span;
}
const toPhone = (p: string) => "+234" + p.replace(/\s/g, "").replace(/^0/, "");

/** Three shots per item from one free photo: the full item, a close-up, and a detail/label crop */
function shots(url: string) {
  const base = url.replace(/&w=\d+/, "");
  const crop = (x: number, y: number, z: number) => `${base}&w=900&h=1125&crop=focalpoint&fp-x=${x}&fp-y=${y}&fp-z=${z}`;
  return [
    { url, label: "Front" },
    { url: crop(0.4, 0.35, 1.9), label: "Detail" },
    { url: crop(0.5, 0.2, 2.6), label: "Close-up" },
  ];
}

/** How the two Business stores sell (from the prototype) */
const BUSINESS_DETAILS: Record<string, Partial<Prisma.SellerCreateInput>> = {
  luxecloset: { shopAddress: null, openingHours: "Daily, 9am – 9pm", deliveryAreas: "Lagos same day · nationwide 2–4 days", storePolicy: "Not as described? Return within 48 hours for a full refund." },
  gadgetcorner: { shopAddress: "Block C, Shop 22, Computer Village, Ikeja, Lagos", openingHours: "Mon–Sat, 9am – 6pm", deliveryAreas: "Lagos same day · nationwide 2–3 days", storePolicy: "7-day warranty on phones and laptops. Test before you pay." },
};

async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    console.error("Refusing to load demo data into a production database. (Pass --force if you really mean it.)");
    process.exit(1);
  }
  const password = await hashPassword(process.env.SEED_PASSWORD ?? "droba-demo-123");
  const sellerIds = new Map<string, string>();

  for (const s of data.sellers) {
    const email = `${s.handle ?? s.key}@seed.droba.ng`;
    const c = cityByName(s.city)!;
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash: password, name: s.name, phone: toPhone(s.phone), city: s.city, lat: c.lat, lng: c.lng, emailVerifiedAt: new Date(), activeMode: "SELLER", createdAt: new Date(`${s.joined}-03-01`) },
      update: { name: s.name, passwordHash: password },
    });
    const sellerData = {
      type: s.type,
      plan: s.plan,
      displayName: s.name,
      handle: s.handle,
      city: s.city,
      area: s.area,
      phone: toPhone(s.phone),
      bio: s.bio,
      bannerUrl: s.banner,
      verified: s.verified,
      ratingAvg: s.rating,
      ratingCount: s.reviews,
      soldCount: s.sold,
      boostCredits: PLAN_RULES[s.plan].boostCredits,
      planRenewsAt: s.plan === "FREE" ? null : new Date(Date.now() + (12 + s.sold % 15) * 86400_000),
      verificationStatus: s.verified ? ("APPROVED" as const) : s.handle === "fitgearlagos" ? ("PENDING" as const) : ("NONE" as const),
      verificationNote: s.handle === "fitgearlagos" ? "Registered business (BN 3381204). Instagram @fitgearlagos, 9k followers. Pickup point at Surulere." : null,
      verificationRequestedAt: s.handle === "fitgearlagos" ? new Date(Date.now() - 2 * 86400_000) : null,
      suspended: false,
      ...(s.handle ? (BUSINESS_DETAILS[s.handle] ?? {}) : {}),
    } satisfies Partial<Prisma.SellerCreateInput>;
    const seller = await prisma.seller.upsert({ where: { userId: user.id }, create: { userId: user.id, createdAt: new Date(`${s.joined}-03-01`), ...sellerData }, update: sellerData });
    sellerIds.set(s.key, seller.id);
  }

  await prisma.listing.deleteMany({ where: { sellerId: { in: [...sellerIds.values()] } } });
  const now = Date.now();
  const rows: Prisma.ListingCreateManyInput[] = data.products.map((p) => {
    const seller = data.sellers.find((s) => s.key === p.seller)!;
    const c = cityByName(seller.city)!;
    const created = new Date(now - p.daysAgo * 86400_000 - p.key * 60_000);
    return {
      sellerId: sellerIds.get(p.seller)!,
      title: p.title,
      description: p.description,
      price: p.price,
      department: p.department,
      category: p.category,
      condition: p.condition,
      brand: p.brand,
      size: p.size,
      color: p.color,
      gender: p.gender,
      origin: p.origin,
      tested: p.tested,
      extra: p.extra,
      flaws: p.flaws,
      specs: p.specs,
      photos: shots(p.photo),
      city: seller.city,
      area: seller.area,
      lat: c.lat + jitter(p.key),
      lng: c.lng + jitter(p.key + 1000),
      openToOffers: p.openToOffers,
      canDeliver: p.canDeliver,
      allowPickup: p.allowPickup,
      status: "ACTIVE",
      boostedUntil: p.boosted ? new Date(now + 7 * 86400_000) : null,
      savesCount: p.saves,
      views: p.saves * 7 + 40,
      createdAt: created,
    };
  });
  await prisma.listing.createMany({ data: rows });

  // 90 days of made-up daily views and saves so the analytics pages have something to show
  const created = await prisma.listing.findMany({ where: { sellerId: { in: [...sellerIds.values()] } }, select: { id: true, sellerId: true, createdAt: true, savesCount: true } });
  const stats: Prisma.ListingStatDailyCreateManyInput[] = [];
  const lagosToday = new Date(new Date(now + 3600_000).toISOString().slice(0, 10));
  created.forEach((l, i) => {
    const age = Math.min(89, Math.floor((now - l.createdAt.getTime()) / 86400_000));
    for (let d = 0; d <= age; d++) {
      const wave = 1 + Math.sin((d + i) / 3.1) * 0.45 + (d % 7 === 1 || d % 7 === 2 ? 0.35 : 0); // busier at weekends
      const base = 2 + (l.savesCount % 9) + Math.max(0, 12 - d) * 0.6; // new items get a bump
      const views = Math.max(0, Math.round(base * wave + jitter(i * 97 + d, 2.5)));
      stats.push({ listingId: l.id, sellerId: l.sellerId, day: new Date(lagosToday.getTime() - d * 86400_000), views, saves: views > 6 && (d + i) % 3 === 0 ? 1 + ((d * i) % 2) : 0 });
    }
  });
  await prisma.listingStatDaily.createMany({ data: stats });

  const buyerEmail = "buyer@droba.ng";
  const lagos = cityByName("Lagos")!;
  const buyer = await prisma.user.upsert({
    where: { email: buyerEmail },
    create: { email: buyerEmail, passwordHash: password, name: "Demo Buyer", city: "Lagos", lat: lagos.lat, lng: lagos.lng, emailVerifiedAt: new Date() },
    update: { passwordHash: password },
  });

  // Two example order requests so "My orders" and the seller's Orders tab aren't empty
  await prisma.order.deleteMany({ where: { buyerId: buyer.id } });
  const demo: [string, number, "PENDING" | "CONFIRMED"][] = [["gadgetcorner", 0, "PENDING"], ["luxecloset", 1, "CONFIRMED"]];
  for (const [handle, idx, status] of demo) {
    const seller = await prisma.seller.findUnique({ where: { handle } });
    const listing = seller && (await prisma.listing.findFirst({ where: { sellerId: seller.id, status: "ACTIVE" }, orderBy: { createdAt: "desc" }, skip: idx }));
    if (!seller || !listing) continue;
    const convo = await prisma.conversation.upsert({
      where: { listingId_buyerId: { listingId: listing.id, buyerId: buyer.id } },
      create: { listingId: listing.id, buyerId: buyer.id, sellerUserId: seller.userId, lastMessageBody: `Order request for ${listing.title}`, lastMessageSenderId: buyer.id },
      update: {},
    });
    await prisma.order.create({
      data: {
        code: `DRB-DEMO${idx + 1}${handle.slice(0, 1).toUpperCase()}`,
        buyerId: buyer.id,
        sellerId: seller.id,
        sellerUserId: seller.userId,
        status,
        confirmedAt: status === "CONFIRMED" ? new Date() : null,
        deliveryMethod: "DELIVERY",
        contactName: "Demo Buyer",
        contactPhone: "+2348012345678",
        address: "12 Adeola Odeku Street, Victoria Island",
        city: "Lagos",
        total: listing.price,
        conversationId: convo.id,
        items: { create: [{ listingId: listing.id, title: listing.title, price: listing.price, condition: listing.condition, photo: (listing.photos as { url: string }[])[0]?.url ?? null }] },
      },
    });
  }

  // An admin account for trying the admin area locally (removed by npm run db:clear-demo)
  const adminEmail = "admin@droba.ng";
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, passwordHash: password, name: "Droba Admin", city: "Lagos", lat: lagos.lat, lng: lagos.lng, emailVerifiedAt: new Date(), role: "ADMIN" },
    update: { passwordHash: password, role: "ADMIN" },
  });

  // Two example reports from the demo buyer, so the admin queue isn't empty
  await prisma.report.deleteMany({ where: { reporterId: buyer.id } });
  const individual = await prisma.listing.findFirst({ where: { seller: { type: "INDIVIDUAL" }, status: "ACTIVE", sellerId: { in: [...sellerIds.values()] } }, orderBy: { price: "desc" } });
  if (individual) {
    await prisma.report.create({ data: { reporterId: buyer.id, listingId: individual.id, sellerId: individual.sellerId, reason: "SCAM", details: "Seller asked me to pay a deposit by transfer before showing me the item." } });
  }
  const store = await prisma.seller.findUnique({ where: { handle: "denimdepot" } });
  if (store) await prisma.report.create({ data: { reporterId: buyer.id, sellerId: store.id, reason: "OFFENSIVE", details: "Was rude in chat when I asked for more photos." } });

  console.log(`Seeded ${data.sellers.length} sellers, ${rows.length} listings, ${stats.length} days of stats, 2 demo orders, 2 reports, ${buyerEmail} and ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
