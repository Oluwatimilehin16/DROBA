"use client";
import Image from "next/image";
import { useState } from "react";
import { ApiError } from "@/lib/http";
import { cx } from "@/lib/format";

export function AuthShell({ title, sub, children, image }: { title: React.ReactNode; sub?: React.ReactNode; children: React.ReactNode; image?: string }) {
  return (
    <main className="wrap grid min-h-[calc(100dvh-140px)] items-center gap-10 py-8 lg:grid-cols-2">
      <div className="mx-auto grid w-full max-w-[420px] gap-6">
        <div className="grid gap-2">
          <h1 className="text-[clamp(28px,4vw,40px)]">{title}</h1>
          {sub && <p className="text-muted">{sub}</p>}
        </div>
        {children}
      </div>
      <div className="relative hidden aspect-[4/5] max-h-[680px] overflow-hidden rounded-lg bg-cream-2 lg:block">
        <Image src={image ?? "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=70"} alt="" fill sizes="50vw" className="object-cover" />
        <div className="absolute inset-x-6 bottom-6 rounded-md bg-white/92 p-5 backdrop-blur">
          <p className="font-display text-[19px] font-bold">Pre-loved everything, <span className="serif text-red">honestly graded.</span></p>
          <p className="mt-1 text-[14px] text-muted">Chat with sellers near you, inspect the item, then pay on delivery.</p>
        </div>
      </div>
    </main>
  );
}

export function Field({ label, name, error, hint, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; error?: string; hint?: React.ReactNode }) {
  return (
    <label className={cx("field", className)}>
      <span className="label">{label}</span>
      <input name={name} className={cx("input", error && "input-err")} aria-invalid={!!error} {...rest} />
      {error ? <span className="err">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

/** Tiny form helper: tracks busy state and maps API field errors onto inputs */
export function useSubmit<T>(fn: () => Promise<T>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      return await fn();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fields);
      } else setError("Something went wrong. Check your connection and try again.");
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, fields, run, setError };
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[12px] bg-blush px-4 py-3 text-[14px] font-semibold text-red-deep">
      {message}
    </p>
  );
}
