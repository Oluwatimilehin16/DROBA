"use client";
import { useState } from "react";
import { useStudio } from "@/lib/studio";
import { OrderCard } from "@/components/orders";
import { Empty } from "@/components/listing";
import { StudioHeader, Tabs } from "@/components/studio-ui";

type Tab = "new" | "confirmed" | "done";

export default function StudioOrders() {
  const { orders, upsertOrder } = useStudio();
  const [tab, setTab] = useState<Tab>("new");
  const groups: Record<Tab, typeof orders> = {
    new: orders?.filter((o) => o.status === "PENDING") ?? [],
    confirmed: orders?.filter((o) => o.status === "CONFIRMED") ?? [],
    done: orders?.filter((o) => ["DELIVERED", "DECLINED", "CANCELLED"].includes(o.status)) ?? [],
  };
  const list = groups[tab] ?? [];
  return (
    <>
      <StudioHeader title="Order requests" sub="Confirm a request, then call or message the buyer to arrange delivery or pickup. They pay you when they receive the item; Droba doesn't handle payment or delivery." />
      <Tabs<Tab>
        tabs={[
          ["new", "New", groups.new?.length],
          ["confirmed", "To deliver", groups.confirmed?.length],
          ["done", "Done", groups.done?.length],
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="grid max-w-3xl gap-4">
        {!orders ? (
          Array.from({ length: 2 }, (_, i) => <div key={i} className="skeleton h-56 rounded-lg" />)
        ) : list.length ? (
          list.map((o) => <OrderCard key={`${o.id}-${o.updatedAt}`} order={o} onChange={upsertOrder} />)
        ) : (
          <Empty title={tab === "new" ? "No new requests" : tab === "confirmed" ? "Nothing waiting for delivery" : "No finished orders yet"} body={tab === "new" ? "When a buyer sends a request for your items, it appears here straight away." : undefined} />
        )}
      </div>
    </>
  );
}
