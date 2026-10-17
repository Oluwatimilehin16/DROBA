"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminListingDTO, ListingStatus } from "@droba/shared";
import { api } from "@/lib/auth";
import { naira } from "@/lib/format";
import { Empty } from "@/components/listing";
import { StudioHeader, Tabs, Thumb } from "@/components/studio-ui";
import { ReasonAction, SearchBox } from "@/components/admin-ui";

type Filter = "" | ListingStatus;

export default function AdminListings() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Filter>("");
  const [items, setItems] = useState<AdminListingDTO[] | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      api<{ items: AdminListingDTO[] }>(`/admin/listings?q=${encodeURIComponent(q)}&status=${status}`)
        .then((r) => setItems(r.items))
        .catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, status, n]);
  const reload = () => setN((x) => x + 1);

  return (
    <>
      <StudioHeader title="Listings" sub="Search every listing on Droba. Removing one emails the seller your reason and links them to the prohibited items list." />
      <div className="mb-3">
        <SearchBox value={q} onChange={setQ} placeholder="Title, store name or listing ID" />
      </div>
      <Tabs<Filter>
        tabs={[
          ["", "All"],
          ["ACTIVE", "Live"],
          ["REMOVED", "Removed"],
          ["SOLD", "Sold"],
        ]}
        value={status}
        onChange={setStatus}
      />
      {!items ? (
        <div className="skeleton h-40 rounded-lg" />
      ) : !items.length ? (
        <Empty title="No listings found" />
      ) : (
        <ul className="grid gap-2">
          {items.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-3">
              <Thumb src={l.photo} size={52} />
              <span className="min-w-0 flex-1">
                <Link href={`/listing/${l.id}`} target="_blank" className="line-clamp-1 text-[14.5px] font-semibold hover:text-red">
                  {l.title}
                </Link>
                <span className="block text-[13px] text-muted num">
                  {naira(l.price)} · {l.seller.displayName}
                  {l.seller.suspended && " (suspended)"} · {l.status === "ACTIVE" ? "Live" : l.status.toLowerCase()}
                </span>
                {l.removedReason && <span className="block text-[12.5px] text-red-deep">Removed by Droba: {l.removedReason}</span>}
              </span>
              {l.reports > 0 && <span className="pill bg-warn-bg text-warn">{l.reports} report{l.reports === 1 ? "" : "s"}</span>}
              {l.status === "REMOVED" && l.removedReason ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    await api(`/admin/listings/${l.id}/restore`, { method: "POST" });
                    reload();
                  }}
                >
                  Restore
                </button>
              ) : l.status === "ACTIVE" ? (
                <div className="w-full sm:w-auto">
                  <ReasonAction
                    label="Remove"
                    placeholder="Reason the seller will see"
                    onConfirm={async (reason) => {
                      await api(`/admin/listings/${l.id}/remove`, { body: { reason } });
                      reload();
                    }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
