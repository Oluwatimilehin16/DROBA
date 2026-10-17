"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DEPARTMENTS, type SearchResponse } from "@droba/shared";
import { DEPT_IMG } from "@/lib/images";
import { api, useAuth } from "@/lib/auth";
import { firstName, greeting } from "@/lib/format";
import { useLocation } from "@/lib/location";
import { Icon, VerifiedSeal } from "@/components/Icon";
import { ListingGrid, SeeAll, SectionHead } from "@/components/listing";
import { useModeSwitch } from "@/components/chrome";

export function HomeGreeting() {
  const { user } = useAuth();
  const [hello, setHello] = useState<string | null>(null);
  useEffect(() => setHello(greeting()), []);
  if (!user || !hello) return <div className="h-5" />;
  return (
    <p className="eyebrow">
      {hello}, {firstName(user.name)}
    </p>
  );
}

export function SellCta() {
  const { go } = useModeSwitch();
  return (
    <button type="button" onClick={() => go("SELLER")} className="btn btn-light btn-lg">
      Sell something free
    </button>
  );
}

/** Items closest to the shopper: GPS if they allow it, else their saved city, else Lagos. */
export function NearYou() {
  const { place, locate, locating } = useLocation();
  const [data, setData] = useState<SearchResponse | null>(null);

  useEffect(() => {
    if (!place) return;
    const ctl = new AbortController();
    api<SearchResponse>(`/listings?lat=${place.lat}&lng=${place.lng}&sort=distance&limit=10`, { signal: ctl.signal })
      .then(setData)
      .catch(() => {});
    return () => ctl.abort();
  }, [place]);

  const label = place?.label ?? "you";
  return (
    <section className="mt-14 sm:mt-16">
      <SectionHead
        title={
          <>
            Near <span className="serif text-red">{label}</span>
          </>
        }
        sub="Closest first, so pickups and delivery are quick."
        action={<SeeAll href={place ? `/search?lat=${place.lat}&lng=${place.lng}&sort=distance` : "/search?sort=distance"} />}
      />
      {place?.source !== "gps" && (
        <button type="button" onClick={locate} disabled={locating} className="chip mb-5">
          <Icon name="pin" size={16} />
          {locating ? "Finding you…" : "Use my exact location"}
        </button>
      )}
      {data ? (
        <ListingGrid items={data.items} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton aspect-[4/5] rounded-md" />
          ))}
        </div>
      )}
    </section>
  );
}


/** Six departments, with the ones picked during sign-up ("What are you shopping for?") first */
export function CategoryTiles() {
  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => {
    try {
      setOrder(JSON.parse(localStorage.getItem("droba:interests") ?? "[]") as string[]);
    } catch {
      /* ignore */
    }
  }, []);
  const depts = [...DEPARTMENTS.filter((d) => order.includes(d.id)), ...DEPARTMENTS.filter((d) => !order.includes(d.id))].slice(0, 6);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {depts.map((d) => (
        <Link key={d.id} href={`/search?department=${d.id}`} className="group relative block aspect-[4/5] overflow-hidden rounded-md bg-cream-2 sm:aspect-[3/4]">
          <Image src={DEPT_IMG[d.id]!} alt="" fill sizes="(max-width: 640px) 50vw, 16vw" className="object-cover transition duration-500 group-hover:scale-105" />
          <span className="absolute inset-x-0 bottom-0 grid gap-0.5 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 text-white">
            <b className="font-display text-[16px] leading-tight">{d.label}</b>
            <small className="text-[12px] text-white/80">{d.blurb}</small>
          </span>
        </Link>
      ))}
    </div>
  );
}

export interface PopularStore {
  id: string;
  displayName: string;
  handle: string | null;
  city: string;
  area: string | null;
  verified: boolean;
  plan: "FREE" | "PREMIUM" | "BUSINESS";
  ratingAvg: number;
  soldCount: number;
  bannerUrl: string | null;
  logoUrl: string | null;
  thumbs: { id: string; photo: string | null }[];
}

