"use client";
import Image from "next/image";
import Link from "next/link";
import { cx } from "@/lib/format";
import { Icon, type IconName } from "./Icon";

/** Page heading used on every Studio page: title on the left, actions on the right */
export function StudioHeader({ eyebrow, title, sub, actions }: { eyebrow?: string; title: React.ReactNode; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="mt-1 text-[clamp(24px,3vw,34px)]">{title}</h1>
        {sub && <p className="mt-1 max-w-[62ch] text-[14.5px] text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-lg border border-line bg-white", className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[16px]">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Kpi({ icon, label, value, hint }: { icon: IconName; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="grid gap-1.5 rounded-lg border border-line bg-white p-4">
      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
        <Icon name={icon} size={15} />
        {label}
      </span>
      <b className="font-display text-[26px] leading-none num">{value}</b>
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </div>
  );
}

export function Thumb({ src, size = 56 }: { src: string | null; size?: number }) {
  return (
    <span className="relative shrink-0 overflow-hidden rounded-[10px] bg-cream-2" style={{ width: size, height: size }}>
      {src && <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />}
    </span>
  );
}

export function Tabs<K extends string>({ tabs, value, onChange }: { tabs: [K, string, number?][]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map(([k, label, n]) => (
        <button key={k} type="button" onClick={() => onChange(k)} className={cx("-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[14.5px] font-bold", value === k ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink")}>
          {label}
          {n !== undefined && <span className="ml-1.5 font-medium text-muted num">{n}</span>}
        </button>
      ))}
    </div>
  );
}

export function QuickLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-[12px] border border-line bg-white px-3 py-2.5 transition hover:border-ink">
      <span className="grid size-9 place-items-center rounded-[10px] bg-blush text-red">
        <Icon name={icon} size={17} />
      </span>
      <b className="flex-1 text-[14.5px] font-semibold">{label}</b>
      <Icon name="chevR" size={16} className="text-muted" />
    </Link>
  );
}
