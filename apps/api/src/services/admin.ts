import type { Prisma, ReportStatus } from "@prisma/client";
import {
  REPORT_REASON_INFO,
  type AdminActionDTO,
  type AdminListingDTO,
  type AdminReportDTO,
  type AdminSummary,
  type AdminUserDTO,
  type AdminVerificationDTO,
  type ListingStatus,
  type ReportAction,
} from "@droba/shared";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { bumpListingsVersion, invalidate, keys } from "../lib/cache.js";
import { SUPPORT_EMAIL, sendEmail, templates } from "../lib/email.js";
import { revokeAllSessions } from "./sessions.js";

/* Moderation. Every action is written to admin_actions, and the person affected gets an email. */

const firstPhoto = (p: unknown) => (Array.isArray(p) ? ((p[0] as { url?: string } | undefined)?.url ?? null) : null);

async function log(adminId: string, action: string, targetType: string, targetId: string, note?: string | null) {
  await prisma.adminAction.create({ data: { adminId, action, targetType, targetId, note: note ?? null } });
}

/** Drop every cached page that shows this seller: store, their listings, search results, popular stores */
async function forgetSeller(seller: { id: string; handle: string | null }) {
  const listings = await prisma.listing.findMany({ where: { sellerId: seller.id }, select: { id: true } });
  await Promise.all([
    invalidate(keys.seller(seller.id), "stores:popular", ...(seller.handle ? [keys.store(seller.handle)] : []), ...listings.map((l) => keys.listing(l.id))),
    bumpListingsVersion(),
  ]);
}

export async function summary(): Promise<AdminSummary> {
  const week = new Date(Date.now() - 7 * 86400_000);
  const [users, newUsersWeek, sellers, stores, activeListings, ordersWeek, openReports, pendingVerifications, suspended, recent] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: week } } }),
    prisma.seller.count(),
    prisma.seller.count({ where: { type: "STORE" } }),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.order.count({ where: { createdAt: { gte: week } } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.seller.count({ where: { verificationStatus: "PENDING" } }),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
    recentActions(12),
  ]);
  return { users, newUsersWeek, sellers, stores, activeListings, ordersWeek, openReports, pendingVerifications, suspended, recent };
}

export async function recentActions(take: number): Promise<AdminActionDTO[]> {
  const rows = await prisma.adminAction.findMany({ orderBy: { createdAt: "desc" }, take });
  const admins = await prisma.user.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.adminId))] } }, select: { id: true, name: true } });
  const name = new Map(admins.map((a) => [a.id, a.name]));
  return rows.map((r) => ({ id: r.id, admin: name.get(r.adminId) ?? "Admin", action: r.action, targetType: r.targetType, targetId: r.targetId, note: r.note, createdAt: r.createdAt.toISOString() }));
}

/* ---------- Reports ---------- */

export async function listReports(status: ReportStatus): Promise<AdminReportDTO[]> {
  const rows = await prisma.report.findMany({
    where: { status },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      listing: { select: { id: true, title: true, photos: true, price: true, status: true } },
      seller: { select: { id: true, displayName: true, handle: true, plan: true, suspended: true, userId: true } },
    },
    orderBy: { createdAt: status === "OPEN" ? "asc" : "desc" },
    take: 200,
  });
  // How many open reports each target has, so repeat offenders stand out
  const open = await prisma.report.groupBy({ by: ["sellerId", "listingId"], where: { status: "OPEN" }, _count: { _all: true } });
  const count = (r: (typeof rows)[number]) =>
    open.filter((o) => (r.listingId ? o.listingId === r.listingId : o.sellerId === r.sellerId && !o.listingId)).reduce((t, o) => t + o._count._all, 0);
  return rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    details: r.details,
    status: r.status,
    resolution: r.resolution,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    reporter: r.reporter,
    listing: r.listing ? { id: r.listing.id, title: r.listing.title, photo: firstPhoto(r.listing.photos), price: r.listing.price, status: r.listing.status as ListingStatus } : null,
    seller: r.seller,
    sameTarget: Math.max(0, count(r) - (r.status === "OPEN" ? 1 : 0)),
  }));
}

export async function actOnReport(adminId: string, reportId: string, action: ReportAction, note?: string) {
  const r = await prisma.report.findUnique({ where: { id: reportId }, include: { seller: true } });
  if (!r) throw notFound("Report not found");
  if (r.status !== "OPEN") throw badRequest("This report has already been handled");
  const reason = note || REPORT_REASON_INFO[r.reason].label;
  const close = (where: Prisma.ReportWhereInput, status: ReportStatus, resolution: string) =>
    prisma.report.updateMany({ where: { ...where, status: "OPEN" }, data: { status, resolution, resolvedById: adminId, resolvedAt: new Date() } });

  switch (action) {
    case "dismiss":
      await close({ id: r.id }, "DISMISSED", note || "No problem found");
      break;
    case "resolve":
      await close({ id: r.id }, "RESOLVED", note || "Handled");
      break;
    case "remove_listing":
      if (!r.listingId) throw badRequest("This report is about a seller, not a listing");
      await removeListing(adminId, r.listingId, reason);
      await close({ listingId: r.listingId }, "RESOLVED", `Listing removed: ${reason}`);
      break;
    case "suspend_seller":
      await suspendUser(adminId, r.seller.userId, reason);
      await close({ sellerId: r.sellerId }, "RESOLVED", `Seller suspended: ${reason}`);
      break;
  }
  await log(adminId, `report.${action}`, "report", r.id, note);
}

