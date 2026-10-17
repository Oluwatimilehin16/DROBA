import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env.js";
import { hmac, randomToken, safeEqual } from "./crypto.js";

/* Photo uploads go straight from the browser to object storage (S3 or Cloudflare R2) via a
   short-lived presigned PUT, so image bytes never pass through the API.
   Without S3 settings (local dev, CI) the same flow targets a local PUT endpoint instead. */

export const LOCAL_DIR = resolve(process.cwd(), ".uploads");
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

let s3: S3Client | null = null;
const s3Configured = () => Boolean(env.S3_BUCKET);

export interface Presigned {
  uploadUrl: string;
  publicUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  key: string;
}

export async function presignUpload(userId: string, contentType: string): Promise<Presigned> {
  const key = `u/${userId}/${Date.now().toString(36)}-${randomToken(9)}.${EXT[contentType] ?? "bin"}`;
  if (s3Configured()) {
    s3 ??= new S3Client({
      region: env.AWS_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      credentials: env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY } : undefined,
    });
    const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }), { expiresIn: 300 });
    const base = env.S3_PUBLIC_URL ?? `https://${env.S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com`;
    return { uploadUrl, publicUrl: `${base.replace(/\/$/, "")}/${key}`, method: "PUT", headers: { "Content-Type": contentType }, key };
  }
  const exp = Math.floor(Date.now() / 1000) + 300;
  const sig = hmac(env.JWT_ACCESS_SECRET, `${key}:${exp}:${contentType}`);
  const qs = new URLSearchParams({ exp: String(exp), sig, ct: contentType });
  return {
    uploadUrl: `${env.API_PUBLIC_URL}/api/uploads/local/${key}?${qs}`,
    publicUrl: `${env.API_PUBLIC_URL}/media/${key}`,
    method: "PUT",
    headers: { "Content-Type": contentType },
    key,
  };
}

export function checkLocalSignature(key: string, exp: string, sig: string, ct: string): boolean {
  if (!/^u\/[\w-]+\/[\w.-]+$/.test(key) || +exp < Date.now() / 1000) return false;
  return safeEqual(sig, hmac(env.JWT_ACCESS_SECRET, `${key}:${exp}:${ct}`));
}

export async function writeLocal(key: string, body: Buffer) {
  const path = join(LOCAL_DIR, key);
  if (!path.startsWith(LOCAL_DIR)) throw new Error("bad key");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
}
