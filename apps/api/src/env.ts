import "./loadEnv.js";
import { z } from "zod";

const bool = z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  /** Comma-separated list of browser origins allowed to call the API with cookies */
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  WEB_URL: z.string().url().default("http://localhost:3000"),
  /** Public URL of this API (used for local uploads) */
  API_PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL_SEC: z.coerce.number().int().default(15 * 60),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().default(30),
  COOKIE_SECURE: bool.optional(),
  COOKIE_DOMAIN: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["console", "resend", "ses"]).default("console"),
  EMAIL_FROM: z.string().default("Droba <hello@droba.ng>"),
  RESEND_API_KEY: z.string().optional(),
  AWS_REGION: z.string().default("eu-west-2"),
  S3_BUCKET: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  /** Trust X-Forwarded-For from this many proxies (load balancer / Render / Fly) */
  TRUST_PROXY: z.coerce.number().int().default(1),
  RATE_LIMIT_DISABLED: bool.default("false"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:\n" + parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n"));
  process.exit(1);
}
export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === "production",
  isTest: parsed.data.NODE_ENV === "test",
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
  cookieSecure: parsed.data.COOKIE_SECURE ?? parsed.data.NODE_ENV === "production",
};
export type Env = typeof env;
