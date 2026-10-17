import type { Metadata } from "next";
import { CONDITIONS, CONDITION_INFO } from "@droba/shared";
import { Icon, type IconName } from "@/components/Icon";
import { ConditionBars } from "@/components/listing";

export const metadata: Metadata = { title: "Buying safely & condition grades" };

const STEPS: [IconName, string, string][] = [
  ["msg", "Chat on Droba first", "Ask questions, request more photos and agree a price in Droba chat, so there's a record."],
  ["eye", "Inspect before you pay", "Check the item against its photos, condition grade, measurements or specs."],
  ["plug", "Test electronics and appliances", "Power them on. Check IMEI, serial numbers and battery health."],
  ["cash", "Pay the seller on delivery", "Droba never takes payment. Never send money in advance, or share OTPs and card PINs."],
  ["pin", "Meet somewhere safe", "Choose a public place in daylight for pickups, or bring someone along."],
  ["star", "Rate the seller", "Your rating helps the next buyer decide who to trust."],
];

export default function Safety() {
  return (
    <main className="wrap grid max-w-3xl gap-10 py-8">
      <section>
        <span className="eyebrow">Buying on Droba</span>
        <h1 className="mt-2 text-[clamp(28px,4vw,40px)]">
          Inspect it. <span className="serif text-red">Then pay the seller.</span>
        </h1>
        <ol className="mt-6 grid gap-4">
          {STEPS.map(([icon, a, b], i) => (
            <li key={a} className="flex gap-4 rounded-md border border-line p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blush text-red">
                <Icon name={icon} />
              </span>
              <span>
                <b className="font-display text-[16px]">
                  {i + 1}. {a}
                </b>
                <p className="text-[14.5px] text-muted">{b}</p>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <section id="grades">
        <h2 className="text-[26px]">How condition grades work</h2>
        <p className="mt-1 text-muted">Sellers choose a grade for every item. Everything on Droba is pre-owned.</p>
        <div className="mt-5 grid gap-3">
          {CONDITIONS.map((c) => (
            <div key={c} className="flex items-start gap-3 rounded-md bg-cream p-4">
              <span className="mt-1.5">
                <ConditionBars condition={c} />
              </span>
              <span>
                <b className="font-display text-[16px]">{CONDITION_INFO[c].label}</b>
                <p className="text-[14.5px] text-ink-2">{CONDITION_INFO[c].description}</p>
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
