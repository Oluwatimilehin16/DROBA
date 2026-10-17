"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/auth";
import { AuthShell, Field, FormError, useSubmit } from "@/components/forms";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { busy, error, fields, run } = useSubmit(async () => {
    await api("/auth/forgot-password", { body: { email } });
    setSent(true);
  });
  return (
    <AuthShell title="Reset your password" sub="We'll email you a link to choose a new one.">
      {sent ? (
        <div className="grid gap-4">
          <p className="rounded-[12px] bg-ok-bg px-4 py-3 text-[14.5px] text-ok">If an account exists for {email}, a reset link is on its way. It works for 1 hour.</p>
          <Link href="/login" className="btn btn-dark">
            Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={run} className="grid gap-4" noValidate>
          <FormError message={error} />
          <Field label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} required />
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
