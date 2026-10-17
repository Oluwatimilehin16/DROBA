"use client";
import { useEffect, useRef, useState } from "react";
import { compact } from "@/lib/format";

/* Small, dependency-free charts for Seller Studio. One series each (so no legend: the heading names it),
   2px line, recessive grid, values in ink (never the series colour), and a hover read-out on every mark. */

const RED = "var(--color-red)";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e!.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const dayLabel = (iso: string, long = false) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-NG", long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });

function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** Daily values as a line with a soft area, crosshair and tooltip on hover/touch */
export function TrendChart({ points, unit, height = 220 }: { points: { day: string; value: number }[]; unit: string; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 34;
  const padR = 8;
  const padT = 10;
  const padB = 26;
  const w = Math.max(0, width - padL - padR);
  const h = height - padT - padB;
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));
  const x = (i: number) => padL + (points.length > 1 ? (i / (points.length - 1)) * w : w / 2);
  const y = (v: number) => padT + h - (v / max) * h;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = `${line}L${x(points.length - 1).toFixed(1)},${padT + h}L${x(0).toFixed(1)},${padT + h}Z`;
  const ticks = [0, max / 2, max];
  const labelIdx = points.length > 2 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : points.map((_, i) => i);

  const pick = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || !points.length) return;
    const i = Math.round(((clientX - r.left - padL) / Math.max(w, 1)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };
  const hp = hover != null ? points[hover] : null;

  return (
    <div ref={ref} className="relative select-none" style={{ height }} onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${unit} per day, highest ${Math.max(...points.map((p) => p.value), 0)}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={padL + w} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--color-muted)" className="num">
                {compact(t)}
              </text>
            </g>
          ))}
          {labelIdx.map((i) => (
            <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize={11} fill="var(--color-muted)">
              {dayLabel(points[i]!.day)}
            </text>
          ))}
          <path d={area} fill={RED} opacity={0.08} />
          <path d={line} fill="none" stroke={RED} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hp && hover != null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + h} stroke="var(--color-ink-2)" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(hp.value)} r={5} fill={RED} stroke="#fff" strokeWidth={2} />
            </>
          )}
        </svg>
      )}
      {hp && hover != null && (
        <div className="pointer-events-none absolute top-0 z-10 rounded-[10px] bg-ink px-2.5 py-1.5 text-[12.5px] whitespace-nowrap text-white shadow-[var(--shadow-2)]" style={{ left: Math.min(Math.max(x(hover) - 60, 0), Math.max(width - 130, 0)) }}>
          <span className="text-white/70">{dayLabel(hp.day, true)}</span> · <b className="num">{hp.value.toLocaleString()}</b> {unit}
        </div>
      )}
    </div>
  );
}

/** Ranked horizontal bars with the value written at the end */
export function BarList({ rows, unit, empty = "Nothing yet" }: { rows: { label: string; value: number; note?: string }[]; unit: string; empty?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.length) return <p className="text-[14px] text-muted">{empty}</p>;
  return (
    <ul className="grid gap-2.5">
      {rows.map((r) => (
        <li key={r.label} className="group grid gap-1" title={`${r.label}: ${r.value.toLocaleString()} ${unit}`}>
          <span className="flex items-baseline justify-between gap-3 text-[13.5px]">
            <span className="truncate font-semibold">{r.label}</span>
            <span className="shrink-0 text-ink-2 num">
              {r.value.toLocaleString()}
              {r.note && <span className="ml-1.5 text-muted">{r.note}</span>}
            </span>
          </span>
          <span className="block h-2 rounded-full bg-cream-2">
            <span className="block h-2 rounded-full bg-red transition group-hover:bg-red-deep" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Seven columns, Monday first, busiest one called out */
export function WeekdayBars({ rows }: { rows: { weekday: number; views: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...rows.map((r) => r.views), 1);
  const best = rows.reduce((b, r) => (r.views > b.views ? r : b), rows[0] ?? { weekday: 1, views: 0 });
  return (
    <div className="grid gap-2">
      <div className="flex h-36 items-end gap-2" role="img" aria-label={`Views by day of the week. Busiest: ${WEEKDAYS[best.weekday - 1]}`}>
        {rows.map((r) => (
          <button
            key={r.weekday}
            type="button"
            onPointerEnter={() => setHover(r.weekday)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(r.weekday)}
            onBlur={() => setHover(null)}
            className="relative flex h-full flex-1 items-end"
            aria-label={`${WEEKDAYS[r.weekday - 1]}: ${r.views} views`}
          >
            {hover === r.weekday && <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-[8px] bg-ink px-2 py-0.5 text-[12px] whitespace-nowrap text-white num">{r.views.toLocaleString()} views</span>}
            <span className={`block w-full rounded-t-[4px] ${r.weekday === best.weekday ? "bg-red" : "bg-red/35"}`} style={{ height: `${Math.max(3, (r.views / max) * 100)}%` }} />
          </button>
        ))}
      </div>
      <div className="flex gap-2 text-center text-[12px] text-muted">
        {WEEKDAYS.map((d, i) => (
          <span key={d} className={`flex-1 ${best.weekday === i + 1 ? "font-bold text-ink" : ""}`}>
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}
