"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { DEPARTMENTS, type Mode } from "@droba/shared";
import { useAuth } from "@/lib/auth";
import { useRealtime } from "@/lib/realtime";
import { cx, firstName, initials } from "@/lib/format";
import { Icon, type IconName } from "./Icon";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" aria-label="Droba home" className="inline-flex shrink-0 items-center gap-2">
      <span className={cx("grid size-[34px] place-items-center rounded-[10px]", light ? "bg-white text-red" : "bg-red text-white")}>
        <Icon name="hanger" size={22} strokeWidth={2} />
      </span>
      <span className={cx("font-display text-[26px] leading-none font-extrabold tracking-[-0.045em]", light && "text-white")}>droba</span>
    </Link>
  );
}

/** Buyer ⇄ Seller. One account, two views. */
export function useModeSwitch() {
  const { user, switchMode } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return {
    busy,
    async go(mode: Mode) {
      if (mode === "SELLER") {
        if (!user) return router.push("/signup?next=/seller/setup");
        if (!user.seller) return router.push("/seller/setup");
      }
      if (!user) return router.push("/");
      setBusy(true);
      try {
        if (user.activeMode !== mode) await switchMode(mode);
        router.push(mode === "SELLER" ? "/dashboard" : "/");
      } finally {
        setBusy(false);
      }
    },
  };
}

export function ModeSwitch({ dark = false }: { dark?: boolean }) {
  const { user } = useAuth();
  const { go, busy } = useModeSwitch();
  const mode = user?.activeMode ?? "BUYER";
  const btn = (m: Mode, icon: IconName, label: string) => (
    <button
      type="button"
      disabled={busy}
      onClick={() => go(m)}
      aria-pressed={mode === m}
      className={cx(
        "inline-flex h-[34px] items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-bold transition",
        mode === m ? (dark ? "bg-white text-wine" : "bg-white text-ink shadow-[var(--shadow-1)]") : dark ? "text-white/70 hover:text-white" : "text-ink-2 hover:text-ink",
      )}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="Switch between shopping and selling" className={cx("inline-flex gap-0.5 rounded-full p-[3px]", dark ? "bg-white/10" : "bg-cream-2")}>
      {btn("BUYER", "bag", "Shopping")}
      {btn("SELLER", "tag", "Selling")}
    </div>
  );
}

