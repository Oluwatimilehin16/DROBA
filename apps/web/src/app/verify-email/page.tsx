"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { api, useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/http";
import { Icon } from "@/components/Icon";

function Verify() {
  const token = useSearchParams().get("token");
  const { reload, user } = useAuth();
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const [msg, setMsg] = useState("");
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    if (!token) {
      setState("error");
      setMsg("This link is missing its code.");
      return;
    }
    api("/auth/verify-email", { body: { token } })
      .then(() => {
        setState("ok");
        void reload();
      })
      .catch((e) => {
        setState("error");
        setMsg(e instanceof ApiError ? e.message : "Something went wrong.");
      });
  }, [token, reload]);
  return (
    <main className="wrap grid min-h-[60vh] place-items-center py-10 text-center">
      <div className="grid max-w-md justify-items-center gap-3">
        <span className={`grid size-16 place-items-center rounded-full ${state === "error" ? "bg-blush text-red" : "bg-ok-bg text-ok"}`}>
          <Icon name={state === "error" ? "x" : "check"} size={30} strokeWidth={2.4} />
        </span>
        <h1 className="text-3xl">{state === "working" ? "Confirming…" : state === "ok" ? "Email confirmed" : "That link didn't work"}</h1>
        <p className="text-muted">{state === "ok" ? "You're all set. You can now sell on Droba." : msg}</p>
        <div className="mt-3 flex gap-2">
          {state === "ok" ? (
            <>
              <Link href={user?.seller ? "/sell" : "/seller/setup"} className="btn btn-primary">
                Start selling
              </Link>
              <Link href="/" className="btn btn-ghost">
                Shop
              </Link>
            </>
          ) : (
            state === "error" && (
              <Link href="/account" className="btn btn-dark">
                Send a new link
              </Link>
            )
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
