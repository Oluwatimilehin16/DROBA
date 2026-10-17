"use client";
import { useState } from "react";
import { ApiError } from "@/lib/http";
import { cx } from "@/lib/format";

/** A button that asks for a short reason before doing something serious (remove, suspend, reject).
    The reason is emailed to the person affected and kept in the admin log. */
export function ReasonAction({
  label,
  confirmLabel,
  placeholder,
  tone = "danger",
  optional = false,
  onConfirm,
}: {
  label: string;
  confirmLabel?: string;
  placeholder: string;
  tone?: "danger" | "dark" | "ghost";
  optional?: boolean;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const btn = tone === "danger" ? "btn-outline-red" : tone === "dark" ? "btn-dark" : "btn-ghost";
  if (!open)
    return (
      <button type="button" className={cx("btn btn-sm", btn)} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  return (
    <form
      className="grid w-full gap-2 rounded-[12px] bg-cream p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await onConfirm(reason.trim());
          setOpen(false);
          setReason("");
        } catch (x) {
          setErr(x instanceof ApiError ? x.message : "That didn't work. Try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <input autoFocus className="input h-10 text-[14px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} maxLength={300} aria-label="Reason" />
      {err && <span className="err">{err}</span>}
      <div className="flex gap-2">
        <button className={cx("btn btn-sm", tone === "danger" ? "btn-primary" : "btn-dark")} disabled={busy || (!optional && reason.trim().length < 3)}>
          {busy ? "Working…" : (confirmLabel ?? label)}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex h-11 w-full max-w-md items-center gap-2 rounded-full border-[1.5px] border-line bg-white px-4 focus-within:border-ink">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="text-muted">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-full min-w-0 flex-1 bg-transparent text-[14.5px] outline-none" aria-label={placeholder} />
    </label>
  );
}
