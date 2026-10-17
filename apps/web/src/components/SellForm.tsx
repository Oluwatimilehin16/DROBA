"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CITY_NAMES, CONDITIONS, CONDITION_INFO, DEPARTMENTS, PLAN_RULES, departmentOf, type Condition, type ListingDetail } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/http";
import { uploadPhoto } from "@/lib/upload";
import { cx, extraLabel, naira } from "@/lib/format";
import { Field, FormError } from "@/components/forms";
import { Icon } from "@/components/Icon";
import { ConditionBars } from "@/components/listing";

const FLAWS: Record<string, string[]> = {
  fashion: ["Small stain", "Light pilling", "Fading", "Loose thread", "Missing button", "Scuffs", "Worn sole", "Stretched"],
  tech: ["Scratches", "Dents", "Battery wear", "Screen marks", "Noisy", "Missing part", "No charger", "No box"],
  goods: ["Scratches", "Fabric wear", "Fading", "Small stain", "Loose part", "Chipped edge", "Missing piece"],
  vehicles: ["Scratches", "Dents", "Needs servicing", "AC needs work", "Minor rust", "Tyres worn"],
};
const SLOT_LABELS = ["Front", "Back", "Detail", "Label / serial", "Side"];

interface Draft {
  title: string;
  category: string;
  condition: Condition | "";
  price: string;
  description: string;
  brand: string;
  size: string;
  color: string;
  gender: "WOMEN" | "MEN" | "UNISEX";
  origin: "TOKUNBO" | "NIGERIAN_USED" | "";
  tested: boolean;
  extra: boolean;
  flaws: string[];
  spec1: string;
  spec2: string;
  photos: { url: string; label: string | null }[];
  city: string;
  area: string;
  openToOffers: boolean;
  canDeliver: boolean;
  allowPickup: boolean;
}

const blank = (city: string): Draft => ({ title: "", category: "", condition: "", price: "", description: "", brand: "", size: "", color: "", gender: "WOMEN", origin: "", tested: false, extra: false, flaws: [], spec1: "", spec2: "", photos: [], city, area: "", openToOffers: true, canDeliver: true, allowPickup: true });

function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex items-center justify-between gap-4 rounded-[12px] border-[1.5px] border-line px-4 py-3 text-left">
      <span>
        <b className="block text-[14.5px]">{label}</b>
        {sub && <small className="text-muted">{sub}</small>}
      </span>
      <span className={cx("relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-ok" : "bg-line-2")}>
        <span className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

