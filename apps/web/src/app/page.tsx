import Image from "next/image";
import Link from "next/link";
import { serverGetSafe } from "@/lib/server";
import { HERO_IMG, POPULAR } from "@/lib/images";
import { Icon } from "@/components/Icon";
import { SeeAll, SectionHead } from "@/components/listing";
import { CategoryTiles, Feed, HomeGreeting, NearYou, SellCta, type PopularStore } from "./home-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stores = await serverGetSafe<{ items: PopularStore[] }>("/sellers", { items: [] }, 120);

  return (
    <main className="wrap pt-6 sm:pt-8">
      <HomeGreeting />

      <section className="relative mt-5 overflow-hidden rounded-lg bg-wine text-white">
        <Image src={HERO_IMG} alt="" fill priority sizes="100vw" className="object-cover opacity-45" />
        <div className="relative grid gap-4 px-6 py-10 sm:px-10 sm:py-14 lg:max-w-[60%]">
          <span className="eyebrow text-white/75">Pre-loved only · Nigeria</span>
          <h1 className="text-[clamp(32px,5vw,56px)]">
            Pre-loved everything, <span className="serif">honestly graded.</span>
          </h1>
          <p className="max-w-[52ch] text-white/85">Fashion, phones, furniture, appliances, baby gear and cars from real homes and trusted stores near you. Bag what you love, send the seller a request, and pay them when it arrives.</p>
          <div className="mt-2 flex flex-wrap gap-2.5">
            <Link href="/search?sort=distance" className="btn btn-primary btn-lg">
              <Icon name="pin" size={18} />
              Shop near me
            </Link>
            <SellCta />
          </div>
        </div>
      </section>

      <section className="mt-14 sm:mt-16">
        <SectionHead title="Shop by category" sub="Everything pre-owned, from wardrobes to car parks." action={<SeeAll href="/categories" />} />
        <CategoryTiles />
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-[20px]">Popular right now</h2>
        <div className="scroll-x -mx-4 gap-4 px-4 pb-1 sm:mx-0 sm:px-0">
          {POPULAR.map((c) => (
            <Link key={c.category} href={`/search?category=${encodeURIComponent(c.category)}`} className="flex w-[84px] shrink-0 flex-col items-center gap-2 text-center text-[13px] leading-tight font-semibold sm:w-[104px]">
              <span className="relative block aspect-square w-full overflow-hidden rounded-full border-[1.5px] border-line bg-cream transition hover:-translate-y-0.5 hover:border-red">
                <Image src={c.img} alt="" fill sizes="104px" className="object-cover" />
              </span>
              {c.category}
            </Link>
          ))}
        </div>
      </section>

      <NearYou />

      <Feed stores={stores.items} />

      <section className="mt-16 grid gap-4 rounded-lg bg-cream p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
        {[
          ["layers", "Graded condition", "Four clear grades chosen by sellers and shown on every item."],
          ["bag", "Bag it, request it", "Send one request per seller. They confirm and arrange delivery with you."],
          ["eye", "Inspect, then pay", "Check it, test it, then pay the seller. Never pay in advance."],
          ["star", "Rate every seller", "Ratings keep sellers honest and help the next buyer."],
        ].map(([icon, title, body]) => (
          <div key={title} className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-red">
              <Icon name={icon as "layers"} />
            </span>
            <div>
              <h4 className="text-[16px]">{title}</h4>
              <p className="mt-1 text-[14px] text-muted">{body}</p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
