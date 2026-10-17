"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PLAN_DETAILS, type AdminVerificationDTO } from "@droba/shared";
import { api } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { Empty } from "@/components/listing";
import { StudioHeader } from "@/components/studio-ui";
import { ReasonAction, when } from "@/components/admin-ui";

function Fact({ label, value, warn = false }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return (
    <span className="grid gap-0.5">
      <span className="text-[12px] text-muted">{label}</span>
      <b className={warn ? "text-red-deep" : ""}>{value}</b>
    </span>
  );
}

export default function AdminVerifications() {
  const [items, setItems] = useState<AdminVerificationDTO[] | null>(null);
  const load = useCallback(() => {
    api<{ items: AdminVerificationDTO[] }>("/admin/verifications")
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);
  const decide = async (sellerId: string, approve: boolean, reason?: string) => {
    await api(`/admin/verifications/${sellerId}`, { body: { approve, reason: reason || undefined } });
    load();
  };

  return (
    <>
      <StudioHeader title="Store verification" sub="Check the store is a real, reachable seller before giving it the badge: look at what they sent, their listings, ratings and any reports." />
      <div className="mb-4 rounded-md bg-white px-4 py-3 text-[13.5px] text-ink-2">
        <b>A good check:</b> the CAC number matches the business name on the CAC public search, the Instagram or TikTok is active and matches the store, the phone number answers, and the listings look like their own photos.
      </div>
      {!items ? (
        <div className="skeleton h-40 rounded-lg" />
      ) : !items.length ? (
        <Empty title="No stores waiting" body="Stores ask for the badge from Seller Studio → Storefront." />
      ) : (
        <div className="grid gap-3">
          {items.map((v) => (
            <article key={v.sellerId} className="grid gap-4 rounded-lg border border-line bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={v.handle ? `/${v.handle}` : `/seller/${v.sellerId}`} target="_blank" className="inline-flex items-center gap-2 font-display text-[19px] font-bold hover:text-red">
                  {v.displayName}
                  <Icon name="arrowR" size={16} />
                </Link>
                <span className="pill">
                  {PLAN_DETAILS[v.plan].label} · {v.city}
                </span>
              </div>
              <p className="rounded-md bg-cream px-3.5 py-2.5 text-[14px] text-ink-2">
                <span className="mb-1 block text-[12px] font-bold text-muted">What they sent{v.requestedAt ? ` · ${when(v.requestedAt)}` : ""}</span>
                {v.note}
              </p>
              <div className="grid grid-cols-2 gap-3 text-[14px] sm:grid-cols-4">
                <Fact label="Owner" value={v.owner.name} />
                <Fact label="Email" value={<span className="break-all">{v.owner.email}</span>} warn={!v.owner.emailVerified} />
                <Fact label="Phone" value={v.owner.phone ?? "Not given"} warn={!v.owner.phone} />
                <Fact label="On Droba since" value={new Date(v.joinedAt).toLocaleDateString("en-NG", { month: "short", year: "numeric" })} />
                <Fact label="Live listings" value={v.activeListings} warn={v.activeListings < 3} />
                <Fact label="Delivered orders" value={v.delivered} />
                <Fact label="Rating" value={v.ratingCount ? `${v.ratingAvg.toFixed(1)} (${v.ratingCount})` : "No ratings"} />
                <Fact label="Open reports" value={v.openReports} warn={v.openReports > 0} />
              </div>
              <div className="flex flex-wrap items-start gap-2 border-t border-line pt-3">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => void decide(v.sellerId, true)}>
                  <Icon name="check" size={15} />
                  Verify store
                </button>
                <ReasonAction label="Turn down" tone="ghost" placeholder="What they need to fix (they'll see this)" onConfirm={(r) => decide(v.sellerId, false, r)} />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