function SearchBox({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [q, setQ] = useState(pathname === "/search" ? (params.get("q") ?? "") : "");
  useEffect(() => {
    if (pathname === "/search") setQ(params.get("q") ?? "");
  }, [params, pathname]);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const next = new URLSearchParams(pathname === "/search" ? params.toString() : "");
        if (q.trim()) next.set("q", q.trim());
        else next.delete("q");
        next.delete("page");
        router.push(`/search?${next.toString()}`);
      }}
      className={cx("flex h-11 w-full items-center gap-2 rounded-full border-[1.5px] border-line bg-cream pl-4 pr-1.5 transition focus-within:border-ink focus-within:bg-white", compact && "h-10")}
    >
      <Icon name="search" size={16} className="text-muted" />
      <input
        name="q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search dresses, iPhones, fridges, sofas…"
        aria-label="Search Droba"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
      />
      <button aria-label="Search" className="grid size-8 place-items-center rounded-full bg-ink text-white">
        <Icon name="arrowR" size={16} />
      </button>
    </form>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const { go } = useModeSwitch();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  if (!user) return null;
  const selling = user.activeMode === "SELLER";
  const item = "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[14.5px] font-semibold hover:bg-cream";
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="icon-btn">
        <span className={cx("grid size-[34px] place-items-center rounded-full text-[13px] font-extrabold", selling ? "bg-accent-soft text-wine" : "bg-blush text-red-deep")}>{initials(user.name)}</span>
      </button>
      {open && (
        <div className="absolute top-12 right-0 z-50 w-72 rounded-[16px] border border-line bg-white p-2 text-ink shadow-[var(--shadow-2)]" onClick={() => setOpen(false)}>
          <div className="flex items-center gap-3 border-b border-line px-3 pt-2 pb-3">
            <span className="grid size-10 place-items-center rounded-full bg-blush text-sm font-extrabold text-red-deep">{initials(user.name)}</span>
            <div className="min-w-0">
              <b className="block truncate">{user.name}</b>
              <span className="block truncate text-[13px] text-muted">{user.email}</span>
            </div>
          </div>
          <button type="button" className={cx(item, "my-1 bg-cream")} onClick={() => go(selling ? "BUYER" : "SELLER")}>
            <Icon name="swap" />
            <span>
              <b className="block">{selling ? "Switch to shopping" : "Switch to selling"}</b>
              <small className="font-medium text-muted">{selling ? "Browse and buy" : user.seller ? (user.seller.type === "STORE" ? user.seller.displayName : "Your listings · Free seller") : "Sell something. It's free"}</small>
            </span>
          </button>
          <Link href="/account" className={item}>
            <Icon name="user" />
            My account
          </Link>
          <Link href="/saved" className={item}>
            <Icon name="heart" />
            Saved items
          </Link>
          <Link href="/messages" className={item}>
            <Icon name="msg" />
            Messages
          </Link>
          {user.seller?.handle && (
            <Link href={`/${user.seller.handle}`} className={item}>
              <Icon name="store" />
              View my store
            </Link>
          )}
          <button
            type="button"
            className={item}
            onClick={async () => {
              await logout();
              router.push("/");
              router.refresh();
            }}
          >
            <Icon name="logout" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function MessagesButton({ light = false }: { light?: boolean }) {
  const { unread } = useRealtime();
  return (
    <Link href="/messages" aria-label={`Messages${unread ? `, ${unread} unread` : ""}`} className={cx("icon-btn", light && "text-white hover:bg-white/10")}>
      <Icon name="msg" />
      {unread > 0 && <span className="absolute top-[3px] right-px grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-red px-[5px] text-[10.5px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
}

const NAV_DEPTS = ["fashion", "phones", "computers", "appliances", "furniture", "vehicles"];

export function Header() {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const selling = user?.activeMode === "SELLER";
  const { go } = useModeSwitch();

  if (selling) {
    const tab = (href: string, label: string) => (
      <Link href={href} className={cx("rounded-full px-3.5 py-2 text-[14px] font-semibold transition", pathname === href ? "bg-white/12 text-white" : "text-white/70 hover:text-white")}>
        {label}
      </Link>
    );
    return (
      <header className="sticky top-0 z-40 bg-wine text-white">
        <div className="wrap flex h-16 items-center gap-4">
          <Logo light />
          <span className="hidden rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold tracking-[.14em] text-accent-soft uppercase sm:inline">Seller</span>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Seller">
            {tab("/dashboard", "Dashboard")}
            {tab("/sell", "New listing")}
            {tab("/messages", "Messages")}
            {user?.seller?.handle && tab(`/${user.seller.handle}`, "My store")}
            {tab("/account", "Settings")}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <span className="hidden sm:block">
              <ModeSwitch dark />
            </span>
            <MessagesButton light />
            <AccountMenu />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-md">
      <div className="wrap">
        <div className="flex h-16 items-center gap-3 md:gap-4">
          <Logo />
          <Link href="/categories" className="hidden h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold hover:bg-cream-2 lg:inline-flex">
            <Icon name="grid" size={16} />
            Categories
          </Link>
          <div className="hidden flex-1 md:block">
            <Suspense>
              <SearchBox />
            </Suspense>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {user ? (
              <span className="hidden lg:block">
                <ModeSwitch />
              </span>
            ) : (
              <button type="button" onClick={() => go("SELLER")} className="btn btn-outline-red btn-sm hidden lg:inline-flex">
                <Icon name="tag" size={16} />
                Sell something
              </button>
            )}
            <Link href="/saved" aria-label="Saved items" className="icon-btn hidden sm:inline-grid">
              <Icon name="heart" />
            </Link>
            {user && <MessagesButton />}
            {user ? (
              <AccountMenu />
            ) : (
              <span className={cx("flex items-center gap-1.5 transition-opacity", ready ? "opacity-100" : "opacity-0")}>
                <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
                  Log in
                </Link>
                <Link href="/signup" className="btn btn-primary btn-sm">
                  Join
                </Link>
              </span>
            )}
          </div>
        </div>
        <div className="pb-3 md:hidden">
          <Suspense>
            <SearchBox compact />
          </Suspense>
        </div>
        <nav aria-label="Departments" className="scroll-x -mx-1 hidden items-center pb-2.5 md:flex">
          {DEPARTMENTS.filter((d) => NAV_DEPTS.includes(d.id)).map((d) => (
            <Link key={d.id} href={`/search?department=${d.id}`} className="shrink-0 rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-ink-2 hover:bg-cream-2 hover:text-ink">
              {d.label}
            </Link>
          ))}
          <Link href="/categories" className="shrink-0 rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-ink-2 hover:bg-cream-2">
            More categories
          </Link>
          <span className="mx-2 h-4 w-px bg-line-2" />
          <Link href="/search?sort=distance" className="shrink-0 rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-ink-2 hover:bg-cream-2">
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" size={14} />
              Near me
            </span>
          </Link>
          <button type="button" onClick={() => go("SELLER")} className="shrink-0 rounded-full px-3 py-1.5 text-[13.5px] font-bold text-red hover:bg-blush">
            Sell something
          </button>
        </nav>
      </div>
    </header>
  );
}

/** Phone tab bar */
export function TabBar() {
  const { user } = useAuth();
  const { unread } = useRealtime();
  const pathname = usePathname();
  const { go } = useModeSwitch();
  const selling = user?.activeMode === "SELLER";
  const t = (href: string, icon: IconName, label: string, badge = 0) => (
    <Link href={href} className={cx("relative flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold", pathname === href ? (selling ? "text-white" : "text-red") : selling ? "text-white/60" : "text-muted")}>
      <Icon name={icon} size={22} />
      {label}
      {badge > 0 && <span className="absolute top-1 left-1/2 ml-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red px-1 text-[10px] font-bold text-white">{badge}</span>}
    </Link>
  );
  return (
    <nav aria-label="Main" className={cx("safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t md:hidden", selling ? "border-white/10 bg-wine" : "border-line bg-white/95 backdrop-blur")}>
      {selling ? t("/dashboard", "chart", "Dashboard") : t("/", "home", "Home")}
      {selling ? t(user?.seller?.handle ? `/${user.seller.handle}` : "/account", "store", "Store") : t("/search", "search", "Shop")}
      {selling ? (
        t("/sell", "plus", "Sell")
      ) : (
        <button type="button" onClick={() => go("SELLER")} className="flex flex-1 flex-col items-center gap-0.5 pt-1 pb-1.5 text-[11px] font-semibold text-muted">
          <span className="-mt-3 grid size-11 place-items-center rounded-full bg-red text-white shadow-[var(--shadow-2)]">
            <Icon name="plus" size={22} />
          </span>
          Sell
        </button>
      )}
      {t("/messages", "msg", "Messages", unread)}
      {t(user ? "/account" : "/login", "user", user ? firstName(user.name) || "Me" : "Log in")}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-cream pb-24 md:pb-0">
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="grid content-start gap-3">
          <Logo />
          <p className="max-w-[36ch] text-muted">Nigeria&apos;s marketplace for pre-loved everything. Droba connects you with sellers near you. You inspect, then pay them on delivery.</p>
        </div>
        <div>
          <h5 className="eyebrow mb-3">Shop</h5>
          <ul className="grid gap-2 text-[14.5px]">
            {DEPARTMENTS.slice(0, 6).map((d) => (
              <li key={d.id}>
                <Link href={`/search?department=${d.id}`} className="hover:text-red">
                  {d.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/categories" className="hover:text-red">
                All categories
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="eyebrow mb-3">Sell</h5>
          <ul className="grid gap-2 text-[14.5px]">
            <li>
              <Link href="/seller/setup" className="hover:text-red">
                Sell something free
              </Link>
            </li>
            <li>
              <Link href="/seller/setup?store=1" className="hover:text-red">
                Open a store
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="eyebrow mb-3">Help</h5>
          <ul className="grid gap-2 text-[14.5px]">
            <li>
              <Link href="/safety" className="hover:text-red">
                Buying safely
              </Link>
            </li>
            <li>
              <Link href="/safety#grades" className="hover:text-red">
                How grading works
              </Link>
            </li>
            <li className="text-muted">hello@droba.ng</li>
          </ul>
        </div>
      </div>
      <div className="wrap flex flex-wrap justify-between gap-2 border-t border-line py-5 text-[13px] text-muted">
        <span>© 2026 Droba. Pre-loved only. Droba does not handle payments between buyers and sellers.</span>
        <span>Lagos · Abuja · Ibadan · Port Harcourt</span>
      </div>
    </footer>
  );
}
