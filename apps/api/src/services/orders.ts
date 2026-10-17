import { randomInt } from "node:crypto";
import type { Order, OrderItem, Seller, User } from "@prisma/client";
import type { CreateOrderInput, OrderAction, OrderDTO } from "@droba/shared";
import { prisma } from "../lib/prisma.js";
import { AppError, badRequest, forbidden, notFound } from "../lib/errors.js";
import { bumpListingsVersion, invalidate, keys } from "../lib/cache.js";
import { naira } from "../lib/format.js";
import { conversationFor, emitToUsers, sendMessage } from "./chat.js";

/* Order requests
   Buyer checks out their bag → one order per seller. Each order also drops a message into the
   buyer↔seller chat so both sides can talk it through. Lifecycle:
     PENDING → CONFIRMED (seller) → DELIVERED (either side, after handover)
     PENDING → DECLINED (seller) | CANCELLED (buyer, until delivered)
   No money moves on Droba; the buyer pays the seller on delivery. */

type FullOrder = Order & { items: OrderItem[]; seller: Seller; buyer: Pick<User, "id" | "name"> };
const include = { items: true, seller: true, buyer: { select: { id: true, name: true } } } as const;

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I: easy to read out on the phone
const newCode = () => "DRB-" + Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export function orderDTO(o: FullOrder, viewerId: string, rated?: boolean): OrderDTO {
  return {
    id: o.id,
    code: o.code,
    status: o.status,
    role: o.buyerId === viewerId ? "BUYER" : "SELLER",
    deliveryMethod: o.deliveryMethod,
    contact: { name: o.contactName, phone: o.contactPhone, address: o.address, city: o.city, note: o.note },
    items: o.items.map((i) => ({ listingId: i.listingId, title: i.title, price: i.price, photo: i.photo, condition: i.condition })),
    total: o.total,
    seller: { id: o.seller.id, displayName: o.seller.displayName, handle: o.seller.handle, verified: o.seller.verified, plan: o.seller.plan },
    buyer: { id: o.buyer.id, name: o.buyer.name },
    conversationId: o.conversationId,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    confirmedAt: o.confirmedAt?.toISOString() ?? null,
    deliveredAt: o.deliveredAt?.toISOString() ?? null,
    ...(rated !== undefined ? { rated } : {}),
  };
}

function broadcast(o: FullOrder) {
  emitToUsers([o.buyerId], "order:update", orderDTO(o, o.buyerId));
  emitToUsers([o.sellerUserId], "order:update", orderDTO(o, o.sellerUserId));
}

/** Order codes are short, so retry on the (rare) collision */
async function withFreshCode<T>(fn: (code: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(newCode());
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002" || attempt >= 4) throw e;
    }
  }
}

export async function createOrders(buyerId: string, input: CreateOrderInput): Promise<OrderDTO[]> {
  const ids = [...new Set(input.listingIds)];
  const listings = await prisma.listing.findMany({ where: { id: { in: ids } }, include: { seller: true } });
  const unavailable = ids.filter((id) => !listings.find((l) => l.id === id && l.status === "ACTIVE"));
  if (unavailable.length) {
    throw new AppError(409, "UNAVAILABLE", unavailable.length === 1 ? "One item in your bag has just sold or been removed" : `${unavailable.length} items in your bag are no longer available`, { listingIds: unavailable.join(",") });
  }
  if (listings.some((l) => l.seller.userId === buyerId)) throw badRequest("You can't order your own item");

  // One order per seller
  const bySeller = new Map<string, typeof listings>();
  for (const l of listings) bySeller.set(l.sellerId, [...(bySeller.get(l.sellerId) ?? []), l]);

  const created: FullOrder[] = [];
  for (const group of bySeller.values()) {
    const seller = group[0]!.seller;
    const convo = await conversationFor(group[0]!.id, buyerId, seller.userId);
    const order = await withFreshCode((code) =>
      prisma.order.create({
          data: {
            code,
            buyerId,
            sellerId: seller.id,
            sellerUserId: seller.userId,
            deliveryMethod: input.deliveryMethod,
            contactName: input.name,
            contactPhone: input.phone,
            address: input.deliveryMethod === "DELIVERY" ? input.address : null,
            city: input.city,
            note: input.note || null,
            total: group.reduce((t, l) => t + l.price, 0),
            conversationId: convo.id,
            items: {
              create: group.map((l) => ({
                listingId: l.id,
                title: l.title,
                price: l.price,
                condition: l.condition,
                photo: Array.isArray(l.photos) ? ((l.photos[0] as { url?: string } | undefined)?.url ?? null) : null,
              })),
            },
          },
          include,
        }),
    );
    created.push(order);
    const lines = group.map((l) => `• ${l.title} (${naira(l.price)})`).join("\n");
    const where = input.deliveryMethod === "DELIVERY" ? `Deliver to: ${input.address}, ${input.city}` : `I'll pick up in ${input.city}`;
    await sendMessage(
      convo.id,
      buyerId,
      `🛍️ Order request ${order.code}\n${lines}\nTotal: ${naira(order.total)} (pay on delivery)\n${where}\nPhone: ${input.phone}${input.note ? `\nNote: ${input.note}` : ""}`,
      `order-${order.id}`,
    );
    broadcast(order);
  }
  return created.map((o) => orderDTO(o, buyerId));
}

