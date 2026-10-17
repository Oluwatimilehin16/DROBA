import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { listingBody, photo, seller, shutdownClients, signup, startServer, uniq, verifyEmail, type TestServer } from "./helpers.js";

let srv: TestServer;
beforeAll(async () => void (srv = await startServer()));
afterAll(async () => {
  await srv.close();
  await shutdownClients();
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("buyer / seller switch", () => {
  it("needs a seller profile before switching to seller view", async () => {
    const u = await signup(srv.http);
    const res = await request(srv.http).post("/api/me/mode").set(auth(u.token)).send({ mode: "SELLER" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("NEEDS_SELLER_PROFILE");
  });

  it("creating a seller profile switches to seller view; switching back keeps the profile", async () => {
    const s = await seller(srv.http);
    const me = await request(srv.http).get("/api/me").set(auth(s.token));
    expect(me.body.activeMode).toBe("SELLER");
    expect(me.body.seller).toMatchObject({ type: "INDIVIDUAL", plan: "FREE", handle: null });
    const back = await request(srv.http).post("/api/me/mode").set(auth(s.token)).send({ mode: "BUYER" });
    expect(back.body.activeMode).toBe("BUYER");
    expect(back.body.seller.id).toBe(s.sellerId);
  });

  it("requires a verified email to sell", async () => {
    const u = await signup(srv.http);
    await request(srv.http).post("/api/sellers").set(auth(u.token)).send({ type: "INDIVIDUAL", city: "Lagos" });
    const res = await request(srv.http).post("/api/listings").set(auth(u.token)).send(listingBody());
    expect(res.status).toBe(403);
  });
});

describe("stores and personal links", () => {
  it("creates a store with a personal link and serves it by handle", async () => {
    const u = await signup(srv.http);
    await verifyEmail(srv.http, u);
    const handle = uniq("shop").slice(0, 20);
    const res = await request(srv.http).post("/api/sellers").set(auth(u.token)).send({ type: "STORE", storeName: "Mama Put Closet", handle, plan: "BUSINESS", city: "Ibadan" });
    expect(res.status).toBe(201);
    expect(res.body.seller).toMatchObject({ handle, plan: "BUSINESS", boostCredits: 10 });
    await request(srv.http).post("/api/listings").set(auth(u.token)).send(listingBody({ category: "Dresses", condition: "LIKE_NEW", gender: "WOMEN", origin: undefined, tested: undefined }));
    const store = await request(srv.http).get(`/api/sellers/by-handle/${handle.toUpperCase()}`);
    expect(store.status).toBe(200);
    expect(store.body.seller.displayName).toBe("Mama Put Closet");
    expect(store.body.storeSearch).toBe(true);
    expect(store.body.collections).toEqual([{ category: "Dresses", count: 1, cover: expect.stringContaining("https://") }]);
  });

  it("rejects reserved and taken handles", async () => {
    expect((await request(srv.http).get("/api/sellers/handle-available?handle=messages")).body.available).toBe(false);
    const u = await signup(srv.http);
    await verifyEmail(srv.http, u);
    const handle = uniq("dup").slice(0, 20);
    await request(srv.http).post("/api/sellers").set(auth(u.token)).send({ type: "STORE", storeName: "One", handle, plan: "PREMIUM", city: "Lagos" });
    const v = await signup(srv.http);
    const res = await request(srv.http).post("/api/sellers").set(auth(v.token)).send({ type: "STORE", storeName: "Two", handle, plan: "PREMIUM", city: "Lagos" });
    expect(res.status).toBe(409);
    expect(res.body.error.fields.handle).toBeTruthy();
  });

  it("an individual can't have a store link without upgrading", async () => {
    const s = await seller(srv.http);
    expect((await request(srv.http).patch("/api/sellers/me").set(auth(s.token)).send({ handle: uniq("x").slice(0, 20) })).status).toBe(403);
    const up = await request(srv.http).post("/api/sellers/me/plan").set(auth(s.token)).send({ plan: "PREMIUM", storeName: "Upgraded", handle: uniq("up").slice(0, 20) });
    expect(up.status).toBe(200);
    expect(up.body.seller).toMatchObject({ type: "STORE", plan: "PREMIUM" });
  });
});

describe("listings", () => {
  it("free sellers get 4 photos per listing", async () => {
    const s = await seller(srv.http);
    const five = await request(srv.http).post("/api/listings").set(auth(s.token)).send(listingBody({ photos: [0, 1, 2, 3, 4].map(photo) }));
    expect(five.status).toBe(400);
    expect(five.body.error.fields.photos).toMatch(/4 photos/);
    const four = await request(srv.http).post("/api/listings").set(auth(s.token)).send(listingBody({ photos: [0, 1, 2, 3].map(photo) }));
    expect(four.status).toBe(201);
    expect(four.body.photos).toHaveLength(4);
    expect(four.body.department).toBe("appliances");
  });

  it("only the owner can edit; marking sold updates the seller's count", async () => {
    const s = await seller(srv.http);
    const other = await seller(srv.http);
    const l = (await request(srv.http).post("/api/listings").set(auth(s.token)).send(listingBody())).body;
    expect((await request(srv.http).patch(`/api/listings/${l.id}`).set(auth(other.token)).send({ price: 1000 })).status).toBe(403);
    const sold = await request(srv.http).patch(`/api/listings/${l.id}`).set(auth(s.token)).send({ status: "SOLD" });
    expect(sold.status).toBe(200);
    const mine = await request(srv.http).get("/api/me/listings").set(auth(s.token));
    expect(mine.body.stats.sold).toBe(1);
  });

  it("saves and unsaves", async () => {
    const s = await seller(srv.http);
    const b = await signup(srv.http);
    const l = (await request(srv.http).post("/api/listings").set(auth(s.token)).send(listingBody())).body;
    await request(srv.http).put(`/api/listings/${l.id}/save`).set(auth(b.token));
    await request(srv.http).put(`/api/listings/${l.id}/save`).set(auth(b.token)); // idempotent
    const saved = await request(srv.http).get("/api/me/saved").set(auth(b.token));
    expect(saved.body.items.map((i: { id: string }) => i.id)).toEqual([l.id]);
    const detail = await request(srv.http).get(`/api/listings/${l.id}`).set(auth(b.token));
    expect(detail.body).toMatchObject({ saved: true, savesCount: 1 });
    await request(srv.http).delete(`/api/listings/${l.id}/save`).set(auth(b.token));
    expect((await request(srv.http).get("/api/me/saved").set(auth(b.token))).body.items).toEqual([]);
  });
});

describe("search", () => {
  it("finds by text, tolerates typos, filters, and returns facets", async () => {
    const s = await seller(srv.http);
    const word = uniq("zq");
    await request(srv.http).post("/api/listings").set(auth(s.token)).send(listingBody({ title: `Kelvinator ${word} fridge`, condition: "LIKE_NEW", price: 300000 }));
    await request(srv.http).post("/api/listings").set(auth(s.token)).send(listingBody({ title: `Grey ${word} sofa`, category: "Sofas", condition: "FAIR", price: 90000, origin: undefined, tested: undefined }));

    const all = await request(srv.http).get("/api/listings").query({ q: word });
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(2);
    expect(all.body.facets.department).toEqual(expect.arrayContaining([{ value: "appliances", count: 1 }, { value: "furniture", count: 1 }]));

    const typo = await request(srv.http).get("/api/listings").query({ q: "Kelvinatr", sellerId: s.sellerId });
    expect(typo.body.items.map((i: { title: string }) => i.title)).toContain(`Kelvinator ${word} fridge`);

    const filtered = await request(srv.http).get("/api/listings").query({ q: word, department: "furniture" });
    expect(filtered.body.total).toBe(1);
    // the department facet ignores its own filter so the panel can still show the other option
    expect(filtered.body.facets.department).toHaveLength(2);

    const priced = await request(srv.http).get("/api/listings").query({ q: word, maxPrice: 100000, condition: "FAIR,FAIRLY_USED" });
    expect(priced.body.items).toHaveLength(1);
    expect(priced.body.items[0].category).toBe("Sofas");
  });

  it("near me: sorts by distance and limits by radius", async () => {
    const lagos = await seller(srv.http, "Lagos");
    const abuja = await seller(srv.http, "Abuja");
    const word = uniq("geo");
    await request(srv.http).post("/api/listings").set(auth(abuja.token)).send(listingBody({ title: `Abuja ${word} fridge` }));
    await request(srv.http).post("/api/listings").set(auth(lagos.token)).send(listingBody({ title: `Lekki ${word} fridge`, location: { lat: 6.4474, lng: 3.4723 } }));

    const near = await request(srv.http).get("/api/listings").query({ q: word, lat: 6.45, lng: 3.47, sort: "distance" });
    expect(near.body.items.map((i: { title: string }) => i.title)).toEqual([`Lekki ${word} fridge`, `Abuja ${word} fridge`]);
    expect(near.body.items[0].distanceM).toBeLessThan(2000);
    expect(near.body.items[1].distanceM).toBeGreaterThan(400_000);

    const radius = await request(srv.http).get("/api/listings").query({ q: word, lat: 6.45, lng: 3.47, radiusKm: 50 });
    expect(radius.body.total).toBe(1);

    const byCity = await request(srv.http).get("/api/listings").query({ q: word, city: "Abuja" });
    expect(byCity.body.items.map((i: { city: string }) => i.city)).toEqual(["Abuja"]);
  });

  it("serves cached pages consistently and reflects new listings at once", async () => {
    const s = await seller(srv.http);
    const word = uniq("cache");
    await request(srv.http).post("/api/listings").set(auth(s.token)).send(listingBody({ title: `First ${word}` }));
    expect((await request(srv.http).get("/api/listings").query({ q: word })).body.total).toBe(1);
    await request(srv.http).post("/api/listings").set(auth(s.token)).send(listingBody({ title: `Second ${word}` }));
    expect((await request(srv.http).get("/api/listings").query({ q: word })).body.total).toBe(2);
  });

  it("meta lists all 12 departments", async () => {
    const res = await request(srv.http).get("/api/meta");
    expect(res.body.departments).toHaveLength(12);
    expect(res.body.cities.length).toBeGreaterThan(10);
  });
});
