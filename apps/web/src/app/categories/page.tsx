import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DEPARTMENTS } from "@droba/shared";
import { DEPT_IMG } from "@/lib/images";

export const metadata: Metadata = { title: "All categories", description: "Every department on Droba: fashion, phones, computers, appliances, furniture, baby gear, vehicles and more." };

export default function Categories() {
  return (
    <main className="wrap py-6">
      <h1 className="text-[clamp(26px,3.6vw,38px)]">All categories</h1>
      <p className="mt-1 text-muted">Everything pre-owned, from wardrobes to car parks.</p>
      <div className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {DEPARTMENTS.map((d) => (
          <section key={d.id} className="grid content-start gap-3">
            <Link href={`/search?department=${d.id}`} className="group relative block aspect-[16/9] overflow-hidden rounded-md bg-cream-2">
              <Image src={DEPT_IMG[d.id]!} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-white">
                <b className="font-display text-[19px]">{d.label}</b>
                <small className="block text-white/80">{d.blurb}</small>
              </span>
            </Link>
            <div className="flex flex-wrap gap-1.5">
              {d.categories.map((c) => (
                <Link key={c} href={`/search?category=${encodeURIComponent(c)}`} className="chip h-8 text-[13px]">
                  {c}
                </Link>
              ))}
              {d.id === "fashion" && (
                <>
                  <Link href="/search?department=fashion&gender=WOMEN" className="chip h-8 text-[13px]">
                    Women
                  </Link>
                  <Link href="/search?department=fashion&gender=MEN" className="chip h-8 text-[13px]">
                    Men
                  </Link>
                </>
              )}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
