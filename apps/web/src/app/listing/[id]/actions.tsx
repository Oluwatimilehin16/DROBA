"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ListingStatus } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/http";
import { cx, naira } from "@/lib/format";
import { Icon } from "@/components/Icon";

interface Props {
  listing: { id: string; title: string; price: number; status: ListingStatus; openToOffers: boolean };
  seller: { id: string; displayName: string };
  saved?: boolean;
}

export function ListingActions({ listing, seller, saved: savedInitial }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(!!savedInitial);
  const [sheet, setSheet] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const mine = user?.seller?.id === seller.id;
  const signIn = () => router.push(`/login?next=/listing/${listing.id}`);

  // The page is rendered without the viewer's identity (so it can be cached); fetch "saved" on the client
  useEffect(() => {
    if (!user) return;
    api<{ saved?: boolean }>(`/listings/${listing.id}`)
      .then((d) => setSaved(!!d.saved))
      .catch(() => {});
  }, [user, listing.id]);

  const toggleSave = async () => {
    if (!user) return signIn();
    const next = !saved;
    setSaved(next);
    try {
      await api(`/listings/${listing.id}/save`, { method: next ? "PUT" : "DELETE" });
    } catch {
      setSaved(!next);
    }
  };

  const revealPhone = async () => {
    if (!user) return signIn();
    const r = await api<{ phone: string | null }>(`/sellers/${seller.id}/contact`).catch(() => ({ phone: null }));
    setPhone(r.phone ?? "Not shared. Use chat");
  };

  if (mine) {
    return (
      <div className="flex flex-wrap gap-2.5">
        <a href={`/sell?edit=${listing.id}`} className="btn btn-dark btn-lg flex-1">
          <Icon name="tag" size={18} />
          Edit listing
        </a>
        <a href="/dashboard" className="btn btn-ghost btn-lg">
          Dashboard
        </a>
      </div>
    );
  }

  const unavailable = listing.status !== "ACTIVE";
  return (
    <>
      <div className="grid gap-2.5">
        <div className="flex gap-2.5">
          <button type="button" disabled={unavailable} onClick={() => (user ? setSheet(true) : signIn())} className="btn btn-primary btn-lg flex-1">
            <Icon name="msg" size={18} />
            {unavailable ? "No longer available" : "Message seller"}
          </button>
          <button type="button" onClick={toggleSave} aria-pressed={saved} aria-label={saved ? "Saved" : "Save"} className={cx("btn btn-lg w-[54px] px-0", saved ? "btn-outline-red bg-blush" : "btn-ghost")}>
            <Icon name="heart" size={20} className={saved ? "fill-current" : ""} />
          </button>
        </div>
        <button type="button" onClick={revealPhone} className="btn btn-ghost">
          <Icon name="phone" size={17} />
          {phone ?? "Show phone number"}
        </button>
      </div>

      {/* Sticky bar on phones */}
      {!unavailable && (
        <div className="safe-bottom fixed inset-x-0 bottom-[58px] z-30 flex gap-2 border-t border-line bg-white/95 p-3 backdrop-blur md:hidden">
          <span className="flex min-w-0 flex-1 flex-col justify-center">
            <b className="font-display text-[18px] num">{naira(listing.price)}</b>
            <small className="truncate text-muted">{seller.displayName}</small>
          </span>
          <button type="button" onClick={() => (user ? setSheet(true) : signIn())} className="btn btn-primary">
            <Icon name="msg" size={17} />
            Message seller
          </button>
        </div>
      )}

      {sheet && <MessageSheet listing={listing} seller={seller} onClose={() => setSheet(false)} />}
    </>
  );
}

function MessageSheet({ listing, seller, onClose }: { listing: Props["listing"]; seller: Props["seller"]; onClose: () => void }) {
  const router = useRouter();
  const quick = ["Hi, is this still available?", "Can I pick it up today?", "Do you deliver to my area?", ...(listing.openToOffers ? [`Would you take ${naira(Math.round((listing.price * 0.85) / 500) * 500)}?`] : [])];
  const [text, setText] = useState(quick[0]!);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ conversationId: string }>("/conversations", { body: { listingId: listing.id, message: text } });
      router.push(`/messages/${r.conversationId}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't send. Please try again.");
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid items-end sm:place-items-center" role="dialog" aria-modal="true" aria-label={`Message ${seller.displayName}`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="sheet-in relative w-full rounded-t-[22px] bg-white p-5 pb-8 sm:max-w-md sm:rounded-[22px] sm:pb-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl">Message {seller.displayName}</h3>
            <p className="truncate text-[13.5px] text-muted">
              About: {listing.title} · {naira(listing.price)}
            </p>
          </div>
          <button type="button" className="icon-btn -mt-1 -mr-2" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="scroll-x mb-3 flex-wrap">
          {quick.map((q) => (
            <button key={q} type="button" onClick={() => setText(q)} className={cx("chip h-8 text-[13px]", text === q && "chip-on")}>
              {q}
            </button>
          ))}
        </div>
        <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} aria-label="Your message" />
        {err && <p className="err mt-2">{err}</p>}
        <p className="hint mt-2">Agree on price and delivery in chat. Pay the seller only when you have the item.</p>
        <button type="button" onClick={send} disabled={busy || !text.trim()} className="btn btn-primary mt-4 w-full">
          {busy ? "Sending…" : "Send message"}
        </button>
      </div>
    </div>
  );
}
