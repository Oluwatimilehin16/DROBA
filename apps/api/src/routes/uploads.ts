import express, { Router } from "express";
import { presignSchema } from "@droba/shared";
import { badRequest, forbidden, parse } from "../lib/errors.js";
import { rateLimit } from "../lib/rateLimit.js";
import { checkLocalSignature, presignUpload, writeLocal } from "../lib/storage.js";
import { requireAuth, userId } from "../middleware/auth.js";

export const uploadsRouter = Router();

/** Step 1: ask for a one-time upload URL. Step 2: PUT the image bytes there. Step 3: send publicUrl with the listing. */
uploadsRouter.post("/presign", requireAuth, rateLimit({ name: "presign", windowSec: 3600, max: 300, key: (r) => r.auth!.userId }), async (req, res) => {
  const input = parse(presignSchema, req.body);
  res.json(await presignUpload(userId(req), input.contentType));
});

/** Local stand-in for S3 when no bucket is configured (development and CI only) */
uploadsRouter.put("/local/*key", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "8mb" }), async (req, res) => {
  const key = ([] as string[]).concat((req.params as Record<string, string | string[]>).key ?? []).join("/");
  const { exp, sig, ct } = req.query as Record<string, string>;
  if (!exp || !sig || !ct || !checkLocalSignature(key, exp, sig, ct)) throw forbidden("Upload link expired");
  if (req.get("content-type") !== ct) throw badRequest("Content type doesn't match the upload link");
  if (!Buffer.isBuffer(req.body) || !req.body.length) throw badRequest("Empty upload");
  await writeLocal(key, req.body);
  res.status(200).end();
});
