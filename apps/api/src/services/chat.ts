import type { Server } from "socket.io";
import type { ClientToServerEvents, ConversationDTO, MessageDTO, ServerToClientEvents, SocketData } from "@droba/shared";
import type { Conversation, ListingStatus, Message } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { keys } from "../lib/cache.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";

/* Messaging lives here so the REST endpoints and the Socket.io handlers share one code path.
   Delivery: every user's sockets (all tabs, all devices, on any API instance) join room "user:<id>".
   Emitting to that room via the Redis adapter reaches them wherever they're connected. */

export type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
let io: IO | null = null;
export const setIO = (server: IO | null) => void (io = server);
export const userRoom = (id: string) => `user:${id}`;

/** Send any typed event to every device of the given users (any API instance, via the Redis adapter) */
export function emitToUsers<E extends keyof ServerToClientEvents>(userIds: string[], event: E, ...args: Parameters<ServerToClientEvents[E]>) {
  if (!io || !userIds.length) return;
  let target = io.to(userRoom(userIds[0]!));
  for (const id of userIds.slice(1)) target = target.to(userRoom(id));
  (target.emit as (ev: E, ...a: Parameters<ServerToClientEvents[E]>) => boolean)(event, ...args);
}

/** The buyer↔seller chat about a listing, created on first use */
export async function conversationFor(listingId: string, buyerId: string, sellerUserId: string) {
  return prisma.conversation.upsert({
    where: { listingId_buyerId: { listingId, buyerId } },
    create: { listingId, buyerId, sellerUserId },
    update: {},
    select: { id: true },
  });
}

interface Participants {
  buyerId: string;
  sellerUserId: string;
}

/** Who is in a conversation, cached: this check runs on every message and typing event. */
export async function participants(conversationId: string): Promise<Participants | null> {
  const k = keys.convo(conversationId);
  const hit = await redis.get(k).catch(() => null);
  if (hit) {
    const [buyerId, sellerUserId] = hit.split("|");
    return { buyerId: buyerId!, sellerUserId: sellerUserId! };
  }
  const c = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { buyerId: true, sellerUserId: true } });
  if (c) redis.set(k, `${c.buyerId}|${c.sellerUserId}`, "EX", 86400).catch(() => {});
  return c;
}

export async function assertMember(conversationId: string, userId: string) {
  const p = await participants(conversationId);
  if (!p) throw notFound("Conversation not found");
  if (p.buyerId !== userId && p.sellerUserId !== userId) throw forbidden("Not your conversation");
  return { ...p, otherId: p.buyerId === userId ? p.sellerUserId : p.buyerId, role: p.buyerId === userId ? ("BUYER" as const) : ("SELLER" as const) };
}

export const messageDTO = (m: Message): MessageDTO => ({
  id: m.id,
  conversationId: m.conversationId,
  senderId: m.senderId,
  body: m.body,
  createdAt: m.createdAt.toISOString(),
  clientId: m.clientId,
});

/** Persist, update the inbox preview, fan out. Idempotent on (sender, clientId).
    Hot path: one cached membership check, then the insert and the inbox update run in parallel. */
export async function sendMessage(conversationId: string, senderId: string, body: string, clientId?: string): Promise<MessageDTO> {
  const member = await assertMember(conversationId, senderId);
  const text = body.trim();
  if (!text) throw badRequest("Message is empty");

  const createdAt = new Date();
  let msg: Message;
  try {
    [msg] = await Promise.all([
      prisma.message.create({ data: { conversationId, senderId, body: text, clientId, createdAt } }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: createdAt,
          lastMessageBody: text.slice(0, 140),
          lastMessageSenderId: senderId,
          [member.role === "BUYER" ? "buyerLastReadAt" : "sellerLastReadAt"]: createdAt,
        },
      }),
    ]);
  } catch (e) {
    // Same clientId again: a retry after a dropped ack. Return the original instead of a duplicate.
    if ((e as { code?: string }).code === "P2002" && clientId) {
      const existing = await prisma.message.findUnique({ where: { senderId_clientId: { senderId, clientId } } });
      if (existing) return messageDTO(existing);
    }
    throw e;
  }
  const dto = messageDTO(msg);
  // Clients bump their own unread badge on message:new; the exact total is resent on connect and on read
  io?.to(userRoom(member.otherId)).to(userRoom(senderId)).emit("message:new", dto);
  return dto;
}

export async function markRead(conversationId: string, userId: string) {
  const member = await assertMember(conversationId, userId);
  const readAt = new Date();
  await prisma.conversation.update({ where: { id: conversationId }, data: member.role === "BUYER" ? { buyerLastReadAt: readAt } : { sellerLastReadAt: readAt } });
  if (io) {
    io.to(userRoom(member.otherId)).emit("conversation:read", { conversationId, userId, readAt: readAt.toISOString() });
    void unreadTotal(userId).then((total) => io?.to(userRoom(userId)).emit("unread:count", { total }));
  }
  return readAt;
}

