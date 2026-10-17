"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PLAN_DETAILS, type AnalyticsDTO, type AnalyticsTotals } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { compact, cx, naira } from "@/lib/format";
import { Icon, type IconName } from "@/components/Icon";
import { BarList, TrendChart, WeekdayBars } from "@/components/charts";
import { Panel, StudioHeader, Tabs, Thumb } from "@/components/studio-ui";

type Metric = "views" | "saves" | "chats" | "requests";
const METRICS: [Metric, string, IconName, string][] = [
  ["views", "Views", "eye", "views"],
  ["saves", "Saves", "heart", "saves"],
  ["chats", "New chats", "msg", "chats"],
  ["requests", "Order requests", "box", "requests"],
];

function Delta({ now, before, days }: { now: number; before: number; days: number }) {
  if (!before && !now) return <span className="text-[12px] text-muted">No activity yet</span>;
  if (!before) return <span className="text-[12px] font-semibold text-ok">New this period</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  return (
    <span className={cx("text-[12px] font-semibold num", up ? "text-ok" : "text-red-deep")}>
      {up ? "▲" : "▼"} {Math.abs(pct)}% <span className="font-medium text-muted">vs previous {days} days</span>
    </span>
  );
}

function Locked({ title, body }: { title: string; body: string }) {
  return (
    <section className="grid justify-items-start gap-3 rounded-lg border border-dashed border-line-2 bg-white p-5">
      <span className="pill bg-ink text-white">
        <Icon name="lock" size={12} />
        Business
      </span>
      <h3 className="text-[17px]">{title}</h3>
      <p className="max-w-[56ch] text-[14px] text-muted">{body}</p>
      <Link href="/studio/plan" className="btn btn-dark btn-sm">
        See Business · {naira(PLAN_DETAILS.BUSINESS.priceNaira)}/mo
      </Link>
    </section>
  );
}

