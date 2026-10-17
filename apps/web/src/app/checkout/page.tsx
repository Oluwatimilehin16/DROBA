"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CITY_NAMES, CONDITION_INFO, type DeliveryMethod, type OrderDTO } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { ApiError } from "@/lib/http";
import { cx, naira } from "@/lib/format";
import { Field, FormError } from "@/components/forms";
import { Icon, VerifiedSeal } from "@/components/Icon";
import { ConditionBars } from "@/components/listing";

const DRAFT_KEY = "droba:checkout";

interface Details {
  name: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  address: string;
  city: string;
  note: string;
}

function Stepper({ step }: { step: 1 | 2 }) {
  const dot = (n: 1 | 2, label: string) => (
    <span className={cx("flex items-center gap-2 text-[13.5px] font-bold", step >= n ? "text-ink" : "text-muted")}>
      <span className={cx("grid size-7 place-items-center rounded-full text-[13px]", step > n ? "bg-ok text-white" : step === n ? "bg-ink text-white" : "bg-cream-2 text-muted")}>{step > n ? <Icon name="check" size={14} strokeWidth={3} /> : n}</span>
      {label}
    </span>
  );
  return (
    <div className="flex items-center gap-3">
      {dot(1, "Your details")}
      <span className="h-px w-8 bg-line-2 sm:w-16" />
      {dot(2, "Review & send")}
    </div>
  );
}

