"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { REPORT_REASONS, REPORT_REASON_INFO, type ReportReason } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/http";
import { cx } from "@/lib/format";
import { Icon } from "./Icon";

/** "Report" link + sheet. Sends a listing or a seller to Droba's review queue. */
export function ReportButton({ listingId, sellerId, what, className }: { listingId?: string; sellerId?: string; what: "listing" | "seller" | "store"; className?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (user?.seller?.id === sellerId) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => (user ? setOpen(true) : router.push(`/login?next=${encodeURIComponent(pathname)}`))}
        className={cx("inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-red", className)}
      >
        <Icon name="info" size={15} />
        Report this {what}
      </button>
      {open && <ReportSheet listingId={listingId} sellerId={sellerId} what={what} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReportSheet({ listingId, sellerId, what, onClose }: { listingId?: string; sellerId?: string; what: string; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Listing reports can use every reason; seller reports skip the listing-only ones
  const reasons = REPORT_REASONS.filter((r) => listingId || !["MISLEADING", "COUNTERFEIT"].includes(r));
  const send = async () => {
    if (!reason) return;
    setBusy(true);
    setErr(null);
    try {
      await api("/reports", { body: { ...(listingId ? { listingId } : { sellerId }), reason, details: details.trim() || undefined } });
      setDone(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't send. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[60] grid items-end sm:place-items-center" role="dialog" aria-modal="true" aria-label={`Report this ${what}`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="sheet-in relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-white p-5 pb-8 sm:max-w-md sm:rounded-[22px] sm:pb-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-xl">{done ? "Thanks for telling us" : `Report this ${what}`}</h3>
          <button type="button" className="icon-btn -mt-1 -mr-2" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        {done ? (
          <div className="grid gap-3">
            <p className="text-[14.5px] text-ink-2">Our team will look at it, usually within a day. We won&apos;t tell the seller who reported them.</p>
            <p className="rounded-md bg-cream px-4 py-3 text-[13.5px] text-ink-2">
              <b>Never pay before you have the item.</b> If someone asks for a deposit or a transfer first, stop and don&apos;t send money.
            </p>
            <button type="button" className="btn btn-dark" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            <div role="radiogroup" aria-label="What's wrong?" className="grid gap-1.5">
              {reasons.map((r) => (
                <button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)} className={cx("grid gap-0.5 rounded-[12px] border-[1.5px] px-3.5 py-2.5 text-left transition", reason === r ? "border-ink bg-cream" : "border-line hover:border-ink-2")}>
                  <b className="text-[14px]">{REPORT_REASON_INFO[r].label}</b>
                  <span className="text-[12.5px] text-muted">{REPORT_REASON_INFO[r].hint}</span>
                </button>
              ))}
            </div>
            <label className="field">
              <span className="label">What happened? (optional)</span>
              <textarea className="input min-h-20 py-3" maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything that helps us check, e.g. what they asked you to do" />
            </label>
            {err && <p className="err">{err}</p>}
            <button type="button" onClick={send} disabled={!reason || busy} className="btn btn-primary">
              {busy ? "Sending…" : "Send report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
