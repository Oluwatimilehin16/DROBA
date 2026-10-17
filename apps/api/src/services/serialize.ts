import type { Listing, Seller, User } from "@prisma/client";
import type { ListingCard, ListingDetail, ListingPhoto, Me, SellerPublic, SellerSummary } from "@droba/shared";
import { prisma } from "../lib/prisma.js";

type SellerWithCounts = Seller & { _count?: { listings?: number; followers?: number } };

export function sellerSummary(s: Seller): SellerSummary {
  return {
    id: s.id,
    type: s.type,
    plan: s.plan,
    displayName: s.displayName,
    handle: s.handle,
    city: s.city,
    area: s.area,
    verified: s.verified,
    ratingAvg: Math.round(s.ratingAvg * 10) / 10,
    ratingCount: s.ratingCount,
    logoUrl: s.logoUrl,
  };
}

/** Public seller profile. The phone number is withheld unless `withPhone` (owner, or a signed-in buyer asking via /contact). */
export function sellerPublic(s: SellerWithCounts, extra?: { isFollowing?: boolean }, withPhone = false): SellerPublic {
  return {
    ...sellerSummary(s),
    bio: s.bio,
    bannerUrl: s.bannerUrl,
    phone: withPhone ? s.phone : null,
    joinedAt: s.createdAt.toISOString(),
    soldCount: s.soldCount,
    activeListings: s._count?.listings ?? 0,
    followers: s._count?.followers ?? 0,
    ...extra,
  };
}

export const sellerCounts = {
  _count: { select: { listings: { where: { status: "ACTIVE" as const } }, followers: true } },
};

export async function loadMe(userId: string): Promise<Me | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, include: { seller: { include: sellerCounts } } });
  return u ? me(u) : null;
}

export function me(u: User & { seller: SellerWithCounts | null }): Me {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: !!u.emailVerifiedAt,
    phone: u.phone,
    city: u.city,
    location: u.lat != null && u.lng != null ? { lat: u.lat, lng: u.lng } : null,
    activeMode: u.activeMode,
    seller: u.seller ? { ...sellerPublic(u.seller, undefined, true), boostCredits: u.seller.boostCredits } : null,
    createdAt: u.createdAt.toISOString(),
  };
}

const photosOf = (p: unknown): ListingPhoto[] =>
  Array.isArray(p) ? p.filter((x) => x && typeof x.url === "string").map((x) => ({ url: x.url as string, label: (x.label as string) ?? null })) : [];

const isBoosted = (d: Date | null) => !!d && d.getTime() > Date.now();

export function listingCard(l: Listing & { seller: Seller }, opts?: { distanceM?: number | null; saved?: boolean }): ListingCard {
  return {
    id: l.id,
    title: l.title,
    price: l.price,
    department: l.department,
    category: l.category,
    condition: l.condition,
    size: l.size,
    brand: l.brand,
    extra: l.extra,
    city: l.city,
    area: l.area,
    photo: photosOf(l.photos)[0]?.url ?? null,
    status: l.status,
    createdAt: l.createdAt.toISOString(),
    boosted: isBoosted(l.boostedUntil),
    distanceM: opts?.distanceM ?? null,
    seller: { id: l.seller.id, displayName: l.seller.displayName, handle: l.seller.handle, verified: l.seller.verified, type: l.seller.type },
    ...(opts?.saved !== undefined ? { saved: opts.saved } : {}),
  };
}

export function listingDetail(l: Listing & { seller: SellerWithCounts }): ListingDetail {
  const { photo: _p, seller: _s, ...card } = listingCard(l);
  return {
    ...card,
    description: l.description,
    color: l.color,
    gender: l.gender,
    origin: l.origin,
    tested: l.tested,
    flaws: l.flaws,
    specs: Array.isArray(l.specs) ? (l.specs as [string, string][]) : [],
    photos: photosOf(l.photos),
    openToOffers: l.openToOffers,
    canDeliver: l.canDeliver,
    allowPickup: l.allowPickup,
    views: l.views,
    savesCount: l.savesCount,
    location: { lat: Math.round(l.lat * 1000) / 1000, lng: Math.round(l.lng * 1000) / 1000 }, // ~100m: never expose an exact home location
    seller: sellerPublic(l.seller),
  };
}