/* ---------- Listings ---------- */

export async function listListings(q: string | undefined, status: ListingStatus | undefined): Promise<AdminListingDTO[]> {
  const where: Prisma.ListingWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? { OR: [{ id: q }, { title: { contains: q, mode: "insensitive" } }, { seller: { displayName: { contains: q, mode: "insensitive" } } }, { seller: { handle: { contains: q.toLowerCase() } } }] }
      : {}),
  };
  const rows = await prisma.listing.findMany({
    where,
    include: { seller: { select: { id: true, displayName: true, handle: true, suspended: true } }, _count: { select: { reports: { where: { status: "OPEN" } } } } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return rows.map((l) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    photo: firstPhoto(l.photos),
    status: l.status,
    removedReason: l.removedReason,
    createdAt: l.createdAt.toISOString(),
    seller: l.seller,
    reports: l._count.reports,
  }));
}

export async function removeListing(adminId: string, listingId: string, reason: string) {
  const l = await prisma.listing.findUnique({ where: { id: listingId }, include: { seller: { include: { user: { select: { email: true } } } } } });
  if (!l) throw notFound("Listing not found");
  await prisma.listing.update({ where: { id: l.id }, data: { status: "REMOVED", removedReason: reason } });
  await prisma.bagItem.deleteMany({ where: { listingId: l.id } });
  await Promise.all([invalidate(keys.listing(l.id)), forgetSeller(l.seller)]);
  sendEmail({
    to: l.seller.user.email,
    ...templates.notice(
      `We removed "${l.title}" from Droba`,
      "We removed one of your listings",
      `"${l.title}" was taken down because: ${reason}\n\nPlease read what can and can't be sold on Droba before listing it again. If you think this is a mistake, reply to ${SUPPORT_EMAIL}.`,
      { href: `${env.WEB_URL}/prohibited`, label: "What you can sell" },
    ),
  });
  await log(adminId, "listing.remove", "listing", l.id, reason);
}

export async function restoreListing(adminId: string, listingId: string) {
  const l = await prisma.listing.findUnique({ where: { id: listingId }, include: { seller: true } });
  if (!l) throw notFound("Listing not found");
  if (l.status !== "REMOVED" || !l.removedReason) throw badRequest("Only listings Droba removed can be restored here");
  await prisma.listing.update({ where: { id: l.id }, data: { status: "ACTIVE", removedReason: null } });
  await Promise.all([invalidate(keys.listing(l.id)), forgetSeller(l.seller)]);
  await log(adminId, "listing.restore", "listing", l.id);
}

/* ---------- Users ---------- */

export async function listUsers(q: string | undefined): Promise<AdminUserDTO[]> {
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { id: q },
          { email: { contains: q.toLowerCase() } },
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q.replace(/\s/g, "").replace(/^0/, "") } },
          { seller: { displayName: { contains: q, mode: "insensitive" } } },
          { seller: { handle: { contains: q.toLowerCase() } } },
        ],
      }
    : {};
  const rows = await prisma.user.findMany({
    where,
    include: { seller: { include: { _count: { select: { listings: { where: { status: "ACTIVE" } }, reports: { where: { status: "OPEN" } } } } } } },
    orderBy: q ? { createdAt: "desc" } : [{ suspendedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 60,
  });
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    suspendedAt: u.suspendedAt?.toISOString() ?? null,
    suspendedReason: u.suspendedReason,
    seller: u.seller ? { id: u.seller.id, displayName: u.seller.displayName, handle: u.seller.handle, plan: u.seller.plan, verified: u.seller.verified, activeListings: u.seller._count.listings } : null,
    reports: u.seller?._count.reports ?? 0,
  }));
}

