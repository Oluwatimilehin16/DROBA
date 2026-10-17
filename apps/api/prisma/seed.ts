/* Seeds the database with the prototype's sellers and 66 listings so the app is browsable on day one.
   Safe to re-run: seed accounts are upserted and their listings recreated.
   Every seed account's password is SEED_PASSWORD (default "droba-demo-123"). */
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

async function main() {
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
    } satisfies Partial<Prisma.SellerCreateInput>;
    const seller = await prisma.seller.upsert({ where: { userId: user.id }, create: { userId: user.id, ...sellerData }, update: sellerData });
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
      photos: [{ url: p.photo, label: null }],
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

  const buyerEmail = "buyer@droba.ng";
  const lagos = cityByName("Lagos")!;
  await prisma.user.upsert({
    where: { email: buyerEmail },
    create: { email: buyerEmail, passwordHash: password, name: "Demo Buyer", city: "Lagos", lat: lagos.lat, lng: lagos.lng, emailVerifiedAt: new Date() },
    update: { passwordHash: password },
  });

  console.log(`Seeded ${data.sellers.length} sellers, ${rows.length} listings, and ${buyerEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
