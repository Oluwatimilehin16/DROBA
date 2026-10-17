"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Condition } from "@droba/shared";

/* The bag lives in this browser (localStorage), so it works before you log in and survives refreshes.
   Checkout turns it into order requests on the server, one per seller. */

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
  const [items, setItems] = useState<BagItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

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

  const add = useCallback((item: BagItem, openDrawer = true) => {
    setItems((cur) => (cur.some((i) => i.id === item.id) ? cur : [...cur, item]));
    if (openDrawer) setOpen(true);
  }, []);
  const remove = useCallback((id: string) => setItems((cur) => cur.filter((i) => i.id !== id)), []);
  const removeMany = useCallback((ids: string[]) => setItems((cur) => cur.filter((i) => !ids.includes(i.id))), []);

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
