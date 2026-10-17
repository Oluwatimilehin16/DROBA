"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { BagItemDTO, Condition } from "@droba/shared";
import { api, useAuth } from "./auth";

/* The bag works before you log in (kept in this browser), and once you're signed in it's kept on your
   account too, so it follows you from phone to laptop. Signing in merges this browser's bag into the
   account's; logging out clears it from this browser. Checkout turns it into order requests, one per seller. */

export interface BagItem {
  id: string;
  title: string;
  price: number;
  photo: string | null;
  condition: Condition;
  city: string;
  seller: { id: string; displayName: string; verified: boolean };
}

interface CartState {
  items: BagItem[];
  open: boolean;
  setOpen: (v: boolean) => void;
  has: (id: string) => boolean;
  add: (item: BagItem, openDrawer?: boolean) => void;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
  total: number;
  /** Items grouped by seller, in the order they were added */
  groups: { seller: BagItem["seller"]; items: BagItem[] }[];
}

const KEY = "droba:bag:v1";
const Ctx = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const userId = user?.id ?? null;
  const [items, setItems] = useState<BagItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const syncedFor = useRef<string | null>(null);

  // Sign-in: merge this browser's bag into the account's. Sign-out: clear this browser's copy.
  useEffect(() => {
    if (!ready || !loaded) return;
    if (userId && syncedFor.current !== userId) {
      syncedFor.current = userId;
      api<{ items: BagItemDTO[] }>("/me/bag/merge", { body: { ids: itemsRef.current.map((i) => i.id) } })
        .then((r) => setItems(r.items))
        .catch(() => {});
    } else if (!userId && syncedFor.current) {
      syncedFor.current = null;
      setItems([]);
    }
  }, [ready, loaded, userId]);

  // Coming back to the tab picks up anything added on another device
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      api<{ items: BagItemDTO[] }>("/me/bag")
        .then((r) => setItems(r.items))
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId]);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(KEY) ?? "[]") as BagItem[]);
    } catch {
      /* empty bag */
    }
    setLoaded(true);
    // Keep tabs in sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setItems(JSON.parse(e.newValue ?? "[]") as BagItem[]);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* storage full or blocked */
    }
  }, [items, loaded]);

  const signedIn = !!userId;
  const add = useCallback(
    (item: BagItem, openDrawer = true) => {
      setItems((cur) => (cur.some((i) => i.id === item.id) ? cur : [...cur, item]));
      if (openDrawer) setOpen(true);
      if (signedIn) void api(`/me/bag/${item.id}`, { method: "PUT" }).catch(() => {});
    },
    [signedIn],
  );
  const removeMany = useCallback(
    (ids: string[]) => {
      setItems((cur) => cur.filter((i) => !ids.includes(i.id)));
      if (signedIn && ids.length) void api("/me/bag/remove", { body: { ids } }).catch(() => {});
    },
    [signedIn],
  );
  const remove = useCallback((id: string) => removeMany([id]), [removeMany]);

  const value = useMemo<CartState>(() => {
    const groups: CartState["groups"] = [];
    for (const it of items) {
      const g = groups.find((x) => x.seller.id === it.seller.id);
      if (g) g.items.push(it);
      else groups.push({ seller: it.seller, items: [it] });
    }
    return { items, open, setOpen, has: (id) => items.some((i) => i.id === id), add, remove, removeMany, total: items.reduce((t, i) => t + i.price, 0), groups };
  }, [items, open, add, remove, removeMany]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart outside CartProvider");
  return v;
}