export default function StudioAnalytics() {
  const { user } = useAuth();
  const router = useRouter();
  const s = user!.seller!;
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<Metric>("views");
  const [data, setData] = useState<AnalyticsDTO | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (s.plan === "FREE") return;
    let live = true;
    setFailed(false);
    api<AnalyticsDTO>(`/me/analytics?days=${days}`)
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [days, s.plan]);

  if (s.plan === "FREE") {
    return (
      <>
        <StudioHeader title="Analytics" sub="See which items buyers look at, save and ask about, day by day." />
        <section className="grid max-w-2xl justify-items-start gap-4 rounded-lg bg-wine p-6 text-white">
          <span className="eyebrow text-accent-soft">Stores only</span>
          <h2 className="text-[24px]">Know what sells before you list it.</h2>
          <ul className="grid gap-2 text-[14.5px] text-white/85">
            {["Daily views, saves, chats and order requests", "How each listing is doing, compared with last month", "Business: categories, where your buyers are, and your busiest days"].map((x) => (
              <li key={x} className="flex gap-2">
                <Icon name="check" size={17} className="mt-0.5 text-accent-soft" />
                {x}
              </li>
            ))}
          </ul>
          <Link href="/studio/plan" className="btn btn-light">
            Open a store · from {naira(PLAN_DETAILS.PREMIUM.priceNaira)}/mo
          </Link>
          <p className="text-[13px] text-white/65">You can already see total views and saves on your Overview.</p>
        </section>
      </>
    );
  }

  const ranges: [string, string][] = [
    ["7", "7 days"],
    ["30", "30 days"],
    ["90", s.plan === "BUSINESS" ? "90 days" : "90 days · Business"],
  ];
  const t: AnalyticsTotals | undefined = data?.totals;
  const p: AnalyticsTotals | undefined = data?.previous;
  const info = METRICS.find((m) => m[0] === metric)!;

  return (
    <>
      <StudioHeader title="Analytics" sub={s.plan === "BUSINESS" ? "Advanced analytics: up to 90 days, with categories, buyer cities and your busiest days." : "Detailed analytics for the last 30 days."} />
      <Tabs
        tabs={ranges.map(([k, l]) => [k, l] as [string, string])}
        value={String(days)}
        onChange={(k) => {
          if (k === "90" && s.plan !== "BUSINESS") return router.push("/studio/plan");
          setDays(Number(k));
        }}
      />

      {failed ? (
        <p className="rounded-md bg-warn-bg px-4 py-3 text-[14px] text-warn">Couldn&apos;t load your numbers. Refresh the page to try again.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {METRICS.map(([k, label, icon]) => (
              <button
                key={k}
                type="button"
                aria-pressed={metric === k}
                onClick={() => setMetric(k)}
                className={cx("grid gap-1.5 rounded-lg border bg-white p-4 text-left transition", metric === k ? "border-ink shadow-[var(--shadow-1)]" : "border-line hover:border-line-2")}
              >
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
                  <Icon name={icon} size={15} />
                  {label}
                </span>
                <b className="font-display text-[26px] leading-none num">{t ? compact(t[k]) : "–"}</b>
                {t && p ? <Delta now={t[k]} before={p[k]} days={data!.days} /> : <span className="skeleton h-3 w-20 rounded" />}
              </button>
            ))}
            <div className="col-span-2 grid gap-1.5 rounded-lg border border-line bg-white p-4 lg:col-span-1">
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
                <Icon name="check" size={15} />
                Sold
              </span>
              <b className="font-display text-[26px] leading-none num">{t ? compact(t.sold) : "–"}</b>
              {t && p ? <Delta now={t.sold} before={p.sold} days={data!.days} /> : <span className="skeleton h-3 w-20 rounded" />}
            </div>
          </div>

          <Panel title={`${info[1]} per day`} className="mt-5">
            <div className="p-4 sm:p-5">{data ? <TrendChart points={data.series.map((d) => ({ day: d.day, value: d[metric] }))} unit={info[3]} /> : <div className="skeleton h-[220px] rounded-md" />}</div>
          </Panel>

          {data?.advanced ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Panel title="From views to sales">
                <div className="p-5">
                  <BarList
                    unit=""
                    rows={[
                      { label: "Viewed an item", value: data.advanced.funnel.views },
                      { label: "Started a chat", value: data.advanced.funnel.chats, note: pct(data.advanced.funnel.chats, data.advanced.funnel.views) },
                      { label: "Sent an order request", value: data.advanced.funnel.requests, note: pct(data.advanced.funnel.requests, data.advanced.funnel.views) },
                      { label: "Delivered", value: data.advanced.funnel.delivered, note: pct(data.advanced.funnel.delivered, data.advanced.funnel.views) },
                    ]}
                  />
                  <p className="mt-4 text-[12.5px] text-muted">Percentages are out of everyone who viewed one of your items.</p>
                </div>
              </Panel>
              <Panel title="Busiest days for views">
                <div className="p-5">
                  <WeekdayBars rows={data.advanced.weekdays} />
                  <p className="mt-3 text-[12.5px] text-muted">List new items and run campaigns just before your busiest day.</p>
                </div>
              </Panel>
              <Panel title="Where your buyers are">
                <div className="p-5">
                  <BarList unit="requests" rows={data.advanced.buyerCities.map((c) => ({ label: c.city, value: c.requests }))} empty="Order requests will show buyers' cities here." />
                </div>
              </Panel>
              <Panel title="By category">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-[13.5px]">
                    <thead>
                      <tr className="border-b border-line text-left text-[12px] text-muted">
                        <th className="px-5 py-2.5 font-semibold">Category</th>
                        <th className="px-2 py-2.5 text-right font-semibold">Live</th>
                        <th className="px-2 py-2.5 text-right font-semibold">Views</th>
                        <th className="px-2 py-2.5 text-right font-semibold">Requests</th>
                        <th className="px-5 py-2.5 text-right font-semibold">Sold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {data.advanced.categories.map((c) => (
                        <tr key={c.category}>
                          <td className="px-5 py-2.5 font-semibold">{c.category}</td>
                          <td className="px-2 py-2.5 text-right num">{c.listings}</td>
                          <td className="px-2 py-2.5 text-right num">{compact(c.views)}</td>
                          <td className="px-2 py-2.5 text-right num">{c.requests}</td>
                          <td className="px-5 py-2.5 text-right num">{c.sold}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          ) : data ? (
            <div className="mt-5">
              <Locked title="See what's working, by category and city" body="Business stores also get 90 days of history, the views → chats → requests → delivered funnel, where buyers are ordering from, and which days of the week are busiest." />
            </div>
          ) : null}

          <Panel title="Your listings" className="mt-5">
            {!data ? (
              <div className="skeleton m-5 h-40 rounded-md" />
            ) : !data.listings.length ? (
              <p className="px-5 py-6 text-[14px] text-muted">No live listings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-[13.5px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[12px] text-muted">
                      <th className="px-5 py-2.5 font-semibold">Item</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Views</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Saves</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Chats</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Requests</th>
                      <th className="px-5 py-2.5 text-right font-semibold" title="Order requests out of views">
                        Request rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.listings.map((l) => (
                      <tr key={l.id} className="hover:bg-cream">
                        <td className="px-5 py-2.5">
                          <Link href={`/listing/${l.id}`} className="flex items-center gap-3">
                            <Thumb src={l.photo} size={40} />
                            <span className="min-w-0">
                              <b className="line-clamp-1 font-semibold text-oxblood">{l.title}</b>
                              <span className="text-[12px] text-muted num">
                                {naira(l.price)}
                                {l.status === "SOLD" && " · Sold"}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-2 py-2.5 text-right num">{compact(l.views)}</td>
                        <td className="px-2 py-2.5 text-right num">{l.saves}</td>
                        <td className="px-2 py-2.5 text-right num">{l.chats}</td>
                        <td className="px-2 py-2.5 text-right num">{l.requests}</td>
                        <td className="px-5 py-2.5 text-right text-muted num">{pct(l.requests, l.views) ?? "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </>
  );
}

function pct(part: number, whole: number) {
  if (!whole) return undefined;
  const v = (part / whole) * 100;
  return `${v < 1 && v > 0 ? v.toFixed(1) : Math.round(v)}%`;
}
