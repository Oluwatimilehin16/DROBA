"use client";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { OrderDTO } from "@droba/shared";
import { api } from "@/lib/auth";
import { naira } from "@/lib/format";
import { Icon, VerifiedSeal, type IconName } from "@/components/Icon";
import { useRequireAuth } from "@/components/messages";

function Sent() {
  const user = useRequireAuth("/orders");
  const ids = (useSearchParams().get("ids") ?? "").split(",").filter(Boolean);
  const [orders, setOrders] = useState<OrderDTO[] | null>(null);
  useEffect(() => {
    if (!user || !ids.length) return;
    Promise.all(ids.map((id) => api<OrderDTO>(`/orders/${id}`).catch(() => null))).then((r) => setOrders(r.filter((x): x is OrderDTO => !!x)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ids.join(",")]);

  if (!user) return null;
  if (!orders) return <main className="wrap py-10"><div className="skeleton h-72 rounded-lg" /></main>;
  const many = orders.length > 1;
  const first = orders[0];
  const total = orders.reduce((t, o) => t + o.total, 0);
  const steps: [IconName, string, string][] = [
    ["msg", "Seller confirms", many ? "Each seller will call or message you, usually within a few hours." : `${first?.seller.displayName ?? "The seller"} will call or message you, usually within a few hours.`],
    ["truck", "Delivery or pickup", "Agree on a time, place and any delivery fee directly with the seller."],
    ["eye", "Inspect and test", "Check it matches the photos, grade and details."],
    ["cash", "Pay the seller", "Cash or transfer, directly to them, only when you're happy."],
    ["star", "Rate the seller", "Takes 10 seconds and helps every buyer after you."],
  ];

  return (
    <main className="wrap max-w-5xl py-6 pb-24">
      <section className="flex flex-col gap-4 rounded-lg bg-wine p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-white text-ok">
          <Icon name="check" size={32} strokeWidth={2.6} />
        </span>
        <div>
          <span className="eyebrow text-white/70">
            Request{many ? "s" : ""} sent · {orders.map((o) => o.code).join(", ")}
          </span>
          <h1 className="mt-1 text-[clamp(26px,3.6vw,38px)]">{many ? `Sent to ${orders.length} sellers.` : `Sent to ${first?.seller.displayName}.`}</h1>
          <p className="mt-1 text-white/80">
            You haven&apos;t paid anything. Keep your phone close: {many ? "each seller" : "the seller"} will contact you on <b className="text-white">{first?.contact.phone}</b>.
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-lg border border-line p-5 sm:p-6">
          <h2 className="mb-4 text-[19px]">What happens next</h2>
          <ol className="grid gap-0">
            {steps.map(([icon, title, body], i) => (
              <li key={title} className="relative flex gap-3 pb-5 last:pb-0">
                {i < steps.length - 1 && <span className="absolute top-9 bottom-0 left-[17px] w-px bg-line-2" />}
                <span className={`relative grid size-9 shrink-0 place-items-center rounded-full ${i === 0 ? "bg-red text-white" : "bg-cream-2 text-ink-2"}`}>
                  <Icon name={icon} size={17} />
                </span>
                <span className="pt-1">
                  <b className="flex items-center gap-2">
                    {title}
                    {i === 0 && <span className="pill h-5 bg-blush text-[11px] text-red-deep">Next</span>}
                  </b>
                  <span className="text-[14px] text-muted">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
        <aside className="grid content-start gap-4 rounded-lg border border-line p-5 sm:p-6">
          <h2 className="text-[19px]">Your request{many ? "s" : ""}</h2>
          {orders.map((o) => (
            <div key={o.id} className="grid gap-2 border-b border-line pb-4 last:border-0 last:pb-0">
              <div className="flex items-center gap-1.5 text-[14px] font-bold">
                <Icon name="store" size={15} />
                {o.seller.displayName}
                {o.seller.verified && <VerifiedSeal size={14} />}
                <span className="pill ml-auto h-5 bg-warn-bg text-[11px] text-warn">Waiting</span>
              </div>
              {o.items.map((it, i) => (
                <div key={i} className="flex items-center gap-2.5 text-[13.5px]">
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-[8px] bg-cream-2">{it.photo && <Image src={it.photo} alt="" fill sizes="40px" className="object-cover" />}</span>
                  <span className="line-clamp-1 flex-1">{it.title}</span>
                  <b className="num">{naira(it.price)}</b>
                </div>
              ))}
            </div>
          ))}
          <p className="flex items-center gap-1.5 text-[13.5px] text-muted">
            <Icon name="pin" size={15} />
            {first?.deliveryMethod === "PICKUP" ? `Pickup in ${first.contact.city}` : `${first?.contact.address}, ${first?.contact.city}`}
          </p>
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <b>Pay on delivery</b>
            <b className="font-display text-[20px] num">{naira(total)}</b>
          </div>
          <Link href="/orders" className="btn btn-primary w-full">
            Track my orders
          </Link>
          <Link href="/" className="btn btn-ghost w-full">
            Keep shopping
          </Link>
        </aside>
      </div>
      <p className="mt-6 flex gap-2 rounded-md bg-warn-bg px-4 py-3 text-[14px] text-warn">
        <Icon name="shield" size={18} className="mt-px" />
        If anyone asks you to pay before you&apos;ve seen the item, stop and report it to Droba.
      </p>
    </main>
  );
}

export default function SentPage() {
  return (
    <Suspense>
      <Sent />
    </Suspense>
  );
}
