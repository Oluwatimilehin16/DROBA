"use client";
import Link from "next/link";
import { useState } from "react";
import { api, useAuth } from "@/lib/auth";
import { useStudio } from "@/lib/studio";
import { ApiError } from "@/lib/http";
import { compact, cx, naira } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { Empty } from "@/components/listing";
import { StudioHeader, Tabs, Thumb } from "@/components/studio-ui";

type Tab = "ACTIVE" | "DRAFT" | "SOLD";

export default function StudioListings() {
  const { user, reload } = useAuth();
  const { listings, removed, reloadListings } = useStudio();
  const [tab, setTab] = useState<Tab>("ACTIVE");
  const [toast, setToast] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const s = user!.seller!;

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
      await reloadListings();
      if (what === "boost" || what === "sold") void reload();
    } catch (e) {
      flash(e instanceof ApiError ? e.message : "Something went wrong");
    }
  };

  const count = (t: Tab) => listings?.filter((l) => l.status === t).length;
  const rows = (listings ?? []).filter((l) => l.status === tab && (!q || l.title.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <StudioHeader
        title="Listings"
        sub="Everything you're selling. Mark items sold when they're gone so buyers don't message you about them."
        actions={
          <Link href="/studio/new" className="btn btn-primary btn-sm">
            <Icon name="plus" size={16} />
            New listing
          </Link>
        }
      />
      {removed.length > 0 && (
        <div className="mb-5 grid gap-1.5 rounded-md bg-warn-bg px-4 py-3 text-[14px] text-warn">
          <b className="flex items-center gap-2">
            <Icon name="info" size={17} />
            Droba removed {removed.length === 1 ? "one of your listings" : `${removed.length} of your listings`}
          </b>
          <ul className="grid gap-0.5 pl-6">
            {removed.map((r) => (
              <li key={r.id}>
                “{r.title}”: {r.removedReason}
              </li>
            ))}
          </ul>
          <span className="pl-6">
            Check{" "}
            <Link href="/prohibited" className="font-semibold underline">
              what can&apos;t be sold
            </Link>{" "}
            before listing again. Think it&apos;s a mistake? Email hello@droba.ng.
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Tabs<Tab>
          tabs={[
            ["ACTIVE", "Live", count("ACTIVE")],
            ["DRAFT", "Drafts", count("DRAFT")],
            ["SOLD", "Sold", count("SOLD")],
          ]}
          value={tab}
          onChange={setTab}
        />
        <label className="mb-4 flex h-10 w-full items-center gap-2 rounded-full border-[1.5px] border-line bg-white px-3.5 focus-within:border-ink sm:w-64">
          <Icon name="search" size={16} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a listing" aria-label="Find a listing" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
        </label>
      </div>

      <div className="grid gap-2.5">
        {!listings ? (
          Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-20 rounded-lg" />)
        ) : !rows.length ? (
          <Empty
            title={q ? "No matches" : tab === "ACTIVE" ? "Nothing live yet" : tab === "DRAFT" ? "No drafts" : "Nothing sold yet"}
            body={!q && tab === "ACTIVE" ? "List your first item. It takes about a minute." : undefined}
            action={
              !q && tab === "ACTIVE" ? (
                <Link href="/studio/new" className="btn btn-primary">
                  List an item
                </Link>
              ) : undefined
            }
          />
        ) : (
          rows.map((l) => (
            <article key={l.id} className="grid grid-cols-[56px_1fr] items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-white p-3 sm:grid-cols-[64px_1fr_auto]">
              <Link href={l.status === "DRAFT" ? `/studio/new?edit=${l.id}` : `/listing/${l.id}`}>
                <Thumb src={l.photo} size={56} />
              </Link>
              <div className="min-w-0">
                <Link href={`/listing/${l.id}`} className="line-clamp-1 font-semibold text-oxblood hover:underline">
                  {l.title}
                </Link>
                <p className="flex flex-wrap items-center gap-x-3 text-[12.5px] text-muted">
                  <b className="font-display text-[14px] text-ink num">{naira(l.price)}</b>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="eye" size={13} />
                    {compact(l.views)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="heart" size={13} />
                    {compact(l.savesCount)}
                  </span>
                  {l.boosted && <span className="pill h-5 bg-blush text-[11px] text-red-deep">Boosted</span>}
                </p>
              </div>
              <div className="col-span-2 flex flex-wrap gap-1.5 sm:col-span-1 sm:justify-end">
                <Link href={`/studio/new?edit=${l.id}`} className="btn btn-ghost btn-sm">
                  Edit
                </Link>
                {l.status === "ACTIVE" && (
                  <>
                    {!l.boosted && s.boostCredits > 0 && (
                      <button type="button" className="btn btn-outline-red btn-sm" onClick={() => act(l.id, "boost")} title="Use 1 credit to boost for 7 days">
                        <Icon name="zap" size={15} />
                        Boost
                      </button>
                    )}
                    <button type="button" className="btn btn-dark btn-sm" onClick={() => act(l.id, "sold")}>
                      Mark sold
                    </button>
                  </>
                )}
                {l.status === "DRAFT" && user!.emailVerified && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => act(l.id, "publish")}>
                    Publish
                  </button>
                )}
                <button type="button" aria-label="Remove listing" className={cx("icon-btn size-9")} onClick={() => act(l.id, "remove")}>
                  <Icon name="trash" size={17} />
                </button>
              </div>
            </article>
          ))
        )}
      </div>
      {toast && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white shadow-[var(--shadow-2)] md:bottom-8">{toast}</div>}
    </>
  );
}
