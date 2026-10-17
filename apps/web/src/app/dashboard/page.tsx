"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PLAN_RULES, type ListingCard } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/http";
import { SITE_HOST } from "@/lib/config";
import { compact, cx, firstName, naira } from "@/lib/format";
import { Icon, type IconName } from "@/components/Icon";
import { Empty } from "@/components/listing";

type Row = ListingCard & { views: number; savesCount: number };
interface Data {
  items: Row[];
  stats: { active: number; sold: number; views: number; saves: number; chats: number; boostCredits: number };
}

const TABS = [
  ["ACTIVE", "Live"],
  ["DRAFT", "Drafts"],
  ["SOLD", "Sold"],
] as const;

export default function Dashboard() {
  const { user, ready, reload } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("ACTIVE");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => api<Data>("/me/listings").then(setData).catch(() => setData({ items: [], stats: { active: 0, sold: 0, views: 0, saves: 0, chats: 0, boostCredits: 0 } })), []);
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login?next=/dashboard");
    else if (!user.seller) router.replace("/seller/setup");
    else void load();
  }, [ready, user, router, load]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };
  const act = async (id: string, what: "sold" | "remove" | "boost" | "publish") => {
    try {
      if (what === "sold") await api(`/listings/${id}`, { method: "PATCH", body: { status: "SOLD" } });
      if (what === "publish") await api(`/listings/${id}`, { method: "PATCH", body: { status: "ACTIVE" } });
      if (what === "remove") {
        if (!confirm("Remove this listing? Buyers won't see it any more.")) return;
        await api(`/listings/${id}`, { method: "DELETE" });
      }
      if (what === "boost") await api(`/listings/${id}/boost`, { body: { days: 7 } });
      flash({ sold: "Marked as sold. Nice one!", remove: "Listing removed", boost: "Boosted for 7 days", publish: "Published" }[what]);
      await load();
      if (what === "boost" || what === "sold") void reload();
    } catch (e) {
      flash(e instanceof ApiError ? e.message : "Something went wrong");
    }
  };

  if (!user?.seller) return null;
  const s = user.seller;
  const rows = data?.items.filter((i) => i.status === tab) ?? [];
  const stat = (icon: IconName, value: string | number, label: string) => (
    <div className="grid gap-1 rounded-md border border-line bg-white p-4">
      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
        <Icon name={icon} size={15} />
        {label}
      </span>
      <b className="font-display text-[26px] leading-none num">{value}</b>
    </div>
  );

  return (
    <main className="wrap py-6 pb-28">
      {!user.emailVerified && (
        <p className="mb-5 flex items-center gap-2 rounded-md bg-warn-bg px-4 py-3 text-[14px] text-warn">
          <Icon name="info" />
          Confirm your email ({user.email}) to publish listings. Check your inbox for the link.
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">{PLAN_RULES[s.plan].label}</span>
          <h1 className="mt-1 text-[clamp(26px,3.6vw,36px)]">Hi {firstName(user.name)}</h1>
          {s.handle && (
            <Link href={`/${s.handle}`} className="link mt-1 text-[14px]">
              {SITE_HOST}/{s.handle}
              <Icon name="arrowR" size={14} />
            </Link>
          )}
        </div>
        <Link href="/sell" className="btn btn-primary">
          <Icon name="plus" size={18} />
          New listing
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stat("tag", data?.stats.active ?? "–", "Live listings")}
        {stat("eye", data ? compact(data.stats.views) : "–", "Views")}
        {stat("heart", data ? compact(data.stats.saves) : "–", "Saves")}
        {stat("msg", data?.stats.chats ?? "–", "Chats")}
        {stat("zap", s.boostCredits, "Boost credits")}
      </div>

      {s.plan === "FREE" && (
        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-md bg-wine p-5 text-white">
          <Icon name="store" size={26} className="text-accent-soft" />
          <div className="min-w-0 flex-1">
            <b className="font-display text-[17px]">Selling often? Open a store.</b>
            <p className="text-[14px] text-white/75">Your own link to share, 10+ photos per item and free monthly boosts.</p>
          </div>
          <Link href="/account#plan" className="btn btn-light btn-sm">
            See store plans
          </Link>
        </div>
      )}

      <div className="mt-8 flex items-center gap-2 border-b border-line">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx("-mb-px border-b-2 px-3 py-2.5 text-[14.5px] font-bold", tab === k ? "border-ink text-ink" : "border-transparent text-muted")}>
            {label} <span className="font-medium text-muted num">{data?.items.filter((i) => i.status === k).length ?? ""}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {!data ? (
          Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-24 rounded-md" />)
        ) : rows.length === 0 ? (
          <Empty title={tab === "ACTIVE" ? "Nothing live yet" : tab === "DRAFT" ? "No drafts" : "Nothing sold yet"} body={tab === "ACTIVE" ? "List your first item. It takes about a minute." : undefined} action={tab === "ACTIVE" ? <Link href="/sell" className="btn btn-primary">List an item</Link> : undefined} />
        ) : (
          rows.map((l) => (
            <article key={l.id} className="grid grid-cols-[72px_1fr] gap-3 rounded-md border border-line p-3 sm:grid-cols-[88px_1fr_auto] sm:items-center">
              <Link href={l.status === "DRAFT" ? `/sell?edit=${l.id}` : `/listing/${l.id}`} className="relative aspect-square overflow-hidden rounded-[10px] bg-cream-2">
                {l.photo && <Image src={l.photo} alt="" fill sizes="88px" className="object-cover" />}
              </Link>
              <div className="min-w-0">
                <Link href={`/listing/${l.id}`} className="line-clamp-1 font-display font-semibold text-oxblood">
                  {l.title}
                </Link>
                <p className="font-display font-bold num">{naira(l.price)}</p>
                <p className="flex flex-wrap gap-x-3 text-[12.5px] text-muted">
                  <span>{compact(l.views)} views</span>
                  <span>{compact(l.savesCount)} saves</span>
                  {l.boosted && <span className="font-bold text-red">Boosted</span>}
                </p>
              </div>
              <div className="col-span-2 flex flex-wrap gap-1.5 sm:col-span-1 sm:justify-end">
                <Link href={`/sell?edit=${l.id}`} className="btn btn-ghost btn-sm">
                  Edit
                </Link>
                {l.status === "ACTIVE" && (
                  <>
                    {!l.boosted && (
                      <button type="button" className="btn btn-outline-red btn-sm" onClick={() => act(l.id, "boost")} disabled={s.boostCredits < 1} title={s.boostCredits < 1 ? "No boost credits left" : "Use 1 credit to boost for 7 days"}>
                        <Icon name="zap" size={15} />
                        Boost
                      </button>
                    )}
                    <button type="button" className="btn btn-dark btn-sm" onClick={() => act(l.id, "sold")}>
                      Mark sold
                    </button>
                  </>
                )}
                {l.status === "DRAFT" && user.emailVerified && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => act(l.id, "publish")}>
                    Publish
                  </button>
                )}
                <button type="button" aria-label="Remove listing" className="icon-btn size-9" onClick={() => act(l.id, "remove")}>
                  <Icon name="trash" size={17} />
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {toast && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white shadow-[var(--shadow-2)] md:bottom-8">{toast}</div>}
    </main>
  );
}
