"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CITY_NAMES } from "@droba/shared";
import { useAuth } from "@/lib/auth";
import { cx } from "@/lib/format";
import { AuthShell, Field, FormError, useSubmit } from "@/components/forms";

function SignupForm() {
  const { signup } = useAuth();
  const router = useRouter();
  const raw = useSearchParams().get("next");
  const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
  const [f, setF] = useState({ name: "", email: "", password: "", phone: "", city: "Lagos" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const { busy, error, fields, run } = useSubmit(async () => {
    await signup({ name: f.name, email: f.email, password: f.password, city: f.city, phone: f.phone || undefined });
    router.replace(next ?? "/welcome");
  });
  return (
    <AuthShell
      title={<>Join <span className="serif text-red">Droba</span></>}
      sub={<>Already have an account? <Link href="/login" className="link">Log in</Link></>}
      image="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=70"
    >
      <form onSubmit={run} className="grid gap-4" noValidate>
        <p className="rounded-[12px] bg-cream px-4 py-3 text-[14px] text-ink-2">One account for buying <b>and</b> selling. Switch between them any time.</p>
        <FormError message={error} />
        <Field label="Full name" name="name" autoComplete="name" value={f.name} onChange={set("name")} error={fields.name} required />
        <Field label="Email" name="email" type="email" autoComplete="email" value={f.email} onChange={set("email")} error={fields.email} required />
        <Field label="Password" name="password" type="password" autoComplete="new-password" value={f.password} onChange={set("password")} error={fields.password} hint="At least 8 characters" required />
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            <span className="label">City</span>
            <select name="city" className={cx("input", fields.city && "input-err")} value={f.city} onChange={set("city")}>
              {CITY_NAMES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <Field label="Phone (optional)" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" value={f.phone} onChange={set("phone")} error={fields.phone} />
        </div>
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? "Creating your account…" : "Create account"}
        </button>
        <p className="hint text-center">
          By creating an account you agree to Droba&apos;s{" "}
          <Link href="/terms" className="font-semibold text-ink underline underline-offset-2">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-ink underline underline-offset-2">
            privacy policy
          </Link>
          , and that you&apos;re 18 or older. We&apos;ll email you a link to confirm your address.
        </p>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
