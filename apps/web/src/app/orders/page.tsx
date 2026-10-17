"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { OrderDTO } from "@droba/shared";
import { api } from "@/lib/auth";
import { useRealtime } from "@/lib/realtime";
import { cx } from "@/lib/format";
import { useRequireAuth } from "@/components/messages";
import { OrderCard } from "@/components/orders";
import { Empty } from "@/components/listing";

/** Buyer: every request I've sent, live-updated when a seller confirms or declines */
export default function MyOrders() {
  const user = useRequireAuth("/orders");
  const { socket } = useRealtime();
  const [items, setItems] = useState<OrderDTO[] | null>(null);
  const [tab, setTab] = useState<"active" | "past">("active");

  useEffect(() => {
    if (user) api<{ items: OrderDTO[] }>("/orders").then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [user]);
  useEffect(() => {
    if (!socket) return;
    const onUpdate = (o: OrderDTO) => o.role === "BUYER" && setItems((cur) => (cur ? [o, ...cur.filter((x) => x.id !== o.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : cur));
    socket.on("order:update", onUpdate);
    return () => void socket.off("order:update", onUpdate);
  }, [socket]);

  if (!user) return null;
  const active = items?.filter((o) => o.status === "PENDING" || o.status === "CONFIRMED") ?? [];
  const past = items?.filter((o) => !active.includes(o)) ?? [];
  const list = tab === "active" ? active : past;

  return (
    <main className="wrap max-w-3xl py-6">
      <h1 className="text-[clamp(26px,3.6vw,36px)]">My orders</h1>
      <p className="mt-1 text-muted">Requests you&apos;ve sent. Sellers confirm and arrange delivery with you; you pay them when it arrives.</p>
      <div className="mt-5 flex gap-2 border-b border-line">
        {(
          [
            ["active", "In progress", active.length],
            ["past", "Completed & closed", past.length],
          ] as const
        ).map(([k, label, n]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx("-mb-px border-b-2 px-3 py-2.5 text-[14.5px] font-bold", tab === k ? "border-ink" : "border-transparent text-muted")}>
            {label} <span className="font-medium text-muted num">{items ? n : ""}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4">
        {!items ? (
          Array.from({ length: 2 }, (_, i) => <div key={i} className="skeleton h-56 rounded-lg" />)
        ) : list.length ? (
          list.map((o) => <OrderCard key={`${o.id}-${o.updatedAt}`} order={o} />)
        ) : (
          <Empty
            title={tab === "active" ? "No requests in progress" : "Nothing here yet"}
            body="Add items to your bag and send a request. The seller confirms and arranges delivery with you."
            action={
              <Link href="/search" className="btn btn-primary">
                Start shopping
              </Link>
            }
          />
        )}
      </div>
    </main>
  );
}