async function load(id: string) {
  const o = await prisma.order.findUnique({ where: { id }, include });
  if (!o) throw notFound("Order not found");
  return o;
}

export async function getOrder(id: string, viewerId: string) {
  const o = await load(id);
  if (o.buyerId !== viewerId && o.sellerUserId !== viewerId) throw forbidden("Not your order");
  const rated = o.buyerId === viewerId ? !!(await prisma.rating.findUnique({ where: { sellerId_raterId: { sellerId: o.sellerId, raterId: viewerId } }, select: { id: true } })) : undefined;
  return orderDTO(o, viewerId, rated);
}

export async function listBuyerOrders(buyerId: string) {
  const rows = await prisma.order.findMany({ where: { buyerId }, include, orderBy: { createdAt: "desc" }, take: 100 });
  const rated = new Set((await prisma.rating.findMany({ where: { raterId: buyerId, sellerId: { in: rows.map((r) => r.sellerId) } }, select: { sellerId: true } })).map((r) => r.sellerId));
  return rows.map((o) => orderDTO(o, buyerId, rated.has(o.sellerId)));
}

export async function listSellerOrders(sellerUserId: string, status?: Order["status"]) {
  const rows = await prisma.order.findMany({ where: { sellerUserId, ...(status ? { status } : {}) }, include, orderBy: { createdAt: "desc" }, take: 200 });
  return rows.map((o) => orderDTO(o, sellerUserId));
}

const MESSAGES: Record<OrderAction, (o: FullOrder, reason?: string) => string> = {
  confirm: (o) => `✅ Confirmed order ${o.code}. I'll reach you on ${o.contactPhone} to arrange ${o.deliveryMethod === "DELIVERY" ? "delivery" : "pickup"}.`,
  decline: (o, r) => `Sorry, I can't fulfil order ${o.code}.${r ? ` ${r}` : ""}`,
  cancel: (o, r) => `I've cancelled order ${o.code}.${r ? ` ${r}` : ""}`,
  delivered: (o) => `📦 Order ${o.code} marked as delivered. Thank you!`,
};

export async function updateOrder(id: string, actorId: string, action: OrderAction, reason?: string): Promise<OrderDTO> {
  const o = await load(id);
  const isBuyer = o.buyerId === actorId;
  const isSeller = o.sellerUserId === actorId;
  if (!isBuyer && !isSeller) throw forbidden("Not your order");

  const allowed: Record<OrderAction, { who: boolean; from: Order["status"][] }> = {
    confirm: { who: isSeller, from: ["PENDING"] },
    decline: { who: isSeller, from: ["PENDING", "CONFIRMED"] },
    cancel: { who: isBuyer, from: ["PENDING", "CONFIRMED"] },
    delivered: { who: isBuyer || isSeller, from: ["CONFIRMED"] },
  };
  const rule = allowed[action];
  if (!rule.who) throw forbidden(action === "cancel" ? "Only the buyer can cancel" : "Only the seller can do that");
  if (!rule.from.includes(o.status)) throw new AppError(409, "BAD_STATE", `This order is already ${o.status.toLowerCase()}`);

  const now = new Date();
  const status = ({ confirm: "CONFIRMED", decline: "DECLINED", cancel: "CANCELLED", delivered: "DELIVERED" } as const)[action];
  // Guarded update: if two people act at the same moment, only one transition wins
  const changed = await prisma.order.updateMany({
    where: { id, status: { in: rule.from } },
    data: { status, ...(action === "confirm" ? { confirmedAt: now } : {}), ...(action === "delivered" ? { deliveredAt: now } : {}) },
  });
  if (!changed.count) throw new AppError(409, "BAD_STATE", "This order was just updated. Refresh to see the latest.");

  if (action === "delivered") {
    // Handed over: the items are sold
    const listingIds = o.items.map((i) => i.listingId).filter((x): x is string => !!x);
    const sold = await prisma.listing.updateMany({ where: { id: { in: listingIds }, status: "ACTIVE" }, data: { status: "SOLD", soldAt: now } });
    if (sold.count) await prisma.seller.update({ where: { id: o.sellerId }, data: { soldCount: { increment: sold.count } } });
    await Promise.all([invalidate(...listingIds.map(keys.listing), keys.seller(o.sellerId), ...(o.seller.handle ? [keys.store(o.seller.handle)] : [])), bumpListingsVersion()]);
  }

  if (o.conversationId) await sendMessage(o.conversationId, actorId, MESSAGES[action](o, reason), `order-${o.id}-${action}`).catch(() => {});
  const fresh = await load(id);
  broadcast(fresh);
  return orderDTO(fresh, actorId);
}

export async function pendingCount(sellerUserId: string) {
  return prisma.order.count({ where: { sellerUserId, status: "PENDING" } });
}
