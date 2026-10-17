/* Line icons (24px grid, stroke). Same set as the prototype. */
const PATHS = {
 "search": "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.5-3.5\"/>",
 "heart": "<path d=\"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z\"/>",
 "bag": "<path d=\"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z\"/><path d=\"M3 6h18\"/><path d=\"M16 10a4 4 0 0 1-8 0\"/>",
 "cartplus": "<path d=\"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z\"/><path d=\"M3 6h18\"/><path d=\"M12 10v6M9 13h6\"/>",
 "user": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0 1 16 0\"/>",
 "home": "<path d=\"M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z\"/>",
 "plus": "<path d=\"M12 5v14M5 12h14\"/>",
 "x": "<path d=\"M18 6 6 18M6 6l12 12\"/>",
 "chevR": "<path d=\"m9 18 6-6-6-6\"/>",
 "chevL": "<path d=\"m15 18-6-6 6-6\"/>",
 "chevD": "<path d=\"m6 9 6 6 6-6\"/>",
 "sliders": "<path d=\"M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1\"/><circle cx=\"15\" cy=\"6\" r=\"2\"/><circle cx=\"9\" cy=\"12\" r=\"2\"/><circle cx=\"17\" cy=\"18\" r=\"2\"/>",
 "check": "<path d=\"M20 6 9 17l-5-5\"/>",
 "star": "<path d=\"M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9Z\"/>",
 "pin": "<path d=\"M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>",
 "truck": "<path d=\"M3 6h11v10H3zM14 9h4l3 3v4h-7\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/><circle cx=\"17\" cy=\"18\" r=\"2\"/>",
 "shield": "<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z\"/><path d=\"m9 12 2 2 4-4\"/>",
 "store": "<path d=\"M3 9 4.5 4h15L21 9\"/><path d=\"M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0\"/><path d=\"M5 12v8h14v-8\"/><path d=\"M10 20v-5h4v5\"/>",
 "box": "<path d=\"M21 8 12 3 3 8v8l9 5 9-5Z\"/><path d=\"m3 8 9 5 9-5M12 13v8\"/>",
 "chart": "<path d=\"M3 3v18h18\"/><path d=\"m7 15 4-4 3 3 5-6\"/>",
 "zap": "<path d=\"M13 2 4 14h7l-1 8 9-12h-7Z\"/>",
 "gem": "<path d=\"M6 3h12l4 6-10 12L2 9Z\"/><path d=\"M2 9h20M12 21 8 9l4-6 4 6Z\"/>",
 "swap": "<path d=\"M17 3l4 4-4 4M21 7H7M7 21l-4-4 4-4M3 17h14\"/>",
 "camera": "<path d=\"M3 8a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/>",
 "tag": "<path d=\"M3 12V3h9l9 9-9 9Z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\"1.5\"/>",
 "eye": "<path d=\"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
 "trash": "<path d=\"M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14\"/>",
 "logout": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9\"/>",
 "arrowR": "<path d=\"M5 12h14M13 6l6 6-6 6\"/>",
 "arrowL": "<path d=\"M19 12H5M11 6l-6 6 6 6\"/>",
 "sparkle": "<path d=\"M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z\"/>",
 "bell": "<path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9\"/><path d=\"M10.3 21a1.94 1.94 0 0 0 3.4 0\"/>",
 "msg": "<path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z\"/>",
 "phone": "<path d=\"M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z\"/>",
 "clock": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>",
 "cash": "<rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"2.5\"/><path d=\"M6 12h.01M18 12h.01\"/>",
 "lock": "<rect x=\"4\" y=\"11\" width=\"16\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/>",
 "hanger": "<path d=\"M12 7.5a2.2 2.2 0 1 1 2.2-2.2c0 1.2-2.2 1.6-2.2 3.2v.8\"/><path d=\"M12 9.3 3.2 16.4a1 1 0 0 0 .6 1.8h16.4a1 1 0 0 0 .6-1.8Z\"/>",
 "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v5M12 7.5v.5\"/>",
 "layers": "<path d=\"m12 3 9 5-9 5-9-5Z\"/><path d=\"m3 13 9 5 9-5\"/>",
 "ruler": "<path d=\"M3 17 17 3l4 4L7 21Z\"/><path d=\"m7 13 2 2M10 10l2 2M13 7l2 2\"/>",
 "plug": "<path d=\"M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0Z\"/><path d=\"M12 18v4\"/>",
 "sofa": "<path d=\"M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3\"/><path d=\"M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2Z\"/><path d=\"M5 18v2M19 18v2\"/>",
 "monitor": "<rect x=\"2\" y=\"4\" width=\"20\" height=\"13\" rx=\"2\"/><path d=\"M8 21h8M12 17v4\"/>",
 "fridge": "<rect x=\"5\" y=\"2\" width=\"14\" height=\"20\" rx=\"2\"/><path d=\"M5 10h14M9 5v2M9 13v3\"/>",
 "phone2": "<rect x=\"6\" y=\"2\" width=\"12\" height=\"20\" rx=\"2.5\"/><path d=\"M11 18h2\"/>",
 "laptop": "<rect x=\"4\" y=\"4\" width=\"16\" height=\"11\" rx=\"1.5\"/><path d=\"M2 19h20\"/>",
 "gamepad": "<path d=\"M6 11h4M8 9v4M15 12h.01M18 10h.01\"/><path d=\"M17.3 5H6.7a4 4 0 0 0-3.96 3.43L2 14.5A2.8 2.8 0 0 0 6.9 17l1.6-2h7l1.6 2a2.8 2.8 0 0 0 4.9-2.5l-.74-6.07A4 4 0 0 0 17.3 5Z\"/>",
 "lamp": "<path d=\"M8 2h8l3 8H5Z\"/><path d=\"M12 10v10M8 21h8\"/>",
 "baby": "<path d=\"M5 5a9 9 0 0 1 14 7H5Z\"/><path d=\"M4 12h16l-2 5H6Z\"/><circle cx=\"8\" cy=\"20\" r=\"1.6\"/><circle cx=\"16\" cy=\"20\" r=\"1.6\"/>",
 "dumbbell": "<path d=\"M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12\"/>",
 "book": "<path d=\"M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2Z\"/><path d=\"M20 19v3H6a2 2 0 0 1-2-2\"/>",
 "drop": "<path d=\"M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12Z\"/>",
 "car": "<path d=\"M5 17H3v-5l2-5h14l2 5v5h-2\"/><path d=\"M3 12h18\"/><circle cx=\"7.5\" cy=\"17\" r=\"2\"/><circle cx=\"16.5\" cy=\"17\" r=\"2\"/><path d=\"M9.5 17h5\"/>",
 "link": "<path d=\"M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1\"/><path d=\"M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1\"/>",
 "user2": "<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20a6.5 6.5 0 0 1 13 0\"/><path d=\"M16 4.5a3.5 3.5 0 0 1 0 7M18 20a6.5 6.5 0 0 0-2.5-5.1\"/>",
 "grid": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"1.5\"/>"
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className = "", strokeWidth = 1.8 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`} dangerouslySetInnerHTML={{ __html: PATHS[name] }} />
  );
}

/** Verified seal. Red for verified stores, ink for verified businesses. */
export function VerifiedSeal({ business = false, size = 15 }: { business?: boolean; size?: number }) {
  return (
    <span title={business ? "Verified business" : "Verified seller"} className={`inline-flex shrink-0 ${business ? "text-ink" : "text-red"}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M12 1.6l2.5 1.8 3.1-.1 1 2.9 2.5 1.9-.9 3 .9 3-2.5 1.9-1 2.9-3.1-.1L12 22.4l-2.5-1.8-3.1.1-1-2.9-2.5-1.9.9-3-.9-3 2.5-1.9 1-2.9 3.1.1Z\"/><path d=\"m8 12.2 2.8 2.8L16 9.6\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>" }} />
  );
}
