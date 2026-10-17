"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DEPARTMENTS, type SearchResponse } from "@droba/shared";
import { DEPT_IMG } from "@/lib/images";
import { api, useAuth } from "@/lib/auth";
import { firstName, greeting } from "@/lib/format";
import { useLocation } from "@/lib/location";
import { Icon } from "@/components/Icon";
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
