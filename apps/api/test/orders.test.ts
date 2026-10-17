import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { OrderDTO } from "@droba/shared";
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
const contact = { deliveryMethod: "DELIVERY", name: "Amara Okafor", phone: "0801 234 5678", address: "12 Adeola Odeku Street, VI", city: "Lagos" };

async function twoSellersAndBuyer() {
  const a = await seller(srv.http, "Lagos");
  const b = await seller(srv.http, "Abuja");
  const buyer = await signup(srv.http);
  const la1 = (await request(srv.http).post("/api/listings").set(auth(a.token)).send(listingBody({ title: "Fridge A1", price: 200000 }))).body;
  const la2 = (await request(srv.http).post("/api/listings").set(auth(a.token)).send(listingBody({ title: "Fan A2", category: "Fans & ACs", price: 30000 }))).body;
  const lb1 = (await request(srv.http).post("/api/listings").set(auth(b.token)).send(listingBody({ title: "Sofa B1", category: "Sofas", origin: undefined, tested: undefined, price: 150000 }))).body;
  return { a, b, buyer, la1, la2, lb1 };
}

describe("bag checkout and order requests", () => {
  it("splits a bag into one request per seller, with a chat message to each", async () => {
    const { a, b, buyer, la1, la2, lb1 } = await twoSellersAndBuyer();
    const sellerSock = await socketFor(srv.url, a.token);
    sockets.push(sellerSock);
    const live = once(sellerSock, "order:update");

    const res = await request(srv.http).post("/api/orders").set(auth(buyer.token)).send({ ...contact, listingIds: [la1.id, la2.id, lb1.id] });
    expect(res.status).toBe(201);
    const orders = res.body.orders as OrderDTO[];
    expect(orders).toHaveLength(2);
    const toA = orders.find((o) => o.seller.id === a.sellerId)!;
    expect(toA).toMatchObject({ status: "PENDING", total: 230000, role: "BUYER", contact: { phone: "+2348012345678" } });
    expect(toA.code).toMatch(/^DRB-[A-Z2-9]{6}$/);
    expect(toA.items.map((i) => i.title).sort()).toEqual(["Fan A2", "Fridge A1"]);

    // the seller hears about it instantly
    expect((await live).code).toBe(toA.code);

    const sellerView = await request(srv.http).get("/api/orders/selling").set(auth(a.token));
    expect(sellerView.body.pending).toBe(1);
    expect(sellerView.body.items[0]).toMatchObject({ role: "SELLER", buyer: { name: "Test User" } });

    const chat = await request(srv.http).get(`/api/conversations/${toA.conversationId}/messages`).set(auth(a.token));
    expect(chat.body.items[0].body).toContain(toA.code);

    const bView = await request(srv.http).get("/api/orders/selling").set(auth(b.token));
    expect(bView.body.items).toHaveLength(1);
  });

  it("requires an address for delivery and refuses sold items", async () => {
    const { buyer, la1 } = await twoSellersAndBuyer();
    const noAddr = await request(srv.http).post("/api/orders").set(auth(buyer.token)).send({ ...contact, address: "", listingIds: [la1.id] });
    expect(noAddr.status).toBe(400);
    expect(noAddr.body.error.fields.address).toBeTruthy();
    const pickup = await request(srv.http).post("/api/orders").set(auth(buyer.token)).send({ ...contact, deliveryMethod: "PICKUP", address: undefined, listingIds: [la1.id] });
    expect(pickup.status).toBe(201);
  });

  it("walks the lifecycle: confirm → delivered marks items sold; only the right person can act", async () => {
    const { a, buyer, la1 } = await twoSellersAndBuyer();
    const order = (await request(srv.http).post("/api/orders").set(auth(buyer.token)).send({ ...contact, listingIds: [la1.id] })).body.orders[0] as OrderDTO;

    expect((await request(srv.http).post(`/api/orders/${order.id}/status`).set(auth(buyer.token)).send({ action: "confirm" })).status).toBe(403);
    expect((await request(srv.http).post(`/api/orders/${order.id}/status`).set(auth(a.token)).send({ action: "delivered" })).status).toBe(409);

    const confirmed = await request(srv.http).post(`/api/orders/${order.id}/status`).set(auth(a.token)).send({ action: "confirm" });
    expect(confirmed.body.status).toBe("CONFIRMED");
    const delivered = await request(srv.http).post(`/api/orders/${order.id}/status`).set(auth(buyer.token)).send({ action: "delivered" });
    expect(delivered.body.status).toBe("DELIVERED");

    const listing = await request(srv.http).get(`/api/listings/${la1.id}`);
    expect(listing.body.status).toBe("SOLD");
    const mine = await request(srv.http).get("/api/orders").set(auth(buyer.token));
    expect(mine.body.items[0]).toMatchObject({ status: "DELIVERED", rated: false });

    // and now the buyer can rate
    expect((await request(srv.http).post(`/api/sellers/${a.sellerId}/ratings`).set(auth(buyer.token)).send({ stars: 5 })).status).toBe(201);
    expect((await request(srv.http).get("/api/orders").set(auth(buyer.token))).body.items[0].rated).toBe(true);
  });

  it("buyers can cancel; outsiders can't see the order", async () => {
    const { buyer, la1 } = await twoSellersAndBuyer();
    const order = (await request(srv.http).post("/api/orders").set(auth(buyer.token)).send({ ...contact, listingIds: [la1.id] })).body.orders[0] as OrderDTO;
    const stranger = await signup(srv.http);
    expect((await request(srv.http).get(`/api/orders/${order.id}`).set(auth(stranger.token))).status).toBe(403);
    const cancelled = await request(srv.http).post(`/api/orders/${order.id}/status`).set(auth(buyer.token)).send({ action: "cancel" });
    expect(cancelled.body.status).toBe("CANCELLED");
  });
});
