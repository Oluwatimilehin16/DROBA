import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { AdminReportDTO, AnalyticsDTO, BagItemDTO, Me } from "@droba/shared";
import { prisma } from "../src/lib/prisma.js";
import { outbox } from "../src/lib/email.js";
import { topUpCredits } from "../src/services/promotions.js";
import { listingBody, seller, shutdownClients, signup, startServer, uniq, verifyEmail, type TestServer, type TestUser } from "./helpers.js";

let srv: TestServer;
beforeAll(async () => void (srv = await startServer()));
afterAll(async () => {
  await srv.close();
  await shutdownClients();
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const tick = () => new Promise((r) => setTimeout(r, 30));

async function store(plan: "PREMIUM" | "BUSINESS"): Promise<TestUser & { sellerId: string; handle: string }> {
  const u = await signup(srv.http);
  await verifyEmail(srv.http, u);
  const handle = uniq("s").slice(0, 20);
  const res = await request(srv.http).post("/api/sellers").set(auth(u.token)).send({ type: "STORE", plan, storeName: `Store ${handle}`, handle, city: "Lagos" });
  if (res.status !== 201) throw new Error(`store failed ${res.status} ${JSON.stringify(res.body)}`);
  return { ...u, sellerId: res.body.seller.id, handle };
}

async function admin(): Promise<TestUser> {
  const u = await signup(srv.http);
  await prisma.user.update({ where: { email: u.email }, data: { role: "ADMIN" } });
  return u;
}

const list = async (u: TestUser, over: Record<string, unknown> = {}) => (await request(srv.http).post("/api/listings").set(auth(u.token)).send(listingBody(over))).body as { id: string };

describe("reports and the admin area", () => {
  it("keeps non-admins out", async () => {
    const u = await signup(srv.http);
    expect((await request(srv.http).get("/api/admin/summary").set(auth(u.token))).status).toBe(403);
    expect((await request(srv.http).get("/api/admin/summary")).status).toBe(401);
  });

  it("lets a buyer report a listing, and an admin remove it", async () => {
    const s = await seller(srv.http);
    const l = await list(s, { title: `Suspicious phone ${uniq()}` });
    const buyer = await signup(srv.http);
    const r1 = await request(srv.http).post("/api/reports").set(auth(buyer.token)).send({ listingId: l.id, reason: "SCAM", details: "Wants a deposit first" });
    expect(r1.status).toBe(201);
    // a second tap doesn't create a duplicate
    const r2 = await request(srv.http).post("/api/reports").set(auth(buyer.token)).send({ listingId: l.id, reason: "SCAM" });
    expect(r2.body.id).toBe(r1.body.id);
    // sellers can't report themselves
    expect((await request(srv.http).post("/api/reports").set(auth(s.token)).send({ listingId: l.id, reason: "SPAM" })).status).toBe(400);

    const a = await admin();
    const queue = (await request(srv.http).get("/api/admin/reports").set(auth(a.token))).body.items as AdminReportDTO[];
    const mine = queue.find((r) => r.id === r1.body.id)!;
    expect(mine).toMatchObject({ reason: "SCAM", listing: { id: l.id }, reporter: { email: buyer.email } });

    const act = await request(srv.http).post(`/api/admin/reports/${mine.id}`).set(auth(a.token)).send({ action: "remove_listing", note: "Asking for deposits" });
    expect(act.status).toBe(200);
    expect((await request(srv.http).get(`/api/listings/${l.id}`)).status).toBe(404);
    await tick();
    expect(outbox.some((m) => m.to === s.email && m.subject.includes("We removed"))).toBe(true);
    // the seller sees why in their Studio
    const studio = await request(srv.http).get("/api/me/listings").set(auth(s.token));
    expect(studio.body.removedByDroba[0]).toMatchObject({ id: l.id, removedReason: "Asking for deposits" });
    // and it's logged
    const summary = await request(srv.http).get("/api/admin/summary").set(auth(a.token));
    expect(summary.body.recent.some((x: { action: string; targetId: string }) => x.action === "report.remove_listing" && x.targetId === mine.id)).toBe(true);

    // restore puts it back
    expect((await request(srv.http).post(`/api/admin/listings/${l.id}/restore`).set(auth(a.token))).status).toBe(200);
    expect((await request(srv.http).get(`/api/listings/${l.id}`)).status).toBe(200);
  });

  it("suspends a seller: no login, items hidden, store gone; and lifts it", async () => {
    const st = await store("PREMIUM");
    const title = `Hidden jacket ${uniq()}`;
    const l = await list(st, { title, category: "Jackets", origin: undefined, tested: undefined });
    const a = await admin();
    expect((await request(srv.http).post(`/api/admin/users/${st.user.id}/suspend`).set(auth(a.token)).send({ reason: "Repeated scam reports" })).status).toBe(200);

    expect((await request(srv.http).post("/api/auth/login").send({ email: st.email, password: st.password })).status).toBe(403);
    expect((await request(srv.http).get("/api/me").set(auth(st.token))).status).toBe(401);
    expect((await request(srv.http).get(`/api/listings/${l.id}`)).status).toBe(404);
    expect((await request(srv.http).get(`/api/sellers/by-handle/${st.handle}`)).status).toBe(404);
    const search = await request(srv.http).get(`/api/listings?q=${encodeURIComponent(title)}`);
    expect(search.body.items.find((i: { id: string }) => i.id === l.id)).toBeUndefined();
    // admins can't be suspended by accident
    const other = await admin();
    expect((await request(srv.http).post(`/api/admin/users/${other.user.id}/suspend`).set(auth(a.token)).send({ reason: "test" })).status).toBe(403);

    expect((await request(srv.http).post(`/api/admin/users/${st.user.id}/unsuspend`).set(auth(a.token))).status).toBe(200);
    expect((await request(srv.http).post("/api/auth/login").send({ email: st.email, password: st.password })).status).toBe(200);
    expect((await request(srv.http).get(`/api/listings/${l.id}`)).status).toBe(200);
  });

  it("verifies a store after review", async () => {
    const st = await store("PREMIUM");
    const req1 = await request(srv.http).post("/api/sellers/me/verification").set(auth(st.token)).send({ note: "CAC BN 1234567, Instagram @mystore" });
    expect(req1.status).toBe(200);
    expect((req1.body as Me).seller!.verificationStatus).toBe("PENDING");
    const a = await admin();
    const q = await request(srv.http).get("/api/admin/verifications").set(auth(a.token));
    expect(q.body.items.some((v: { sellerId: string }) => v.sellerId === st.sellerId)).toBe(true);
    // rejecting needs a reason
    expect((await request(srv.http).post(`/api/admin/verifications/${st.sellerId}`).set(auth(a.token)).send({ approve: false })).status).toBe(400);
    expect((await request(srv.http).post(`/api/admin/verifications/${st.sellerId}`).set(auth(a.token)).send({ approve: true })).status).toBe(200);
    const pub = await request(srv.http).get(`/api/sellers/by-handle/${st.handle}`);
    expect(pub.body.seller.verified).toBe(true);
  });
});

describe("plan perks", () => {
  it("tops up monthly boost credits on the renewal date", async () => {
    const st = await store("PREMIUM");
    await prisma.seller.update({ where: { id: st.sellerId }, data: { boostCredits: 0, planRenewsAt: new Date(Date.now() - 3600_000) } });
    expect(await topUpCredits()).toBeGreaterThanOrEqual(1);
    const s = await prisma.seller.findUniqueOrThrow({ where: { id: st.sellerId } });
    expect(s.boostCredits).toBe(3);
    expect(s.planRenewsAt!.getTime()).toBeGreaterThan(Date.now() + 29 * 86400_000);
    // running again does nothing until next month
    await topUpCredits();
    expect((await prisma.seller.findUniqueOrThrow({ where: { id: st.sellerId } })).boostCredits).toBe(3);
  });

  it("runs Business campaigns and keeps them from other plans", async () => {
    const prem = await store("PREMIUM");
    const p1 = await list(prem);
    expect((await request(srv.http).post("/api/me/campaigns").set(auth(prem.token)).send({ kind: "PICKED", listingIds: [p1.id], days: 7 })).status).toBe(403);

    const biz = await store("BUSINESS");
    const fridge = await list(biz, { title: "Fridge one" });
    const fridge2 = await list(biz, { title: "Fridge two" });
    const sofa = await list(biz, { title: "Sofa", category: "Sofas", origin: undefined, tested: undefined });
    const res = await request(srv.http).post("/api/me/campaigns").set(auth(biz.token)).send({ kind: "CATEGORY", category: "Fridges", days: 7 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ label: "Fridges", listingCount: 2, active: true });
    const rows = await prisma.listing.findMany({ where: { id: { in: [fridge.id, fridge2.id, sofa.id] } } });
    expect(rows.filter((r) => r.boostedUntil && r.boostedUntil > new Date()).map((r) => r.title).sort()).toEqual(["Fridge one", "Fridge two"]);
    expect((await prisma.seller.findUniqueOrThrow({ where: { id: biz.sellerId } })).boostCredits).toBe(9);
    // nothing matching → no credit spent
    expect((await request(srv.http).post("/api/me/campaigns").set(auth(biz.token)).send({ kind: "UNDER_PRICE", maxPrice: 1000, days: 3 })).status).toBe(400);
    expect((await prisma.seller.findUniqueOrThrow({ where: { id: biz.sellerId } })).boostCredits).toBe(9);
  });

  it("gives Premium 30 days of analytics and Business 90 with breakdowns", async () => {
    const free = await seller(srv.http);
    expect((await request(srv.http).get("/api/me/analytics").set(auth(free.token))).status).toBe(403);

    const prem = await store("PREMIUM");
    const l = await list(prem);
    const viewer = await signup(srv.http);
    await request(srv.http).get(`/api/listings/${l.id}`).set(auth(viewer.token));
    await request(srv.http).put(`/api/listings/${l.id}/save`).set(auth(viewer.token));
    await new Promise((r) => setTimeout(r, 150)); // views are counted off the request path
    const a = (await request(srv.http).get("/api/me/analytics?days=90").set(auth(prem.token))).body as AnalyticsDTO;
    expect(a.days).toBe(30); // capped by the plan
    expect(a.series).toHaveLength(30);
    expect(a.totals).toMatchObject({ views: 1, saves: 1 });
    expect(a.listings[0]).toMatchObject({ id: l.id, views: 1, saves: 1 });
    expect(a.advanced).toBeNull();

    const biz = await store("BUSINESS");
    await list(biz);
    const b = (await request(srv.http).get("/api/me/analytics?days=90").set(auth(biz.token))).body as AnalyticsDTO;
    expect(b.days).toBe(90);
    expect(b.advanced?.weekdays).toHaveLength(7);
    expect(b.advanced?.categories[0]).toMatchObject({ category: "Fridges", listings: 1 });
  });

  it("shows business details only for Business stores", async () => {
    const prem = await store("PREMIUM");
    expect((await request(srv.http).patch("/api/sellers/me").set(auth(prem.token)).send({ openingHours: "9 to 5" })).status).toBe(403);
    const biz = await store("BUSINESS");
    const res = await request(srv.http).patch("/api/sellers/me").set(auth(biz.token)).send({ openingHours: "Mon–Sat, 9am – 6pm", deliveryAreas: "Lagos same day", storePolicy: "Test before you pay" });
    expect(res.status).toBe(200);
    const pub = await request(srv.http).get(`/api/sellers/by-handle/${biz.handle}`);
    expect(pub.body.seller.business).toMatchObject({ openingHours: "Mon–Sat, 9am – 6pm", deliveryAreas: "Lagos same day", shopAddress: null });
  });
});

describe("bag across devices", () => {
  it("keeps the bag on the account and clears ordered items", async () => {
    const s = await seller(srv.http);
    const l1 = await list(s, { title: "Bag item one" });
    const l2 = await list(s, { title: "Bag item two" });
    const buyer = await signup(srv.http);
    expect((await request(srv.http).put(`/api/me/bag/${l1.id}`).set(auth(buyer.token))).status).toBe(204);
    // signing in on another device merges that device's bag
    const merged = await request(srv.http).post("/api/me/bag/merge").set(auth(buyer.token)).send({ ids: [l2.id, "nope"] });
    expect((merged.body.items as BagItemDTO[]).map((i) => i.title)).toEqual(["Bag item one", "Bag item two"]);
    // you can't bag your own item
    await request(srv.http).put(`/api/me/bag/${l1.id}`).set(auth(s.token));
    expect((await request(srv.http).get("/api/me/bag").set(auth(s.token))).body.items).toHaveLength(0);

    const order = await request(srv.http).post("/api/orders").set(auth(buyer.token)).send({ deliveryMethod: "PICKUP", name: "Ada", phone: "0801 234 5678", city: "Lagos", listingIds: [l1.id] });
    expect(order.status).toBe(201);
    const after = await request(srv.http).get("/api/me/bag").set(auth(buyer.token));
    expect((after.body.items as BagItemDTO[]).map((i) => i.id)).toEqual([l2.id]);
  });
});
