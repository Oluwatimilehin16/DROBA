"use client";
import { PLAN_DETAILS, STORE_PLANS, type StorePlan } from "@droba/shared";
import { cx, naira } from "@/lib/format";
import { Icon } from "./Icon";

/** The three selling plans side by side: Free, Premium (most popular), Business (dark). Same cards everywhere. */
export function PlansGrid({ current, onPick, busy, ctaFor }: { current?: StorePlan; onPick: (p: StorePlan) => void; busy?: StorePlan | null; ctaFor?: (p: StorePlan) => string }) {
  const label = (p: StorePlan) => {
    if (ctaFor) return ctaFor(p);
    if (current === p) return "Your current plan";
    if (p === "FREE") return current ? "Switch to free selling" : "Sell something free";
    return current && current !== "FREE" ? `Switch to ${PLAN_DETAILS[p].label}` : `Open a ${PLAN_DETAILS[p].label.toLowerCase()}`;
  };
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {STORE_PLANS.map((p) => {
        const d = PLAN_DETAILS[p];
        const dark = p === "BUSINESS";
        const feat = p === "PREMIUM";
        return (
          <div key={p} className={cx("flex flex-col gap-4 rounded-lg border-[1.5px] p-6", dark ? "border-wine bg-wine text-white" : feat ? "border-red bg-white shadow-[var(--shadow-2)]" : "border-line bg-white")}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[20px]">{d.label}</h3>
              {d.tag && <span className="pill bg-red text-white">{d.tag}</span>}
              {current === p && <span className={cx("pill", dark ? "bg-white/15 text-white" : "bg-ink text-white")}>Current</span>}
            </div>
            <div>
              <span className="font-display text-[34px] leading-none font-extrabold num">{d.priceNaira ? naira(d.priceNaira) : "₦0"}</span>
              <span className={cx("text-[14px]", dark ? "text-white/70" : "text-muted")}> / month</span>
              <p className={cx("mt-1.5 text-[14px]", dark ? "text-white/80" : "text-muted")}>{d.blurb}</p>
            </div>
            <ul className="grid flex-1 content-start gap-2 text-[14px]">
              {d.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Icon name="check" size={16} strokeWidth={2.4} className={cx("mt-0.5", dark ? "text-accent-soft" : feat ? "text-red" : "text-ok")} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={current === p || busy === p}
              onClick={() => onPick(p)}
              className={cx("btn w-full", dark ? "btn-light" : feat ? "btn-primary" : current === p ? "btn-ghost" : "btn-dark")}
            >
              {busy === p ? "Please wait…" : label(p)}
            </button>
          </div>
        );
      })}
    </div>
  );
}
