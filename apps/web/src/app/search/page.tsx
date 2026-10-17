import type { Metadata } from "next";
import Link from "next/link";
import { departmentById, type SearchResponse } from "@droba/shared";
import { serverGet } from "@/lib/server";
import { qs } from "@/lib/http";
import { ListingGrid, Empty } from "@/components/listing";
import { Filters, FiltersButton, SortSelect, ActiveFilters, NearMeToggle } from "./filters";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const KEYS = ["q", "department", "category", "condition", "gender", "minPrice", "maxPrice", "city", "lat", "lng", "radiusKm", "sellerType", "verified", "tested", "sort", "page"] as const;

function title(sp: SP) {
  const q = one(sp.q);
  const cat = one(sp.category);
  const dept = one(sp.department);
  if (q) return `“${q}”`;
  if (cat) return cat;
  if (dept) return departmentById(dept)?.label ?? "Shop";
  if (one(sp.sort) === "distance" || one(sp.lat)) return "Near you";
  return "Shop everything";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  return { title: `${title(sp).replace(/[“”]/g, "")} · pre-loved`, robots: one(sp.q) ? { index: false } : undefined };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const params = Object.fromEntries(KEYS.map((k) => [k, one(sp[k])]));
  const limit = 24;
  let data: SearchResponse | null = null;
  let failed = false;
  try {
    data = await serverGet<SearchResponse>(`/listings${qs({ ...params, limit })}`, 15);
  } catch {
    failed = true;
  }
  const page = Number(params.page ?? 1);
  const pages = data ? Math.ceil(data.total / limit) : 0;
  const pageHref = (p: number) => `/search${qs({ ...params, page: p > 1 ? p : undefined })}`;

  return (
    <main className="wrap pt-6 pb-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(26px,3.4vw,38px)]">{title(sp)}</h1>
          {data && <p className="mt-1 text-muted num">{data.total.toLocaleString()} pre-loved {data.total === 1 ? "item" : "items"}</p>}
        </div>
        <div className="flex items-center gap-2">
          <NearMeToggle />
          <FiltersButton facets={data?.facets} />
          <SortSelect />
        </div>
      </div>
      <ActiveFilters />
      <div className="mt-4 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-36">
            <Filters facets={data?.facets} />
          </div>
        </aside>
        <section>
          {failed ? (
            <Empty title="We couldn't load listings" body="Please check your connection and try again." />
          ) : data && data.items.length ? (
            <>
              <ListingGrid items={data.items} priorityCount={4} />
              {pages > 1 && (
                <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-2">
                  {page > 1 && (
                    <Link href={pageHref(page - 1)} className="btn btn-ghost btn-sm">
                      Previous
                    </Link>
                  )}
                  <span className="px-3 text-sm text-muted num">
                    Page {page} of {pages}
                  </span>
                  {page < pages && (
                    <Link href={pageHref(page + 1)} className="btn btn-dark btn-sm">
                      Next
                    </Link>
                  )}
                </nav>
              )}
            </>
          ) : (
            <Empty
              title="No matches yet"
              body="Try fewer filters, a wider area, or a different word. New pre-loved items are listed every day."
              action={
                <Link href="/search" className="btn btn-primary">
                  Clear all filters
                </Link>
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}
