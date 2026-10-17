import Image from "next/image";
import Link from "next/link";
import type { SearchResponse, SellerPublic } from "@droba/shared";
import { compact, cx, initials } from "@/lib/format";
import { qs } from "@/lib/http";
import { SITE_HOST } from "@/lib/config";
import { Icon, VerifiedSeal } from "./Icon";
import { ListingGrid, Empty } from "./listing";
import { FollowButton, ShareStoreLink, StoreSearch, StoreSort } from "./storefront-client";

export interface StoreView {
  seller: SellerPublic;
  collections: { category: string; count: number; cover: string | null }[];
  storeSearch: boolean;
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <span className="grid gap-0.5">
      <b className="font-display text-[17px] leading-none num">{value}</b>
      <span className="text-[12px] text-muted">{label}</span>
    </span>
  );
}

/** Store and seller pages share one layout: identity, a short stat row, collections, then items.
    Premium = banner + collections. Business adds in-store search and a darker verified seal. */
export function Storefront({ view, items, basePath, filters }: { view: StoreView; items: SearchResponse; basePath: string; filters: { q?: string; category?: string; sort?: string; page?: number } }) {
  const s = view.seller;
  const isStore = s.type === "STORE";
  const total = view.collections.reduce((a, c) => a + c.count, 0);
  const pages = Math.ceil(items.total / items.pageSize);
  const href = (patch: Record<string, string | number | undefined>) => `${basePath}${qs({ ...filters, page: undefined, ...patch })}`;

  return (
    <main className="pb-10">
      {isStore && (
        <div className="relative h-36 overflow-hidden bg-wine sm:h-52 lg:h-64">
          {s.bannerUrl && <Image src={s.bannerUrl} alt="" fill priority sizes="100vw" className="object-cover" />}
        </div>
      )}
      <div className="wrap">
        <section className={cx("grid gap-4 border-b border-line pb-5 sm:grid-cols-[auto_1fr_auto] sm:items-end", isStore ? "pt-0" : "pt-8")}>
          <span className={cx("relative z-10 grid size-20 shrink-0 place-items-center overflow-hidden rounded-[20px] border-4 border-white bg-blush font-display text-2xl font-extrabold text-red-deep shadow-[var(--shadow-1)] sm:size-24", isStore && "-mt-10 sm:-mt-12")}>
            {s.logoUrl ? <img src={s.logoUrl} alt="" className="size-full object-cover" /> : initials(s.displayName)}
          </span>
          <div className="grid min-w-0 gap-1.5">
            <h1 className="flex items-center gap-2 text-[clamp(24px,3vw,32px)]">
              <span className="truncate">{s.displayName}</span>
              {s.verified && <VerifiedSeal business={s.plan === "BUSINESS"} size={20} />}
            </h1>
            <p className="flex flex-wrap items-center gap-x-2 text-[13.5px] text-muted">
              <span className="font-semibold text-ink-2">{isStore ? (s.plan === "BUSINESS" ? "Business store" : "Premium store") : "Individual seller"}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Icon name="pin" size={13} />
                {[s.area, s.city].filter(Boolean).join(", ")}
              </span>
              {isStore && s.handle && (
                <>
                  <span>·</span>
                  <span>
                    {SITE_HOST}/{s.handle}
                  </span>
                </>
              )}
            </p>
            {s.bio && <p className="max-w-[70ch] text-[14.5px] text-ink-2">{s.bio}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FollowButton sellerId={s.id} initial={!!s.isFollowing} />
            {isStore && s.handle && <ShareStoreLink handle={s.handle} name={s.displayName} />}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 sm:col-span-3 sm:gap-x-7">
            <Stat value={s.ratingCount ? <span className="inline-flex items-center gap-1"><Icon name="star" size={15} className="fill-current text-red" />{s.ratingAvg.toFixed(1)}</span> : "New"} label={s.ratingCount ? `${compact(s.ratingCount)} ratings` : "No ratings yet"} />
            <Stat value={compact(s.soldCount)} label="sold" />
            <Stat value={total} label="items" />
            <Stat value={compact(s.followers)} label="followers" />
            <span className="hidden sm:grid">
              <Stat value={new Date(s.joinedAt).getFullYear()} label="on Droba since" />
            </span>
          </div>
        </section>

        {view.collections.length > 1 && (
          <nav aria-label="Collections" className="scroll-x mt-5 gap-3 pb-1">
            <Link href={href({ category: undefined })} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-center text-[12.5px] font-semibold">
              <span className={cx("grid aspect-square w-full place-items-center rounded-full border-2 bg-cream text-ink", !filters.category ? "border-ink" : "border-line")}>
                <Icon name="grid" />
              </span>
              All <span className="-mt-1.5 text-muted num">{total}</span>
            </Link>
            {view.collections.map((c) => (
              <Link key={c.category} href={href({ category: c.category })} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-center text-[12.5px] leading-tight font-semibold">
                <span className={cx("relative block aspect-square w-full overflow-hidden rounded-full border-2 bg-cream-2", filters.category === c.category ? "border-ink" : "border-line")}>
                  {c.cover && <Image src={c.cover} alt="" fill sizes="80px" className="object-cover" />}
                </span>
                <span className="line-clamp-2">{c.category}</span>
                <span className="-mt-1 text-muted num">{c.count}</span>
              </Link>
            ))}
          </nav>
        )}

        <div className="mt-5 mb-5 flex flex-wrap items-center justify-between gap-3">
          {view.storeSearch ? <StoreSearch basePath={basePath} initial={filters.q ?? ""} category={filters.category} /> : <h2 className="text-[20px]">{filters.category ?? "All items"}</h2>}
          <StoreSort />
        </div>

        {items.items.length ? (
          <ListingGrid items={items.items} priorityCount={4} showDistance={false} />
        ) : (
          <Empty title={filters.q ? `Nothing matching “${filters.q}”` : "No items here yet"} body={filters.q ? "Try another word, or browse all items in this store." : "Check back soon."} action={filters.q || filters.category ? <Link className="btn btn-dark" href={basePath}>See all items</Link> : undefined} />
        )}

        {pages > 1 && (
          <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-2">
            {(filters.page ?? 1) > 1 && (
              <Link href={href({ page: (filters.page ?? 1) - 1 })} className="btn btn-ghost btn-sm">
                Previous
              </Link>
            )}
            <span className="px-3 text-sm text-muted num">
              Page {filters.page ?? 1} of {pages}
            </span>
            {(filters.page ?? 1) < pages && (
              <Link href={href({ page: (filters.page ?? 1) + 1 })} className="btn btn-dark btn-sm">
                Next
              </Link>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
