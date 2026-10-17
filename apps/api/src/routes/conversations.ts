import { Router } from "express";
import { sendMessageSchema, startConversationSchema } from "@droba/shared";
import { parse } from "../lib/errors.js";
import { rateLimit } from "../lib/rateLimit.js";
import { requireAuth, userId } from "../middleware/auth.js";
import { getConversation, isOnline, listConversations, listMessages, markRead, sendMessage, startConversation, unreadTotal, assertMember } from "../services/chat.js";

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

const msgLimit = rateLimit({ name: "msg", windowSec: 10, max: 20, key: (r) => r.auth!.userId });

conversationsRouter.get("/", async (req, res) => {
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  res.json(await listConversations(userId(req), cursor));
});

conversationsRouter.get("/unread", async (req, res) => {
  res.json({ total: await unreadTotal(userId(req)) });
});

/** "Message seller" on a listing: opens (or reuses) the chat and sends the first message */
conversationsRouter.post("/", msgLimit, async (req, res) => {
  const input = parse(startConversationSchema, req.body);
  res.status(201).json(await startConversation(userId(req), input.listingId, input.message));
});

conversationsRouter.get("/:id", async (req, res) => {
  const convo = await getConversation(req.params.id!, userId(req));
  res.json({ ...convo, counterpartOnline: await isOnline(convo.counterpart.userId) });
});

conversationsRouter.get("/:id/messages", async (req, res) => {
  const before = typeof req.query.before === "string" ? req.query.before : undefined;
  res.json(await listMessages(req.params.id!, userId(req), before));
});

/** REST fallback for sending (the web app normally sends over the socket) */
conversationsRouter.post("/:id/messages", msgLimit, async (req, res) => {
  const input = parse(sendMessageSchema, req.body);
  res.status(201).json(await sendMessage(req.params.id!, userId(req), input.body, input.clientId));
});

conversationsRouter.post("/:id/read", async (req, res) => {
  await assertMember(req.params.id!, userId(req));
  res.json({ readAt: (await markRead(req.params.id!, userId(req))).toISOString() });
});
