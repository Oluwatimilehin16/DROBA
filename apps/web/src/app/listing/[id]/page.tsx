import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONDITIONS, CONDITION_INFO, departmentById, type ListingCard, type ListingDetail } from "@droba/shared";
import { serverGetOrNull, serverGetSafe } from "@/lib/server";
import { ago, compact, cx, extraLabel, initials, naira } from "@/lib/format";
import { Icon, VerifiedSeal, type IconName } from "@/components/Icon";
import { ListingCard as Card, SectionHead } from "@/components/listing";
import { Gallery } from "./gallery";
import { ListingActions } from "./actions";
import { ReportButton } from "@/components/report";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const l = await serverGetOrNull<ListingDetail>(`/listings/${id}`);
  if (!l) return { title: "Listing not found" };
  const desc = `${naira(l.price)} · ${CONDITION_INFO[l.condition].label} · ${l.city}. ${l.description}`.slice(0, 200);
  return {
    title: `${l.title} · ${naira(l.price)}`,
    description: desc,
    openGraph: { title: `${l.title} · ${naira(l.price)}`, description: desc, images: l.photos[0] ? [{ url: l.photos[0].url }] : undefined },
  };
}

const SAFETY: [IconName, string, string][] = [
  ["eye", "Inspect before you pay", "Check it against the photos, grade and details."],
  ["plug", "Test electronics", "Power it on. Check IMEI, serial numbers and battery health."],
  ["cash", "Pay the seller on delivery", "Never send money in advance or share OTPs and card PINs."],
  ["pin", "Meet somewhere safe", "Choose a public place in daylight, or bring someone along."],
];
const VEHICLE_SAFETY: [IconName, string, string][] = [
  ["eye", "Inspect with a mechanic", "Check the engine and body, and test-drive first."],
  ["box", "Verify the papers", "Customs duty, registration and ownership should match the VIN."],
  ["cash", "Pay only after inspection", "Never pay a deposit to “hold” a vehicle you haven't seen."],
];

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const l = await serverGetOrNull<ListingDetail>(`/listings/${id}`);
  if (!l) notFound();
  const similar = await serverGetSafe<{ items: ListingCard[] }>(`/listings/${id}/similar`, { items: [] }, 60);
  const dept = departmentById(l.department);
  const info = CONDITION_INFO[l.condition];
  const s = l.seller;
  const sellerHref = s.handle ? `/${s.handle}` : `/seller/${s.id}`;

  const facts: [string, string][] = [
    ["Category", `${dept?.label ?? ""} · ${l.category}`],
    ...(l.brand ? ([["Brand", l.brand]] as [string, string][]) : []),
    ...(l.size ? ([[dept?.kind === "fashion" ? "Size" : "Size / spec", l.size]] as [string, string][]) : []),
    ...(l.color ? ([["Colour", l.color]] as [string, string][]) : []),
    ...(l.gender ? ([["For", { WOMEN: "Women", MEN: "Men", UNISEX: "Everyone" }[l.gender]]] as [string, string][]) : []),
    ...(l.origin ? ([["Origin", l.origin === "TOKUNBO" ? "Tokunbo (foreign used)" : "Nigerian used"]] as [string, string][]) : []),
    ...l.specs,
  ];

  return (
    <main className="wrap pt-4 pb-28 md:pb-10">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-[13px] text-muted">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <Icon name="chevR" size={14} />
        <Link href={`/search?department=${l.department}`} className="hover:text-ink">
          {dept?.label}
        </Link>
        <Icon name="chevR" size={14} />
        <Link href={`/search?category=${encodeURIComponent(l.category)}`} className="hover:text-ink">
          {l.category}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <Gallery photos={l.photos} title={l.title} sold={l.status === "SOLD"} />

        <div className="grid content-start gap-6">
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="pill bg-blush text-red-deep">{info.label}</span>
              {l.extra && <span className="pill">{extraLabel(l.department)}</span>}
              {l.tested && (
                <span className="pill bg-ok-bg text-ok">
                  <Icon name="check" size={13} strokeWidth={2.6} />
                  Tested & working
                </span>
              )}
              {l.status === "SOLD" && <span className="pill bg-ink text-white">Sold</span>}
            </div>
            <h1 className="text-[clamp(26px,3.2vw,38px)] text-oxblood">{l.title}</h1>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-[30px] font-extrabold tracking-[-0.02em] num">{naira(l.price)}</span>
              {l.openToOffers && <span className="text-[14px] font-semibold text-ok">Open to offers</span>}
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-muted">
              <span className="inline-flex items-center gap-1">
                <Icon name="pin" size={14} />
                {[l.area, l.city].filter(Boolean).join(", ")}
              </span>
              <span>Listed {ago(l.createdAt)}</span>
              <span>{compact(l.views)} views</span>
              {l.savesCount > 0 && <span>{compact(l.savesCount)} saves</span>}
            </p>
          </div>

          <ListingActions listing={{ id: l.id, title: l.title, price: l.price, status: l.status, openToOffers: l.openToOffers, photo: l.photos[0]?.url ?? null, condition: l.condition, city: l.city }} seller={{ id: s.id, displayName: s.displayName, verified: s.verified }} saved={(l as ListingDetail & { saved?: boolean }).saved} />

          <div className="flex flex-wrap gap-2 text-[13.5px]">
            <span className={cx("pill h-8 px-3", l.canDeliver ? "bg-cream-2" : "bg-cream text-muted line-through")}>
              <Icon name="truck" size={15} />
              Seller delivers
            </span>
            <span className={cx("pill h-8 px-3", l.allowPickup ? "bg-cream-2" : "bg-cream text-muted line-through")}>
              <Icon name="store" size={15} />
              Pickup
            </span>
            <span className="pill h-8 bg-cream-2 px-3">
              <Icon name="cash" size={15} />
              Pay on delivery
            </span>
          </div>

          <section className="rounded-md bg-cream p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[17px]">Condition: {info.label}</h3>
              <Link href="/safety#grades" className="link text-[13px]">
                Grade guide
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((k) => (
                <span key={k} className={cx("h-2 rounded-full", k < info.bars ? "bg-red" : "bg-white ring-1 ring-line-2 ring-inset")} />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5 text-[11.5px] font-semibold text-muted">
              {[...CONDITIONS].reverse().map((c) => (
                <span key={c} className={cx(c === l.condition && "font-extrabold text-ink")}>
                  {CONDITION_INFO[c].label}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[14px] text-ink-2">{info.description}</p>
            {l.flaws.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {l.flaws.map((f) => (
                  <span key={f} className="pill bg-warn-bg text-warn">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </section>

          {l.description && (
            <section>
              <h3 className="mb-2 text-[17px]">From the seller</h3>
              <p className="whitespace-pre-line text-ink-2">{l.description}</p>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-[17px]">Details</h3>
            <dl className="divide-y divide-line rounded-md border border-line">
              {facts.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(110px,40%)_1fr] gap-3 px-4 py-2.5 text-[14px]">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <Link href={sellerHref} className="flex items-center gap-4 rounded-md border border-line p-4 transition hover:border-ink">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-blush font-display text-lg font-extrabold text-red-deep">
              {s.logoUrl ? <img src={s.logoUrl} alt="" className="size-full object-cover" /> : initials(s.displayName)}
            </span>
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="flex items-center gap-1.5 font-display text-[17px] font-bold">
                <span className="truncate">{s.displayName}</span>
                {s.verified && <VerifiedSeal business={s.plan === "BUSINESS"} />}
              </span>
              <span className="text-[13px] text-muted">
                {s.type === "STORE" ? (s.plan === "BUSINESS" ? "Business store" : "Premium store") : "Individual seller"} · {s.city}
              </span>
              <span className="flex flex-wrap gap-x-3 text-[13px] font-semibold text-ink-2">
                {s.ratingCount > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="star" size={14} className="fill-current text-red" />
                    {s.ratingAvg.toFixed(1)} ({compact(s.ratingCount)})
                  </span>
                ) : (
                  <span>New seller</span>
                )}
                <span>{compact(s.soldCount)} sold</span>
                <span>{s.activeListings} listed</span>
              </span>
            </span>
            <Icon name="chevR" className="text-muted" />
          </Link>

          <section className="rounded-md border border-line p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[16px]">
              <Icon name="shield" className="text-red" />
              Buy safely on Droba
            </h3>
            <ul className="grid gap-3">
              {(l.department === "vehicles" ? VEHICLE_SAFETY : SAFETY).map(([icon, a, b]) => (
                <li key={a} className="flex gap-3 text-[14px]">
                  <Icon name={icon} className="mt-0.5 text-muted" />
                  <span>
                    <b>{a}.</b> <span className="text-muted">{b}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <ReportButton listingId={l.id} sellerId={s.id} what="listing" className="justify-self-start" />
        </div>
      </div>

      {similar.items.length > 0 && (
        <section className="mt-16">
          <SectionHead title="You might also like" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
            {similar.items.slice(0, 6).map((it) => (
              <Card key={it.id} item={it} showDistance={false} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
