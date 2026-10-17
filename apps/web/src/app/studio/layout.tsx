"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { PLAN_DETAILS } from "@droba/shared";
import { useAuth } from "@/lib/auth";
import { StudioProvider, useStudio } from "@/lib/studio";
import { cx, initials } from "@/lib/format";
import { Icon, type IconName } from "@/components/Icon";
import { AccountMenu, Logo, MessagesButton, ModeSwitch } from "@/components/chrome";

/* Seller Studio: everything a seller does, in one place.
   Desktop: deep-wine sidebar (so sellers always know which side of Droba they're on) + content.
   Phone: wine top bar + the seller tab bar at the bottom. */

function Sidebar() {
  const { user } = useAuth();
  const { stats, pending } = useStudio();
  const pathname = usePathname();
  const s = user!.seller!;
  const store = s.type === "STORE";
  const item = (href: string, icon: IconName, label: string, badge?: React.ReactNode) => {
    const on = href === "/studio" ? pathname === "/studio" : pathname.startsWith(href);
    return (
      <Link href={href} className={cx("flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14.5px] font-semibold transition", on ? "bg-white text-wine" : "text-white/75 hover:bg-white/8 hover:text-white")}>
        <Icon name={icon} size={19} />
        <span className="flex-1">{label}</span>
        {badge}
      </Link>
    );
  };
  const count = (n: number | undefined, hot = false) => (n ? <span className={cx("rounded-full px-2 py-0.5 text-[11.5px] font-bold num", hot ? "bg-red text-white" : "bg-white/12")}>{n}</span> : null);
  return (
    <aside className="sticky top-0 hidden h-dvh w-[252px] shrink-0 flex-col gap-5 overflow-y-auto bg-wine px-4 py-5 text-white md:flex">
      <div className="flex items-baseline gap-1.5 px-1">
        <Logo light />
        <span className="font-serif text-[18px] text-accent-soft italic">{store ? "studio" : "selling"}</span>
      </div>
      <Link href="/studio/new" className="btn btn-primary w-full">
        <Icon name="plus" size={18} />
        New listing
      </Link>
      <nav aria-label="Seller Studio" className="grid gap-1">
        {item("/studio", "grid", "Overview")}
        {item("/studio/orders", "box", "Order requests", count(pending, true))}
        {item("/studio/listings", "tag", "Listings", count(stats?.active))}
        {item("/messages", "msg", "Messages")}
        {item("/studio/analytics", "chart", "Analytics", s.plan === "FREE" ? <Icon name="lock" size={14} className="text-white/50" /> : null)}
        {item("/studio/promote", "zap", "Boost & campaigns")}
        {item("/studio/storefront", store ? "store" : "user", store ? "Storefront" : "Seller profile")}
        {item("/studio/plan", "gem", store ? "Plan & billing" : "Open a store")}
      </nav>
      <div className="mt-auto grid gap-3 border-t border-white/10 pt-4">
        <Link href={s.handle ? `/${s.handle}` : `/seller/${s.id}`} className="flex items-center gap-3 rounded-[12px] p-2 hover:bg-white/8">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-accent-soft font-display text-[14px] font-extrabold text-wine">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {s.logoUrl ? <img src={s.logoUrl} alt="" className="size-full object-cover" /> : initials(s.displayName)}
          </span>
          <span className="min-w-0">
            <b className="block truncate text-[14px]">{s.displayName}</b>
            <small className="text-[12px] text-white/60">
              {PLAN_DETAILS[s.plan].label} · {store ? "View store" : "View profile"}
            </small>
          </span>
        </Link>
        <ModeSwitch dark />
      </div>
    </aside>
  );
}

function MobileTop() {
  const { user } = useAuth();
  const s = user!.seller!;
  return (
    <div className="sticky top-0 z-40 flex h-14 items-center gap-2 bg-wine px-4 text-white md:hidden">
      <Logo light />
      <span className="font-serif text-[16px] text-accent-soft italic">{s.type === "STORE" ? "studio" : "selling"}</span>
      <div className="ml-auto flex items-center">
        <MessagesButton light />
        <AccountMenu />
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-cream">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <MobileTop />
        <div className="mx-auto w-full max-w-[1100px] px-4 pt-5 pb-28 sm:px-6 md:pt-8 md:pb-12 lg:px-10">{children}</div>
      </div>
    </div>
  );
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, switchMode } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!user.seller) router.replace("/seller/setup");
    // Opening the Studio puts you in selling mode
    else if (user.activeMode !== "SELLER") void switchMode("SELLER").catch(() => {});
  }, [ready, user, router, pathname, switchMode]);
  if (!user?.seller) return <div className="min-h-dvh bg-cream" />;
  return (
    <StudioProvider>
      <Shell>{children}</Shell>
    </StudioProvider>
  );
}
