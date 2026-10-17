import "server-only";
import { API_INTERNAL } from "./config";
import { ApiError, parseResponse } from "./http";

/** Public API reads from server components. Cached briefly in Next's data cache. */
export async function serverGet<T>(path: string, revalidate = 30): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.INTERNAL_API_KEY) headers["x-internal-key"] = process.env.INTERNAL_API_KEY;
  const res = await fetch(`${API_INTERNAL}/api${path}`, { next: { revalidate }, headers });
  return parseResponse<T>(res);
}

/** Same, but returns null on 404 instead of throwing (for notFound() pages) */
export async function serverGetOrNull<T>(path: string, revalidate = 30): Promise<T | null> {
  try {
    return await serverGet<T>(path, revalidate);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** For sections that should degrade to empty rather than break the page */
export async function serverGetSafe<T>(path: string, fallback: T, revalidate = 30): Promise<T> {
  try {
    return await serverGet<T>(path, revalidate);
  } catch {
    return fallback;
  }
}
