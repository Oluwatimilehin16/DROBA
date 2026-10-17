"use client";
import Link from "next/link";
import { useState } from "react";
import { BOOST_PRICES } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { useStudio } from "@/lib/studio";
import { ApiError } from "@/lib/http";
import { compact, cx, naira } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { Empty } from "@/components/listing";
import { Panel, StudioHeader, Thumb } from "@/components/studio-ui";

/** Boost: push a listing to the top of search and feeds, marked "Sponsored" */
export default function StudioPromote() {
  const { user, reload } = useAuth();
  const { listings, reloadListings } = useStudio();
  const s = user!.seller!;
  const [days, setDays] = useState<3 | 7 | 14>(7);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const live = (listings ?? []).filter((l) => l.status === "ACTIVE");

  const boost = async (id: string) => {
    setBusy(id);
    setMsg(null);
    try {
      await api(`/listings/${id}/boost`, { body: { days } });
      setMsg(`Boosted for ${days} days. It now shows near the top of search, marked "Sponsored".`);
      await Promise.all([reloadListings(), reload()]);
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Couldn't boost");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <StudioHeader title="Boost a listing" sub="Boosted items appear first in search, the home feed and their category, marked “Sponsored”." />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel title="Choose a listing">
          {!listings ? (
            <div className="skeleton m-5 h-40 rounded-md" />
          ) : !live.length ? (
            <div className="p-5">
              <Empty title="Nothing live to boost" action={<Link href="/studio/new" className="btn btn-primary">List an item</Link>} />
            </div>
          ) : (
            <div className="divide-y divide-line">
              {live.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                  <Thumb src={l.photo} size={48} />
                  <span className="min-w-0 flex-1">
                    <b className="line-clamp-1 text-[14.5px] text-oxblood">{l.title}</b>
                    <span className="text-[12.5px] text-muted num">
                      {naira(l.price)} · {compact(l.views)} views
                    </span>
                  </span>
                  {l.boosted ? (
                    <span className="pill bg-blush text-red-deep">Boosted</span>
                  ) : (
                    <button type="button" disabled={s.boostCredits < 1 || !!busy} onClick={() => boost(l.id)} className="btn btn-outline-red btn-sm">
                      <Icon name="zap" size={15} />
                      {busy === l.id ? "Boosting…" : "Boost"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
        <div className="grid content-start gap-4">
          <section className="grid gap-3 rounded-lg bg-wine p-5 text-white">
            <span className="eyebrow text-accent-soft">Boost credits</span>
            <b className="font-display text-[34px] leading-none num">{s.boostCredits}</b>
            <p className="text-[13.5px] text-white/75">{s.plan === "FREE" ? "Free sellers pay per boost." : s.plan === "PREMIUM" ? "Premium stores get 3 free boosts every month." : "Business stores get 10 free boosts every month."} One credit boosts one listing.</p>
          </section>
          <Panel title="How long?">
            <div className="grid gap-2 p-4">
              {BOOST_PRICES.map(([d, price]) => (
                <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={cx("flex items-center justify-between rounded-[12px] border-[1.5px] px-4 py-3 text-left transition", days === d ? "border-ink bg-cream" : "border-line hover:border-ink-2")}>
                  <b>{d} days</b>
                  <span className="text-[14px] text-muted num">{naira(price)} or 1 credit</span>
                </button>
              ))}
              {s.boostCredits < 1 && <p className="rounded-[12px] bg-warn-bg px-3 py-2.5 text-[13px] text-warn">Paying for boosts by card or transfer is coming soon. {s.plan === "FREE" ? "Open a store to get free monthly boosts." : "Your credits refresh next month."}</p>}
              {msg && <p className="text-[13.5px] font-semibold text-ok">{msg}</p>}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
