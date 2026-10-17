"use client";
import { Inbox, useRequireAuth } from "@/components/messages";
import { Icon } from "@/components/Icon";

export default function MessagesPage() {
  const user = useRequireAuth("/messages");
  if (!user) return null;
  return (
    <main className="wrap py-4 md:py-6">
      <h1 className="mb-3 text-[28px] md:hidden">Messages</h1>
      <div className="grid overflow-hidden rounded-lg border border-line md:h-[calc(100dvh-190px)] md:grid-cols-[360px_1fr]">
        <section className="min-h-0 overflow-y-auto border-line md:border-r">
          <h2 className="hidden border-b border-line px-4 py-3 text-[18px] md:block">Messages</h2>
          <Inbox />
        </section>
        <section className="hidden place-items-center text-center text-muted md:grid">
          <div className="grid justify-items-center gap-2">
            <Icon name="msg" size={32} />
            <p>Pick a conversation</p>
          </div>
        </section>
      </div>
    </main>
  );
}
