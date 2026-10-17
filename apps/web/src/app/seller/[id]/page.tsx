import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import type { SearchResponse } from "@droba/shared";
import { serverGet, serverGetOrNull } from "@/lib/server";
import { qs } from "@/lib/http";
import { Storefront, type StoreView } from "@/components/storefront";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const view = await serverGetOrNull<StoreView>(`/sellers/${(await params).id}`);
  return { title: view ? `${view.seller.displayName} · seller in ${view.seller.city}` : "Seller not found", robots: { index: false } };
}

/** Individual sellers get a simple profile (no banner, no personal link). Stores redirect to their link. */
export default async function SellerPage({ params, searchParams }: Props) {
  const { id } = await params;
  const view = await serverGetOrNull<StoreView>(`/sellers/${id}`);
  if (!view) notFound();
  if (view.seller.type === "STORE" && view.seller.handle) permanentRedirect(`/${view.seller.handle}`);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const items = await serverGet<SearchResponse>(`/listings${qs({ sellerId: id, category: sp.category, sort: sp.sort ?? "newest", page, limit: 24 })}`, 15);
  return (
    <Suspense>
      <Storefront view={{ ...view, storeSearch: false }} items={items} basePath={`/seller/${id}`} filters={{ category: sp.category, sort: sp.sort, page }} />
    </Suspense>
  );
}
