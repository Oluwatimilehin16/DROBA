"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CITY_NAMES, PLAN_DETAILS, type StorePlan } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { SITE_HOST } from "@/lib/config";
import { cx, naira } from "@/lib/format";
import { Field, FormError, useSubmit } from "@/components/forms";
import { Icon } from "@/components/Icon";
import { PlansGrid } from "@/components/plans";

type Kind = "INDIVIDUAL" | "STORE";


function useHandleCheck(handle: string) {
  const [state, setState] = useState<{ ok: boolean | null; reason?: string }>({ ok: null });
  useEffect(() => {
    if (handle.length < 3) return setState({ ok: null });
    const t = setTimeout(() => {
      fetch(`/api/sellers/handle-available?handle=${encodeURIComponent(handle)}`)
        .then((r) => r.json())
        .then((r: { available: boolean; reason?: string }) => setState({ ok: r.available, reason: r.available ? undefined : (r.reason ?? "That link is taken") }))
        .catch(() => setState({ ok: null }));
    }, 300);
    return () => clearTimeout(t);
  }, [handle]);
  return state;
}

function Setup() {
  const { user, ready, setUser } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const wantsPlan = sp.get("plan");
  const [kind, setKind] = useState<Kind | null>(wantsPlan === "PREMIUM" || wantsPlan === "BUSINESS" ? "STORE" : wantsPlan === "FREE" ? "INDIVIDUAL" : null);
  const [plan, setPlan] = useState<Exclude<StorePlan, "FREE">>(wantsPlan === "BUSINESS" ? "BUSINESS" : "PREMIUM");
  const [f, setF] = useState({ storeName: "", handle: "", city: "Lagos", area: "", phone: "", bio: "" });
  const [touchedHandle, setTouchedHandle] = useState(false);
  const check = useHandleCheck(f.handle);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/signup?next=/seller/setup");
    else if (user.seller) router.replace("/dashboard");
    else setF((x) => ({ ...x, city: user.city ?? x.city, phone: user.phone ? user.phone.replace("+234", "0") : x.phone }));
  }, [ready, user, router]);

  const { busy, error, fields, run } = useSubmit(async () => {
    const me = await api<NonNullable<typeof user>>("/sellers", {
      body: {
        type: kind,
        plan: kind === "STORE" ? plan : "FREE",
        city: f.city,
        area: f.area || undefined,
        phone: f.phone || undefined,
        ...(kind === "STORE" ? { storeName: f.storeName, handle: f.handle, bio: f.bio || undefined } : {}),
      },
    });
    setUser(me);
    router.replace(me.emailVerified ? "/sell" : "/dashboard");
  });

  if (!user) return null;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  if (!kind) {
    return (
      <main className="wrap max-w-6xl py-8">
        <span className="eyebrow">Sell on Droba</span>
        <h1 className="mt-2 text-[clamp(28px,4vw,40px)]">
          How do you want to <span className="serif text-red">sell?</span>
        </h1>
        <p className="mt-2 text-muted">Start free and open a store later. You keep the same account and can switch between shopping and selling any time.</p>
        <div className="mt-7">
          <PlansGrid
            onPick={(p) => {
              if (p === "FREE") setKind("INDIVIDUAL");
              else {
                setPlan(p);
                setKind("STORE");
              }
            }}
          />
        </div>
        <p className="mt-5 text-center text-[13.5px] text-muted">Stores are billed monthly. Cancel anytime and you go back to selling free; your listings stay up.</p>
      </main>
    );
  }

  const handleError = fields.handle || (touchedHandle && check.ok === false ? check.reason : undefined);
  return (
    <main className="wrap max-w-2xl py-8">
      <button type="button" onClick={() => setKind(null)} className="link mb-4 text-[14px]">
        <Icon name="arrowL" size={16} />
        Back
      </button>
      <h1 className="text-[clamp(26px,3.6vw,36px)]">{kind === "STORE" ? "Set up your store" : "A few details"}</h1>
      <p className="mt-1 text-muted">{kind === "STORE" ? "Buyers will see this on your store page." : "So buyers know where items are and how to reach you."}</p>
      <form onSubmit={run} className="mt-6 grid gap-5" noValidate>
        <FormError message={error} />
        {kind === "STORE" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["PREMIUM", "BUSINESS"] as const).map((p) => (
                <button key={p} type="button" aria-pressed={plan === p} onClick={() => setPlan(p)} className={cx("grid gap-1.5 rounded-md border-[1.5px] p-4 text-left transition", plan === p ? "border-ink bg-cream" : "border-line hover:border-ink-2")}>
                  <span className="flex items-center justify-between">
                    <b className="font-display text-[17px]">{PLAN_DETAILS[p].label}</b>
                    <span className={cx("grid size-5 place-items-center rounded-full border-[1.5px]", plan === p ? "border-ink bg-ink text-white" : "border-line-2")}>{plan === p && <Icon name="check" size={12} strokeWidth={3} />}</span>
                  </span>
                  <span className="font-display text-[20px] font-bold">
                    {naira(PLAN_DETAILS[p].priceNaira)}
                    <span className="text-[13px] font-medium text-muted"> / month</span>
                  </span>
                  <ul className="grid gap-1 text-[13.5px] text-ink-2">
                    {PLAN_DETAILS[p].features.slice(1, 5).map((x) => (
                      <li key={x} className="flex gap-1.5">
                        <Icon name="check" size={14} className="mt-0.5 text-ok" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
            <Field
              label="Store name"
              name="storeName"
              value={f.storeName}
              onChange={(e) => {
                const v = e.target.value;
                setF((x) => ({ ...x, storeName: v, handle: touchedHandle ? x.handle : v.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30) }));
              }}
              error={fields.storeName}
              placeholder="e.g. Yaba Vintage Co."
            />
            <label className="field">
              <span className="label">Your store link</span>
              <span className={cx("flex h-12 items-center overflow-hidden rounded-[12px] border-[1.5px] bg-white focus-within:border-ink", handleError ? "border-red" : "border-line")}>
                <span className="flex h-full items-center bg-cream px-3 text-[14px] text-muted">{SITE_HOST}/</span>
                <input
                  name="handle"
                  value={f.handle}
                  onChange={(e) => {
                    setTouchedHandle(true);
                    setF({ ...f, handle: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30) });
                  }}
                  className="h-full min-w-0 flex-1 px-3 outline-none"
                  placeholder="yourstore"
                  aria-invalid={!!handleError}
                />
                {check.ok && (
                  <span className="pr-3 text-ok">
                    <Icon name="check" size={18} strokeWidth={2.4} />
                  </span>
                )}
              </span>
              {handleError ? <span className="err">{handleError}</span> : <span className="hint">Share it anywhere: Instagram bio, WhatsApp status, flyers. Letters and numbers only.</span>}
            </label>
          </>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span className="label">City</span>
            <select className="input" value={f.city} onChange={set("city")}>
              {CITY_NAMES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <Field label="Area (optional)" name="area" value={f.area} onChange={set("area")} placeholder="e.g. Yaba, Wuse II" error={fields.area} />
        </div>
        <Field label="Phone for buyers" name="phone" type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} placeholder="0803 123 4567" error={fields.phone} hint="Only shown to signed-in buyers who tap “Show phone number”." />
        {kind === "STORE" && (
          <label className="field">
            <span className="label">About your store (optional)</span>
            <textarea className="input" maxLength={240} value={f.bio} onChange={set("bio")} placeholder="What you sell, how you check items, delivery areas…" />
          </label>
        )}
        <button className="btn btn-primary btn-lg" disabled={busy || (kind === "STORE" && (!f.storeName || check.ok === false))}>
          {busy ? "Setting up…" : kind === "STORE" ? `Open my ${plan === "BUSINESS" ? "Business" : "Premium"} store` : "Start selling"}
        </button>
        {kind === "STORE" && <p className="hint -mt-2 text-center">You won&apos;t be charged today.</p>}
      </form>
    </main>
  );
}

export default function SetupPage() {
  return (
    <Suspense>
      <Setup />
    </Suspense>
  );
}
