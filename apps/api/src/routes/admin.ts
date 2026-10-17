import { Router } from "express";
import { z } from "zod";
import { LISTING_STATUSES, REPORT_STATUSES, adminReasonSchema, adminReportActionSchema, adminVerifySchema } from "@droba/shared";
import { parse } from "../lib/errors.js";
import { requireAdmin, requireAuth, userId } from "../middleware/auth.js";
import * as admin from "../services/admin.js";

/* Admin area. Every route needs a signed-in user whose role is ADMIN.
   Make someone an admin with: npm run make-admin -- their@email.com */
export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);
adminRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

const q = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : undefined);

adminRouter.get("/summary", async (_req, res) => {
  res.json(await admin.summary());
});

adminRouter.get("/actions", async (_req, res) => {
  res.json({ items: await admin.recentActions(100) });
});

adminRouter.get("/reports", async (req, res) => {
  const status = z.enum(REPORT_STATUSES).default("OPEN").parse(req.query.status ?? undefined);
  res.json({ items: await admin.listReports(status) });
});

adminRouter.post("/reports/:id", async (req, res) => {
  const { action, note } = parse(adminReportActionSchema, req.body);
  await admin.actOnReport(userId(req), String(req.params.id), action, note);
  res.json({ ok: true });
});

adminRouter.get("/verifications", async (_req, res) => {
  res.json({ items: await admin.listVerifications() });
});

adminRouter.post("/verifications/:sellerId", async (req, res) => {
  const { approve, reason } = parse(adminVerifySchema, req.body);
  await admin.decideVerification(userId(req), String(req.params.sellerId), approve, reason);
  res.json({ ok: true });
});

adminRouter.post("/sellers/:sellerId/unverify", async (req, res) => {
  const { reason } = parse(adminReasonSchema, req.body);
  await admin.revokeVerification(userId(req), String(req.params.sellerId), reason);
  res.json({ ok: true });
});

adminRouter.get("/users", async (req, res) => {
  res.json({ items: await admin.listUsers(q(req.query.q)) });
});

adminRouter.post("/users/:id/suspend", async (req, res) => {
  const { reason } = parse(adminReasonSchema, req.body);
  await admin.suspendUser(userId(req), String(req.params.id), reason);
  res.json({ ok: true });
});

adminRouter.post("/users/:id/unsuspend", async (req, res) => {
  await admin.unsuspendUser(userId(req), String(req.params.id));
  res.json({ ok: true });
});

adminRouter.get("/listings", async (req, res) => {
  const status = z.enum(LISTING_STATUSES).optional().parse(q(req.query.status));
  res.json({ items: await admin.listListings(q(req.query.q), status) });
});

adminRouter.post("/listings/:id/remove", async (req, res) => {
  const { reason } = parse(adminReasonSchema, req.body);
  await admin.removeListing(userId(req), String(req.params.id), reason);
  res.json({ ok: true });
});

adminRouter.post("/listings/:id/restore", async (req, res) => {
  await admin.restoreListing(userId(req), String(req.params.id));
  res.json({ ok: true });
});
