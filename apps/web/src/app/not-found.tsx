import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap grid min-h-[55vh] place-items-center py-16 text-center">
      <div className="grid justify-items-center gap-3">
        <span className="font-display text-[64px] leading-none font-extrabold text-red">404</span>
        <h1 className="text-[26px]">We couldn&apos;t find that</h1>
        <p className="max-w-[40ch] text-muted">The item may have sold, or the store link may have changed.</p>
        <div className="mt-2 flex gap-2">
          <Link href="/" className="btn btn-primary">
            Go home
          </Link>
          <Link href="/search" className="btn btn-ghost">
            Browse items
          </Link>
        </div>
      </div>
    </main>
  );
}
