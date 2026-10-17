"use client";
import { use } from "react";
import { Chat, Inbox, useRequireAuth } from "@/components/messages";

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useRequireAuth(`/messages/${id}`);
  if (!user) return null;
  return (
    <main className="md:wrap md:py-6">
      <div className="grid h-[calc(100dvh-178px)] overflow-hidden border-line md:h-[calc(100dvh-190px)] md:grid-cols-[360px_1fr] md:rounded-lg md:border">
        <section className="hidden min-h-0 overflow-y-auto border-r border-line md:block">
          <h2 className="border-b border-line px-4 py-3 text-[18px]">Messages</h2>
          <Inbox activeId={id} />
        </section>
        <section className="min-h-0">
          <Chat id={id} />
        </section>
      </div>
    </main>
  );
}
