"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CITY_NAMES, CONDITIONS, CONDITION_INFO, DEPARTMENTS, departmentById, type SearchResponse } from "@droba/shared";
import { cx, departmentLabel, naira } from "@/lib/format";
import { useLocation } from "@/lib/location";
import { Icon } from "@/components/Icon";
import { ConditionBars } from "@/components/listing";

type Facets = SearchResponse["facets"] | undefined;

function useParamsEditor() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const set = (patch: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  return { sp, set, pending };
}

const count = (facets: Facets, key: keyof NonNullable<Facets>, value: string) => facets?.[key].find((f) => f.value === value)?.count ?? 0;

function Group({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line py-4 first:pt-0">
      <summary className="flex cursor-pointer list-none items-center justify-between font-display text-[15px] font-bold">
        {title}
        <Icon name="chevD" size={16} className="transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 grid gap-1.5">{children}</div>
    </details>
  );
}

function Option({ on, label, n, onClick, type = "radio", extra }: { on: boolean; label: string; n?: number; onClick: () => void; type?: "radio" | "check"; extra?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={cx("flex items-center gap-2.5 rounded-[8px] px-1.5 py-1.5 text-left text-[14px] hover:bg-cream", on ? "font-bold text-ink" : "text-ink-2", n === 0 && !on && "opacity-50")}>
      <span className={cx("grid size-[18px] shrink-0 place-items-center border-[1.5px]", type === "radio" ? "rounded-full" : "rounded-[5px]", on ? "border-ink bg-ink text-white" : "border-line-2 bg-white")}>
        {on && <Icon name="check" size={12} strokeWidth={3} />}
      </span>
      {extra}
      <span className="flex-1">{label}</span>
      {n !== undefined && <span className="text-[12.5px] text-muted num">{n}</span>}
    </button>
  );
}

export function Filters({ facets, onDone }: { facets: Facets; onDone?: () => void }) {
  const { sp, set } = useParamsEditor();
  const dept = sp.get("department");
  const deptInfo = dept ? departmentById(dept) : undefined;
  const conditions = (sp.get("condition") ?? "").split(",").filter(Boolean);
  const [min, setMin] = useState(sp.get("minPrice") ?? "");
  const [max, setMax] = useState(sp.get("maxPrice") ?? "");
  useEffect(() => {
    setMin(sp.get("minPrice") ?? "");
    setMax(sp.get("maxPrice") ?? "");
  }, [sp]);

  const toggleCondition = (c: string) => {
    const next = conditions.includes(c) ? conditions.filter((x) => x !== c) : [...conditions, c];
    set({ condition: next.join(",") || null });
  };

  return (
    <div className="text-ink">
      <Group title="Category">
        <Option on={!dept} label="All departments" onClick={() => set({ department: null, category: null })} />
        {DEPARTMENTS.map((d) => (
          <Option key={d.id} on={dept === d.id} label={d.label} n={count(facets, "department", d.id)} onClick={() => set({ department: dept === d.id ? null : d.id, category: null })} />
        ))}
      </Group>

      {deptInfo && (
        <Group title={`${deptInfo.label} type`}>
          {deptInfo.categories.map((c) => (
            <Option key={c} type="check" on={sp.get("category") === c} label={c} n={count(facets, "category", c)} onClick={() => set({ category: sp.get("category") === c ? null : c })} />
          ))}
        </Group>
      )}

      {dept === "fashion" && (
        <Group title="For">
          {[
            ["", "Everyone"],
            ["WOMEN", "Women"],
            ["MEN", "Men"],
          ].map(([v, l]) => (
            <Option key={v} on={(sp.get("gender") ?? "") === v} label={l!} onClick={() => set({ gender: v || null })} />
          ))}
        </Group>
      )}

      <Group title="Condition">
        {CONDITIONS.map((c) => (
          <Option key={c} type="check" on={conditions.includes(c)} label={CONDITION_INFO[c].label} n={count(facets, "condition", c)} extra={<ConditionBars condition={c} />} onClick={() => toggleCondition(c)} />
        ))}
      </Group>

      <Group title="Price">
        <form
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            set({ minPrice: min.replace(/\D/g, "") || null, maxPrice: max.replace(/\D/g, "") || null });
          }}
        >
          <input className="input h-10 text-[14px]" inputMode="numeric" placeholder="₦ Min" value={min} onChange={(e) => setMin(e.target.value)} aria-label="Minimum price" />
          <span className="text-muted">–</span>
          <input className="input h-10 text-[14px]" inputMode="numeric" placeholder="₦ Max" value={max} onChange={(e) => setMax(e.target.value)} aria-label="Maximum price" />
          <button className="btn btn-dark btn-sm col-span-3 mt-1">Apply price</button>
        </form>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            [0, 20000],
            [20000, 100000],
            [100000, 500000],
            [500000, 0],
          ].map(([a, b]) => (
            <button key={`${a}-${b}`} type="button" className="chip h-8 text-[12.5px]" onClick={() => set({ minPrice: a ? String(a) : null, maxPrice: b ? String(b) : null })}>
              {a ? naira(a!) : "Under"} {b ? `${a ? "–" : ""} ${naira(b)}` : "+"}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Location" open={!!sp.get("city") || !!sp.get("radiusKm")}>
        <select className="input h-10 text-[14px]" value={sp.get("city") ?? ""} onChange={(e) => set({ city: e.target.value || null, lat: null, lng: null })} aria-label="City">
          <option value="">Anywhere in Nigeria</option>
          {CITY_NAMES.map((c) => (
            <option key={c} value={c}>
              {c} {count(facets, "city", c) ? `(${count(facets, "city", c)})` : ""}
            </option>
          ))}
        </select>
        {(sp.get("lat") || sp.get("city")) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[null, "5", "10", "25", "50"].map((r) => (
              <button key={r ?? "any"} type="button" onClick={() => set({ radiusKm: r })} className={cx("chip h-8 text-[12.5px]", (sp.get("radiusKm") ?? null) === r && "chip-on")}>
                {r ? `Within ${r} km` : "Any distance"}
              </button>
            ))}
          </div>
        )}
      </Group>

      <Group title="Seller" open={false}>
        <Option on={!sp.get("sellerType")} label="Everyone" onClick={() => set({ sellerType: null })} />
        <Option on={sp.get("sellerType") === "STORE"} label="Stores" onClick={() => set({ sellerType: "STORE" })} />
        <Option on={sp.get("sellerType") === "INDIVIDUAL"} label="Individual sellers" onClick={() => set({ sellerType: "INDIVIDUAL" })} />
        <Option type="check" on={sp.get("verified") === "true"} label="Verified only" onClick={() => set({ verified: sp.get("verified") === "true" ? null : "true" })} />
        {(!deptInfo || deptInfo.kind === "tech") && <Option type="check" on={sp.get("tested") === "true"} label="Tested & working" onClick={() => set({ tested: sp.get("tested") === "true" ? null : "true" })} />}
      </Group>

      {onDone && (
        <button type="button" className="btn btn-primary mt-5 w-full" onClick={onDone}>
          Show results
        </button>
      )}
    </div>
  );
}

