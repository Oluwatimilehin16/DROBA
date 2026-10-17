/** Where server components reach the API (inside the network) */
export const API_INTERNAL = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
/** Where the browser opens the WebSocket. Empty means same origin (when a proxy forwards /socket.io). */
export const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
/** Public site URL, used for share links and Open Graph tags */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
