"use client";
import { api } from "./auth";

interface Presigned {
  uploadUrl: string;
  publicUrl: string;
  method: "PUT";
  headers: Record<string, string>;
}

/** Shrink photos in the browser before upload (max 1600px, JPEG ~85%): faster on mobile data, cheaper to store. */
async function compress(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** Presign → PUT straight to storage → return the public URL */
export async function uploadPhoto(file: File): Promise<string> {
  const body = await compress(file);
  const contentType = body.type === "image/png" || body.type === "image/webp" ? body.type : "image/jpeg";
  const p = await api<Presigned>("/uploads/presign", { body: { contentType, size: body.size } });
  const res = await fetch(p.uploadUrl, { method: "PUT", headers: { ...p.headers, "Content-Type": contentType }, body });
  if (!res.ok) throw new Error("Upload failed. Please try again.");
  return p.publicUrl;
}