/** Checkout: step 1 contact & delivery, step 2 review, then one order request per seller. Nothing is paid on Droba. */
export default function Checkout() {
  const { user, ready } = useAuth();
  const cart = useCart();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [d, setD] = useState<Details>({ name: "", phone: "", deliveryMethod: "DELIVERY", address: "", city: "Lagos", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const many = cart.groups.length > 1;

  useEffect(() => {
    if (ready && !user) router.replace("/login?next=/checkout");
  }, [ready, user, router]);

  // Prefill from last time, then from the profile
  useEffect(() => {
    if (!user) return;
    let saved: Partial<Details> = {};
    try {
      saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") as Partial<Details>;
    } catch {
      /* ignore */
    }
    setD((x) => ({ ...x, name: user.name, phone: user.phone?.replace("+234", "0") ?? "", city: user.city ?? x.city, ...saved }));
  }, [user]);

  const set = <K extends keyof Details>(k: K, v: Details[K]) => setD((x) => ({ ...x, [k]: v }));

  const toReview = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (d.name.trim().length < 2) errs.name = "Enter your name";
    if (!/^(\+?234|0)?[789][01]\d{8}$/.test(d.phone.replace(/[\s-]/g, ""))) errs.phone = "Enter a valid Nigerian phone number";
    if (d.deliveryMethod === "DELIVERY" && d.address.trim().length < 5) errs.address = "Enter the delivery address";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, note: "" }));
    } catch {
      /* ignore */
    }
    setStep(2);
    window.scrollTo({ top: 0 });
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ orders: OrderDTO[] }>("/orders", {
        body: { listingIds: cart.items.map((i) => i.id), deliveryMethod: d.deliveryMethod, name: d.name, phone: d.phone, address: d.deliveryMethod === "DELIVERY" ? d.address : undefined, city: d.city, note: d.note || undefined },
      });
      cart.removeMany(cart.items.map((i) => i.id));
      router.replace(`/orders/sent?ids=${r.orders.map((o) => o.id).join(",")}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "UNAVAILABLE" && e.fields.listingIds) {
        const gone = e.fields.listingIds.split(",");
        cart.removeMany(gone);
        setError(`${e.message}. We've taken ${gone.length === 1 ? "it" : "them"} out of your bag. Check the rest and send again.`);
      } else if (e instanceof ApiError) {
        setError(e.message);
        if (Object.keys(e.fields).length) {
          setErrors(e.fields);
          setStep(1);
        }
      } else setError("Couldn't send. Check your connection and try again.");
      setBusy(false);
    }
  };

  if (!user) return null;
  if (!cart.items.length)
    return (
      <main className="wrap grid min-h-[50vh] place-items-center py-12 text-center">
        <div className="grid justify-items-center gap-2">
          <span className="grid size-14 place-items-center rounded-full bg-cream text-muted">
            <Icon name="bag" size={26} />
          </span>
          <h1 className="text-2xl">Your bag is empty</h1>
          <Link href="/search" className="btn btn-primary mt-2">
            Find something pre-loved
          </Link>
        </div>
      </main>
    );

  const strip = (
    <button type="button" onClick={() => cart.setOpen(true)} className="flex w-full items-center gap-3 rounded-md border border-line bg-cream p-3 text-left">
      <span className="flex -space-x-3">
        {cart.items.slice(0, 4).map((i) => (
          <span key={i.id} className="relative size-12 overflow-hidden rounded-[10px] border-2 border-white bg-cream-2">
            {i.photo && <Image src={i.photo} alt="" fill sizes="48px" className="object-cover" />}
          </span>
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[14.5px]">
          {cart.items.length} item{cart.items.length > 1 ? "s" : ""} from {cart.groups.length} seller{many ? "s" : ""}
        </b>
        <span className="text-[13px] text-muted">{naira(cart.total)} to pay on delivery</span>
      </span>
      <Icon name="chevR" size={16} className="text-muted" />
    </button>
  );

  return (
    <main className="wrap max-w-5xl py-6 pb-28">
      <Stepper step={step} />

      {step === 1 ? (
        <form onSubmit={toReview} noValidate className="mt-6 grid max-w-2xl gap-6">
          <div>
            <h1 className="text-[clamp(26px,3.6vw,36px)]">Where should sellers reach you?</h1>
            <p className="mt-1 text-muted">
              {many ? "Each seller" : "The seller"} gets these details to confirm your request and arrange delivery or pickup with you directly. Droba doesn&apos;t charge you or deliver anything.
            </p>
          </div>
          {strip}
          <section className="grid gap-4 rounded-lg border border-line p-5">
            <h2 className="flex items-center gap-2 text-[17px]">
              <Icon name="user" size={18} />
              Contact
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" name="name" autoComplete="name" value={d.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
              <Field label="Phone (shared with the seller)" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0801 234 5678" value={d.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
            </div>
          </section>
          <section className="grid gap-4 rounded-lg border border-line p-5">
            <h2 className="flex items-center gap-2 text-[17px]">
              <Icon name="truck" size={18} />
              Getting it to you
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["DELIVERY", "truck", "Seller delivers to me", "The seller tells you any delivery fee when they confirm. You pay it with the item."],
                  ["PICKUP", "pin", "I'll pick it up", "Agree a time and a safe public place with the seller."],
                ] as const
              ).map(([v, icon, title, sub]) => (
                <button key={v} type="button" aria-pressed={d.deliveryMethod === v} onClick={() => set("deliveryMethod", v)} className={cx("flex gap-3 rounded-md border-[1.5px] p-4 text-left transition", d.deliveryMethod === v ? "border-ink bg-cream" : "border-line hover:border-ink-2")}>
                  <span className={cx("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-[1.5px]", d.deliveryMethod === v ? "border-ink bg-ink" : "border-line-2")}>{d.deliveryMethod === v && <span className="size-2 rounded-full bg-white" />}</span>
                  <span>
                    <b className="flex items-center gap-1.5 text-[15px]">
                      <Icon name={icon} size={16} />
                      {title}
                    </b>
                    <span className="text-[13px] text-muted">{sub}</span>
                  </span>
                </button>
              ))}
            </div>
            {d.deliveryMethod === "DELIVERY" && <Field label="Delivery address" name="address" autoComplete="street-address" placeholder="12 Adeola Odeku Street, Victoria Island" value={d.address} onChange={(e) => set("address", e.target.value)} error={errors.address} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field">
                <span className="label">City</span>
                <select className="input" value={d.city} onChange={(e) => set("city", e.target.value)}>
                  {CITY_NAMES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <Field label="Note for the seller (optional)" name="note" placeholder="Best time to call, landmark…" value={d.note} onChange={(e) => set("note", e.target.value)} maxLength={300} />
            </div>
          </section>
          <div className="flex flex-wrap justify-between gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => cart.setOpen(true)}>
              <Icon name="arrowL" size={17} />
              Back to bag
            </button>
            <button className="btn btn-primary btn-lg">
              Continue to review
              <Icon name="arrowR" size={18} />
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="grid content-start gap-5">
            <div>
              <h1 className="text-[clamp(26px,3.6vw,36px)]">Check your request{many ? "s" : ""}</h1>
              <p className="mt-1 text-muted">
                When you send, {many ? `each of the ${cart.groups.length} sellers gets a request for their items only` : "the seller gets your request"}, with your name, phone and {d.deliveryMethod === "PICKUP" ? "city" : "address"}.
              </p>
            </div>
            <FormError message={error} />
            <section className="rounded-lg border border-line p-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[16px]">
                  <Icon name="pin" size={17} />
                  {d.deliveryMethod === "PICKUP" ? "Pickup" : "Delivering to"}
                </h2>
                <button type="button" className="link text-[14px]" onClick={() => setStep(1)}>
                  Edit
                </button>
              </div>
              <p className="grid gap-0.5 text-[14.5px]">
                <b>{d.name}</b>
                <span>{d.phone}</span>
                <span>{d.deliveryMethod === "PICKUP" ? `You'll collect from the seller in ${d.city}` : `${d.address}, ${d.city}`}</span>
                {d.note && <span className="text-muted">Note: {d.note}</span>}
              </p>
            </section>
            {cart.groups.map((g, gi) => (
              <section key={g.seller.id} className="rounded-lg border border-line p-5">
                <h2 className="mb-3 flex items-center gap-1.5 text-[16px]">
                  {many && <span className="mr-1 grid size-6 place-items-center rounded-full bg-ink text-[12px] text-white">{gi + 1}</span>}
                  <Icon name="store" size={17} />
                  {g.seller.displayName}
                  {g.seller.verified && <VerifiedSeal size={15} />}
                </h2>
                <div className="grid gap-3">
                  {g.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3">
                      <span className="relative size-16 shrink-0 overflow-hidden rounded-[10px] bg-cream-2">{it.photo && <Image src={it.photo} alt="" fill sizes="64px" className="object-cover" />}</span>
                      <span className="min-w-0 flex-1">
                        <b className="line-clamp-1 text-[14.5px] text-oxblood">{it.title}</b>
                        <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                          <ConditionBars condition={it.condition} />
                          {CONDITION_INFO[it.condition].label}
                        </span>
                      </span>
                      <b className="font-display num">{naira(it.price)}</b>
                    </div>
                  ))}
                </div>
                {many && (
                  <p className="mt-3 border-t border-line pt-3 text-right text-[13.5px] text-muted">
                    Pay {g.seller.displayName}: <b className="text-ink num">{naira(g.items.reduce((t, i) => t + i.price, 0))}</b>
                  </p>
                )}
              </section>
            ))}
            <p className="flex gap-2 rounded-md bg-warn-bg px-4 py-3 text-[14px] text-warn">
              <Icon name="shield" size={18} className="mt-px" />
              <span>
                <b>Pay on delivery only.</b> Inspect and test everything before you pay the seller. Don&apos;t send money in advance, even if asked.
              </span>
            </p>
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="grid gap-3 rounded-lg border border-line p-5">
              <div className="flex justify-between text-[14.5px]">
                <span>Items ({cart.items.length})</span>
                <span className="num">{naira(cart.total)}</span>
              </div>
              <div className="flex justify-between text-[14.5px]">
                <span>Delivery</span>
                <span className="text-muted">{d.deliveryMethod === "PICKUP" ? "Pickup" : "Agreed with seller"}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <b>Pay on delivery</b>
                <b className="font-display text-[22px] num">{naira(cart.total)}</b>
              </div>
              <button type="button" onClick={send} disabled={busy} className="btn btn-primary btn-lg w-full">
                <Icon name="msg" size={18} />
                {busy ? "Sending…" : `Send request${many ? "s" : ""}`}
              </button>
              <button type="button" onClick={() => setStep(1)} className="btn btn-ghost w-full">
                <Icon name="arrowL" size={17} />
                Edit details
              </button>
              <p className="text-center text-[12.5px] text-muted">Nothing is charged. You pay each seller when your item arrives.</p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
