"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CONDITION_INFO } from "@droba/shared";
import { useAuth } from "@/lib/auth";
import { useCart, type BagItem } from "@/lib/cart";
import { cx, naira } from "@/lib/format";
import { Icon, VerifiedSeal } from "./Icon";

/** Small "add to bag" button on product cards */
export function AddToBagButton({ item, className = "" }: { item: BagItem; className?: string }) {
  const { has, add, remove } = useCart();
  const { user } = useAuth();
  const inBag = has(item.id);
  if (user?.seller?.id === item.seller.id) return null;
  return (
    <button
      type="button"
      onClick={() => (inBag ? remove(item.id) : add(item))}
      aria-label={inBag ? "In your bag. Tap to remove" : "Add to bag"}
      aria-pressed={inBag}
      className={cx("grid size-9 shrink-0 place-items-center rounded-full border-[1.5px] transition", inBag ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink", className)}
    >
      <Icon name={inBag ? "check" : "cartplus"} size={17} strokeWidth={inBag ? 2.6 : 1.8} />
    </button>
  );
}

/** Header bag icon with count */
export function BagButton({ light = false }: { light?: boolean }) {
  const { items, setOpen } = useCart();
  return (
    <button type="button" onClick={() => setOpen(true)} aria-label={`Your bag${items.length ? `, ${items.length} items` : ""}`} className={cx("icon-btn", light && "text-white hover:bg-white/10")}>
      <Icon name="bag" />
      {items.length > 0 && <span className="absolute top-[3px] right-px grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-red px-[5px] text-[10.5px] font-bold text-white">{items.length}</span>}
    </button>
  );
}

/** Slide-in bag. Rows are fixed-height flex rows with eager images, so nothing collapses or flickers on phones. */
export function BagDrawer() {
  const { open, setOpen, items, groups, remove, total } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);
  if (!open) return null;
  const checkout = () => {
    setOpen(false);
    router.push(user ? "/checkout" : "/login?next=/checkout");
  };
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Your bag">
      <button type="button" aria-label="Close bag" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <aside className="sheet-in absolute top-0 right-0 bottom-0 flex w-full max-w-[440px] flex-col bg-white shadow-[var(--shadow-2)]">
        <header className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-[22px]">
            Your bag <span className="text-[16px] font-medium text-muted">({items.length})</span>
          </h3>
          <button type="button" className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
            <Icon name="x" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!items.length ? (
            <div className="grid justify-items-center gap-2 py-14 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-cream text-muted">
                <Icon name="bag" size={26} />
              </span>
              <h3 className="text-lg">Your bag is empty</h3>
              <p className="text-[14px] text-muted">Pre-loved items are one of one. When you see it, bag it.</p>
              <Link href="/search" onClick={() => setOpen(false)} className="btn btn-primary mt-2">
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {groups.map((g) => (
                <section key={g.seller.id} className="flex flex-col gap-3">
                  <h4 className="flex items-center gap-1.5 text-[14px] font-bold">
                    <Icon name="store" size={16} />
                    {g.seller.displayName}
                    {g.seller.verified && <VerifiedSeal size={14} />}
                  </h4>
                  {g.items.map((it) => (
                    <div key={it.id} className="flex shrink-0 items-start gap-3">
                      <Link href={`/listing/${it.id}`} onClick={() => setOpen(false)} className="relative size-[76px] shrink-0 overflow-hidden rounded-[12px] bg-cream-2">
                        {it.photo && <Image src={it.photo} alt="" fill sizes="76px" loading="eager" className="object-cover" />}
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <Link href={`/listing/${it.id}`} onClick={() => setOpen(false)} className="line-clamp-2 text-[14.5px] font-semibold text-oxblood">
                          {it.title}
                        </Link>
                        <span className="text-[12.5px] text-muted">
                          {CONDITION_INFO[it.condition].label} · {it.city}
                        </span>
                        <button type="button" onClick={() => remove(it.id)} className="self-start text-[12.5px] font-bold text-muted underline hover:text-red">
                          Remove
                        </button>
                      </div>
                      <b className="shrink-0 font-display num">{naira(it.price)}</b>
                    </div>
                  ))}
                </section>
              ))}
              <p className="flex gap-2 rounded-[12px] bg-warn-bg px-3 py-2.5 text-[13px] text-warn">
                <Icon name="cash" size={17} className="mt-px" />
                <span>
                  <b>You pay each seller on delivery.</b> Items aren&apos;t reserved until the seller confirms your request.
                </span>
              </p>
            </div>
          )}
        </div>
        {items.length > 0 && (
          <footer className="safe-bottom grid shrink-0 gap-2 border-t border-line px-5 py-4">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">To pay on delivery</span>
              <b className="font-display text-[20px] num">{naira(total)}</b>
            </div>
            <div className="flex justify-between text-[13px] text-muted">
              <span>Delivery fee</span>
              <span>Agreed with each seller</span>
            </div>
            <button type="button" onClick={checkout} className="btn btn-primary btn-lg mt-1 w-full">
              Send order request
              <Icon name="arrowR" size={18} />
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost w-full">
              Keep shopping
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