export async function suspendUser(adminId: string, targetId: string, reason: string) {
  if (targetId === adminId) throw forbidden("You can't suspend yourself");
  const u = await prisma.user.findUnique({ where: { id: targetId }, include: { seller: true } });
  if (!u) throw notFound("User not found");
  if (u.role === "ADMIN") throw forbidden("Remove their admin role before suspending them");
  await prisma.$transaction([
    prisma.user.update({ where: { id: u.id }, data: { suspendedAt: new Date(), suspendedReason: reason, activeMode: "BUYER" } }),
    prisma.seller.updateMany({ where: { userId: u.id }, data: { suspended: true } }),
    // Their items leave everyone's bags; open order requests to them are declined so buyers aren't left waiting
    prisma.bagItem.deleteMany({ where: { listing: { seller: { userId: u.id } } } }),
    prisma.order.updateMany({ where: { sellerUserId: u.id, status: { in: ["PENDING", "CONFIRMED"] } }, data: { status: "DECLINED" } }),
  ]);
  await revokeAllSessions(u.id);
  if (u.seller) await forgetSeller(u.seller);
  sendEmail({
    to: u.email,
    ...templates.notice(
      "Your Droba account has been suspended",
      "Your account has been suspended",
      `We suspended your Droba account because: ${reason}\n\nYou can't log in or sell while it's suspended. If you think this is a mistake, reply to ${SUPPORT_EMAIL} with your account email.`,
      { href: `${env.WEB_URL}/terms`, label: "Read the terms" },
    ),
  });
  await log(adminId, "user.suspend", "user", u.id, reason);
}

export async function unsuspendUser(adminId: string, targetId: string) {
  const u = await prisma.user.findUnique({ where: { id: targetId }, include: { seller: true } });
  if (!u) throw notFound("User not found");
  await prisma.$transaction([
    prisma.user.update({ where: { id: u.id }, data: { suspendedAt: null, suspendedReason: null } }),
    prisma.seller.updateMany({ where: { userId: u.id }, data: { suspended: false } }),
  ]);
  if (u.seller) await forgetSeller(u.seller);
  sendEmail({ to: u.email, ...templates.notice("Your Droba account is active again", "Welcome back", "We've lifted the suspension on your Droba account. You can log in again.", { href: `${env.WEB_URL}/login`, label: "Log in" }) });
  await log(adminId, "user.unsuspend", "user", u.id);
}

/* ---------- Store verification ---------- */

export async function listVerifications(): Promise<AdminVerificationDTO[]> {
  const rows = await prisma.seller.findMany({
    where: { verificationStatus: "PENDING" },
    include: {
      user: { select: { name: true, email: true, phone: true, emailVerifiedAt: true } },
      _count: { select: { listings: { where: { status: "ACTIVE" } }, orders: { where: { status: "DELIVERED" } }, reports: { where: { status: "OPEN" } } } },
    },
    orderBy: { verificationRequestedAt: "asc" },
    take: 100,
  });
  return rows.map((s) => ({
    sellerId: s.id,
    displayName: s.displayName,
    handle: s.handle,
    plan: s.plan,
    city: s.city,
    status: s.verificationStatus,
    note: s.verificationNote,
    requestedAt: s.verificationRequestedAt?.toISOString() ?? null,
    joinedAt: s.createdAt.toISOString(),
    owner: { name: s.user.name, email: s.user.email, phone: s.phone ?? s.user.phone, emailVerified: !!s.user.emailVerifiedAt },
    activeListings: s._count.listings,
    soldCount: s.soldCount,
    delivered: s._count.orders,
    ratingAvg: Math.round(s.ratingAvg * 10) / 10,
    ratingCount: s.ratingCount,
    openReports: s._count.reports,
  }));
}

export async function decideVerification(adminId: string, sellerId: string, approve: boolean, reason?: string) {
  const s = await prisma.seller.findUnique({ where: { id: sellerId }, include: { user: { select: { email: true } } } });
  if (!s) throw notFound("Store not found");
  if (s.type !== "STORE") throw badRequest("Only stores can be verified");
  if (!approve && !reason) throw badRequest("Tell the store why, so they can fix it", { reason: "Required" });
  await prisma.seller.update({
    where: { id: s.id },
    data: approve ? { verified: true, verificationStatus: "APPROVED", verificationReply: null } : { verified: false, verificationStatus: "REJECTED", verificationReply: reason },
  });
  await forgetSeller(s);
  const badge = s.plan === "BUSINESS" ? "Verified Business" : "Verified Store";
  sendEmail({
    to: s.user.email,
    ...(approve
      ? templates.notice(`${s.displayName} is now verified on Droba`, "You're verified", `Your store now shows the ${badge} badge on your storefront and on every listing.`, { href: `${env.WEB_URL}/${s.handle ?? ""}`, label: "See your store" })
      : templates.notice("About your verification request", "We couldn't verify your store yet", `${reason}\n\nYou can send a new request from Seller Studio → Storefront once that's sorted.`, { href: `${env.WEB_URL}/studio/storefront`, label: "Open Seller Studio" })),
  });
  await log(adminId, approve ? "verification.approve" : "verification.reject", "seller", s.id, reason);
}

/** Admins can also take a badge away (e.g. after reports) */
export async function revokeVerification(adminId: string, sellerId: string, reason: string) {
  const s = await prisma.seller.findUnique({ where: { id: sellerId } });
  if (!s) throw notFound("Store not found");
  await prisma.seller.update({ where: { id: s.id }, data: { verified: false, verificationStatus: "REJECTED", verificationReply: reason } });
  await forgetSeller(s);
  await log(adminId, "verification.revoke", "seller", s.id, reason);
}
