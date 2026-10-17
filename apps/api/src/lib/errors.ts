import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from "./logger.js";

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) => new AppError(400, "BAD_REQUEST", message, fields);
export const unauthorized = (message = "Please log in") => new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You can't do that") => new AppError(403, "FORBIDDEN", message);
export const notFound = (what = "Not found") => new AppError(404, "NOT_FOUND", what);
export const conflict = (message: string, fields?: Record<string, string>) => new AppError(409, "CONFLICT", message, fields);

export function zodFields(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path.join(".") || "_";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

/** Parse with a zod schema or throw a 400 with per-field messages */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const r = schema.safeParse(data);
  if (!r.success) throw new AppError(400, "VALIDATION", "Please check the highlighted fields", zodFields(r.error));
  return r.data;
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(notFound("Route not found"));

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: "VALIDATION", message: "Invalid request", fields: zodFields(err) } });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found" } });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: { code: "TOO_LARGE", message: "That upload is too large" } });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "BAD_JSON", message: "Malformed JSON" } });
    return;
  }
  logger.error({ err, path: req.path }, "unhandled error");
  res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong on our side. Please try again." } });
};
