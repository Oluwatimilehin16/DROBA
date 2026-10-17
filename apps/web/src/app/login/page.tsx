"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AuthShell, Field, FormError, useSubmit } from "@/components/forms";

function safeNext(n: string | null) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : null;
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, fields, run } = useSubmit(async () => {
    const me = await login(email, password);
    router.replace(next ?? (me.activeMode === "SELLER" ? "/studio" : "/"));
    router.refresh();
  });
  return (
    <AuthShell title="Welcome back" sub={<>New to Droba? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="link">Create an account</Link></>}>
      <form onSubmit={run} className="grid gap-4" noValidate>
        <FormError message={error} />
        <Field label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fields.password} required />
        <Link href="/forgot-password" className="link -mt-1 justify-self-end text-[13.5px]">
          Forgot password?
        </Link>
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
