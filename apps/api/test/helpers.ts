import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { io as connect, type Socket } from "socket.io-client";
import type { AuthResponse, ClientToServerEvents, ServerToClientEvents } from "@droba/shared";
import { createApp } from "../src/app.js";
import { attachSocket } from "../src/realtime/socket.js";
import { outbox } from "../src/lib/email.js";
import { prisma } from "../src/lib/prisma.js";
import { redis } from "../src/lib/redis.js";

export interface TestServer {
  http: Server;
  url: string;
  close: () => Promise<void>;
}

export async function startServer(): Promise<TestServer> {
  const http = createServer(createApp());
  const rt = attachSocket(http);
  await new Promise<void>((r) => http.listen(0, r));
  const url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  return {
    http,
    url,
    async close() {
      await rt.close();
      await new Promise((r) => http.close(r));
    },
  };
}

export async function shutdownClients() {
  await prisma.$disconnect();
  redis.disconnect();
}

let n = 0;
export const uniq = (p = "u") => `${p}${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export interface TestUser {
  token: string;
  cookie: string;
  user: AuthResponse["user"];
  email: string;
  password: string;
}

export function refreshCookie(res: request.Response): string {
  const set = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
  const c = set.find((x) => x.startsWith("droba_rt="));
  if (!c) throw new Error("no refresh cookie in response");
  return c.split(";")[0]!;
}

export async function signup(http: Server, over: Partial<{ name: string; email: string; password: string; city: string }> = {}): Promise<TestUser> {
  const email = over.email ?? `${uniq()}@test.droba.ng`;
  const password = over.password ?? "correct horse battery";
  const res = await request(http).post("/api/auth/signup").send({ name: over.name ?? "Test User", email, password, city: over.city ?? "Lagos" });
  if (res.status !== 201) throw new Error(`signup failed ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.accessToken, cookie: refreshCookie(res), user: res.body.user, email, password };
}

export function lastLink(to: string, path: string): string {
  const mail = [...outbox].reverse().find((m) => m.to === to && m.text.includes(path));
  if (!mail) throw new Error(`no ${path} email for ${to}`);
  return new URL(mail.text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;
}

export async function verifyEmail(http: Server, u: TestUser) {
  // Email is sent asynchronously; give the in-process outbox a tick
  await new Promise((r) => setTimeout(r, 20));
  const token = lastLink(u.email, "/verify-email");
  const res = await request(http).post("/api/auth/verify-email").send({ token });
  if (res.status !== 200) throw new Error(`verify failed ${res.status}`);
}

/** Signed-up, verified user with a free individual seller profile */
export async function seller(http: Server, city = "Lagos"): Promise<TestUser & { sellerId: string }> {
  const u = await signup(http, { city });
  await verifyEmail(http, u);
  const res = await request(http).post("/api/sellers").set("Authorization", `Bearer ${u.token}`).send({ type: "INDIVIDUAL", city });
  if (res.status !== 201) throw new Error(`seller failed ${res.status} ${JSON.stringify(res.body)}`);
  return { ...u, sellerId: res.body.seller.id };
}

export const photo = (i = 0) => ({ url: `https://images.unsplash.com/photo-15${i}?w=600` });

export function listingBody(over: Record<string, unknown> = {}) {
  return {
    title: "Samsung 450L fridge",
    description: "Cools well, tested",
    price: 250000,
    category: "Fridges",
    condition: "FIRST_GRADE",
    origin: "TOKUNBO",
    tested: true,
    photos: [photo()],
    ...over,
  };
}

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function socketFor(url: string, token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const s: ClientSocket = connect(url, { auth: { token }, transports: ["websocket"], reconnection: false, forceNew: true });
    s.once("connect", () => resolve(s));
    s.once("connect_error", (e) => reject(e));
  });
}

export function once<E extends keyof ServerToClientEvents>(s: ClientSocket, event: E, timeoutMs = 5000): Promise<Parameters<ServerToClientEvents[E]>[0]> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${String(event)}`)), timeoutMs);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s as any).once(event, (payload: any) => {
      clearTimeout(t);
      resolve(payload);
    });
  });
}
