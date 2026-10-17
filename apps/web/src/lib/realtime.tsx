"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@droba/shared";
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
    s.on("connect_error", () => {
      // usually an expired access token: the auth provider refreshes it, the next retry picks it up
    });
    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
  }, [userId]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useRealtime = () => useContext(Ctx);
