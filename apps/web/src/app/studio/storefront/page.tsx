"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { SITE_HOST, SITE_URL } from "@/lib/config";
import { Icon } from "@/components/Icon";
import { BusinessDetailsForm, StoreSettings, VerificationPanel } from "@/components/seller-settings";
import { StudioHeader } from "@/components/studio-ui";

export default function StudioStorefront() {
  const { user } = useAuth();
  const s = user!.seller!;
  const store = s.type === "STORE";
  const [copied, setCopied] = useState(false);
  const link = `${SITE_URL.replace(/\/$/, "")}/${s.handle}`;
  return (
    <>
      <StudioHeader
        title={store ? "Storefront" : "Seller profile"}
        sub={store ? "How your store looks to buyers. Your banner is just the photo, so pick one that shows what you sell." : "Buyers see this on your listings."}
        actions={
          <Link href={s.handle ? `/${s.handle}` : `/seller/${s.id}`} className="btn btn-ghost btn-sm">
            <Icon name="eye" size={16} />
            See it as a buyer
          </Link>
        }
      />
      {store && s.handle && (
        <section className="mb-5 flex flex-wrap items-center gap-3 rounded-lg bg-wine p-5 text-white">
          <Icon name="link" size={22} className="text-accent-soft" />
          <div className="min-w-0 flex-1">
            <span className="eyebrow text-accent-soft">Your store link</span>
            <b className="block truncate font-display text-[19px]">
              {SITE_HOST}/{s.handle}
            </b>
            <span className="text-[13px] text-white/70">Put it in your Instagram bio, WhatsApp status and flyers.</span>
          </div>
          <button
            type="button"
            className="btn btn-light btn-sm"
            onClick={async () => {
              try {
                if (navigator.share) await navigator.share({ title: `${s.displayName} on Droba`, url: link });
                else {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              } catch {
                /* dismissed */
              }
            }}
          >
            <Icon name={copied ? "check" : "link"} size={15} />
            {copied ? "Copied" : "Share link"}
          </button>
        </section>
      )}
      <div className="grid max-w-3xl gap-5">
        <StoreSettings user={user!} />
        {s.plan === "BUSINESS" ? (
          <BusinessDetailsForm user={user!} />
        ) : (
          store && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-dashed border-line-2 bg-white p-5 text-[14px] text-ink-2">
              <Icon name="lock" size={16} />
              Business stores can also show opening hours, delivery areas, a shop address and a store policy.
              <Link href="/studio/plan" className="link">
                See Business
              </Link>
            </p>
          )
        )}
        <VerificationPanel user={user!} />
      </div>
      {!store && (
        <p className="mt-5 max-w-3xl rounded-lg border border-line bg-white p-5 text-[14px] text-ink-2">
          Want a banner, logo and your own link like <b>{SITE_HOST}/yourstore</b>?{" "}
          <Link href="/studio/plan" className="link">
            Open a store
          </Link>
        </p>
      )}
    </>
  );
}
