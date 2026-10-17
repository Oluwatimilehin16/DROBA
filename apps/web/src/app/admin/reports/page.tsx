"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { REPORT_REASON_INFO, type AdminReportDTO, type ReportAction, type ReportStatus } from "@droba/shared";
import { api } from "@/lib/auth";
import { naira } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { Empty } from "@/components/listing";
import { StudioHeader, Tabs, Thumb } from "@/components/studio-ui";
import { ReasonAction, when } from "@/components/admin-ui";

export default function AdminReports() {
  const [status, setStatus] = useState<ReportStatus>("OPEN");
  const [items, setItems] = useState<AdminReportDTO[] | null>(null);
  const load = useCallback(() => {
    setItems(null);
    api<{ items: AdminReportDTO[] }>(`/admin/reports?status=${status}`)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [status]);
  useEffect(load, [load]);

  const act = async (id: string, action: ReportAction, note?: string) => {
    await api(`/admin/reports/${id}`, { body: { action, note: note || undefined } });
    load();
  };

  return (
    <>
      <StudioHeader title="Reports" sub="Oldest first. Removing a listing or suspending a seller closes every open report about them, and emails them the reason you give." />
      <Tabs<ReportStatus>
        tabs={[
          ["OPEN", "Open"],
          ["RESOLVED", "Acted on"],
          ["DISMISSED", "Dismissed"],
        ]}
        value={status}
        onChange={setStatus}
      />
      {!items ? (
        <div className="skeleton h-40 rounded-lg" />
      ) : !items.length ? (
        <Empty title={status === "OPEN" ? "No open reports" : "Nothing here"} body={status === "OPEN" ? "When a buyer reports a listing or seller, it shows up here." : undefined} />
      ) : (
        <div className="grid gap-3">
          {items.map((r) => (
            <article key={r.id} className="grid gap-3 rounded-lg border border-line bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill bg-blush text-red-deep">{REPORT_REASON_INFO[r.reason].label}</span>
                <span className="text-[13px] text-muted">
                  {r.listing ? "Listing" : "Seller"} · reported by {r.reporter.name} ({r.reporter.email}) · {when(r.createdAt)}
                </span>
                {r.sameTarget > 0 && <span className="pill bg-warn-bg text-warn">+{r.sameTarget} other open report{r.sameTarget === 1 ? "" : "s"}</span>}
                {r.seller.suspended && <span className="pill bg-ink text-white">Seller suspended</span>}
              </div>
              {r.details && <p className="rounded-md bg-cream px-3.5 py-2.5 text-[14px] text-ink-2">“{r.details}”</p>}
              <div className="flex flex-wrap items-center gap-3">
                {r.listing && (
                  <Link href={`/listing/${r.listing.id}`} target="_blank" className="flex min-w-0 items-center gap-3 rounded-[12px] border border-line p-2 pr-4 hover:border-ink">
                    <Thumb src={r.listing.photo} size={44} />
                    <span className="min-w-0">
                      <b className="line-clamp-1 text-[14px]">{r.listing.title}</b>
                      <span className="text-[12.5px] text-muted num">
                        {naira(r.listing.price)} · {r.listing.status === "ACTIVE" ? "Live" : r.listing.status.toLowerCase()}
                      </span>
                    </span>
                  </Link>
                )}
                <Link href={r.seller.handle ? `/${r.seller.handle}` : `/seller/${r.seller.id}`} target="_blank" className="inline-flex items-center gap-1.5 text-[14px] font-semibold hover:text-red">
                  <Icon name="store" size={16} />
                  {r.seller.displayName}
                  <span className="font-normal text-muted">· {r.seller.plan.toLowerCase()}</span>
                </Link>
              </div>
              {r.status === "OPEN" ? (
                <div className="flex flex-wrap items-start gap-2 border-t border-line pt-3">
                  <ReasonAction label="Dismiss" tone="ghost" optional placeholder="Why (optional), e.g. no problem found" onConfirm={(n) => act(r.id, "dismiss", n)} />
                  <ReasonAction label="Mark handled" tone="ghost" optional placeholder="What you did, e.g. warned the seller" onConfirm={(n) => act(r.id, "resolve", n)} />
                  {r.listing && r.listing.status !== "REMOVED" && <ReasonAction label="Remove listing" placeholder="Reason the seller will see" onConfirm={(n) => act(r.id, "remove_listing", n)} />}
                  {!r.seller.suspended && <ReasonAction label="Suspend seller" placeholder="Reason the seller will see" onConfirm={(n) => act(r.id, "suspend_seller", n)} />}
                </div>
              ) : (
                <p className="border-t border-line pt-3 text-[13.5px] text-muted">
                  {r.resolution}
                  {r.resolvedAt && ` · ${when(r.resolvedAt)}`}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
