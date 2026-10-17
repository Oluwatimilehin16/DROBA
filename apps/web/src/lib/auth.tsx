"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AuthResponse, Me, Mode } from "@droba/shared";
import { ApiError, parseResponse } from "./http";

/* Session handling in the browser
   - The access token lives only in memory (never localStorage), so XSS can't lift a long-lived credential.
   - The refresh token is an httpOnly cookie scoped to /api/auth on this origin; on page load we call
     /api/auth/refresh to restore the session, and again shortly before each access token expires.
   - api() adds the bearer token and transparently refreshes once on a 401. */

let accessToken: string | null = null;
let refreshing: Promise<AuthResponse | null> | null = null;
const listeners = new Set<(r: AuthResponse | null) => void>();

export const currentToken = () => accessToken;

async function doRefresh(): Promise<AuthResponse | null> {
  refreshing ??= (async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
      if (!res.ok) {
        accessToken = null;
        return null;
      }
      const r = (await res.json()) as AuthResponse;
      accessToken = r.accessToken;
      return r;
    } catch {
      return null;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  const r = await refreshing;
  listeners.forEach((l) => l(r));
  return r;
}

export interface RequestOpts {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

/** Authenticated call to the API from the browser */
export async function api<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const send = () =>
    fetch(`/api${path}`, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers: {
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: "include",
      signal: opts.signal,
    });
  let res = await send();
  if (res.status === 401 && !path.startsWith("/auth/")) {
    if (await doRefresh()) res = await send();
  }
  return parseResponse<T>(res);
}

interface AuthState {
  user: Me | null;
  ready: boolean;
  setUser: (u: Me | null) => void;
  login: (email: string, password: string) => Promise<Me>;
  signup: (input: { name: string; email: string; password: string; city?: string; phone?: string }) => Promise<Me>;
  logout: () => Promise<void>;
  reload: () => Promise<Me | null>;
  switchMode: (mode: Mode) => Promise<Me>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback((expiresIn: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void doRefresh(), Math.max(30, expiresIn - 60) * 1000);
  }, []);

  const accept = useCallback(
    (r: AuthResponse | null) => {
      if (r) {
        accessToken = r.accessToken;
        setUser(r.user);
        schedule(r.expiresIn);
      } else {
        accessToken = null;
        setUser(null);
      }
    },
    [schedule],
  );

  useEffect(() => {
    listeners.add(accept);
    void doRefresh().finally(() => setReady(true));
    return () => void listeners.delete(accept);
  }, [accept]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      setUser,
      async login(email, password) {
        const r = await api<AuthResponse>("/auth/login", { body: { email, password } });
        accept(r);
        return r.user;
      },
      async signup(input) {
        const r = await api<AuthResponse>("/auth/signup", { body: input });
        accept(r);
        return r.user;
      },
      async logout() {
        await api("/auth/logout", { method: "POST" }).catch(() => {});
        accept(null);
      },
      async reload() {
        try {
          const me = await api<Me>("/me");
          setUser(me);
          return me;
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) setUser(null);
          return null;
        }
      },
      async switchMode(mode) {
        const me = await api<Me>("/me/mode", { body: { mode } });
        setUser(me);
        return me;
      },
    }),
    [user, ready, accept],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
