"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, useAuth } from "@/lib/auth";
import { SITE_URL } from "@/lib/config";
import { cx } from "@/lib/format";
import { Icon } from "./Icon";

export function FollowButton({ sellerId, initial }: { sellerId: string; initial: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [on, setOn] = useState(initial);
  useEffect(() => {
    if (!user) return;
    api<{ seller: { isFollowing?: boolean } }>(`/sellers/${sellerId}`)
      .then((v) => setOn(!!v.seller.isFollowing))
      .catch(() => {});
  }, [user, sellerId]);
  if (user?.seller?.id === sellerId)
    return (
      <a href="/studio/storefront" className="btn btn-ghost btn-sm">
        Edit store
      </a>
    );
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cx("btn btn-sm", on ? "btn-ghost" : "btn-dark")}
      onClick={async () => {
        if (!user) return router.push(`/login?next=${pathname}`);
        setOn(!on);
        await api(`/sellers/${sellerId}/follow`, { method: on ? "DELETE" : "PUT" }).catch(() => setOn(on));
      }}
    >
      {on ? (
        <>
          <Icon name="check" size={15} />
          Following
        </>
      ) : (
        <>
          <Icon name="plus" size={15} />
          Follow
        </>
      )}
    </button>
  );
}

/** The store's own shareable link: droba.ng/<handle> */
export function ShareStoreLink({ handle, name }: { handle: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL.replace(/\/$/, "")}/${handle}`;
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        try {
          if (navigator.share) await navigator.share({ title: `${name} on Droba`, url });
          else {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        } catch {
          /* share sheet dismissed */
        }
      }}
    >
      <Icon name={copied ? "check" : "link"} size={15} />
      {copied ? "Link copied" : "Share store link"}
    </button>
  );
}

export function StoreSearch({ basePath, initial, category }: { basePath: string; initial: string; category?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      className="flex h-11 w-full max-w-md items-center gap-2 rounded-full border-[1.5px] border-line bg-cream pr-1.5 pl-4 focus-within:border-ink focus-within:bg-white"
      onSubmit={(e) => {
        e.preventDefault();
        const p = new URLSearchParams();
        if (q.trim()) p.set("q", q.trim());
        if (category) p.set("category", category);
        router.push(`${basePath}${p.size ? `?${p}` : ""}`);
      }}
    >
      <Icon name="search" size={16} className="text-muted" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this store" aria-label="Search this store" className="min-w-0 flex-1 bg-transparent outline-none" />
      <button className="btn btn-dark btn-sm h-8">Search</button>
    </form>
  );
}

export function StoreSort() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <select
      aria-label="Sort"
      className="input h-9 w-auto rounded-full text-[13.5px] font-semibold"
      value={sp.get("sort") ?? ""}
      onChange={(e) => {
        const p = new URLSearchParams(sp.toString());
        if (e.target.value) p.set("sort", e.target.value);
        else p.delete("sort");
        p.delete("page");
        router.push(`${pathname}?${p}`, { scroll: false });
      }}
    >
      <option value="">Newest</option>
      <option value="price_asc">Price: low to high</option>
      <option value="price_desc">Price: high to low</option>
    </select>
  );
}
