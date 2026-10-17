import type { Metadata } from "next";
import Link from "next/link";
import { PROHIBITED_ITEMS } from "@droba/shared";
import { LegalShell, Part } from "@/components/legal";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "What you can't sell", description: "Items that aren't allowed on Droba, and items that need extra care." };

const CARE: [string, string][] = [
  ["Phones, tablets and laptops", "Check the IMEI or serial isn't blacklisted or reported stolen. Remove your accounts (iCloud, Google) before you sell."],
  ["Cars and motorcycles", "Have the papers ready: proof of ownership, customs papers for tokunbo vehicles, and a VIN that matches."],
  ["Designer bags, shoes and watches", "Only call it original if it is. Say so clearly if it's a replica, or don't list it."],
  ["Electricals and generators", "Test them before listing and say honestly what works and what doesn't."],
  ["Baby gear and car seats", "Don't sell car seats that have been in an accident, or anything that's been recalled."],
  ["Books, games and media", "Originals only. No pirated copies or downloads."],
];

export default function Prohibited() {
  return (
    <LegalShell
      eyebrow="Selling on Droba"
      title="What you can't sell"
      toc={[...PROHIBITED_ITEMS.map((g, i) => [`g${i}`, g.group] as [string, string]), ["care", "Allowed, with care"], ["report", "If you see something"]]}
      intro={
        <p>
          Droba is for pre-owned items that are legal to sell in Nigeria. Listings with anything below are removed, and sellers who keep listing them are suspended. This list is part of our{" "}
          <Link href="/terms" className="link">
            terms of use
          </Link>
          .
        </p>
      }
    >
      {PROHIBITED_ITEMS.map((g, i) => (
        <Part key={g.group} id={`g${i}`} title={g.group}>
          <ul className="!list-none !gap-2">
            {g.items.map((it) => (
              <li key={it} className="!ml-0 flex !list-none gap-2.5">
                <Icon name="x" size={18} className="mt-0.5 text-red" strokeWidth={2.2} />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </Part>
      ))}
      <Part id="care" title="Allowed, with care">
        <div className="grid gap-3 sm:grid-cols-2">
          {CARE.map(([t, b]) => (
            <div key={t} className="rounded-md border border-line p-4">
              <b className="flex items-center gap-2 font-display text-[15.5px]">
                <Icon name="check" size={17} className="text-ok" strokeWidth={2.2} />
                {t}
              </b>
              <p className="mt-1 text-[14px] text-muted">{b}</p>
            </div>
          ))}
        </div>
      </Part>
      <Part id="report" title="If you see something">
        <p>Tap <b>Report this listing</b> at the bottom of any listing, or <b>Report this store</b> on a store page. Reports are anonymous: we never tell the seller who reported them. If someone asks you to pay before delivery, stop and report them.</p>
      </Part>
    </LegalShell>
  );
}