/** Unread messages across all of a user's conversations (one indexed query). */
export async function unreadTotal(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n
    FROM conversations c JOIN messages m ON m.conversation_id = c.id
    WHERE (c.buyer_id = ${userId} AND m.sender_id <> ${userId} AND m.created_at > c.buyer_last_read_at)
       OR (c.seller_user_id = ${userId} AND m.sender_id <> ${userId} AND m.created_at > c.seller_last_read_at)`;
  return rows[0]?.n ?? 0;
}

/** Find or create the buyer↔seller chat about a listing, then send the first message. */
export async function startConversation(buyerId: string, listingId: string, message: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, include: { seller: { select: { userId: true, suspended: true } } } });
  if (!listing || listing.status !== "ACTIVE" || listing.seller.suspended) throw notFound("This listing is no longer available");
  if (listing.seller.userId === buyerId) throw badRequest("This is your own listing");
  const convo = await prisma.conversation.upsert({
    where: { listingId_buyerId: { listingId, buyerId } },
    create: { listingId, buyerId, sellerUserId: listing.seller.userId },
    update: {},
  });
  const msg = await sendMessage(convo.id, buyerId, message);
  return { conversationId: convo.id, message: msg };
}

type ConvoRow = Conversation & {
  listing: { id: string; title: string; price: number; photos: unknown; status: ListingStatus } | null;
  buyer: { id: string; name: string };
  sellerUser: { id: string; name: string; seller: { id: string; displayName: string; handle: string | null } | null };
};

export async function listConversations(userId: string, cursor?: string): Promise<{ items: ConversationDTO[]; nextCursor: string | null }> {
  const take = 30;
  const rows = (await prisma.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerUserId: userId }], ...(cursor ? { lastMessageAt: { lt: new Date(cursor) } } : {}) },
    include: {
      listing: { select: { id: true, title: true, price: true, photos: true, status: true } },
      buyer: { select: { id: true, name: true } },
      sellerUser: { select: { id: true, name: true, seller: { select: { id: true, displayName: true, handle: true } } } },
    },
    orderBy: { lastMessageAt: "desc" },
    take: take + 1,
  })) as ConvoRow[];
  const page = rows.slice(0, take);
  const unread = await unreadByConversation(userId, page.map((r) => r.id));
  return {
    items: page.map((c) => convoDTO(c, userId, unread.get(c.id) ?? 0)),
    nextCursor: rows.length > take ? page[page.length - 1]!.lastMessageAt.toISOString() : null,
  };
}

export async function getConversation(id: string, userId: string) {
  await assertMember(id, userId);
  const c = (await prisma.conversation.findUnique({
    where: { id },
    include: {
      listing: { select: { id: true, title: true, price: true, photos: true, status: true } },
      buyer: { select: { id: true, name: true } },
      sellerUser: { select: { id: true, name: true, seller: { select: { id: true, displayName: true, handle: true } } } },
    },
  })) as ConvoRow | null;
  if (!c) throw notFound();
  const unread = await unreadByConversation(userId, [id]);
  return convoDTO(c, userId, unread.get(id) ?? 0);
}

async function unreadByConversation(userId: string, ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const rows = await prisma.$queryRaw<{ id: string; n: number }[]>`
    SELECT c.id, count(m.id)::int AS n
    FROM conversations c JOIN messages m ON m.conversation_id = c.id AND m.sender_id <> ${userId}
    WHERE c.id = ANY(${ids}::text[])
      AND m.created_at > CASE WHEN c.buyer_id = ${userId} THEN c.buyer_last_read_at ELSE c.seller_last_read_at END
    GROUP BY c.id`;
  return new Map(rows.map((r) => [r.id, r.n]));
}

function convoDTO(c: ConvoRow, userId: string, unread: number): ConversationDTO {
  const iAmBuyer = c.buyerId === userId;
  const photos = Array.isArray(c.listing?.photos) ? (c.listing!.photos as { url: string }[]) : [];
  return {
    id: c.id,
    listing: c.listing ? { id: c.listing.id, title: c.listing.title, price: c.listing.price, photo: photos[0]?.url ?? null, status: c.listing.status } : null,
    counterpart: iAmBuyer
      ? { userId: c.sellerUser.id, name: c.sellerUser.seller?.displayName ?? c.sellerUser.name, sellerHandle: c.sellerUser.seller?.handle ?? null, sellerId: c.sellerUser.seller?.id ?? null }
      : { userId: c.buyer.id, name: c.buyer.name, sellerHandle: null, sellerId: null },
    role: iAmBuyer ? "BUYER" : "SELLER",
    lastMessage: c.lastMessageBody ? { body: c.lastMessageBody, createdAt: c.lastMessageAt.toISOString(), senderId: c.lastMessageSenderId ?? "" } : null,
    unread,
    updatedAt: c.lastMessageAt.toISOString(),
  };
}

export async function listMessages(conversationId: string, userId: string, before?: string) {
  await assertMember(conversationId, userId);
  const take = 50;
  const rows = await prisma.message.findMany({
    where: { conversationId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
    orderBy: { createdAt: "desc" },
    take: take + 1,
  });
  const page = rows.slice(0, take);
  return { items: page.reverse().map(messageDTO), nextCursor: rows.length > take ? page[0]!.createdAt.toISOString() : null };
}

/* Presence: a Redis hash of live socket ids per user, refreshed by a heartbeat so a crashed
   instance's sockets age out within two minutes instead of leaving users "online" forever. */
const PRESENCE_TTL = 120;
export async function presenceUp(userId: string, socketId: string): Promise<boolean> {
  const k = `presence:${userId}`;
  const [[, before]] = (await redis.multi().hlen(k).hset(k, socketId, Date.now()).expire(k, PRESENCE_TTL).exec()) as [[null, number], ...unknown[]];
  return before === 0;
}
export async function presenceDown(userId: string, socketId: string): Promise<boolean> {
  const k = `presence:${userId}`;
  const [, [, left]] = (await redis.multi().hdel(k, socketId).hlen(k).exec()) as [unknown, [null, number]];
  return left === 0;
}
export async function presenceRefresh(userIds: string[]) {
  if (!userIds.length) return;
  const m = redis.multi();
  for (const id of userIds) m.expire(`presence:${id}`, PRESENCE_TTL);
  await m.exec();
}
export async function isOnline(userId: string) {
  return (await redis.hlen(`presence:${userId}`).catch(() => 0)) > 0;
}
