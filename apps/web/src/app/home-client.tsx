"use client";
import { useEffect, useState } from "react";
import type { SearchResponse } from "@droba/shared";
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

