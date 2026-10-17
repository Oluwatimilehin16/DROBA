"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { OrderDTO } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { useRealtime } from "@/lib/realtime";
import { cx } from "@/lib/format";
import { OrderCard } from "@/components/orders";
import { Empty } from "@/components/listing";

const TABS = [
  ["new", "New requests"],
  ["confirmed", "To deliver"],
  ["done", "Done"],
] as const;

/** Seller: incoming order requests. New ones appear live. */
export default function SellerOrders() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const { socket } = useRealtime();
  const [items, setItems] = useState<OrderDTO[] | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("new");

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login?next=/orders/selling");
    else if (!user.seller) router.replace("/seller/setup");
    else api<{ items: OrderDTO[] }>("/orders/selling").then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [ready, user, router]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (o: OrderDTO) => o.role === "SELLER" && setItems((cur) => (cur ? [o, ...cur.filter((x) => x.id !== o.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : cur));
    socket.on("order:update", onUpdate);
    return () => void socket.off("order:update", onUpdate);
  }, [socket]);

  if (!user?.seller) return null;
  const groups = {
    new: items?.filter((o) => o.status === "PENDING") ?? [],
    confirmed: items?.filter((o) => o.status === "CONFIRMED") ?? [],
    done: items?.filter((o) => ["DELIVERED", "DECLINED", "CANCELLED"].includes(o.status)) ?? [],
  };
  const list = groups[tab];

  return (
    <main className="wrap max-w-3xl py-6 pb-24">
      <h1 className="text-[clamp(26px,3.6vw,36px)]">Orders</h1>
      <p className="mt-1 text-muted">Confirm requests, then call or message the buyer to arrange delivery. They pay you when they receive the item. Droba doesn&apos;t handle payment or delivery.</p>
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx("-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[14.5px] font-bold", tab === k ? "border-ink" : "border-transparent text-muted")}>
            {label}
            {items && groups[k].length > 0 && <span className={cx("ml-1.5 rounded-full px-1.5 py-0.5 text-[11.5px] num", k === "new" ? "bg-red text-white" : "bg-cream-2 text-muted")}>{groups[k].length}</span>}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4">
        {!items ? (
          Array.from({ length: 2 }, (_, i) => <div key={i} className="skeleton h-56 rounded-lg" />)
        ) : list.length ? (
          list.map((o) => <OrderCard key={`${o.id}-${o.updatedAt}`} order={o} />)
        ) : (
          <Empty title={tab === "new" ? "No new requests" : tab === "confirmed" ? "Nothing waiting for delivery" : "No finished orders yet"} body={tab === "new" ? "When a buyer sends a request for your items, it appears here straight away." : undefined} />
        )}
      </div>
    </main>
  );
}
