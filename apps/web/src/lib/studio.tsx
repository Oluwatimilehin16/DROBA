"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ListingCard, OrderDTO } from "@droba/shared";
import { api } from "./auth";
import { useRealtime } from "./realtime";

export type StudioListing = ListingCard & { views: number; savesCount: number };
export interface StudioStats {
  active: number;
  sold: number;
  views: number;
  saves: number;
  chats: number;
  boostCredits: number;
}

interface StudioState {
  listings: StudioListing[] | null;
  stats: StudioStats | null;
  orders: OrderDTO[] | null;
  pending: number;
  reloadListings: () => Promise<void>;
  reloadOrders: () => Promise<void>;
  upsertOrder: (o: OrderDTO) => void;
}

const Ctx = createContext<StudioState | null>(null);

/** One fetch of the seller's listings and orders, shared by every Studio page; orders stay live over the socket */
export function StudioProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useRealtime();
  const [listings, setListings] = useState<StudioListing[] | null>(null);
  const [stats, setStats] = useState<StudioStats | null>(null);
  const [orders, setOrders] = useState<OrderDTO[] | null>(null);

  const reloadListings = useCallback(async () => {
    try {
      const r = await api<{ items: StudioListing[]; stats: StudioStats }>("/me/listings");
      setListings(r.items);
      setStats(r.stats);
    } catch {
      setListings([]);
    }
  }, []);
  const reloadOrders = useCallback(async () => {
    try {
      setOrders((await api<{ items: OrderDTO[] }>("/orders/selling")).items);
    } catch {
      setOrders([]);
    }
  }, []);
  const upsertOrder = useCallback((o: OrderDTO) => setOrders((cur) => (cur ? [o, ...cur.filter((x) => x.id !== o.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : cur)), []);

  useEffect(() => {
    void reloadListings();
    void reloadOrders();
  }, [reloadListings, reloadOrders]);

  useEffect(() => {
    if (!socket) return;
    const onOrder = (o: OrderDTO) => {
      if (o.role !== "SELLER") return;
      upsertOrder(o);
      if (o.status === "DELIVERED") void reloadListings();
    };
    socket.on("order:update", onOrder);
    return () => void socket.off("order:update", onOrder);
  }, [socket, upsertOrder, reloadListings]);

  const pending = orders?.filter((o) => o.status === "PENDING").length ?? 0;
  return <Ctx.Provider value={{ listings, stats, orders, pending, reloadListings, reloadOrders, upsertOrder }}>{children}</Ctx.Provider>;
}

export function useStudio() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStudio outside StudioProvider");
  return v;
}
