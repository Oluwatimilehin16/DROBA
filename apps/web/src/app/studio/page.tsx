"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PLAN_DETAILS, type OrderDTO } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { useStudio } from "@/lib/studio";
import { SITE_HOST } from "@/lib/config";
import { ApiError } from "@/lib/http";
import { compact, firstName, greeting, naira } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { Kpi, Panel, QuickLink, StudioHeader, Thumb } from "@/components/studio-ui";

function RequestRow({ o }: { o: OrderDTO }) {
  const { upsertOrder } = useStudio();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const confirm = async () => {
    setBusy(true);
    try {
      upsertOrder(await api<OrderDTO>(`/orders/${o.id}/status`, { body: { action: "confirm" } }));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't confirm");
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <Thumb src={o.items[0]?.photo ?? null} size={48} />
      <div className="min-w-0 flex-1">
        <b className="line-clamp-1 text-[14.5px]">{o.items.map((i) => i.title).join(", ")}</b>
        <span className="text-[12.5px] text-muted">
          {o.buyer.name} · {o.contact.city} · {naira(o.total)}
        </span>
        {err && <span className="err block">{err}</span>}
      </div>
      <button type="button" onClick={confirm} disabled={busy} className="btn btn-primary btn-sm">
        <Icon name="check" size={15} />
        {busy ? "…" : "Confirm"}
      </button>
    </div>
  );
}

export default function StudioOverview() {
  const { user } = useAuth();
  const { listings, stats, orders, pending } = useStudio();
  const [hello, setHello] = useState("Hello");
  useEffect(() => setHello(greeting()), []);
  const s = user!.seller!;
  const store = s.type === "STORE";
  const plan = PLAN_DETAILS[s.plan];
  const newOrders = orders?.filter((o) => o.status === "PENDING") ?? [];
  const toDeliver = orders?.filter((o) => o.status === "CONFIRMED").length ?? 0;
  const top = (listings ?? []).filter((l) => l.status === "ACTIVE").sort((a, b) => b.views - a.views).slice(0, 4);

  return (
    <>
      <StudioHeader
        eyebrow={`${hello}, ${firstName(user!.name)}`}
        title={pending ? `${pending} new order request${pending > 1 ? "s" : ""}` : "No new requests right now"}
        actions={
          <>
            <Link href={s.handle ? `/${s.handle}` : `/seller/${s.id}`} className="btn btn-ghost btn-sm">
              <Icon name="eye" size={16} />
              {store ? "View store" : "View profile"}
            </Link>
            <Link href="/studio/new" className="btn btn-primary btn-sm">
              <Icon name="plus" size={16} />
              New listing
            </Link>
          </>
        }
      />

      {!user!.emailVerified && (
        <p className="mb-5 flex items-center gap-2 rounded-md bg-warn-bg px-4 py-3 text-[14px] text-warn">
          <Icon name="info" />
          Confirm your email ({user!.email}) to publish listings. Check your inbox for the link.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon="tag" label="Live listings" value={stats?.active ?? "–"} />
        <Kpi icon="eye" label="Item views" value={stats ? compact(stats.views) : "–"} />
        <Kpi icon="heart" label="Saves" value={stats ? compact(stats.saves) : "–"} />
        <Kpi icon="star" label="Rating" value={s.ratingCount ? s.ratingAvg.toFixed(1) : "New"} hint={s.ratingCount ? `${compact(s.ratingCount)} ratings · ${compact(s.soldCount)} sold` : "Ratings appear after sales"} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-5">
          <Panel
            title="New order requests"
            action={
              <Link href="/studio/orders" className="link text-[13.5px]">
                {toDeliver ? `${toDeliver} to deliver` : "See all"}
                <Icon name="arrowR" size={14} />
              </Link>
            }
          >
            {!orders ? (
              <div className="skeleton m-5 h-16 rounded-md" />
            ) : newOrders.length ? (
              <div className="divide-y divide-line">
                {newOrders.slice(0, 4).map((o) => (
                  <RequestRow key={`${o.id}-${o.updatedAt}`} o={o} />
                ))}
              </div>
            ) : (
              <p className="px-5 py-6 text-[14px] text-muted">Nothing waiting. Boost a listing to reach more buyers.</p>
            )}
          </Panel>

          <Panel
            title="Your top listings"
            action={
              <Link href="/studio/listings" className="link text-[13.5px]">
                Manage
                <Icon name="arrowR" size={14} />
              </Link>
            }
          >
            {!listings ? (
              <div className="skeleton m-5 h-32 rounded-md" />
            ) : top.length ? (
              <div className="divide-y divide-line">
                {top.map((l) => (
                  <Link key={l.id} href={`/listing/${l.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-cream">
                    <Thumb src={l.photo} size={48} />
                    <span className="min-w-0 flex-1">
                      <b className="line-clamp-1 text-[14.5px] text-oxblood">{l.title}</b>
                      <span className="text-[12.5px] text-muted num">{naira(l.price)}</span>
                    </span>
                    <span className="text-right text-[12.5px] text-muted num">
                      <span className="flex items-center justify-end gap-1">
                        <Icon name="eye" size={13} />
                        {compact(l.views)}
                      </span>
                      <span className="flex items-center justify-end gap-1">
                        <Icon name="heart" size={13} />
                        {compact(l.savesCount)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="grid justify-items-start gap-3 px-5 py-6">
                <p className="text-[14px] text-muted">No live listings yet. It takes about a minute to list something.</p>
                <Link href="/studio/new" className="btn btn-primary btn-sm">
                  List your first item
                </Link>
              </div>
            )}
          </Panel>
        </div>

        <div className="grid content-start gap-5">
          <section className="grid gap-3 rounded-lg bg-wine p-5 text-white">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-accent-soft">Your plan</span>
              <span className="pill bg-white/12 text-white">{plan.label}</span>
            </div>
            {store ? (
              <>
                <h3 className="text-[20px]">{s.plan === "BUSINESS" ? "Everything unlocked." : "Your store is live."}</h3>
                <div className="grid gap-1.5 text-[14px]">
                  <span className="flex justify-between">
                    <span className="text-white/75">Active listings</span>
                    <b className="num">{stats?.active ?? 0} · no limit</b>
                  </span>
                  <span className="flex justify-between">
                    <span className="text-white/75">Free boosts left</span>
                    <b className="num">{s.boostCredits}</b>
                  </span>
                  <span className="flex justify-between">
                    <span className="text-white/75">Store link</span>
                    <b className="truncate">
                      {SITE_HOST}/{s.handle}
                    </b>
                  </span>
                </div>
                {s.plan !== "BUSINESS" && (
                  <Link href="/studio/plan" className="btn btn-light w-full">
                    Go Business
                  </Link>
                )}
              </>
            ) : (
              <>
                <h3 className="text-[19px]">Selling often? Open a store.</h3>
                <ul className="grid gap-1.5 text-[14px] text-white/85">
                  {["Your own storefront and store link", "10 photos per item", "Analytics and 3 free boosts a month"].map((x) => (
                    <li key={x} className="flex gap-2">
                      <Icon name="check" size={16} className="mt-0.5 text-accent-soft" />
                      {x}
                    </li>
                  ))}
                </ul>
                <Link href="/studio/plan" className="btn btn-light w-full">
                  Open a store · {naira(PLAN_DETAILS.PREMIUM.priceNaira)}/mo
                </Link>
              </>
            )}
          </section>

          <Panel title="Quick actions">
            <div className="grid gap-2 p-4">
              <QuickLink href="/studio/new" icon="camera" label="List a new item" />
              <QuickLink href="/studio/promote" icon="zap" label="Boost a listing" />
              {store ? <QuickLink href="/studio/storefront" icon="link" label="Share your store link" /> : <QuickLink href="/studio/plan" icon="gem" label="Compare store plans" />}
              <QuickLink href="/messages" icon="msg" label="Messages from buyers" />
            </div>
          </Panel>

          <p className="flex gap-2 rounded-md bg-white px-4 py-3 text-[13.5px] text-ink-2">
            <Icon name="cash" size={18} className="mt-px text-ok" />
            <span>
              <b>Getting paid:</b> buyers pay you directly on delivery. Let them inspect and test first. Good ratings bring more buyers.
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
