import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { handleSchema, type SearchResponse } from "@droba/shared";
import { serverGet, serverGetOrNull } from "@/lib/server";
import { qs } from "@/lib/http";
import { Storefront, type StoreView } from "@/components/storefront";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<Record<string, string | undefined>> };

async function load(raw: string) {
  const h = handleSchema.safeParse(decodeURIComponent(raw));
  if (!h.success) return null;
  return serverGetOrNull<StoreView>(`/sellers/by-handle/${h.data}`, 30);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const view = await load((await params).handle);
  if (!view) return { title: "Store not found" };
  const s = view.seller;
  const description = s.bio ?? `Pre-loved items from ${s.displayName} in ${s.city}. Shop on Droba and pay on delivery.`;
  return {
    title: `${s.displayName} (${s.city})`,
    description,
    alternates: { canonical: `/${s.handle}` },
    openGraph: { title: `${s.displayName} on Droba`, description, images: s.bannerUrl ? [{ url: s.bannerUrl }] : undefined },
  };
}

/** Personal store link: droba.ng/<handle> */
export default async function StorePage({ params, searchParams }: Props) {
  const view = await load((await params).handle);
  if (!view) notFound();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const sort = sp.sort ?? "newest";
  const filters = { q: view.storeSearch ? sp.q : undefined, category: sp.category, sort: sp.sort, page };
  const items = await serverGet<SearchResponse>(`/listings${qs({ sellerId: view.seller.id, q: filters.q, category: filters.category, sort, page, limit: 24 })}`, 15);
  return (
    <Suspense>
      <Storefront view={view} items={items} basePath={`/${view.seller.handle}`} filters={filters} />
    </Suspense>
  );
}
