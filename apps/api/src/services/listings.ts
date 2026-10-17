import type { Prisma, Seller } from "@prisma/client";
import { PLAN_RULES, cityByName, departmentOf, type CreateListingInput, type UpdateListingInput } from "@droba/shared";
import { prisma } from "../lib/prisma.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { bumpListingsVersion, cached, invalidate, keys } from "../lib/cache.js";
import { redis } from "../lib/redis.js";
import { listingDetail, sellerCounts } from "./serialize.js";

function checkPhotos(seller: Seller, count: number) {
  const max = PLAN_RULES[seller.plan].photosPerListing;
  if (count > max) throw badRequest(`Your plan allows ${max} photos per listing`, { photos: `Up to ${max} photos on the ${PLAN_RULES[seller.plan].label} plan` });
}

/** Where the item is: exact pin if given (rounded ~100m), else the city centre. */
function placeOf(input: { city?: string; location?: { lat: number; lng: number } }, seller: Seller) {
  const city = input.city ?? seller.city;
  const centre = cityByName(city);
  const pin = input.location ?? (centre ? { lat: centre.lat, lng: centre.lng } : null);
  if (!pin) throw badRequest("Choose the city the item is in", { city: "Choose a city" });
  return { city, lat: pin.lat, lng: pin.lng };
}

async function afterWrite(listingId: string, seller: Seller) {
  await Promise.all([invalidate(keys.listing(listingId), keys.seller(seller.id), ...(seller.handle ? [keys.store(seller.handle)] : [])), bumpListingsVersion()]);
}

export async function createListing(seller: Seller, input: CreateListingInput) {
  checkPhotos(seller, input.photos.length);
  const dept = departmentOf(input.category)!;
  const place = placeOf(input, seller);
  const l = await prisma.listing.create({
    data: {
      sellerId: seller.id,
      title: input.title,
      description: input.description,
      price: input.price,
      department: dept.id,
      category: input.category,
      condition: input.condition,
      brand: input.brand,
      size: input.size,
      color: input.color,
      gender: dept.kind === "fashion" ? (input.gender ?? "UNISEX") : null,
      origin: dept.kind !== "fashion" ? input.origin : null,
      tested: input.tested ?? false,
      extra: input.extra ?? false,
      flaws: input.flaws,
      specs: input.specs as Prisma.InputJsonValue,
      photos: input.photos.map((p) => ({ url: p.url, label: p.label ?? null })),
      area: input.area ?? seller.area,
      ...place,
      openToOffers: input.openToOffers,
      canDeliver: input.canDeliver,
      allowPickup: input.allowPickup,
      status: input.status,
    },
  });
  await afterWrite(l.id, seller);
  return l;
}

export async function ownListing(seller: Seller, id: string) {
  const l = await prisma.listing.findUnique({ where: { id } });
  if (!l || l.status === "REMOVED") throw notFound("Listing not found");
  if (l.sellerId !== seller.id) throw forbidden("That isn't your listing");
  return l;
}

export async function updateListing(seller: Seller, id: string, input: UpdateListingInput) {
  const current = await ownListing(seller, id);
  if (input.photos) checkPhotos(seller, input.photos.length);
  const data: Prisma.ListingUpdateInput = {};
  const scalar = ["title", "description", "price", "condition", "brand", "size", "color", "gender", "origin", "tested", "extra", "flaws", "area", "openToOffers", "canDeliver", "allowPickup"] as const;
  for (const k of scalar) if (input[k] !== undefined) (data as Record<string, unknown>)[k] = input[k];
  if (input.specs) data.specs = input.specs as Prisma.InputJsonValue;
  if (input.photos) data.photos = input.photos.map((p) => ({ url: p.url, label: p.label ?? null }));
  if (input.category) {
    data.category = input.category;
    data.department = departmentOf(input.category)!.id;
  }
  if (input.city || input.location) Object.assign(data, placeOf({ city: input.city ?? current.city, location: input.location }, seller));
  if (input.status) {
    data.status = input.status;
    if (input.status === "SOLD" && current.status !== "SOLD") {
      data.soldAt = new Date();
      await prisma.seller.update({ where: { id: seller.id }, data: { soldCount: { increment: 1 } } });
    }
  }
  const l = await prisma.listing.update({ where: { id }, data });
  await afterWrite(id, seller);
  return l;
}

export async function removeListing(seller: Seller, id: string) {
  await ownListing(seller, id);
  await prisma.listing.update({ where: { id }, data: { status: "REMOVED" } });
  await afterWrite(id, seller);
}

export async function boostListing(seller: Seller, id: string, days: number) {
  const l = await ownListing(seller, id);
  if (l.status !== "ACTIVE") throw badRequest("Only live listings can be boosted");
  // One credit per boost. Free sellers buy credits (payment provider webhook adds them); stores get monthly credits.
  const spent = await prisma.seller.updateMany({ where: { id: seller.id, boostCredits: { gte: 1 } }, data: { boostCredits: { decrement: 1 } } });
  if (spent.count === 0) throw badRequest("You have no boost credits left", { boost: "Buy a boost to continue" });
  const from = l.boostedUntil && l.boostedUntil > new Date() ? l.boostedUntil : new Date();
  const updated = await prisma.listing.update({ where: { id }, data: { boostedUntil: new Date(from.getTime() + days * 86400_000) } });
  await afterWrite(id, seller);
  return updated;
}

/** Public detail, cached for 60s. Views are counted once per viewer per hour, off the request path. */
export async function getListingDetail(id: string) {
  return cached(keys.listing(id), 60, async () => {
    const l = await prisma.listing.findUnique({ where: { id }, include: { seller: { include: sellerCounts } } });
    if (!l || l.status === "REMOVED" || l.status === "DRAFT") return null;
    return listingDetail(l);
  });
}

export function countView(id: string, viewer: string) {
  redis
    .set(`viewed:${id}:${viewer}`, "1", "EX", 3600, "NX")
    .then((fresh) => {
      if (fresh) return prisma.listing.update({ where: { id }, data: { views: { increment: 1 } } });
    })
    .catch(() => {});
}