function StoreCard({ s }: { s: PopularStore }) {
  return (
    <Link href={`/${s.handle}`} className="group flex w-[260px] shrink-0 flex-col overflow-hidden rounded-md border border-line bg-white transition hover:border-ink sm:w-auto">
      <span className="relative block h-24 bg-wine">{s.bannerUrl && <Image src={s.bannerUrl} alt="" fill sizes="300px" className="object-cover" />}</span>
      <span className="grid gap-1.5 p-3.5">
        <span className="flex items-center gap-1.5 font-display text-[16px] font-bold">
          <span className="truncate">{s.displayName}</span>
          {s.verified && <VerifiedSeal size={15} business={s.plan === "BUSINESS"} />}
        </span>
        <span className="flex flex-wrap gap-x-2.5 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1 font-semibold text-ink-2">
            <Icon name="star" size={13} className="fill-current text-red" />
            {s.ratingAvg.toFixed(1)}
          </span>
          <span>{s.soldCount.toLocaleString()} sold</span>
          <span className="truncate">{s.city}</span>
        </span>
        <span className="mt-1 grid grid-cols-3 gap-1.5">
          {s.thumbs.map((t) => (
            <span key={t.id} className="relative aspect-square overflow-hidden rounded-[8px] bg-cream-2">
              {t.photo && <Image src={t.photo} alt="" fill sizes="90px" className="object-cover" />}
            </span>
          ))}
        </span>
      </span>
    </Link>
  );
}

const FEEDS = [
  ["foryou", "For You", "Picked from what you shop for, with featured items first."],
  ["new", "New In", "Fresh listings from the last few days."],
  ["trending", "Trending", "Most saved right now."],
] as const;
type FeedKey = (typeof FEEDS)[number][0];

/** The main home feed: For You / New In / Trending, with Popular stores woven in like the prototype */
export function Feed({ stores }: { stores: PopularStore[] }) {
  const [tab, setTab] = useState<FeedKey>("foryou");
  const [pages, setPages] = useState<SearchResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  useEffect(() => {
    try {
      setInterests(JSON.parse(localStorage.getItem("droba:interests") ?? "[]") as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  const query = (page: number) => {
    const p = new URLSearchParams({ limit: "20", page: String(page) });
    if (tab === "new") p.set("sort", "newest");
    if (tab === "trending") p.set("sort", "popular");
    if (tab === "foryou" && interests.length) p.set("department", interests.join(","));
    return `/listings?${p}`;
  };

  useEffect(() => {
    let live = true;
    setLoading(true);
    setPages([]);
    api<SearchResponse>(query(1))
      .then((r) => live && setPages([r]))
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, interests.join(",")]);

  const more = async () => {
    setLoading(true);
    try {
      const r = await api<SearchResponse>(query(pages.length + 1));
      setPages((p) => [...p, r]);
    } finally {
      setLoading(false);
    }
  };

  const items = pages.flatMap((p) => p.items);
  const total = pages[0]?.total ?? 0;
  const info = FEEDS.find((f) => f[0] === tab)!;
  const seeAll = tab === "new" ? "/search?sort=newest" : tab === "trending" ? "/search?sort=popular" : interests.length ? `/search?department=${interests[0]}` : "/search";

  return (
    <section className="mt-14 sm:mt-16" id="feed">
      <div className="mb-2 flex items-end justify-between gap-4">
        <div role="tablist" aria-label="Feed" className="flex gap-1 rounded-full bg-cream-2 p-1">
          {FEEDS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-[14px] font-bold transition ${tab === k ? "bg-white text-ink shadow-[var(--shadow-1)]" : "text-ink-2"}`}>
              {label}
            </button>
          ))}
        </div>
        <SeeAll href={seeAll} />
      </div>
      <p className="mb-5 text-[14px] text-muted">{tab === "foryou" && !interests.length ? "Popular pre-loved finds across Droba. Featured items first." : info[2]}</p>

      {!items.length && loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="skeleton aspect-[4/5] rounded-md" />
          ))}
        </div>
      ) : (
        <>
          <ListingGrid items={items.slice(0, 10)} showDistance={false} />
          {tab === "foryou" && stores.length > 0 && (
            <div className="my-12 rounded-lg bg-cream p-5 sm:p-7">
              <SectionHead title="Popular stores" sub="Stores buyers keep coming back to." />
              <div className="scroll-x -mx-1 gap-3 px-1 pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-4">
                {stores.slice(0, 4).map((s) => (
                  <StoreCard key={s.id} s={s} />
                ))}
              </div>
            </div>
          )}
          {items.length > 10 && (
            <div className={tab === "foryou" && stores.length ? "" : "mt-7"}>
              <ListingGrid items={items.slice(10)} showDistance={false} />
            </div>
          )}
          {items.length < total && (
            <div className="mt-8 flex justify-center">
              <button type="button" onClick={more} disabled={loading} className="btn btn-outline">
                {loading ? "Loading…" : "Show more"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
