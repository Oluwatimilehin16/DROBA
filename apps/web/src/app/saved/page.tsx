"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ListingCard } from "@droba/shared";
import { api } from "@/lib/auth";
import { useRequireAuth } from "@/components/messages";
import { Empty, ListingGrid } from "@/components/listing";

export default function SavedPage() {
  const user = useRequireAuth("/saved");
  const [items, setItems] = useState<ListingCard[] | null>(null);
  useEffect(() => {
    if (user) api<{ items: ListingCard[] }>("/me/saved").then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [user]);
  if (!user) return null;
  return (
    <main className="wrap py-6">
      <h1 className="text-[clamp(26px,3.6vw,36px)]">Saved items</h1>
      <p className="mt-1 mb-6 text-muted">Pre-loved things go fast. Message the seller when you&apos;re ready.</p>
      {!items ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton aspect-[4/5] rounded-md" />)}</div>
      ) : items.length ? (
        <ListingGrid items={items} showDistance={false} />
      ) : (
        <Empty title="Nothing saved yet" body="Tap the heart on any item to keep it here." action={<Link href="/search" className="btn btn-primary">Browse items</Link>} />
      )}
    </main>
  );
}
