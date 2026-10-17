import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { lastLink, refreshCookie, shutdownClients, signup, startServer, uniq, verifyEmail, type TestServer } from "./helpers.js";

let srv: TestServer;
beforeAll(async () => void (srv = await startServer()));
afterAll(async () => {
  await srv.close();
  await shutdownClients();
});

describe("auth", () => {
  it("signs up, returns a token, a refresh cookie and the buyer view by default", async () => {
    const u = await signup(srv.http, { name: "Ada Obi", city: "Abuja" });
    expect(u.token).toBeTruthy();
    expect(u.cookie).toMatch(/^droba_rt=/);
    expect(u.user).toMatchObject({ name: "Ada Obi", city: "Abuja", activeMode: "BUYER", emailVerified: false, seller: null });
    expect(u.user.location).toEqual({ lat: 9.0765, lng: 7.3986 });
  });

  it("rejects bad input with per-field messages", async () => {
    const res = await request(srv.http).post("/api/auth/signup").send({ name: "A", email: "nope", password: "short" });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });

  it("rejects a duplicate email (case-insensitive)", async () => {
    const email = `${uniq()}@test.droba.ng`;
    await signup(srv.http, { email });
    const res = await request(srv.http).post("/api/auth/signup").send({ name: "Again", email: email.toUpperCase(), password: "another password" });
    expect(res.status).toBe(409);
  });

  it("logs in with the right password only", async () => {
    const u = await signup(srv.http);
    const bad = await request(srv.http).post("/api/auth/login").send({ email: u.email, password: "wrong password" });
    expect(bad.status).toBe(401);
    const unknown = await request(srv.http).post("/api/auth/login").send({ email: "nobody@test.droba.ng", password: "whatever123" });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.message).toBe(bad.body.error.message); // no account enumeration
    const ok = await request(srv.http).post("/api/auth/login").send({ email: u.email, password: u.password });
    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe(u.email);
  });

  it("protects /me and accepts the bearer token", async () => {
    expect((await request(srv.http).get("/api/me")).status).toBe(401);
    const u = await signup(srv.http);
    const me = await request(srv.http).get("/api/me").set("Authorization", `Bearer ${u.token}`);
    expect(me.status).toBe(200);
    expect(me.body.id).toBe(u.user.id);
  });

  it("rotates the refresh token and survives two tabs refreshing at once", async () => {
    const u = await signup(srv.http);
    const [a, b] = await Promise.all([
      request(srv.http).post("/api/auth/refresh").set("Cookie", u.cookie),
      request(srv.http).post("/api/auth/refresh").set("Cookie", u.cookie),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const next = refreshCookie(a);
    expect(next).not.toBe(u.cookie);
    const again = await request(srv.http).post("/api/auth/refresh").set("Cookie", next);
    expect(again.status).toBe(200);
  });

  it("logout ends the session immediately, even for unexpired access tokens", async () => {
    const u = await signup(srv.http);
    const out = await request(srv.http).post("/api/auth/logout").set("Cookie", u.cookie);
    expect(out.status).toBe(204);
    expect((await request(srv.http).get("/api/me").set("Authorization", `Bearer ${u.token}`)).status).toBe(401);
    expect((await request(srv.http).post("/api/auth/refresh").set("Cookie", u.cookie)).status).toBe(401);
  });

  it("verifies email from the emailed link, once", async () => {
    const u = await signup(srv.http);
    await verifyEmail(srv.http, u);
    const me = await request(srv.http).get("/api/me").set("Authorization", `Bearer ${u.token}`);
    expect(me.body.emailVerified).toBe(true);
    const reuse = await request(srv.http).post("/api/auth/verify-email").send({ token: lastLink(u.email, "/verify-email") });
    expect(reuse.status).toBe(400);
  });

  it("resets a forgotten password and signs out other sessions", async () => {
    const u = await signup(srv.http);
    const res = await request(srv.http).post("/api/auth/forgot-password").send({ email: u.email });
    expect(res.status).toBe(200);
    expect((await request(srv.http).post("/api/auth/forgot-password").send({ email: "ghost@test.droba.ng" })).status).toBe(200);
    await new Promise((r) => setTimeout(r, 20));
    const token = lastLink(u.email, "/reset-password");
    const reset = await request(srv.http).post("/api/auth/reset-password").send({ token, password: "a brand new password" });
    expect(reset.status).toBe(200);
    expect((await request(srv.http).get("/api/me").set("Authorization", `Bearer ${u.token}`)).status).toBe(401);
    expect((await request(srv.http).post("/api/auth/login").send({ email: u.email, password: "a brand new password" })).status).toBe(200);
  });

  it("handles 100 concurrent sign-ups without errors", async () => {
    const results = await Promise.all(
      Array.from({ length: 100 }, () => request(srv.http).post("/api/auth/signup").send({ name: "Load Test", email: `${uniq("c")}@test.droba.ng`, password: "load test password" })),
    );
    expect(results.filter((r) => r.status !== 201).map((r) => r.status)).toEqual([]);
  });
});
