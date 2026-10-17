"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, OrderDTO, ServerToClientEvents } from "@droba/shared";
import { SOCKET_URL } from "./config";
import { currentToken, useAuth } from "./auth";

export type DrobaSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface RealtimeState {
  socket: DrobaSocket | null;
  connected: boolean;
  unread: number;
}
const Ctx = createContext<RealtimeState>({ socket: null, connected: false, unread: 0 });

/** One socket per tab while signed in. Reconnects pick up the latest access token. */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<RealtimeState>({ socket: null, connected: false, unread: 0 });
  const [toast, setToast] = useState<OrderDTO | null>(null);

  useEffect(() => {
    if (!userId) {
      setState({ socket: null, connected: false, unread: 0 });
      return;
    }
    const s: DrobaSocket = io(SOCKET_URL || window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: (cb) => cb({ token: currentToken() }),
      reconnectionDelayMax: 8000,
    });
    setState((p) => ({ ...p, socket: s }));
    s.on("connect", () => setState((p) => ({ ...p, connected: true })));
    s.on("disconnect", () => setState((p) => ({ ...p, connected: false })));
    s.on("unread:count", ({ total }) => setState((p) => ({ ...p, unread: total })));
    // Optimistic badge bump; the exact total arrives again whenever a chat is read
    s.on("message:new", (m) => m.senderId !== userId && setState((p) => ({ ...p, unread: p.unread + 1 })));
    // Pop a notice when a buyer sends a new request, or a seller answers yours
    s.on("order:update", (o) => {
      const fresh = (o.role === "SELLER" && o.status === "PENDING") || (o.role === "BUYER" && o.status !== "PENDING" && o.status !== "CANCELLED");
      if (!fresh) return;
      setToast(o);
      setTimeout(() => setToast((t) => (t?.id === o.id ? null : t)), 7000);
    });
    s.on("connect_error", () => {
      // usually an expired access token: the auth provider refreshes it, the next retry picks it up
    });
    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
  }, [userId]);

  return (
    <Ctx.Provider value={state}>
      {children}
      {toast && (
        <Link
          href={toast.role === "SELLER" ? "/studio/orders" : "/orders"}
          onClick={() => setToast(null)}
          className="sheet-in fixed top-20 right-4 left-4 z-[70] mx-auto flex max-w-sm items-center gap-3 rounded-[16px] bg-ink px-4 py-3 text-white shadow-[var(--shadow-2)] sm:left-auto"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red text-[18px]">🛍️</span>
          <span className="min-w-0">
            <b className="block text-[14.5px]">
              {toast.role === "SELLER" ? "New order request" : toast.status === "CONFIRMED" ? `${toast.seller.displayName} confirmed your order` : toast.status === "DECLINED" ? `${toast.seller.displayName} declined your order` : "Order delivered"}
            </b>
            <span className="block truncate text-[13px] text-white/75">
              {toast.code} · {toast.items.map((i) => i.title).join(", ")}
            </span>
          </span>
        </Link>
      )}
    </Ctx.Provider>
  );
}

export const useRealtime = () => useContext(Ctx);
