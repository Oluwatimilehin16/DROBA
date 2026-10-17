"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ConversationDTO, MessageDTO, Paged } from "@droba/shared";
import { api, useAuth } from "@/lib/auth";
import { useRealtime } from "@/lib/realtime";
import { ago, clock, cx, initials, naira } from "@/lib/format";
import { Icon } from "./Icon";

export function useRequireAuth(next: string) {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [ready, user, router, next]);
  return user;
}

/** Conversation list. Refreshes itself whenever a message arrives on the socket. */
export function Inbox({ activeId }: { activeId?: string }) {
  const { socket } = useRealtime();
  const [items, setItems] = useState<ConversationDTO[] | null>(null);
  const load = useCallback(() => api<Paged<ConversationDTO>>("/conversations").then((r) => setItems(r.items)).catch(() => setItems([])), []);
  useEffect(() => void load(), [load]);
  useEffect(() => {
    if (!socket) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(load, 250);
    };
    socket.on("message:new", refresh);
    socket.on("conversation:read", refresh);
    socket.on("connect", refresh);
    return () => {
      clearTimeout(t);
      socket.off("message:new", refresh);
      socket.off("conversation:read", refresh);
      socket.off("connect", refresh);
    };
  }, [socket, load]);

  if (!items) return <div className="grid gap-2 p-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-[72px] rounded-md" />)}</div>;
  if (!items.length)
    return (
      <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-cream text-muted">
          <Icon name="msg" size={26} />
        </span>
        <h3 className="text-lg">No messages yet</h3>
        <p className="text-[14px] text-muted">When you message a seller, or a buyer messages you, it shows up here.</p>
        <Link href="/search" className="btn btn-dark btn-sm mt-2">
          Start shopping
        </Link>
      </div>
    );
  return (
    <ul className="divide-y divide-line">
      {items.map((c) => (
        <li key={c.id}>
          <Link href={`/messages/${c.id}`} className={cx("flex gap-3 px-3 py-3 transition hover:bg-cream", activeId === c.id && "bg-cream")}>
            <span className="relative size-14 shrink-0 overflow-hidden rounded-[12px] bg-cream-2">{c.listing?.photo ? <Image src={c.listing.photo} alt="" fill sizes="56px" className="object-cover" /> : <span className="grid size-full place-items-center font-bold text-muted">{initials(c.counterpart.name)}</span>}</span>
            <span className="grid min-w-0 flex-1 content-center gap-0.5">
              <span className="flex items-baseline justify-between gap-2">
                <b className="truncate text-[14.5px]">{c.counterpart.name}</b>
                <span className="shrink-0 text-[12px] text-muted">{c.lastMessage ? ago(c.lastMessage.createdAt) : ""}</span>
              </span>
              <span className="truncate text-[12.5px] text-muted">
                <span className={cx("mr-1 rounded px-1 py-px text-[10.5px] font-bold uppercase", c.role === "SELLER" ? "bg-wine text-white" : "bg-cream-2 text-ink-2")}>{c.role === "SELLER" ? "Selling" : "Buying"}</span>
                {c.listing?.title}
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className={cx("truncate text-[13.5px]", c.unread ? "font-bold text-ink" : "text-ink-2")}>{c.lastMessage?.body}</span>
                {c.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-red px-1.5 text-[11px] font-bold text-white">{c.unread}</span>}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

type Msg = MessageDTO & { pending?: boolean; failed?: boolean };
const newClientId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

/** One chat, live over Socket.io with optimistic sends, typing, presence and read receipts. */
export function Chat({ id }: { id: string }) {
  const { user } = useAuth();
  const { socket, connected } = useRealtime();
  const [convo, setConvo] = useState<(ConversationDTO & { counterpartOnline?: boolean }) | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [older, setOlder] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const typingSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const me = user?.id;

  useEffect(() => {
    setMsgs([]);
    setConvo(null);
    Promise.all([api<ConversationDTO & { counterpartOnline: boolean }>(`/conversations/${id}`), api<Paged<MessageDTO>>(`/conversations/${id}/messages`)])
      .then(([c, m]) => {
        setConvo(c);
        setOnline(c.counterpartOnline);
        setMsgs(m.items);
        setOlder(m.nextCursor);
      })
      .catch(() => setError("This conversation isn't available."));
  }, [id]);

  const markRead = useCallback(() => {
    if (socket?.connected) socket.emit("conversation:read", { conversationId: id });
    else void api(`/conversations/${id}/read`, { method: "POST" }).catch(() => {});
  }, [socket, id]);

  useEffect(() => {
    if (!socket) return;
    const join = () => socket.emit("conversation:join", { conversationId: id }, (r) => r.ok && setOnline(r.data.online));
    const onMsg = (m: MessageDTO) => {
      if (m.conversationId !== id) return;
      setMsgs((cur) => {
        if (cur.some((x) => x.id === m.id)) return cur;
        const i = m.clientId ? cur.findIndex((x) => x.clientId === m.clientId) : -1;
        if (i >= 0) return cur.map((x, k) => (k === i ? m : x));
        return [...cur, m];
      });
      if (m.senderId !== me) {
        setTyping(false);
        if (document.visibilityState === "visible") markRead();
      }
    };
    const onTyping = (p: { conversationId: string; userId: string; isTyping: boolean }) => p.conversationId === id && p.userId !== me && setTyping(p.isTyping);
    const onRead = (p: { conversationId: string; userId: string; readAt: string }) => p.conversationId === id && p.userId !== me && setSeenAt(p.readAt);
    const onPresence = (p: { userId: string; online: boolean }) => p.userId === convo?.counterpart.userId && setOnline(p.online);
    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("message:new", onMsg);
    socket.on("typing", onTyping);
    socket.on("conversation:read", onRead);
    socket.on("presence", onPresence);
    return () => {
      socket.off("connect", join);
      socket.off("message:new", onMsg);
      socket.off("typing", onTyping);
      socket.off("conversation:read", onRead);
      socket.off("presence", onPresence);
    };
  }, [socket, id, me, markRead, convo?.counterpart.userId]);

  // Read on open, and whenever the tab comes back into view
  useEffect(() => {
    if (!convo) return;
    markRead();
    const onVis = () => document.visibilityState === "visible" && markRead();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [convo, markRead]);

  useLayoutEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [msgs.length, typing]);

  const send = async (body: string, clientId = newClientId()) => {
    if (!me || !body.trim()) return;
    setError(null);
    const optimistic: Msg = { id: `tmp-${clientId}`, conversationId: id, senderId: me, body: body.trim(), createdAt: new Date().toISOString(), clientId, pending: true };
    setMsgs((cur) => [...cur.filter((m) => m.clientId !== clientId), optimistic]);
    const settle = (m: MessageDTO | null, err?: string) =>
      setMsgs((cur) => cur.map((x) => (x.clientId === clientId ? (m ? m : { ...x, pending: false, failed: true }) : x)).filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i));
    if (socket?.connected) {
      socket.timeout(10000).emit("message:send", { conversationId: id, body, clientId }, (err: Error | null, r?: { ok: true; data: MessageDTO } | { ok: false; error: string }) => {
        if (err || !r) return settle(null);
        if (r.ok) settle(r.data);
        else {
          settle(null);
          setError(r.error);
        }
      });
    } else {
      try {
        settle(await api<MessageDTO>(`/conversations/${id}/messages`, { body: { body, clientId } }));
      } catch {
        settle(null);
      }
    }
  };

  const onType = (v: string) => {
    setText(v);
    if (!socket?.connected) return;
    const now = Date.now();
    if (now - typingSent.current > 2500) {
      typingSent.current = now;
      socket.emit("typing", { conversationId: id, isTyping: true });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingSent.current = 0;
      socket.emit("typing", { conversationId: id, isTyping: false });
    }, 3000);
  };

  const loadOlder = async () => {
    if (!older) return;
    const r = await api<Paged<MessageDTO>>(`/conversations/${id}/messages?before=${encodeURIComponent(older)}`);
    setMsgs((cur) => [...r.items, ...cur]);
    setOlder(r.nextCursor);
  };

  if (error && !convo) return <div className="grid h-full place-items-center p-10 text-center text-muted">{error}</div>;
  if (!convo) return <div className="grid gap-3 p-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className={cx("skeleton h-12 rounded-[16px]", i % 2 ? "ml-auto w-2/3" : "w-1/2")} />)}</div>;

  const lastMine = [...msgs].reverse().find((m) => m.senderId === me && !m.pending);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-line px-3 py-2.5">
        <Link href="/messages" aria-label="Back to messages" className="icon-btn md:hidden">
          <Icon name="chevL" />
        </Link>
        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-blush text-[13px] font-extrabold text-red-deep">
          {initials(convo.counterpart.name)}
          <span className={cx("absolute right-0 bottom-0 size-3 rounded-full border-2 border-white", online ? "bg-ok" : "bg-line-2")} />
        </span>
        <span className="grid min-w-0 flex-1">
          {convo.counterpart.sellerHandle ? (
            <Link href={`/${convo.counterpart.sellerHandle}`} className="truncate font-bold hover:underline">
              {convo.counterpart.name}
            </Link>
          ) : (
            <b className="truncate">{convo.counterpart.name}</b>
          )}
          <span className="text-[12.5px] text-muted">{typing ? <span className="font-semibold text-ok">typing…</span> : online ? "Online" : connected ? "Offline" : "Connecting…"}</span>
        </span>
        {convo.role === "BUYER" && convo.counterpart.sellerId && (
          <button type="button" onClick={() => setRating(true)} className="btn btn-ghost btn-sm shrink-0">
            <Icon name="star" size={15} />
            Rate
          </button>
        )}
      </header>
      {rating && convo.counterpart.sellerId && <RateSheet sellerId={convo.counterpart.sellerId} name={convo.counterpart.name} listingId={convo.listing?.id} onClose={() => setRating(false)} />}
      {convo.listing && (
        <Link href={`/listing/${convo.listing.id}`} className="flex items-center gap-3 border-b border-line bg-cream px-3 py-2">
          <span className="relative size-11 shrink-0 overflow-hidden rounded-[8px] bg-cream-2">{convo.listing.photo && <Image src={convo.listing.photo} alt="" fill sizes="44px" className="object-cover" />}</span>
          <span className="grid min-w-0 flex-1">
            <span className="truncate text-[13.5px] font-semibold text-oxblood">{convo.listing.title}</span>
            <span className="text-[13px] font-bold num">
              {naira(convo.listing.price)}
              {convo.listing.status === "SOLD" && <span className="ml-2 text-red">Sold</span>}
            </span>
          </span>
          <Icon name="chevR" size={16} className="text-muted" />
        </Link>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <p className="mx-auto mb-4 flex max-w-sm items-start gap-2 rounded-[12px] bg-warn-bg px-3 py-2 text-[12.5px] text-warn">
          <Icon name="shield" size={16} className="mt-px" />
          Never pay before you&apos;ve seen the item. Meet in a safe public place, and don&apos;t share OTPs or card PINs.
        </p>
        {older && (
          <button type="button" onClick={loadOlder} className="link mx-auto mb-3 block text-[13px]">
            Load earlier messages
          </button>
        )}
        <ol className="grid gap-1.5">
          {msgs.map((m, i) => {
            const mine = m.senderId === me;
            const prev = msgs[i - 1];
            const gap = !prev || new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 15 * 60_000;
            return (
              <li key={m.id} className="grid">
                {gap && <span className="my-2 justify-self-center text-[11.5px] font-semibold text-muted">{ago(m.createdAt)}</span>}
                <div className={cx("max-w-[80%] rounded-[18px] px-3.5 py-2 text-[14.5px] whitespace-pre-wrap", mine ? "justify-self-end rounded-br-[6px] bg-ink text-white" : "justify-self-start rounded-bl-[6px] bg-cream-2 text-ink", m.pending && "opacity-60", m.failed && "bg-blush text-red-deep")}>
                  {m.body}
                  <span className={cx("ml-2 inline-block align-bottom text-[10.5px]", mine ? "text-white/60" : "text-muted")}>{clock(m.createdAt)}</span>
                </div>
                {m.failed && (
                  <button type="button" onClick={() => send(m.body, m.clientId ?? undefined)} className="justify-self-end text-[12px] font-bold text-red">
                    Not sent. Tap to retry
                  </button>
                )}
                {mine && lastMine?.id === m.id && seenAt && new Date(seenAt) >= new Date(m.createdAt) && <span className="justify-self-end text-[11px] text-muted">Seen</span>}
              </li>
            );
          })}
          {typing && (
            <li className="justify-self-start rounded-[18px] rounded-bl-[6px] bg-cream-2 px-4 py-3">
              <span className="flex gap-1">
                {[0, 1, 2].map((k) => (
                  <i key={k} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${k * 120}ms` }} />
                ))}
              </span>
            </li>
          )}
        </ol>
        <div ref={bottom} />
      </div>

      {error && <p className="px-3 pb-1 text-[12.5px] font-semibold text-red">{error}</p>}
      <form
        className="safe-bottom flex items-end gap-2 border-t border-line bg-white p-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          const body = text;
          setText("");
          void send(body);
        }}
      >
        <textarea
          rows={1}
          value={text}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          maxLength={2000}
          placeholder="Write a message…"
          aria-label="Message"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-[22px] border-[1.5px] border-line bg-cream px-4 py-2.5 text-[15px] outline-none focus:border-ink focus:bg-white"
        />
        <button aria-label="Send" disabled={!text.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-red text-white disabled:opacity-40">
          <Icon name="arrowR" size={20} />
        </button>
      </form>
    </div>
  );
}

/** After the handover: rate the seller (one rating per buyer per seller, editable) */
export function RateSheet({ sellerId, name, listingId, onClose, onRated }: { sellerId: string; name: string; listingId?: string; onClose: () => void; onRated?: () => void }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setState("busy");
    setErr(null);
    try {
      await api(`/sellers/${sellerId}/ratings`, { body: { stars, comment: comment.trim() || undefined, listingId } });
      setState("done");
      onRated?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save your rating");
      setState("idle");
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid items-end sm:place-items-center" role="dialog" aria-modal="true" aria-label={`Rate ${name}`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="sheet-in relative w-full rounded-t-[22px] bg-white p-5 pb-8 sm:max-w-md sm:rounded-[22px] sm:pb-5">
        {state === "done" ? (
          <div className="grid justify-items-center gap-2 py-4 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-ok-bg text-ok">
              <Icon name="check" size={26} strokeWidth={2.4} />
            </span>
            <h3 className="text-xl">Thanks for rating {name}</h3>
            <p className="text-[14px] text-muted">It helps the next buyer decide who to trust.</p>
            <button type="button" className="btn btn-dark mt-2" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-xl">How was {name}?</h3>
            <p className="text-[14px] text-muted">Rate after you&apos;ve received and checked the item.</p>
            <div className="my-4 flex justify-center gap-2" role="radiogroup" aria-label="Stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setStars(n)} className={n <= stars ? "text-red" : "text-line-2"}>
                  <Icon name="star" size={36} className="fill-current" />
                </button>
              ))}
            </div>
            <textarea className="input" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Was it as described? How was delivery? (optional)" />
            {err && <p className="err mt-2">{err}</p>}
            <button type="button" disabled={!stars || state === "busy"} onClick={submit} className="btn btn-primary mt-4 w-full">
              {state === "busy" ? "Saving…" : "Submit rating"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
