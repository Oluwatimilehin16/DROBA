"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEPARTMENTS } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { DEPT_IMG } from "@/lib/images";
import { cx, firstName } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { useModeSwitch } from "@/components/chrome";

/** First-run screen after sign-up: what are you shopping for (picture tiles), or jump straight to selling. */
export default function Welcome() {
  const { user, ready, reload } = useAuth();
  const router = useRouter();
  const { go } = useModeSwitch();
  const [picked, setPicked] = useState<string[]>([]);
  const [resent, setResent] = useState(false);
  useEffect(() => {
    if (ready && !user) router.replace("/signup");
  }, [ready, user, router]);
  if (!user) return null;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const done = () => {
    try {
      localStorage.setItem("droba:interests", JSON.stringify(picked));
    } catch {
      /* ignore */
    }
    router.push(picked.length === 1 ? `/search?department=${picked[0]}` : "/");
  };
  return (
    <main className="wrap max-w-5xl py-8">
      {!user.emailVerified && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-md bg-info-bg px-4 py-3 text-[14px] text-info">
          <Icon name="info" />
          <span className="flex-1">
            We sent a confirmation link to <b>{user.email}</b>. Confirm it to start selling.
          </span>
          <button
            type="button"
            className="font-bold underline"
            disabled={resent}
            onClick={async () => {
              await api("/auth/resend-verification", { method: "POST" }).catch(() => {});
              setResent(true);
              void reload();
            }}
          >
            {resent ? "Sent" : "Resend"}
          </button>
        </div>
      )}
      <span className="eyebrow">Welcome, {firstName(user.name)}</span>
      <h1 className="mt-2 text-[clamp(28px,4vw,42px)]">
        What are you <span className="serif text-red">shopping for?</span>
      </h1>
      <p className="mt-2 text-muted">Pick a few. We&apos;ll put them first on your home page.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {DEPARTMENTS.map((d) => {
          const on = picked.includes(d.id);
          return (
            <button key={d.id} type="button" aria-pressed={on} onClick={() => toggle(d.id)} className={cx("group relative aspect-[4/3] overflow-hidden rounded-md text-left ring-offset-2 transition", on ? "ring-[3px] ring-red" : "ring-0")}>
              <Image src={DEPT_IMG[d.id]!} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute bottom-3 left-3 right-10 font-display text-[16px] leading-tight font-bold text-white">{d.label}</span>
              <span className={cx("absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full border-2 border-white", on ? "bg-red text-white" : "bg-black/20")}>{on && <Icon name="check" size={15} strokeWidth={3} />}</span>
            </button>
          );
        })}
      </div>
      <div className="safe-bottom sticky bottom-[58px] mt-8 flex flex-wrap items-center gap-3 border-t border-line bg-white/95 py-4 backdrop-blur md:bottom-0">
        <button type="button" className="btn btn-primary btn-lg flex-1 sm:flex-none" onClick={done}>
          {picked.length ? `Show me ${picked.length === 1 ? "this" : "these"}` : "Skip for now"}
        </button>
        <button type="button" className="btn btn-ghost btn-lg" onClick={() => go("SELLER")}>
          <Icon name="tag" size={18} />I want to sell
        </button>
      </div>
    </main>
  );
}
