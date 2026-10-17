"use client";
import Image from "next/image";
import { useState } from "react";
import type { ListingPhoto } from "@droba/shared";
import { cx } from "@/lib/format";
import { Icon } from "@/components/Icon";

export function Gallery({ photos, title, sold }: { photos: ListingPhoto[]; title: string; sold: boolean }) {
  const [i, setI] = useState(0);
  const cur = photos[i];
  return (
    <div className="grid content-start gap-3 lg:sticky lg:top-24">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-cream-2 sm:aspect-square lg:aspect-[4/5]">
        {cur ? <Image src={cur.url} alt={cur.label ? `${title}: ${cur.label}` : title} fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" /> : <span className="absolute inset-0 grid place-items-center text-muted"><Icon name="camera" size={36} /></span>}
        {sold && <span className="absolute inset-0 grid place-items-center bg-ink/55 font-display text-4xl font-extrabold tracking-[.1em] text-white">SOLD</span>}
        {photos.length > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => setI((i - 1 + photos.length) % photos.length)} className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-[var(--shadow-1)]">
              <Icon name="chevL" />
            </button>
            <button type="button" aria-label="Next photo" onClick={() => setI((i + 1) % photos.length)} className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-[var(--shadow-1)]">
              <Icon name="chevR" />
            </button>
            <span className="absolute right-3 bottom-3 rounded-full bg-ink/70 px-2.5 py-1 text-[12px] font-bold text-white num">
              {i + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="scroll-x">
          {photos.map((p, k) => (
            <button key={p.url + k} type="button" onClick={() => setI(k)} aria-label={`Photo ${k + 1}`} className={cx("relative size-16 shrink-0 overflow-hidden rounded-[10px] border-2 sm:size-20", k === i ? "border-ink" : "border-transparent opacity-75")}>
              <Image src={p.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
