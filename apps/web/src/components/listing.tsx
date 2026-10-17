import Image from "next/image";
import Link from "next/link";
import { CONDITION_INFO, type Condition, type ListingCard as Card } from "@droba/shared";
import { cx, distance, extraLabel, naira } from "@/lib/format";
import { Icon, VerifiedSeal } from "./Icon";

export function ConditionBars({ condition }: { condition: Condition }) {
  const n = CONDITION_INFO[condition].bars;
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <i key={i} className={cx("h-2.5 w-1 rounded-[1px]", i <= n ? "bg-red" : "bg-line-2")} />
      ))}
    </span>
  );
}

export function ConditionChip({ condition, extra, department }: { condition: Condition; extra?: boolean; department?: string }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-[6px] bg-white/95 pr-2 pl-1.5 text-[11.5px] font-bold whitespace-nowrap text-ink">
      <ConditionBars condition={condition} />
      {CONDITION_INFO[condition].label}
      {extra && department && <span className="hidden font-semibold text-muted sm:inline">· {extraLabel(department)}</span>}
    </span>
  );
}

/** Photo, then the item name (the hero), price, details, and the seller last. */
export function ListingCard({ item, priority = false, showDistance = true }: { item: Card; priority?: boolean; showDistance?: boolean }) {
  const meta = [item.department === "fashion" ? (item.size && item.size !== "One size" ? `Size ${item.size}` : item.brand) : item.size, showDistance && item.distanceM != null ? distance(item.distanceM) : item.city]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className={cx("group relative flex min-w-0 flex-col gap-2.5", item.status === "SOLD" && "opacity-80")}>
      <Link href={`/listing/${item.id}`} className="relative block aspect-[4/5] overflow-hidden rounded-md bg-cream-2">
        {item.photo ? (
          <Image src={item.photo} alt={item.title} fill priority={priority} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-muted">
            <Icon name="camera" size={28} />
          </span>
        )}
        {item.boosted && <span className="absolute top-2.5 left-2.5 rounded-[6px] bg-white/92 px-2 py-1 text-[10.5px] font-extrabold tracking-[.1em] text-muted uppercase">Sponsored</span>}
        {item.status === "SOLD" && <span className="absolute inset-0 grid place-items-center bg-ink/55 font-display text-2xl font-extrabold tracking-[.1em] text-white">SOLD</span>}
        <span className="absolute bottom-2.5 left-2.5">
          <ConditionChip condition={item.condition} extra={item.extra} department={item.department} />
        </span>
      </Link>
      <div className="grid min-w-0 gap-0.5 px-0.5">
        <Link href={`/listing/${item.id}`} className="line-clamp-2 font-display text-[15.5px] leading-snug font-semibold tracking-[-0.01em] text-oxblood hover:underline sm:text-base">
          {item.title}
        </Link>
        <span className="font-display text-[17px] font-bold tracking-[-0.02em] num">{naira(item.price)}</span>
        {meta && <span className="truncate text-[12.5px] text-muted">{meta}</span>}
        <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[12.5px] font-semibold text-ink-2">
          {item.seller.verified && <VerifiedSeal size={13} />}
          <span className="truncate">{item.seller.displayName}</span>
        </span>
      </div>
    </article>
  );
}

export function ListingGrid({ items, priorityCount = 0, showDistance = true }: { items: Card[]; priorityCount?: number; showDistance?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((it, i) => (
        <ListingCard key={it.id} item={it} priority={i < priorityCount} showDistance={showDistance} />
      ))}
    </div>
  );
}

export function SectionHead({ title, sub, action }: { title: React.ReactNode; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-[clamp(22px,2.6vw,30px)]">{title}</h2>
        {sub && <p className="mt-1 hidden text-muted sm:block">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function SeeAll({ href, label = "See all" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="link shrink-0 whitespace-nowrap">
      {label}
      <Icon name="arrowR" size={16} />
    </Link>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-lg bg-cream px-6 py-14 text-center">
      <h3 className="text-xl">{title}</h3>
      {body && <p className="max-w-[44ch] text-muted">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
