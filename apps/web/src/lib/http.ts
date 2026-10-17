import type { ApiError as ApiErrorBody } from "@droba/shared";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const e = (body as ApiErrorBody | undefined)?.error;
    throw new ApiError(res.status, e?.code ?? "HTTP_" + res.status, e?.message ?? "Something went wrong. Please try again.", e?.fields ?? {});
  }
  return body as T;
}

export function qs(params: Record<string, string | number | boolean | undefined | null | string[]>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) continue;
    u.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}
