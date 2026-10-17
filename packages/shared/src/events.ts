/* Socket.io event contracts. Both the server and the browser client are typed against these. */
import type { MessageDTO, OrderDTO } from "./types.js";

export type Ack<T> = (res: { ok: true; data: T } | { ok: false; error: string }) => void;

export interface ClientToServerEvents {
  "message:send": (payload: { conversationId: string; body: string; clientId?: string }, ack: Ack<MessageDTO>) => void;
  "conversation:read": (payload: { conversationId: string }) => void;
  "typing": (payload: { conversationId: string; isTyping: boolean }) => void;
  "conversation:join": (payload: { conversationId: string }, ack: Ack<{ online: boolean }>) => void;
}

export interface ServerToClientEvents {
  "message:new": (message: MessageDTO) => void;
  "conversation:read": (payload: { conversationId: string; userId: string; readAt: string }) => void;
  "typing": (payload: { conversationId: string; userId: string; isTyping: boolean }) => void;
  "presence": (payload: { userId: string; online: boolean }) => void;
  "unread:count": (payload: { total: number }) => void;
  /** A new order request, or a status change, for either side */
  "order:update": (order: OrderDTO) => void;
}

export interface SocketData {
  userId: string;
}
