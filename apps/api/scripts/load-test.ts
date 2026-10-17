/* Load test against a running API (npm run load -w @droba/api).
   1. N users sign up over HTTP at the same time (real scrypt hashing, real sessions)
   2. All N open a WebSocket and stay connected
   3. Paired up, everyone sends M chat messages at once; we time the ack and the delivery to the other person
   4. C concurrent clients hammer search (mixed queries, near-me, filters)
   Env: API_URL (default http://localhost:4000), USERS (1000), MESSAGES (5), SEARCH_REQUESTS (3000), CONCURRENCY (200) */
import "../src/loadEnv.js";
import { writeFileSync } from "node:fs";
import { io as connect, type Socket } from "socket.io-client";
import { PrismaClient } from "@prisma/client";
import type { ClientToServerEvents, MessageDTO, ServerToClientEvents } from "@droba/shared";

const API = process.env.API_URL ?? "http://localhost:4000";
const USERS = Number(process.env.USERS ?? 1000);
const MESSAGES = Number(process.env.MESSAGES ?? 5);
const SEARCHES = Number(process.env.SEARCH_REQUESTS ?? 3000);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 200);
const prisma = new PrismaClient();
type S = Socket<ServerToClientEvents, ClientToServerEvents>;

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? 0);
};
const stats = (xs: number[]) => ({ count: xs.length, p50: pct(xs, 50), p95: pct(xs, 95), p99: pct(xs, 99), max: Math.round(Math.max(0, ...xs)) });

async function pool<T>(items: T[], size: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) await fn(items[i++]!);
  }));
}

async function main() {
  const run = Date.now().toString(36);
  const report: Record<string, unknown> = { api: API, users: USERS, messagesPerUser: MESSAGES };

  // 1. Concurrent sign-ups
  const signupMs: number[] = [];
  let signupErrors = 0;
  const t1 = Date.now();
  const users = (
    await Promise.all(
      Array.from({ length: USERS }, async (_, i) => {
        const t = performance.now();
        const r = await fetch(`${API}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: `Load ${i}`, email: `load-${run}-${i}@load.droba.ng`, password: "load-test-password", city: i % 2 ? "Lagos" : "Abuja" }),
        }).catch(() => null);
        signupMs.push(performance.now() - t);
        if (!r || r.status !== 201) {
          signupErrors++;
          return null;
        }
        const body = (await r.json()) as { accessToken: string; user: { id: string } };
        return { token: body.accessToken, id: body.user.id };
      }),
    )
  ).filter((u): u is { token: string; id: string } => !!u);
  report.signup = { ...stats(signupMs), errors: signupErrors, wallMs: Date.now() - t1 };
  console.log("signup", report.signup);

  // Pair users into conversations (buyer i ↔ "seller" i+1)
  const pairs: { a: number; b: number; convo: string }[] = [];
  for (let i = 0; i + 1 < users.length; i += 2) {
    const c = await prisma.conversation.create({ data: { buyerId: users[i]!.id, sellerUserId: users[i + 1]!.id } });
    pairs.push({ a: i, b: i + 1, convo: c.id });
  }

  // 2. Everyone connects
  const t2 = Date.now();
  const connectMs: number[] = [];
  let connectErrors = 0;
  const sockets: (S | null)[] = await Promise.all(
    users.map(
      (u) =>
        new Promise<S | null>((resolve) => {
          const t = performance.now();
          const s: S = connect(API, { auth: { token: u.token }, transports: ["websocket"], reconnection: false, forceNew: true, timeout: 20000 });
          s.once("connect", () => {
            connectMs.push(performance.now() - t);
            resolve(s);
          });
          s.once("connect_error", () => {
            connectErrors++;
            resolve(null);
          });
        }),
    ),
  );
  report.connect = { ...stats(connectMs), errors: connectErrors, concurrentSockets: sockets.filter(Boolean).length, wallMs: Date.now() - t2 };
  console.log("connect", report.connect);

  // 3. Everyone chats at once
  const sentAt = new Map<string, number>();
  const ackMs: number[] = [];
  const deliveryMs: number[] = [];
  let ackErrors = 0;
  let delivered = 0;
  const expected = pairs.length * 2 * MESSAGES;
  const allDelivered = new Promise<void>((resolve) => {
    const done = setTimeout(resolve, 30000);
    sockets.forEach((s, idx) =>
      s?.on("message:new", (m: MessageDTO) => {
        if (m.senderId === users[idx]!.id || !m.clientId) return; // own echo
        const t = sentAt.get(m.clientId);
        if (t) deliveryMs.push(performance.now() - t);
        if (++delivered >= expected) {
          clearTimeout(done);
          resolve();
        }
      }),
    );
  });
  const t3 = Date.now();
  await Promise.all(
    pairs.flatMap((p) =>
      [p.a, p.b].flatMap((who) =>
        Array.from({ length: MESSAGES }, (_, k) => {
          const s = sockets[who];
          if (!s) return Promise.resolve();
          const clientId = `${run}-${who}-${k}`;
          const t = performance.now();
          sentAt.set(clientId, t);
          return new Promise<void>((resolve) =>
            s.timeout(20000).emit("message:send", { conversationId: p.convo, body: `hello ${k}`, clientId }, (err: Error | null, res?: { ok: boolean }) => {
              if (err || !res?.ok) ackErrors++;
              else ackMs.push(performance.now() - t);
              resolve();
            }),
          );
        }),
      ),
    ),
  );
  await allDelivered;
  const chatWall = Date.now() - t3;
  report.chat = { messages: expected, ack: stats(ackMs), delivery: stats(deliveryMs), delivered, ackErrors, wallMs: chatWall, messagesPerSec: Math.round((ackMs.length / chatWall) * 1000) };
  console.log("chat", report.chat);

  // 4. Search under load
  const queries = [
    "",
    "q=iphone",
    "q=fridge&sort=price_asc",
    "department=fashion&condition=LIKE_NEW,FIRST_GRADE",
    "lat=6.52&lng=3.38&sort=distance",
    "lat=9.07&lng=7.39&radiusKm=25",
    "q=sofa&city=Abuja",
    "q=genrator", // typo
    "department=phones&maxPrice=400000",
    "category=Sneakers&sort=newest",
  ];
  const searchMs: number[] = [];
  let searchErrors = 0;
  const t4 = Date.now();
  await pool(
    Array.from({ length: SEARCHES }, (_, i) => queries[i % queries.length]!),
    CONCURRENCY,
    async (qs) => {
      const t = performance.now();
      const r = await fetch(`${API}/api/listings?${qs}`).catch(() => null);
      if (!r || !r.ok) searchErrors++;
      else await r.arrayBuffer();
      searchMs.push(performance.now() - t);
    },
  );
  const searchWall = Date.now() - t4;
  report.search = { ...stats(searchMs), errors: searchErrors, concurrency: CONCURRENCY, wallMs: searchWall, requestsPerSec: Math.round((SEARCHES / searchWall) * 1000) };
  console.log("search", report.search);

  sockets.forEach((s) => s?.disconnect());
  await prisma.$disconnect();
  writeFileSync(process.env.LOAD_REPORT ?? "load-report.json", JSON.stringify(report, null, 2));
  const failed = signupErrors + connectErrors + ackErrors + searchErrors > 0 || delivered < expected;
  console.log(failed ? "LOAD TEST: FAILURES" : "LOAD TEST: OK");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
