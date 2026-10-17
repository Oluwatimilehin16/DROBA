import { Router } from "express";
import { z } from "zod";
import { ORDER_STATUSES, createOrderSchema, orderActionSchema } from "@droba/shared";
import { parse } from "../lib/errors.js";
import { rateLimit } from "../lib/rateLimit.js";
import { requireAuth, requireSeller, userId } from "../middleware/auth.js";
import { createOrders, getOrder, listBuyerOrders, listSellerOrders, pendingCount, updateOrder } from "../services/orders.js";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

/** Checkout: send order requests for everything in the bag (one per seller) */
ordersRouter.post("/", rateLimit({ name: "order", windowSec: 3600, max: 30, key: (r) => r.auth!.userId }), async (req, res) => {
  const input = parse(createOrderSchema, req.body);
  res.status(201).json({ orders: await createOrders(userId(req), input) });
});

/** My orders as a buyer */
ordersRouter.get("/", async (req, res) => {
  res.json({ items: await listBuyerOrders(userId(req)) });
});

/** Orders for my store / seller profile */
ordersRouter.get("/selling", async (req, res) => {
  const seller = await requireSeller(req, { verified: false });
  const status = z.enum(ORDER_STATUSES).optional().parse(req.query.status);
  const [items, pending] = await Promise.all([listSellerOrders(seller.userId, status), pendingCount(seller.userId)]);
  res.json({ items, pending });
});

ordersRouter.get("/:id", async (req, res) => {
  res.json(await getOrder(String(req.params.id), userId(req)));
});

ordersRouter.post("/:id/status", rateLimit({ name: "order-status", windowSec: 60, max: 30, key: (r) => r.auth!.userId }), async (req, res) => {
  const { action, reason } = parse(orderActionSchema, req.body);
  res.json(await updateOrder(String(req.params.id), userId(req), action, reason));
});
