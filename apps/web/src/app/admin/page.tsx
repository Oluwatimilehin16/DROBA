"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminSummary } from "@droba/shared";
import { api } from "@/lib/auth";
import { compact } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { Kpi, Panel, StudioHeader } from "@/components/studio-ui";
import { when } from "@/components/admin-ui";

const ACTION_LABEL: Record<string, string> = {
  "report.dismiss": "Dismissed a report",
  "report.resolve": "Marked a report handled",
  "report.remove_listing": "Removed a reported listing",
  "report.suspend_seller": "Suspended a reported seller",
  "listing.remove": "Removed a listing",
  "listing.restore": "Restored a listing",
  "user.suspend": "Suspended an account",
  "user.unsuspend": "Lifted a suspension",
  "verification.approve": "Verified a store",
  "verification.reject": "Turned down a verification",
  "verification.revoke": "Took away a verified badge",
};

export default function AdminHome() {
  const [s, setS] = useState<AdminSummary | null>(null);
  useEffect(() => {
    api<AdminSummary>("/admin/summary")
      .then(setS)
      .catch(() => {});
  }, []);
  return (
    <>
      <StudioHeader eyebrow="Droba admin" title="Keeping Droba safe" sub="Reports from buyers, stores asking to be verified, and the people and listings behind them." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin/reports" className="flex items-center gap-4 rounded-lg bg-wine p-5 text-white transition hover:bg-wine-2">
          <Icon name="info" size={26} className="text-accent-soft" />
          <span className="flex-1">
            <b className="block font-display text-[30px] leading-none num">{s ? s.openReports : "–"}</b>
            <span className="text-[14px] text-white/75">open report{s?.openReports === 1 ? "" : "s"} to review</span>
          </span>
          <Icon name="chevR" />
        </Link>
        <Link href="/admin/verifications" className="flex items-center gap-4 rounded-lg bg-ink p-5 text-white transition hover:bg-wine-3">
          <Icon name="shield" size={26} className="text-accent-soft" />
          <span className="flex-1">
            <b className="block font-display text-[30px] leading-none num">{s ? s.pendingVerifications : "–"}</b>
            <span className="text-[14px] text-white/75">store{s?.pendingVerifications === 1 ? "" : "s"} waiting for verification</span>
          </span>
          <Icon name="chevR" />
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon="user2" label="People" value={s ? compact(s.users) : "–"} hint={s ? `+${s.newUsersWeek} this week` : undefined} />
        <Kpi icon="store" label="Sellers" value={s ? compact(s.sellers) : "–"} hint={s ? `${s.stores} stores` : undefined} />
        <Kpi icon="tag" label="Live listings" value={s ? compact(s.activeListings) : "–"} />
        <Kpi icon="box" label="Order requests" value={s ? compact(s.ordersWeek) : "–"} hint="last 7 days" />
      </div>
      {!!s?.suspended && (
        <p className="mt-3 text-[13.5px] text-muted">
          {s.suspended} suspended account{s.suspended === 1 ? "" : "s"}.{" "}
          <Link href="/admin/users" className="link">
            See people
          </Link>
        </p>
      )}
      <Panel title="Recent admin actions" className="mt-5">
        {!s ? (
          <div className="skeleton m-5 h-24 rounded-md" />
        ) : !s.recent.length ? (
          <p className="px-5 py-6 text-[14px] text-muted">Nothing yet. Every decision made here is logged with who made it and why.</p>
        ) : (
          <ul className="divide-y divide-line">
            {s.recent.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-5 py-3 text-[14px]">
                <span>
                  <b>{a.admin}</b> {(ACTION_LABEL[a.action] ?? a.action).toLowerCase()}
                  {a.note && <span className="text-muted">: “{a.note}”</span>}
                </span>
                <span className="text-[12.5px] text-muted">{when(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