function SellForm() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const editId = useSearchParams().get("edit");
  const [d, setD] = useState<Draft>(blank("Lagos"));
  const [loaded, setLoaded] = useState(!editId);
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState<"ACTIVE" | "DRAFT" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const seller = user?.seller;
  const maxPhotos = seller ? PLAN_RULES[seller.plan].photosPerListing : 4;
  const dept = d.category ? departmentOf(d.category) : undefined;
  const kind = dept?.kind;

  useEffect(() => {
    if (!ready) return;
    if (!user) return router.replace("/login?next=/studio/new");
    if (!user.seller) return router.replace("/seller/setup");
    if (!editId) setD((x) => ({ ...x, city: user.seller!.city, area: x.area || (user.seller!.area ?? "") }));
  }, [ready, user, router, editId]);

  useEffect(() => {
    if (!editId || !user?.seller) return;
    api<ListingDetail>(`/me/listings/${editId}`)
      .then((l) => {
        setD({
          title: l.title, category: l.category, condition: l.condition, price: String(l.price), description: l.description, brand: l.brand ?? "", size: l.size ?? "", color: l.color ?? "", gender: l.gender ?? "UNISEX",
          origin: l.origin ?? "", tested: l.tested, extra: l.extra, flaws: l.flaws, spec1: l.specs[0]?.[1] ?? "", spec2: l.specs[1]?.[1] ?? "", photos: l.photos, city: l.city, area: l.area ?? "", openToOffers: l.openToOffers, canDeliver: l.canDeliver, allowPickup: l.allowPickup,
        });
        setLoaded(true);
      })
      .catch(() => setError("We couldn't load that listing."));
  }, [editId, user?.seller]);

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = maxPhotos - d.photos.length;
    const list = [...files].slice(0, room);
    if (files.length > room) setError(`Your plan allows ${maxPhotos} photos per item.`);
    setUploading((n) => n + list.length);
    await Promise.all(
      list.map(async (f) => {
        try {
          const url = await uploadPhoto(f);
          setD((x) => ({ ...x, photos: [...x.photos, { url, label: null }].slice(0, maxPhotos) }));
        } catch (e) {
          setError(e instanceof Error ? e.message : "Upload failed");
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );
  };

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!d.photos.length) m.push("a photo");
    if (d.title.trim().length < 3) m.push("a title");
    if (!d.category) m.push("a category");
    if (!d.condition) m.push("the condition");
    if (!(+d.price >= 100)) m.push("a price");
    return m;
  }, [d]);

  const submit = async (status: "ACTIVE" | "DRAFT") => {
    setBusy(status);
    setError(null);
    setFields({});
    const specs: [string, string][] = [];
    if (dept?.specLabels) {
      if (d.spec1.trim()) specs.push([dept.specLabels[0], d.spec1.trim()]);
      if (d.spec2.trim()) specs.push([dept.specLabels[1], d.spec2.trim()]);
    }
    const body = {
      title: d.title, category: d.category, condition: d.condition || undefined, price: Number(d.price.replace(/\D/g, "")), description: d.description,
      brand: d.brand || undefined, size: d.size || undefined, color: d.color || undefined,
      gender: kind === "fashion" ? d.gender : undefined, origin: kind === "tech" && d.origin ? d.origin : undefined, tested: kind === "tech" ? d.tested : undefined,
      extra: d.extra, flaws: d.flaws, specs, photos: d.photos.map((p, i) => ({ url: p.url, label: SLOT_LABELS[i] })), city: d.city, area: d.area || undefined,
      openToOffers: d.openToOffers, canDeliver: d.canDeliver, allowPickup: d.allowPickup, status,
    };
    try {
      const l = await api<{ id: string }>(editId ? `/listings/${editId}` : "/listings", { method: editId ? "PATCH" : "POST", body });
      router.push(status === "ACTIVE" ? `/listing/${l.id}?published=1` : "/studio/listings");
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFields(e.fields);
      } else setError("Couldn't save. Check your connection and try again.");
      setBusy(null);
    }
  };

  if (!user?.seller || !loaded) return <main className="wrap py-10"><div className="skeleton h-96 rounded-lg" /></main>;

  return (
    <main className="wrap grid max-w-6xl gap-8 py-6 pb-32 lg:grid-cols-[1fr_320px]">
      <div className="grid content-start gap-8">
        <div>
          <span className="eyebrow">{editId ? "Edit listing" : "New listing"}</span>
          <h1 className="mt-1 text-[clamp(26px,3.6vw,36px)]">{editId ? d.title || "Edit listing" : "What are you selling?"}</h1>
          {!user.emailVerified && <p className="mt-3 rounded-[12px] bg-warn-bg px-4 py-3 text-[14px] text-warn">Confirm your email to publish. You can save a draft now.</p>}
        </div>
        <FormError message={error} />

        <section className="grid gap-3">
          <h2 className="text-[18px]">
            Photos <span className="text-[14px] font-medium text-muted">· up to {maxPhotos}</span>
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {d.photos.map((p, i) => (
              <div key={p.url} className="relative aspect-square overflow-hidden rounded-md bg-cream-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="size-full object-cover" />
                <span className="absolute bottom-1.5 left-1.5 rounded-[6px] bg-white/92 px-1.5 py-0.5 text-[11px] font-bold">{i === 0 ? "Cover" : SLOT_LABELS[i] ?? `Photo ${i + 1}`}</span>
                <button type="button" aria-label="Remove photo" onClick={() => set("photos", d.photos.filter((_, k) => k !== i))} className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-white/92">
                  <Icon name="x" size={14} />
                </button>
                {i > 0 && (
                  <button type="button" aria-label="Make cover" onClick={() => set("photos", [p, ...d.photos.filter((_, k) => k !== i)])} className="absolute top-1.5 left-1.5 grid size-7 place-items-center rounded-full bg-white/92">
                    <Icon name="star" size={14} />
                  </button>
                )}
              </div>
            ))}
            {Array.from({ length: uploading }, (_, i) => (
              <div key={`u${i}`} className="skeleton aspect-square rounded-md" />
            ))}
            {d.photos.length + uploading < maxPhotos && (
              <label className={cx("grid aspect-square cursor-pointer place-items-center rounded-md border-2 border-dashed text-center text-[12.5px] font-semibold text-muted hover:border-ink hover:text-ink", fields.photos ? "border-red" : "border-line-2")}>
                <span className="grid justify-items-center gap-1">
                  <Icon name="camera" size={24} />
                  {d.photos.length ? "Add more" : SLOT_LABELS[0]}
                </span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => void addPhotos(e.target.files)} />
              </label>
            )}
          </div>
          {fields.photos ? <p className="err">{fields.photos}</p> : <p className="hint">Natural light, plain background. Show any flaws: honest photos sell faster.</p>}
        </section>

        <section className="grid gap-4">
          <h2 className="text-[18px]">The item</h2>
          <Field label="Title" name="title" value={d.title} onChange={(e) => set("title", e.target.value)} maxLength={80} placeholder="e.g. Samsung 450L double-door fridge" error={fields.title} />
          <label className="field">
            <span className="label">Category</span>
            <select className={cx("input", fields.category && "input-err")} value={d.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Choose a category</option>
              {DEPARTMENTS.map((g) => (
                <optgroup key={g.id} label={g.label}>
                  {g.categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {fields.category && <span className="err">{fields.category}</span>}
          </label>

          {kind === "fashion" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="field">
                <span className="label">For</span>
                <select className="input" value={d.gender} onChange={(e) => set("gender", e.target.value as Draft["gender"])}>
                  <option value="WOMEN">Women</option>
                  <option value="MEN">Men</option>
                  <option value="UNISEX">Everyone</option>
                </select>
              </label>
              <Field label="Size" name="size" value={d.size} onChange={(e) => set("size", e.target.value)} placeholder="e.g. M, UK 12, EU 43" />
              <Field label="Brand" name="brand" value={d.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Zara" />
            </div>
          )}
          {kind && kind !== "fashion" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Brand / make" name="brand" value={d.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Samsung" />
              <Field label="Size / capacity" name="size" value={d.size} onChange={(e) => set("size", e.target.value)} placeholder={dept?.sizeHint} />
              {dept?.specLabels && (
                <>
                  <Field label={dept.specLabels[0]} name="spec1" value={d.spec1} onChange={(e) => set("spec1", e.target.value)} />
                  <Field label={dept.specLabels[1]} name="spec2" value={d.spec2} onChange={(e) => set("spec2", e.target.value)} />
                </>
              )}
            </div>
          )}
          {kind === "tech" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field">
                <span className="label">Origin</span>
                <select className="input" value={d.origin} onChange={(e) => set("origin", e.target.value as Draft["origin"])}>
                  <option value="">Not sure</option>
                  <option value="TOKUNBO">Tokunbo (foreign used)</option>
                  <option value="NIGERIAN_USED">Nigerian used</option>
                </select>
              </label>
              <div className="self-end">
                <Toggle on={d.tested} onChange={(v) => set("tested", v)} label="Tested & working" sub="You've powered it on recently" />
              </div>
            </div>
          )}
          {kind && <Field label="Colour (optional)" name="color" value={d.color} onChange={(e) => set("color", e.target.value)} />}
        </section>

        <section className="grid gap-3">
          <h2 className="text-[18px]">Condition</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {CONDITIONS.map((c) => (
              <button key={c} type="button" aria-pressed={d.condition === c} onClick={() => set("condition", c)} className={cx("grid gap-1.5 rounded-md border-[1.5px] p-4 text-left transition", d.condition === c ? "border-ink bg-cream" : "border-line hover:border-ink-2", fields.condition && !d.condition && "border-red")}>
                <span className="flex items-center gap-2 font-display text-[16px] font-bold">
                  <ConditionBars condition={c} />
                  {CONDITION_INFO[c].label}
                </span>
                <span className="text-[13px] text-muted">{CONDITION_INFO[c].description}</span>
              </button>
            ))}
          </div>
          {kind && (
            <>
              <Toggle on={d.extra} onChange={(v) => set("extra", v)} label={extraLabel(dept!.id)} sub="Still has it" />
              <div className="flex flex-wrap gap-2">
                {(FLAWS[dept!.id === "vehicles" ? "vehicles" : kind] ?? []).map((f) => (
                  <button key={f} type="button" aria-pressed={d.flaws.includes(f)} onClick={() => set("flaws", d.flaws.includes(f) ? d.flaws.filter((x) => x !== f) : [...d.flaws, f])} className={cx("chip h-8 text-[13px]", d.flaws.includes(f) && "border-warn bg-warn-bg text-warn")}>
                    {f}
                  </button>
                ))}
              </div>
              <p className="hint -mt-1">Tap any flaws buyers should know about.</p>
            </>
          )}
          <label className="field">
            <span className="label">Description</span>
            <textarea className="input" maxLength={3000} value={d.description} onChange={(e) => set("description", e.target.value)} placeholder="How long you've had it, why you're selling, what's included, measurements…" />
          </label>
        </section>

        <section className="grid gap-3">
          <h2 className="text-[18px]">Price & handover</h2>
          <label className="field">
            <span className="label">Price</span>
            <span className={cx("flex h-12 items-center rounded-[12px] border-[1.5px] bg-white focus-within:border-ink", fields.price ? "border-red" : "border-line")}>
              <span className="pl-3.5 font-display text-[18px] font-bold text-muted">₦</span>
              <input inputMode="numeric" className="h-full min-w-0 flex-1 px-2 font-display text-[18px] font-bold outline-none num" value={d.price ? Number(d.price).toLocaleString("en-US") : ""} onChange={(e) => set("price", e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="0" aria-label="Price in naira" />
            </span>
            {fields.price && <span className="err">{fields.price}</span>}
          </label>
          <Toggle on={d.openToOffers} onChange={(v) => set("openToOffers", v)} label="Open to offers" sub="Buyers can suggest a price in chat" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle on={d.canDeliver} onChange={(v) => set("canDeliver", v)} label="I can deliver" />
            <Toggle on={d.allowPickup} onChange={(v) => set("allowPickup", v)} label="Buyer can pick up" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span className="label">Item is in</span>
              <select className="input" value={d.city} onChange={(e) => set("city", e.target.value)}>
                {CITY_NAMES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <Field label="Area" name="area" value={d.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Ikeja" />
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-lg border border-line p-4">
          <span className="eyebrow">Preview</span>
          <div className="relative mt-3 aspect-[4/5] overflow-hidden rounded-md bg-cream-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {d.photos[0] ? <img src={d.photos[0].url} alt="" className="size-full object-cover" /> : <span className="absolute inset-0 grid place-items-center text-muted"><Icon name="camera" size={30} /></span>}
          </div>
          <p className="mt-3 line-clamp-2 font-display text-[16px] font-semibold text-oxblood">{d.title || "Your item title"}</p>
          <p className="font-display text-[18px] font-bold num">{d.price ? naira(+d.price) : "₦0"}</p>
          <p className="text-[12.5px] text-muted">{[d.condition && CONDITION_INFO[d.condition].label, d.city].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="safe-bottom fixed inset-x-0 bottom-[58px] z-30 grid gap-2 border-t border-line bg-white/95 p-3 backdrop-blur md:bottom-0 lg:static lg:mt-4 lg:border-0 lg:bg-transparent lg:p-0">
          {missing.length > 0 && <p className="text-center text-[12.5px] text-muted">Add {missing.join(", ")} to publish</p>}
          <div className="flex gap-2 lg:grid">
            <button type="button" className="btn btn-primary flex-1" disabled={!!busy || uploading > 0 || missing.length > 0 || !user.emailVerified} onClick={() => submit("ACTIVE")}>
              {busy === "ACTIVE" ? "Publishing…" : editId ? "Save & publish" : "Publish listing"}
            </button>
            <button type="button" className="btn btn-ghost" disabled={!!busy || uploading > 0 || !d.photos.length || d.title.trim().length < 3 || !d.category || !d.condition || !(+d.price >= 100)} onClick={() => submit("DRAFT")}>
              {busy === "DRAFT" ? "Saving…" : "Save draft"}
            </button>
          </div>
        </div>
      </aside>
    </main>
  );
}

export default function SellFormPage() {
  return (
    <Suspense>
      <SellForm />
    </Suspense>
  );
}
