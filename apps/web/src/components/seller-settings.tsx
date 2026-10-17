"use client";
import { useState } from "react";
import { CITY_NAMES, PLAN_DETAILS, type Me, type StorePlan } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { uploadPhoto } from "@/lib/upload";
import { SITE_HOST } from "@/lib/config";
import { cx, initials } from "@/lib/format";
import { Field, FormError, useSubmit } from "./forms";
import { Icon } from "./Icon";
import { PlansGrid } from "./plans";

export function Section({ id, title, children, sub }: { id?: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="grid gap-4 rounded-lg border border-line bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-[19px]">{title}</h2>
        {sub && <p className="mt-0.5 text-[14px] text-muted">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

export function Saved({ show }: { show: boolean }) {
  return show ? (
    <span className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-ok">
      <Icon name="check" size={15} />
      Saved
    </span>
  ) : null;
}

export function StoreSettings({ user }: { user: Me }) {
  const { setUser } = useAuth();
  const s = user.seller!;
  const isStore = s.type === "STORE";
  const [f, setF] = useState({ storeName: s.displayName, handle: s.handle ?? "", bio: s.bio ?? "", area: s.area ?? "", city: s.city, phone: s.phone?.replace("+234", "0") ?? "" });
  const [ok, setOk] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);
  const { busy, error, fields, run, setError } = useSubmit(async () => {
    const body = isStore ? { storeName: f.storeName, handle: f.handle, bio: f.bio || null, area: f.area || null, city: f.city, phone: f.phone || null } : { area: f.area || null, city: f.city, phone: f.phone || null };
    setUser(await api<Me>("/sellers/me", { method: "PATCH", body }));
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  });
  const image = async (kind: "logo" | "banner", file?: File) => {
    if (!file) return;
    setUploading(kind);
    try {
      const url = await uploadPhoto(file);
      setUser(await api<Me>("/sellers/me", { method: "PATCH", body: kind === "logo" ? { logoUrl: url } : { bannerUrl: url } }));
    } catch {
      setError("Upload failed. Try a smaller image.");
    } finally {
      setUploading(null);
    }
  };
  return (
    <Section title={isStore ? "Your store" : "Seller profile"} sub={isStore ? `${SITE_HOST}/${s.handle}` : "Shown on your listings"}>
      {isStore && (
        <div className="grid gap-3">
          <label className="relative block h-32 cursor-pointer overflow-hidden rounded-md bg-wine sm:h-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {s.bannerUrl && <img src={s.bannerUrl} alt="" className="size-full object-cover" />}
            <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 text-[13px] font-bold">
              <Icon name="camera" size={15} />
              {uploading === "banner" ? "Uploading…" : "Change banner"}
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => image("banner", e.target.files?.[0])} />
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <span className="grid size-16 place-items-center overflow-hidden rounded-[16px] bg-blush font-display text-xl font-extrabold text-red-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {s.logoUrl ? <img src={s.logoUrl} alt="" className="size-full object-cover" /> : initials(s.displayName)}
            </span>
            <span className="link text-[14px]">{uploading === "logo" ? "Uploading…" : "Change logo"}</span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => image("logo", e.target.files?.[0])} />
          </label>
        </div>
      )}
      <form onSubmit={run} className="grid gap-4">
        <FormError message={error} />
        {isStore && (
          <>
            <Field label="Store name" name="storeName" value={f.storeName} onChange={(e) => setF({ ...f, storeName: e.target.value })} error={fields.storeName} />
            <label className="field">
              <span className="label">Store link</span>
              <span className={cx("flex h-12 items-center overflow-hidden rounded-[12px] border-[1.5px] bg-white focus-within:border-ink", fields.handle ? "border-red" : "border-line")}>
                <span className="flex h-full items-center bg-cream px-3 text-[14px] text-muted">{SITE_HOST}/</span>
                <input value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })} className="h-full min-w-0 flex-1 px-3 outline-none" />
              </span>
              {fields.handle ? <span className="err">{fields.handle}</span> : <span className="hint">Changing it breaks links you&apos;ve already shared.</span>}
            </label>
            <label className="field">
              <span className="label">About</span>
              <textarea className="input" maxLength={240} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
            </label>
          </>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="field">
            <span className="label">City</span>
            <select className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>
              {CITY_NAMES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <Field label="Area" name="area" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} />
          <Field label="Phone for buyers" name="phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} error={fields.phone} />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-dark" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <Saved show={ok} />
        </div>
      </form>
    </Section>
  );
}

export function PlanSettings({ user }: { user: Me }) {
  const { setUser } = useAuth();
  const s = user.seller!;
  const [target, setTarget] = useState<StorePlan | null>(null);
  const [f, setF] = useState({ storeName: "", handle: "" });
  const { busy, error, fields, run } = useSubmit(async () => {
    setUser(await api<Me>("/sellers/me/plan", { body: { plan: target, ...(s.type === "INDIVIDUAL" && target !== "FREE" ? f : {}) } }));
    setTarget(null);
  });
  return (
    <Section id="plan" title="Your plan" sub={`You're on ${PLAN_DETAILS[s.plan].label}. Stores are billed monthly; cancel anytime.`}>
      <PlansGrid current={s.plan} busy={busy ? target : null} onPick={(p) => setTarget(p)} />
      {target && (
        <form onSubmit={run} className="grid gap-3 rounded-md bg-cream p-4">
          <FormError message={error} />
          {s.type === "INDIVIDUAL" && target !== "FREE" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Store name" name="storeName" value={f.storeName} onChange={(e) => setF({ ...f, storeName: e.target.value, handle: f.handle || e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })} error={fields.storeName} />
              <Field label={`Store link (${SITE_HOST}/…)`} name="handle" value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })} error={fields.handle} />
            </div>
          )}
          {target === "FREE" && <p className="text-[14px] text-ink-2">Your listings stay live, but your store page and link will stop working.</p>}
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Switching…" : `Switch to ${PLAN_DETAILS[target].label}`}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setTarget(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Section>
  );
}


