"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CITY_NAMES, type Me } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { Field, FormError, useSubmit } from "@/components/forms";
import { Saved, Section } from "@/components/seller-settings";
import { Icon } from "@/components/Icon";
import { useRequireAuth } from "@/components/messages";
import { ModeSwitch } from "@/components/chrome";

function Profile({ user }: { user: Me }) {
  const { setUser } = useAuth();
  const [f, setF] = useState({ name: user.name, phone: user.phone?.replace("+234", "0") ?? "", city: user.city ?? "Lagos" });
  const [ok, setOk] = useState(false);
  const { busy, error, fields, run } = useSubmit(async () => {
    setUser(await api<Me>("/me", { method: "PATCH", body: { name: f.name, phone: f.phone || null, city: f.city } }));
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  });
  return (
    <Section title="Your details" sub={user.email}>
      <form onSubmit={run} className="grid gap-4">
        <FormError message={error} />
        <Field label="Name" name="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={fields.name} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" name="phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} error={fields.phone} />
          <label className="field">
            <span className="label">City (for “near me”)</span>
            <select className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>
              {CITY_NAMES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-dark" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <Saved show={ok} />
        </div>
      </form>
    </Section>
  );
}

export default function AccountPage() {
  const user = useRequireAuth("/account");
  const { logout, reload } = useAuth();
  const router = useRouter();
  const [resent, setResent] = useState(false);
  // Fresh copy once on open (e.g. email was just verified in another tab)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void reload(), []);
  if (!user) return null;
  return (
    <main className="wrap grid max-w-3xl gap-5 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[clamp(26px,3.6vw,36px)]">Account</h1>
        <ModeSwitch />
      </div>
      {!user.emailVerified && (
        <p className="flex flex-wrap items-center gap-3 rounded-md bg-info-bg px-4 py-3 text-[14px] text-info">
          <span className="flex-1">Confirm {user.email} to sell on Droba.</span>
          <button type="button" className="font-bold underline" disabled={resent} onClick={() => api("/auth/resend-verification", { method: "POST" }).finally(() => setResent(true))}>
            {resent ? "Link sent" : "Resend link"}
          </button>
        </p>
      )}
      <Profile user={user} />
      {user.seller ? (
        <Section title={user.seller.type === "STORE" ? "Your store" : "Selling"} sub="Store details, plan, listings and orders live in Seller Studio.">
          <div className="flex flex-wrap gap-2">
            <Link href="/studio" className="btn btn-dark">
              <Icon name="chart" size={17} />
              Open Seller Studio
            </Link>
            <Link href="/studio/storefront" className="btn btn-ghost">
              {user.seller.type === "STORE" ? "Store settings" : "Seller profile"}
            </Link>
            <Link href="/studio/plan" className="btn btn-ghost">
              Plan
            </Link>
          </div>
        </Section>
      ) : (
        <Section title="Sell on Droba" sub="List items free, or open a store with your own link.">
          <Link href="/seller/setup" className="btn btn-primary justify-self-start">
            Start selling
          </Link>
        </Section>
      )}
      <Section title="Buying" sub="Your requests and saved items.">
        <div className="flex flex-wrap gap-2">
          <Link href="/orders" className="btn btn-ghost">
            <Icon name="box" size={17} />
            My orders
          </Link>
          <Link href="/saved" className="btn btn-ghost">
            <Icon name="heart" size={17} />
            Saved items
          </Link>
          <Link href="/messages" className="btn btn-ghost">
            <Icon name="msg" size={17} />
            Messages
          </Link>
        </div>
      </Section>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => {
            await logout();
            router.push("/");
          }}
        >
          <Icon name="logout" size={17} />
          Log out
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => {
            await api("/auth/logout-all", { method: "POST" }).catch(() => {});
            await logout();
            router.push("/login");
          }}
        >
          Log out on all devices
        </button>
      </div>
    </main>
  );
}
