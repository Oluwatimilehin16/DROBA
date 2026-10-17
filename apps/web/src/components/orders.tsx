"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ORDER_STATUS_INFO, type OrderAction, type OrderDTO } from "@droba/shared";
import { api } from "@/lib/auth";
import { ApiError } from "@/lib/http";
import { ago, cx, naira } from "@/lib/format";
import { Icon, VerifiedSeal } from "./Icon";
import { RateSheet } from "./messages";

const TONE: Record<string, string> = { warn: "bg-warn-bg text-warn", info: "bg-info-bg text-info", ok: "bg-ok-bg text-ok", muted: "bg-cream-2 text-muted" };

export function StatusPill({ order }: { order: OrderDTO }) {
  const info = ORDER_STATUS_INFO[order.status];
  return <span className={cx("pill", TONE[info.tone])}>{order.role === "BUYER" ? info.buyerLabel : info.label}</span>;
}

/** One order request, for either side. Actions depend on who is looking and the current status. */
export function OrderCard({ order: initial, onChange }: { order: OrderDTO; onChange?: (o: OrderDTO) => void }) {
  const [order, setOrder] = useState(initial);
  const [busy, setBusy] = useState<OrderAction | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rating, setRating] = useState(false);
  const seller = order.role === "SELLER";

  const act = async (action: OrderAction) => {
    if (action === "decline" && !confirm("Decline this request? The buyer will be told in chat.")) return;
    if (action === "cancel" && !confirm("Cancel this request?")) return;
    setBusy(action);
    setErr(null);
    try {
      const o = await api<OrderDTO>(`/orders/${order.id}/status`, { body: { action } });
      setOrder(o);
      onChange?.(o);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="grid gap-4 rounded-lg border border-line p-4 sm:p-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusPill order={order} />
        <b className="font-mono text-[13px] tracking-wide">{order.code}</b>
        <span className="text-[12.5px] text-muted">{ago(order.createdAt)}</span>
        <span className="ml-auto font-display text-[18px] font-bold num">{naira(order.total)}</span>
      </header>

      <div className="flex items-center gap-1.5 text-[14px] font-bold">
        {seller ? (
          <>
            <Icon name="user" size={16} />
            {order.buyer.name}
          </>
        ) : (
          <Link href={order.seller.handle ? `/${order.seller.handle}` : `/seller/${order.seller.id}`} className="flex items-center gap-1.5 hover:underline">
            <Icon name="store" size={16} />
            {order.seller.displayName}
            {order.seller.verified && <VerifiedSeal size={14} business={order.seller.plan === "BUSINESS"} />}
          </Link>
        )}
      </div>

      <ul className="grid gap-2.5">
        {order.items.map((it, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-[10px] bg-cream-2">{it.photo && <Image src={it.photo} alt="" fill sizes="56px" className="object-cover" />}</span>
            {it.listingId ? (
              <Link href={`/listing/${it.listingId}`} className="line-clamp-2 min-w-0 flex-1 text-[14.5px] font-semibold text-oxblood hover:underline">
                {it.title}
              </Link>
            ) : (
              <span className="min-w-0 flex-1 text-[14.5px] font-semibold">{it.title}</span>
            )}
            <span className="font-display font-bold num">{naira(it.price)}</span>
          </li>
        ))}
      </ul>

      <div className="grid gap-1 rounded-md bg-cream px-4 py-3 text-[14px]">
        <span className="flex items-center gap-1.5 font-bold">
          <Icon name={order.deliveryMethod === "PICKUP" ? "pin" : "truck"} size={16} />
          {order.deliveryMethod === "PICKUP" ? `Buyer picks up in ${order.contact.city}` : `Deliver to ${order.contact.address}, ${order.contact.city}`}
        </span>
        {seller && (
          <span className="flex flex-wrap items-center gap-x-3">
            <span>{order.contact.name}</span>
            <a href={`tel:${order.contact.phone}`} className="link">
              {order.contact.phone}
            </a>
          </span>
        )}
        {order.contact.note && <span className="text-muted">Note: {order.contact.note}</span>}
      </div>

      {err && <p className="err">{err}</p>}

      <footer className="flex flex-wrap gap-2">
        {seller && order.status === "PENDING" && (
          <>
            <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => act("confirm")}>
              <Icon name="check" size={15} />
              {busy === "confirm" ? "Confirming…" : "Confirm"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => act("decline")}>
              Decline
            </button>
          </>
        )}
        {order.status === "CONFIRMED" && (
          <button type="button" className="btn btn-dark btn-sm" disabled={!!busy} onClick={() => act("delivered")}>
            <Icon name="box" size={15} />
            {busy === "delivered" ? "Saving…" : seller ? "Mark delivered" : "I've received it"}
          </button>
        )}
        {seller && order.status === "CONFIRMED" && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => act("decline")}>
            Can&apos;t fulfil
          </button>
        )}
        {!seller && (order.status === "PENDING" || order.status === "CONFIRMED") && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => act("cancel")}>
            Cancel request
          </button>
        )}
        {!seller && order.status === "DELIVERED" && !order.rated && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setRating(true)}>
            <Icon name="star" size={15} />
            Rate {order.seller.displayName}
          </button>
        )}
        {order.conversationId && (
          <Link href={`/messages/${order.conversationId}`} className="btn btn-ghost btn-sm">
            <Icon name="msg" size={15} />
            {seller ? "Message buyer" : "Message seller"}
          </Link>
        )}
      </footer>
      {rating && (
        <RateSheet
          sellerId={order.seller.id}
          name={order.seller.displayName}
          listingId={order.items[0]?.listingId ?? undefined}
          onClose={() => setRating(false)}
          onRated={() => setOrder((o) => ({ ...o, rated: true }))}
        />
      )}
    </article>
  );
}