/** Stores ask Droba for the verified badge; shows where the request is */
export function VerificationPanel({ user }: { user: Me }) {
  const { setUser } = useAuth();
  const s = user.seller!;
  const [note, setNote] = useState("");
  const { busy, error, fields, run } = useSubmit(async () => {
    setUser(await api<Me>("/sellers/me/verification", { body: { note } }));
  });
  const badge = s.plan === "BUSINESS" ? "Verified Business" : "Verified Store";
  if (s.type !== "STORE") return null;
  return (
    <Section title={`${badge} badge`} sub="A seal next to your name on your storefront and every listing. Buyers trust verified stores more.">
      {s.verified ? (
        <p className="flex items-center gap-2 rounded-md bg-ok-bg px-4 py-3 text-[14px] font-semibold text-ok">
          <Icon name="shield" size={18} />
          Your store is verified.
        </p>
      ) : s.verificationStatus === "PENDING" ? (
        <p className="flex items-start gap-2 rounded-md bg-info-bg px-4 py-3 text-[14px] text-info">
          <Icon name="clock" size={18} className="mt-0.5" />
          <span>
            <b>We&apos;re reviewing your store.</b> This usually takes 1–2 working days. We&apos;ll email you either way.
          </span>
        </p>
      ) : (
        <form onSubmit={run} className="grid gap-3">
          {s.verificationStatus === "REJECTED" && s.verificationReply && (
            <p className="rounded-md bg-warn-bg px-4 py-3 text-[14px] text-warn">
              <b>Last time we couldn&apos;t verify you:</b> {s.verificationReply}
            </p>
          )}
          <FormError message={error} />
          <label className="field">
            <span className="label">Help us check your store is real</span>
            <textarea className={cx("input min-h-24 py-3", fields.note && "input-err")} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. CAC registration number, your Instagram or TikTok, shop address, how long you've been selling" />
            {fields.note ? <span className="err">{fields.note}</span> : <span className="hint">Only Droba sees this. Confirm your email and have a few live listings first.</span>}
          </label>
          <div>
            <button className="btn btn-dark" disabled={busy || note.trim().length < 10}>
              {busy ? "Sending…" : "Request verification"}
            </button>
          </div>
        </form>
      )}
    </Section>
  );
}

/** Business stores: shop address, opening hours, delivery areas and store policy, shown on the storefront */
export function BusinessDetailsForm({ user }: { user: Me }) {
  const { setUser } = useAuth();
  const d = user.seller!.details;
  const [f, setF] = useState({ shopAddress: d.shopAddress ?? "", openingHours: d.openingHours ?? "", deliveryAreas: d.deliveryAreas ?? "", storePolicy: d.storePolicy ?? "" });
  const [ok, setOk] = useState(false);
  const { busy, error, fields, run } = useSubmit(async () => {
    const body = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null]));
    setUser(await api<Me>("/sellers/me", { method: "PATCH", body }));
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  });
  return (
    <Section title="How you sell" sub="Shown in a box on your storefront so buyers know what to expect.">
      <form onSubmit={run} className="grid gap-4">
        <FormError message={error} />
        <Field label="Shop address (leave empty if you only sell online)" name="shopAddress" maxLength={120} value={f.shopAddress} onChange={(e) => setF({ ...f, shopAddress: e.target.value })} error={fields.shopAddress} placeholder="e.g. Block C, Shop 22, Computer Village, Ikeja" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={f.shopAddress ? "Opening hours" : "When you reply"} name="openingHours" maxLength={80} value={f.openingHours} onChange={(e) => setF({ ...f, openingHours: e.target.value })} error={fields.openingHours} placeholder="e.g. Mon–Sat, 9am – 6pm" />
          <Field label="Delivers to" name="deliveryAreas" maxLength={120} value={f.deliveryAreas} onChange={(e) => setF({ ...f, deliveryAreas: e.target.value })} error={fields.deliveryAreas} placeholder="e.g. Lagos same day · nationwide 2–3 days" />
        </div>
        <label className="field">
          <span className="label">Store policy</span>
          <textarea className="input min-h-20 py-3" maxLength={240} value={f.storePolicy} onChange={(e) => setF({ ...f, storePolicy: e.target.value })} placeholder="e.g. 7-day warranty on phones. Not as described? Return within 48 hours." />
          {fields.storePolicy && <span className="err">{fields.storePolicy}</span>}
        </label>
        <div className="flex items-center gap-3">
          <button className="btn btn-dark" disabled={busy}>
            {busy ? "Saving…" : "Save details"}
          </button>
          <Saved show={ok} />
        </div>
      </form>
    </Section>
  );
}
