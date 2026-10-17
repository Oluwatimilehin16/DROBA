"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BOOST_PRICES, CAMPAIGN_INFO, CAMPAIGN_KINDS, CAMPAIGN_MAX_ITEMS, PLAN_DETAILS, PLAN_RULES, type CampaignDTO, type CampaignKind } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { useStudio } from "@/lib/studio";
import { ApiError } from "@/lib/http";
import { compact, cx, naira } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { Empty } from "@/components/listing";
import { Panel, StudioHeader, Thumb } from "@/components/studio-ui";

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });

function Campaigns({ days }: { days: 3 | 7 | 14 }) {
  const { user, reload } = useAuth();
  const { listings, reloadListings } = useStudio();
  const s = user!.seller!;
  const live = useMemo(() => (listings ?? []).filter((l) => l.status === "ACTIVE"), [listings]);
  const categories = useMemo(() => [...new Set(live.map((l) => l.category))].sort(), [live]);
  const [kind, setKind] = useState<CampaignKind>("NEW_ARRIVALS");
  const [category, setCategory] = useState("");
  const [maxPrice, setMaxPrice] = useState("50000");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [history, setHistory] = useState<CampaignDTO[] | null>(null);

  const loadHistory = useCallback(() => {
    api<{ items: CampaignDTO[] }>("/me/campaigns")
      .then((r) => setHistory(r.items))
      .catch(() => setHistory([]));
  }, []);
  useEffect(loadHistory, [loadHistory]);
  useEffect(() => setCategory((c) => c || categories[0] || ""), [categories]);

  const matches = useMemo(() => {
    const price = Number(maxPrice.replace(/\D/g, "")) || 0;
    const m =
      kind === "NEW_ARRIVALS"
        ? live.filter((l) => Date.now() - new Date(l.createdAt).getTime() < 14 * 86400_000)
        : kind === "CATEGORY"
          ? live.filter((l) => l.category === category)
          : kind === "UNDER_PRICE"
            ? live.filter((l) => l.price <= price)
            : live.filter((l) => picked.includes(l.id));
    return m.slice(0, CAMPAIGN_MAX_ITEMS);
  }, [kind, live, category, maxPrice, picked]);

  const start = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const body = { kind, days, ...(kind === "CATEGORY" ? { category } : kind === "UNDER_PRICE" ? { maxPrice: Number(maxPrice.replace(/\D/g, "")) } : kind === "PICKED" ? { listingIds: picked } : {}) };
      const c = await api<CampaignDTO>("/me/campaigns", { body });
      setMsg({ ok: true, text: `“${c.label}” is live: ${c.listingCount} item${c.listingCount === 1 ? "" : "s"} boosted until ${shortDate(c.endsAt)}.` });
      setPicked([]);
      loadHistory();
      await Promise.all([reloadListings(), reload()]);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Couldn't start the campaign" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Campaigns" action={<span className="pill bg-ink text-white">Business</span>}>
      <div className="grid gap-4 p-5">
        <p className="text-[14px] text-muted">Boost a whole group at once for one credit: up to {CAMPAIGN_MAX_ITEMS} items, all marked “Sponsored” for {days} days.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="What to promote">
          {CAMPAIGN_KINDS.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={cx("grid gap-0.5 rounded-[12px] border-[1.5px] p-3 text-left transition", kind === k ? "border-ink bg-cream" : "border-line hover:border-ink-2")}>
              <b className="text-[14px]">{CAMPAIGN_INFO[k].label}</b>
              <span className="text-[12px] leading-snug text-muted">{CAMPAIGN_INFO[k].blurb}</span>
            </button>
          ))}
        </div>

        {kind === "CATEGORY" && (
          <label className="field max-w-sm">
            <span className="label">Category</span>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
        {kind === "UNDER_PRICE" && (
          <label className="field max-w-sm">
            <span className="label">Everything up to</span>
            <span className="flex h-12 items-center overflow-hidden rounded-[12px] border-[1.5px] border-line bg-white focus-within:border-ink">
              <span className="flex h-full items-center bg-cream px-3 text-muted">₦</span>
              <input inputMode="numeric" value={Number(maxPrice.replace(/\D/g, "") || 0).toLocaleString()} onChange={(e) => setMaxPrice(e.target.value)} className="h-full min-w-0 flex-1 px-3 outline-none num" />
            </span>
          </label>
        )}
        {kind === "PICKED" && (
          <div className="grid max-h-72 gap-1 overflow-y-auto rounded-[12px] border border-line p-1.5">
            {live.map((l) => {
              const on = picked.includes(l.id);
              return (
                <label key={l.id} className={cx("flex cursor-pointer items-center gap-3 rounded-[10px] px-2 py-1.5", on ? "bg-cream" : "hover:bg-cream")}>
                  <input type="checkbox" checked={on} onChange={() => setPicked((p) => (on ? p.filter((x) => x !== l.id) : [...p, l.id].slice(0, CAMPAIGN_MAX_ITEMS)))} className="size-4 accent-[var(--color-red)]" />
                  <Thumb src={l.photo} size={36} />
                  <span className="min-w-0 flex-1">
                    <b className="line-clamp-1 text-[13.5px] font-semibold">{l.title}</b>
                    <span className="text-[12px] text-muted num">{naira(l.price)}</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-cream px-4 py-3">
          <span className="text-[14px]">
            <b className="num">{matches.length}</b> item{matches.length === 1 ? "" : "s"} · {days} days · uses 1 of your <b className="num">{s.boostCredits}</b> credits
          </span>
          <button type="button" onClick={start} disabled={busy || !matches.length || s.boostCredits < 1} className="btn btn-primary btn-sm">
            <Icon name="zap" size={15} />
            {busy ? "Starting…" : "Start campaign"}
          </button>
        </div>
        {msg && <p className={cx("text-[13.5px] font-semibold", msg.ok ? "text-ok" : "text-red-deep")}>{msg.text}</p>}

        {!!history?.length && (
          <div className="grid gap-1.5">
            <span className="eyebrow">Your campaigns</span>
            <ul className="divide-y divide-line rounded-[12px] border border-line">
              {history.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13.5px]">
                  <span className="min-w-0">
                    <b className="block truncate">{c.label}</b>
                    <span className="text-[12px] text-muted">
                      {c.listingCount} items · {c.days} days · started {shortDate(c.createdAt)}
                    </span>
                  </span>
                  <span className={cx("pill shrink-0", c.active ? "bg-ok-bg text-ok" : "")}>{c.active ? `Live until ${shortDate(c.endsAt)}` : "Ended"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}

function CampaignsLocked() {
  return (
    <Panel title="Campaigns" action={<span className="pill bg-ink text-white">Business</span>}>
      <div className="grid justify-items-start gap-3 p-5">
        <p className="text-[14px] text-muted">Promote a group of items at once: new arrivals, a whole category, everything under a price, or your own pick. One credit boosts up to {CAMPAIGN_MAX_ITEMS} items.</p>
        <div className="flex flex-wrap gap-2">
          {["New arrivals", "Under ₦50k", "Phones"].map((c) => (
            <span key={c} className="chip">
              {c}
            </span>
          ))}
        </div>
        <Link href="/studio/plan" className="btn btn-dark btn-sm">
          <Icon name="lock" size={14} />
          Available on Business stores
        </Link>
      </div>
    </Panel>
  );
}

/** Boost: push a listing to the top of search and feeds, marked "Sponsored". Business stores can also run campaigns. */
export default function StudioPromote() {
  const { user, reload } = useAuth();
  const { listings, reloadListings } = useStudio();
  const s = user!.seller!;
  const [days, setDays] = useState<3 | 7 | 14>(7);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const live = (listings ?? []).filter((l) => l.status === "ACTIVE");
  const monthly = PLAN_RULES[s.plan].boostCredits;

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
      <StudioHeader title="Boost & campaigns" sub="Boosted items appear first in search, the home feed and their category, marked “Sponsored”." />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-5">
          <Panel title="Boost one listing">
            {!listings ? (
              <div className="skeleton m-5 h-40 rounded-md" />
            ) : !live.length ? (
              <div className="p-5">
                <Empty title="Nothing live to boost" action={<Link href="/studio/new" className="btn btn-primary">List an item</Link>} />
              </div>
            ) : (
              <div className="max-h-[520px] divide-y divide-line overflow-y-auto">
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
                      <span className="pill bg-blush text-red-deep">Boosted{l.boostedUntil ? ` · until ${shortDate(l.boostedUntil)}` : ""}</span>
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
          {PLAN_RULES[s.plan].campaigns ? <Campaigns days={days} /> : <CampaignsLocked />}
        </div>
        <div className="grid content-start gap-4">
          <section className="grid gap-3 rounded-lg bg-wine p-5 text-white">
            <span className="eyebrow text-accent-soft">Boost credits</span>
            <b className="font-display text-[34px] leading-none num">{s.boostCredits}</b>
            <p className="text-[13.5px] text-white/75">
              {s.plan === "FREE"
                ? "Free sellers pay per boost."
                : `${PLAN_DETAILS[s.plan].label}s get ${monthly} free credits every month.${s.planRenewsAt ? ` Topped back up to ${monthly} on ${shortDate(s.planRenewsAt)}.` : ""}`}{" "}
              One credit boosts one listing{PLAN_RULES[s.plan].campaigns ? ", or one whole campaign" : ""}.
            </p>
          </section>
          <Panel title="How long?">
            <div className="grid gap-2 p-4">
              {BOOST_PRICES.map(([d, price]) => (
                <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={cx("flex items-center justify-between rounded-[12px] border-[1.5px] px-4 py-3 text-left transition", days === d ? "border-ink bg-cream" : "border-line hover:border-ink-2")}>
                  <b>{d} days</b>
                  <span className="text-[14px] text-muted num">{naira(price)} or 1 credit</span>
                </button>
              ))}
              {s.boostCredits < 1 && (
                <p className="rounded-[12px] bg-warn-bg px-3 py-2.5 text-[13px] text-warn">
                  Paying for boosts by card or transfer is coming soon. {s.plan === "FREE" ? "Open a store to get free monthly boosts." : s.planRenewsAt ? `Your credits are topped up on ${shortDate(s.planRenewsAt)}.` : "Your credits refresh next month."}
                </p>
              )}
              {msg && <p className="text-[13.5px] font-semibold text-ok">{msg}</p>}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
