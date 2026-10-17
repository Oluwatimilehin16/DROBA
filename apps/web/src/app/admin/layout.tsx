"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { cx } from "@/lib/format";
import { Icon, type IconName } from "@/components/Icon";
import { AccountMenu, Logo } from "@/components/chrome";

/* Droba admin: moderation and store verification. Only accounts with the ADMIN role get in
   (the API checks this on every call too). Make someone an admin: npm run make-admin -- their@email.com */

const NAV: [string, IconName, string][] = [
  ["/admin", "grid", "Overview"],
  ["/admin/reports", "info", "Reports"],
  ["/admin/verifications", "shield", "Verification"],
  ["/admin/users", "user2", "People"],
  ["/admin/listings", "tag", "Listings"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);

  if (!user) return <div className="min-h-dvh bg-cream" />;
  if (user.role !== "ADMIN")
    return (
      <main className="wrap grid min-h-[60vh] place-items-center py-16 text-center">
        <div className="grid justify-items-center gap-3">
          <Icon name="lock" size={32} className="text-muted" />
          <h1 className="text-2xl">Admins only</h1>
          <p className="text-muted">This part of Droba is for the team that keeps it safe.</p>
          <Link href="/" className="btn btn-dark">
            Back to shopping
          </Link>
        </div>
      </main>
    );

  const on = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  return (
    <div className="flex min-h-dvh bg-cream">
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col gap-5 bg-ink px-4 py-5 text-white md:flex">
        <div className="flex items-baseline gap-1.5 px-1">
          <Logo light />
          <span className="font-serif text-[18px] text-accent-soft italic">admin</span>
        </div>
        <nav aria-label="Admin" className="grid gap-1">
          {NAV.map(([href, icon, label]) => (
            <Link key={href} href={href} className={cx("flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14.5px] font-semibold transition", on(href) ? "bg-white text-ink" : "text-white/70 hover:bg-white/8 hover:text-white")}>
              <Icon name={icon} size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="mt-auto flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-[14px] font-semibold text-white/70 hover:bg-white/8 hover:text-white">
          <Icon name="arrowL" size={17} />
          Back to Droba
        </Link>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-40 grid gap-2 bg-ink px-4 pt-3 pb-2 text-white md:hidden">
          <div className="flex items-center gap-2">
            <Logo light />
            <span className="font-serif text-[16px] text-accent-soft italic">admin</span>
            <div className="ml-auto">
              <AccountMenu />
            </div>
          </div>
          <nav aria-label="Admin" className="scroll-x -mx-1 px-1">
            {NAV.map(([href, , label]) => (
              <Link key={href} href={href} className={cx("shrink-0 rounded-full px-3 py-1.5 text-[13.5px] font-semibold", on(href) ? "bg-white text-ink" : "text-white/75")}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mx-auto w-full max-w-[1100px] px-4 pt-5 pb-16 sm:px-6 md:pt-8 lg:px-10">{children}</div>
      </div>
    </div>
  );
}