export function FiltersButton({ facets }: { facets: Facets }) {
  const [open, setOpen] = useState(false);
  const { sp } = useParamsEditor();
  const n = ["category", "condition", "gender", "minPrice", "maxPrice", "city", "radiusKm", "sellerType", "verified", "tested", "department"].filter((k) => sp.get(k)).length;
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => void (document.body.style.overflow = "");
  }, [open]);
  return (
    <>
      <button type="button" className="btn btn-dark btn-sm lg:hidden" onClick={() => setOpen(true)}>
        <Icon name="sliders" size={16} />
        Filters{n ? ` · ${n}` : ""}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="sheet-in absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[22px] bg-white p-5 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl">Filters</h3>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
                <Icon name="x" />
              </button>
            </div>
            <Filters facets={facets} onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

export function SortSelect() {
  const { sp, set } = useParamsEditor();
  return (
    <select aria-label="Sort" className="input h-9 w-auto min-w-0 flex-1 rounded-full px-3 text-[13.5px] font-semibold sm:flex-none" value={sp.get("sort") ?? ""} onChange={(e) => set({ sort: e.target.value || null })}>
      <option value="">Best match</option>
      <option value="distance">Nearest first</option>
      <option value="newest">Newest</option>
      <option value="popular">Trending</option>
      <option value="price_asc">Price: low to high</option>
      <option value="price_desc">Price: high to low</option>
    </select>
  );
}

export function NearMeToggle() {
  const { sp, set } = useParamsEditor();
  const { place, locate, locating } = useLocation();
  const on = !!sp.get("lat");
  const [want, setWant] = useState(false);
  // Once the browser answers (or refuses), search around the best place we have: GPS, else profile city, else Lagos
  useEffect(() => {
    if (!want || locating || !place) return;
    setWant(false);
    set({ lat: String(place.lat), lng: String(place.lng), city: null, sort: "distance" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want, locating, place]);
  return (
    <button
      type="button"
      className={cx("chip h-9", on && "chip-on")}
      disabled={locating}
      aria-pressed={on}
      onClick={() => {
        if (on) return set({ lat: null, lng: null, radiusKm: null, sort: sp.get("sort") === "distance" ? null : sp.get("sort") });
        setWant(true);
        if (place?.source !== "gps") locate();
      }}
    >
      <Icon name="pin" size={16} />
      {locating ? "Locating…" : "Near me"}
    </button>
  );
}

export function ActiveFilters() {
  const { sp, set } = useParamsEditor();
  const chips: [string, string, Record<string, null>][] = [];
  const q = sp.get("q");
  if (q) chips.push(["q", `“${q}”`, { q: null }]);
  const d = sp.get("department");
  if (d) chips.push(["department", departmentLabel(d), { department: null, category: null }]);
  const c = sp.get("category");
  if (c) chips.push(["category", c, { category: null }]);
  for (const cond of (sp.get("condition") ?? "").split(",").filter(Boolean)) {
    chips.push([`c-${cond}`, CONDITION_INFO[cond as keyof typeof CONDITION_INFO]?.label ?? cond, { condition: null }]);
  }
  const min = sp.get("minPrice"), max = sp.get("maxPrice");
  if (min || max) chips.push(["price", `${min ? naira(+min) : "₦0"} – ${max ? naira(+max) : "any"}`, { minPrice: null, maxPrice: null }]);
  const city = sp.get("city");
  if (city) chips.push(["city", city, { city: null }]);
  const r = sp.get("radiusKm");
  if (r) chips.push(["r", `Within ${r} km`, { radiusKm: null }]);
  if (sp.get("sellerType")) chips.push(["st", sp.get("sellerType") === "STORE" ? "Stores" : "Individuals", { sellerType: null }]);
  if (sp.get("verified")) chips.push(["v", "Verified", { verified: null }]);
  if (sp.get("tested")) chips.push(["t", "Tested", { tested: null }]);
  if (!chips.length) return null;
  return (
    <div className="scroll-x items-center">
      {chips.map(([k, label, clear]) => (
        <button key={k} type="button" className="chip h-8 border-ink/15 bg-cream text-[13px]" onClick={() => set(clear)}>
          {label}
          <Icon name="x" size={14} />
        </button>
      ))}
      <a href="/search" className="link ml-1 shrink-0 text-[13px]">
        Clear all
      </a>
    </div>
  );
}
