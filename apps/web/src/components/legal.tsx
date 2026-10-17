import Link from "next/link";

/* Shared layout for Terms, Privacy and Prohibited items.
   The business details below are what the pages show. Update them once Droba is registered. */
export const LEGAL = {
  name: "Droba",
  email: "hello@droba.ng",
  location: "Lagos, Nigeria",
  updated: "17 October 2026",
};

export function LegalShell({ eyebrow, title, intro, children, toc }: { eyebrow: string; title: string; intro: React.ReactNode; children: React.ReactNode; toc: [string, string][] }) {
  return (
    <main className="wrap grid gap-10 py-8 lg:grid-cols-[220px_1fr] lg:gap-14 lg:py-12">
      <aside className="hidden lg:block">
        <nav aria-label="On this page" className="sticky top-24 grid gap-1 text-[14px]">
          <span className="eyebrow mb-2">On this page</span>
          {toc.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-[8px] px-2 py-1 text-ink-2 hover:bg-cream hover:text-red">
              {label}
            </a>
          ))}
          <span className="mt-5 grid gap-1 border-t border-line pt-4">
            <Link href="/terms" className="px-2 py-1 text-ink-2 hover:text-red">
              Terms of use
            </Link>
            <Link href="/privacy" className="px-2 py-1 text-ink-2 hover:text-red">
              Privacy policy
            </Link>
            <Link href="/prohibited" className="px-2 py-1 text-ink-2 hover:text-red">
              Prohibited items
            </Link>
          </span>
        </nav>
      </aside>
      <article className="max-w-[72ch]">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="mt-2 text-[clamp(30px,4vw,44px)]">{title}</h1>
        <p className="mt-2 text-[13.5px] text-muted">Last updated {LEGAL.updated}</p>
        <div className="mt-5 text-[16px] text-ink-2">{intro}</div>
        <div className="legal mt-8 grid gap-9">{children}</div>
        <p className="mt-12 rounded-md bg-cream p-5 text-[14.5px] text-ink-2">
          Questions about this page? Email <a href={`mailto:${LEGAL.email}`} className="link">{LEGAL.email}</a>.
        </p>
      </article>
    </main>
  );
}

export function Part({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-24 gap-3 text-[15.5px] leading-relaxed text-ink-2 [&_b]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-1.5">
      <h2 className="text-[22px] text-ink">{title}</h2>
      {children}
    </section>
  );
}
