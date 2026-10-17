"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/auth";
import { AuthShell, Field, FormError, useSubmit } from "@/components/forms";

function Reset() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const { busy, error, fields, run } = useSubmit(async () => {
    await api("/auth/reset-password", { body: { token, password } });
    setDone(true);
  });
  return (
    <AuthShell title="Choose a new password">
      {done ? (
        <div className="grid gap-4">
          <p className="rounded-[12px] bg-ok-bg px-4 py-3 text-ok">Password changed. For your safety we signed you out everywhere.</p>
          <Link href="/login" className="btn btn-primary">
            Log in
          </Link>
        </div>
      ) : (
        <form onSubmit={run} className="grid gap-4" noValidate>
          <FormError message={error} />
          <Field label="New password" name="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fields.password} hint="At least 8 characters" />
          <button className="btn btn-primary btn-lg" disabled={busy || !token}>
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <Reset />
    </Suspense>
  );
}
