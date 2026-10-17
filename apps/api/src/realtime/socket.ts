import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { sendMessageSchema } from "@droba/shared";
import { env } from "../env.js";
import { logger } from "../lib/logger.js";
import { makeAdapterClients } from "../lib/redis.js";
import { allow } from "../lib/rateLimit.js";
import { AppError } from "../lib/errors.js";
import { sessionActive, verifyAccess } from "../services/sessions.js";
import { assertMember, isOnline, markRead, presenceDown, presenceRefresh, presenceUp, sendMessage, setIO, unreadTotal, userRoom, type IO } from "../services/chat.js";

/* Real-time layer.
   - Auth: the access token in the handshake (socket.io-client `auth: { token }`), checked against the live session.
   - Scale-out: the Redis adapter relays emits between API instances, so two people on different
     servers still chat instantly. Run as many instances as needed behind a load balancer
     (sticky sessions only matter if long-polling is enabled; the client uses WebSocket first).
   - Each user's sockets join "user:<id>" for delivery. Presence goes to "watch:<id>", joined only while
     a chat with that person is open, so 1,000 people coming online doesn't fan out a million events. */

const watchRoom = (userId: string) => `watch:${userId}`;
const errMsg = (e: unknown) => (e instanceof AppError ? e.message : "Something went wrong");

export function attachSocket(http: HttpServer) {
  const io: IO = new Server(http, {
    path: "/socket.io",
    cors: { origin: env.corsOrigins, credentials: true },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 64 * 1024,
  });
  const { pub, sub } = makeAdapterClients();
  io.adapter(createAdapter(pub, sub));

  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth as { token?: string })?.token;
      if (!token) return next(new Error("UNAUTHORIZED"));
      const c = verifyAccess(token);
      if (!(await sessionActive(c.sid, c.sub))) return next(new Error("UNAUTHORIZED"));
      socket.data.userId = c.sub;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.data.userId;
    void socket.join(userRoom(uid));

    socket.on("message:send", async (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      try {
        if (!(await allow("msg", uid, 10, 20))) return reply({ ok: false, error: "You're sending messages too fast" });
        const input = sendMessageSchema.parse({ body: payload?.body, clientId: payload?.clientId });
        const msg = await sendMessage(String(payload?.conversationId), uid, input.body, input.clientId);
        reply({ ok: true, data: msg });
      } catch (e) {
        reply({ ok: false, error: e instanceof Error && e.name === "ZodError" ? "Message can't be empty or over 2000 characters" : errMsg(e) });
      }
    });

    socket.on("conversation:join", async (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      try {
        const m = await assertMember(String(payload?.conversationId), uid);
        // Presence is only sent to people looking at a chat with that user, never broadcast to everyone
        for (const r of socket.rooms) if (r.startsWith("watch:")) void socket.leave(r);
        void socket.join(watchRoom(m.otherId));
        reply({ ok: true, data: { online: await isOnline(m.otherId) } });
      } catch (e) {
        reply({ ok: false, error: errMsg(e) });
      }
    });

    socket.on("conversation:read", async (payload) => {
      try {
        await markRead(String(payload?.conversationId), uid);
      } catch {
        /* ignore */
      }
    });

    socket.on("typing", async (payload) => {
      try {
        if (!(await allow("typing", uid, 5, 15))) return;
        const m = await assertMember(String(payload?.conversationId), uid);
        io.to(userRoom(m.otherId)).emit("typing", { conversationId: String(payload.conversationId), userId: uid, isTyping: !!payload.isTyping });
      } catch {
        /* ignore */
      }
    });

    // Bookkeeping runs after the handlers are attached, so events sent right after connecting aren't missed
    void (async () => {
      try {
        if (await presenceUp(uid, socket.id)) io.to(watchRoom(uid)).emit("presence", { userId: uid, online: true });
        socket.emit("unread:count", { total: await unreadTotal(uid) });
      } catch (e) {
        logger.warn({ err: (e as Error).message }, "socket connect bookkeeping failed");
      }
    })();

    socket.on("disconnect", async () => {
      try {
        if (await presenceDown(uid, socket.id)) io.to(watchRoom(uid)).emit("presence", { userId: uid, online: false });
      } catch {
        /* presence ages out on its own */
      }
    });
  });

  // Keep presence alive for sockets on this instance
  const heartbeat = setInterval(() => {
    const ids = [...new Set([...io.of("/").sockets.values()].map((s) => s.data.userId).filter(Boolean))];
    presenceRefresh(ids).catch(() => {});
  }, 50_000);
  heartbeat.unref();

  setIO(io);
  return {
    io,
    async close() {
      clearInterval(heartbeat);
      setIO(null);
      await new Promise<void>((r) => io.close(() => r()));
      // The adapter unsubscribes asynchronously on close; give it a moment before closing its connections
      await new Promise((r) => setTimeout(r, 200));
      await Promise.allSettled([pub.quit(), sub.quit()]);
    },
  };
}
