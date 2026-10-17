import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { MessageDTO } from "@droba/shared";
import { listingBody, once, seller, shutdownClients, signup, socketFor, startServer, type ClientSocket, type TestServer } from "./helpers.js";

let srv: TestServer;
const sockets: ClientSocket[] = [];
beforeAll(async () => void (srv = await startServer()));
afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  await srv.close();
  await shutdownClients();
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const send = (s: ClientSocket, conversationId: string, body: string, clientId?: string) =>
  new Promise<{ ok: true; data: MessageDTO } | { ok: false; error: string }>((r) => s.emit("message:send", { conversationId, body, clientId }, r));

async function setup() {
  const sel = await seller(srv.http);
  const buyer = await signup(srv.http);
  const listing = (await request(srv.http).post("/api/listings").set(auth(sel.token)).send(listingBody())).body;
  const start = await request(srv.http).post("/api/conversations").set(auth(buyer.token)).send({ listingId: listing.id, message: "Hi, is this still available?" });
  expect(start.status).toBe(201);
  return { sel, buyer, listing, conversationId: start.body.conversationId as string };
}

describe("real-time chat", () => {
  it("rejects sockets without a valid session", async () => {
    await expect(socketFor(srv.url, "not-a-token")).rejects.toThrow(/UNAUTHORIZED/);
  });

  it("starting a chat from a listing shows up in both inboxes with the right roles", async () => {
    const { sel, buyer, conversationId } = await setup();
    const b = await request(srv.http).get("/api/conversations").set(auth(buyer.token));
    const s = await request(srv.http).get("/api/conversations").set(auth(sel.token));
    expect(b.body.items[0]).toMatchObject({ id: conversationId, role: "BUYER", unread: 0 });
    expect(s.body.items[0]).toMatchObject({ id: conversationId, role: "SELLER", unread: 1, lastMessage: { body: "Hi, is this still available?" } });
  });

  it("delivers messages instantly to the other person and to the sender's other tabs", async () => {
    const { sel, buyer, conversationId } = await setup();
    const sellerSock = await socketFor(srv.url, sel.token);
    const buyerTab1 = await socketFor(srv.url, buyer.token);
    const buyerTab2 = await socketFor(srv.url, buyer.token);
    sockets.push(sellerSock, buyerTab1, buyerTab2);

    const atSeller = once(sellerSock, "message:new");
    const atTab2 = once(buyerTab2, "message:new");
    const ack = await send(buyerTab1, conversationId, "Can I pick it up tomorrow?", "c-1");
    expect(ack.ok).toBe(true);
    const [m1, m2] = await Promise.all([atSeller, atTab2]);
    expect(m1.body).toBe("Can I pick it up tomorrow?");
    expect(m2.id).toBe(m1.id);

    const reply = once(buyerTab1, "message:new");
    await send(sellerSock, conversationId, "Yes, after 4pm");
    expect((await reply).body).toBe("Yes, after 4pm");

    const history = await request(srv.http).get(`/api/conversations/${conversationId}/messages`).set(auth(buyer.token));
    expect(history.body.items.map((m: MessageDTO) => m.body)).toEqual(["Hi, is this still available?", "Can I pick it up tomorrow?", "Yes, after 4pm"]);
  });

  it("retries with the same clientId never duplicate a message", async () => {
    const { buyer, conversationId } = await setup();
    const s = await socketFor(srv.url, buyer.token);
    sockets.push(s);
    const [a, b] = await Promise.all([send(s, conversationId, "Offer: 200k", "dup-1"), send(s, conversationId, "Offer: 200k", "dup-1")]);
    expect(a.ok && b.ok && a.data.id === b.data.id).toBe(true);
    const history = await request(srv.http).get(`/api/conversations/${conversationId}/messages`).set(auth(buyer.token));
    expect(history.body.items.filter((m: MessageDTO) => m.body === "Offer: 200k")).toHaveLength(1);
  });

  it("relays typing and read receipts, and keeps unread counts right", async () => {
    const { sel, buyer, conversationId } = await setup();
    const sellerSock = await socketFor(srv.url, sel.token);
    const buyerSock = await socketFor(srv.url, buyer.token);
    sockets.push(sellerSock, buyerSock);

    const typing = once(sellerSock, "typing");
    buyerSock.emit("typing", { conversationId, isTyping: true });
    expect(await typing).toMatchObject({ conversationId, userId: buyer.user.id, isTyping: true });

    expect((await request(srv.http).get("/api/conversations/unread").set(auth(sel.token))).body.total).toBe(1);
    const read = once(buyerSock, "conversation:read");
    sellerSock.emit("conversation:read", { conversationId });
    expect((await read).userId).toBe(sel.user.id);
    expect((await request(srv.http).get("/api/conversations/unread").set(auth(sel.token))).body.total).toBe(0);
  });

  it("outsiders can't read or post into someone else's chat", async () => {
    const { conversationId } = await setup();
    const stranger = await signup(srv.http);
    expect((await request(srv.http).get(`/api/conversations/${conversationId}/messages`).set(auth(stranger.token))).status).toBe(403);
    const s = await socketFor(srv.url, stranger.token);
    sockets.push(s);
    const r = await send(s, conversationId, "hello");
    expect(r.ok).toBe(false);
  });

  it("only people who chatted with a seller can rate them", async () => {
    const { sel, buyer } = await setup();
    const stranger = await signup(srv.http);
    expect((await request(srv.http).post(`/api/sellers/${sel.sellerId}/ratings`).set(auth(stranger.token)).send({ stars: 1 })).status).toBe(403);
    expect((await request(srv.http).post(`/api/sellers/${sel.sellerId}/ratings`).set(auth(buyer.token)).send({ stars: 5, comment: "Smooth" })).status).toBe(201);
    const store = await request(srv.http).get(`/api/sellers/${sel.sellerId}`);
    expect(store.body.seller).toMatchObject({ ratingAvg: 5, ratingCount: 1 });
  });

  it("handles 40 people sending 100 messages at once", async () => {
    const pairs = await Promise.all(Array.from({ length: 20 }, () => setup()));
    const socks = await Promise.all(pairs.flatMap((p) => [socketFor(srv.url, p.buyer.token), socketFor(srv.url, p.sel.token)]));
    sockets.push(...socks);
    const t0 = Date.now();
    const acks = await Promise.all(
      pairs.flatMap((p, i) => Array.from({ length: 5 }, (_, k) => send(socks[i * 2]!, p.conversationId, `msg ${k}`, `${p.conversationId}-${k}`))),
    );
    expect(acks.every((a) => a.ok)).toBe(true);
    expect(Date.now() - t0).toBeLessThan(10_000);
  });
});
