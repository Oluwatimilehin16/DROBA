/* =========================================================================
   Droba frontend — vanilla JS single-page app.
   Views are functions that return HTML strings; one delegated click/change
   handler drives everything. State lives in `S` (persisted) and `ui` (transient).

   Business rules reflected here:
   - Droba connects buyers and sellers. It does NOT take payments: buyers pay
     the seller on delivery after inspecting the item, then rate the seller.
   - Anyone can sell up to 5 items free with no store ("Free seller").
     A storefront is paid (Premium / Business). Anyone can pay to boost.
   ========================================================================= */

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-US");
const num = (v) => +String(v ?? "").replace(/\D/g, "") || 0;
const k = (n) => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n);
const initials = (name = "") => name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "D";
const slug = (s = "") => s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20);
const first = (name = "") => name.trim().split(/\s+/)[0] || "";

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  cartplus: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M12 10v6M9 13h6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>', chevL: '<path d="m15 18-6-6 6-6"/>', chevD: '<path d="m6 9 6 6 6-6"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9Z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  store: '<path d="M3 9 4.5 4h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v8h14v-8"/><path d="M10 20v-5h4v5"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
  gem: '<path d="M6 3h12l4 6-10 12L2 9Z"/><path d="M2 9h20M12 21 8 9l4-6 4 6Z"/>',
  swap: '<path d="M17 3l4 4-4 4M21 7H7M7 21l-4-4 4-4M3 17h14"/>',
  camera: '<path d="M3 8a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><circle cx="12" cy="13" r="4"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  hanger: '<path d="M12 7.5a2.2 2.2 0 1 1 2.2-2.2c0 1.2-2.2 1.6-2.2 3.2v.8"/><path d="M12 9.3 3.2 16.4a1 1 0 0 0 .6 1.8h16.4a1 1 0 0 0 .6-1.8Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
  ruler: '<path d="M3 17 17 3l4 4L7 21Z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
  plug: '<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0Z"/><path d="M12 18v4"/>',
  sofa: '<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2Z"/><path d="M5 18v2M19 18v2"/>',
  monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  fridge: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 10h14M9 5v2M9 13v3"/>',
  phone2: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  laptop: '<rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  gamepad: '<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><path d="M17.3 5H6.7a4 4 0 0 0-3.96 3.43L2 14.5A2.8 2.8 0 0 0 6.9 17l1.6-2h7l1.6 2a2.8 2.8 0 0 0 4.9-2.5l-.74-6.07A4 4 0 0 0 17.3 5Z"/>',
  lamp: '<path d="M8 2h8l3 8H5Z"/><path d="M12 10v10M8 21h8"/>',
  baby: '<path d="M5 5a9 9 0 0 1 14 7H5Z"/><path d="M4 12h16l-2 5H6Z"/><circle cx="8" cy="20" r="1.6"/><circle cx="16" cy="20" r="1.6"/>',
  dumbbell: '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2Z"/><path d="M20 19v3H6a2 2 0 0 1-2-2"/>',
  drop: '<path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12Z"/>',
  car: '<path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><path d="M3 12h18"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
};
const ic = (n, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`;
const SEAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.6l2.5 1.8 3.1-.1 1 2.9 2.5 1.9-.9 3 .9 3-2.5 1.9-1 2.9-3.1-.1L12 22.4l-2.5-1.8-3.1.1-1-2.9-2.5-1.9.9-3-.9-3 2.5-1.9 1-2.9 3.1.1Z"/><path d="m8 12.2 2.8 2.8L16 9.6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const vb = (t) => t ? `<span class="vbadge ${t === "business" ? "biz" : ""}" title="${t === "business" ? "Verified Business" : "Verified Store"}">${SEAL}</span>` : "";
const stars = (n) => `<span class="stars" aria-label="${n} out of 5">${[1, 2, 3, 4, 5].map(i => ic("star", i <= Math.round(n) ? "" : "off")).join("")}</span>`;
const condBars = (c) => `<span class="cond-bars">${[1, 2, 3, 4].map(i => `<i class="${i <= 5 - c ? "f" : ""}"></i>`).join("")}</span>`;
const condChip = (c, extra, dept = "Fashion") => `<span class="cond">${condBars(c)}${GRADES[c - 1].short}${extra ? " · " + extraLabel(dept) : ""}</span>`;
const shortName = (s) => s.type === "store" ? s.name : first(s.name);
const sellerKind = (s) => s.type === "store" ? (s.plan === "Business" ? "Business store" : "Premium store") : "Individual seller";

/* ---------- images ---------- */
const IMG = { ok: 0, err: 0, blocked: false };
function pimg(src, alt, cat = "Vintage", color = "Red", w = 700, attrs = "") {
  const isData = String(src).startsWith("data:");
  const url = !src ? placeholder(cat, color) : isData ? src : (IMG.blocked ? placeholder(cat, color) : UNSPLASH(src, w));
  return `<img src="${url}" alt="${esc(alt)}" data-fb="${esc(cat + "|" + color)}" ${attrs}>`;
}
const prodImg = (p, w = 700, attrs = 'loading="lazy"') => pimg(p.img, p.title, p.cat, p.color, w, attrs);
document.addEventListener("load", (e) => { if (e.target.tagName === "IMG" && !e.target.src.startsWith("data:")) IMG.ok++; }, true);
document.addEventListener("error", (e) => {
  const el = e.target;
  if (el.tagName !== "IMG" || !el.dataset.fb || el.dataset.swapped) return;
  const [cat, color] = el.dataset.fb.split("|");
  el.dataset.swapped = "1";
  el.src = placeholder(cat, color);
  IMG.err++;
  if (!IMG.blocked && IMG.ok === 0 && IMG.err >= 3) {
    IMG.blocked = true;
    $$("img[data-fb]:not([data-swapped])").forEach(i => { const [c, co] = i.dataset.fb.split("|"); i.dataset.swapped = "1"; i.src = placeholder(c, co); });
  }
}, true);

/* ---------- state ---------- */
const FRESH_FILTERS = () => ({ q: "", dept: [], cat: [], dep: [], cond: [], extra: false, noFlaws: false, tested: false, origin: [], size: [], brand: [], color: [], min: "", max: "", city: [], sellerType: [], verified: false, deliver: false, pickup: false, offers: false, listed: "", sort: "rec" });
const L = (id, title, cat, price, cond, img, color, status, views, saves, more = {}) => Object.assign({ id, title, cat, dept: deptOf(cat), price, cond, img, color, status, views, saves, boost: 0, size: "", extra: false }, more);
const SEED_LISTINGS = (kind) => kind === "store" ? [
  L("L1", "Red wool longline coat", "Jackets", 38000, 2, "1562347174-7370ad83dc47", "Red", "active", 1240, 267, { size: "M", boost: 4 }),
  L("L2", "Grey fabric sofa with cushions", "Sofas", 185000, 3, "1611967164521-abae8fba4668", "Grey", "active", 980, 114, { size: "3-seater" }),
  L("L3", "iPhone 11, 128GB", "Phones", 330000, 2, "1573148195900-7845dcb9b127", "Silver", "active", 1530, 298, { size: "128GB" }),
  L("L4", "White microwave oven", "Kitchen appliances", 38000, 2, "1585659722983-3a675dabf23d", "White", "active", 410, 22, { size: "25 L" }),
  L("L5", "Classic denim trucker jacket", "Jackets", 24000, 2, "1611312449408-fcece27cdbb7", "Blue", "active", 720, 81, { size: "L" }),
  L("L6", "Pink mini handbag", "Bags", 22000, 2, "1681747685985-a401c271156c", "Pink", "sold", 640, 64, { size: "One size" }),
  L("L7", "Wireless over-ear headphones", "Audio", 85000, 2, "1505740420928-5e560c06d30e", "Black", "sold", 515, 77, { size: "Over-ear" }),
  L("L8", "Striped cotton shirt", "Shirts", 7000, 2, "1603252110481-7ba873bf42ab", "White", "draft", 0, 0, { size: "XL" }),
] : [
  L("L1", "Retro blue mini fridge", "Fridges", 185000, 3, "1571175443880-49e1d25b2bc5", "Blue", "active", 340, 41, { size: "130 L" }),
  L("L2", "Black satin slip dress", "Dresses", 12000, 3, "1603122630570-7fd434d470d0", "Black", "active", 210, 18, { size: "S" }),
  L("L3", "Pink mini handbag", "Bags", 22000, 2, "1681747685985-a401c271156c", "Pink", "sold", 190, 30, { size: "One size" }),
];
const SEED_ORDERS = (kind) => kind === "store" ? [
  { id: "DRB-20418", lid: "L3", buyer: "Kemi O.", phone: "0814 220 1932", city: "Lekki, Lagos", amount: 330000, status: "New request", when: "Today, 10:42" },
  { id: "DRB-20391", lid: "L1", buyer: "Uche N.", phone: "0815 337 0021", city: "Enugu", amount: 38000, status: "Confirmed", when: "Yesterday" },
  { id: "DRB-20310", lid: "L6", buyer: "Bisi A.", phone: "0816 900 4410", city: "Ibadan", amount: 22000, status: "Delivered", when: "3 Oct", rating: 5 },
  { id: "DRB-20177", lid: "L7", buyer: "Zainab M.", phone: "0817 120 8890", city: "Abuja", amount: 85000, status: "Delivered", when: "28 Sep", rating: 4 },
] : [
  { id: "DRB-20420", lid: "L1", buyer: "Kemi O.", phone: "0814 220 1932", city: "Surulere, Lagos", amount: 185000, status: "New request", when: "Today, 09:15" },
  { id: "DRB-20302", lid: "L3", buyer: "Tolu F.", phone: "0818 640 2210", city: "Yaba, Lagos", amount: 22000, status: "Delivered", when: "2 Oct", rating: 5 },
];
const FRESH_DRAFT = () => ({ photos: {}, title: "", brand: "", cat: "", dep: "W", size: "", color: "", m1: "", m2: "", desc: "", cond: 0, extra: false, tested: false, origin: "", flaws: [], note: "", price: "", offers: true, deliver: true, pickup: true, boostLaunch: false });
const DEFAULT_STATE = () => ({
  user: null, mode: "buyer", cart: [8, 62], saved: [2, 11, 40], recent: ["Fridge"], feed: "foryou",
  f: FRESH_FILTERS(), ob: { role: "shop" }, listings: SEED_LISTINGS("store"), orders: SEED_ORDERS("store"), myOrders: [], draft: FRESH_DRAFT(), following: [],
});
const STORE_KEY = "droba-v4";
let S;
try { S = Object.assign(DEFAULT_STATE(), JSON.parse(localStorage.getItem(STORE_KEY) || "null") || {}); } catch (e) { S = DEFAULT_STATE(); }
const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { } };
const ui = { fg: {}, mega: false, menu: false, cart: false, sheet: null, jumper: false, gIdx: 0, more: false, step: 1, ltab: "active", pick: null, dur: 7, errs: [], storeTab: "shop", ship: "deliver", banner: null, showPhone: false, rate: { id: null, stars: 0, asDesc: null } };
const prefs = () => S.user ? { depts: S.user.depts || [], dep: S.user.dep || "All", styles: S.user.styles || [] } : null;
const mySeller = () => S.user && S.user.seller;
const isStore = () => !!(mySeller() && mySeller().type === "store");
const sellerName = () => { const s = mySeller(); return s ? (s.type === "store" ? s.name : S.user.name) : ""; };
const FREE_LIMIT = 5;
const PLAN_LIMIT = { Free: FREE_LIMIT, Premium: 150, Business: Infinity };
const PHOTO_LIMIT = { Free: 5, Premium: 10, Business: 15 };
const BOOST_CREDITS = { Free: 0, Premium: 3, Business: 10 };
const listingImg = (l, w = 400, attrs = 'loading="lazy"') => pimg(l.img || "", l.title || "New listing", l.cat || "Vintage", l.color || "Red", w, attrs);

/* ---------- routing ---------- */
let CUR = "welcome";
const HIST = [];
function parseHash() { const h = (location.hash || "").replace(/^#\/?/, ""); return h || null; }
function go(path, opts = {}) {
  if (!opts.back && CUR !== path) HIST.push(CUR);
  CUR = path;
  try { if (parseHash() !== path) history.pushState(null, "", "#/" + path); } catch (e) { }
  ui.mega = false; ui.menu = false; ui.cart = false; ui.sheet = null; ui.jumper = false; ui.gIdx = 0; ui.errs = []; ui.showPhone = false;
  render();
  if (!opts.keepScroll) window.scrollTo(0, 0);
}
window.addEventListener("popstate", () => { CUR = parseHash() || "welcome"; render(); });

/* ---------- toast ---------- */
let toastTimer;
function toast(msg, action) {
  const el = $("#toast");
  el.innerHTML = `<div class="toast" role="status">${ic("check", "sm")}<span>${esc(msg)}</span>${action ? `<button data-act="${action[1]}">${esc(action[0])}</button>` : ""}</div>`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.innerHTML = ""; }, 3000);
}

/* =========================================================================
   SHARED UI
   ========================================================================= */
const logo = (light = false, to = "home") => `<button class="logo ${light ? "light" : ""}" data-go="${to}" aria-label="Droba home"><span class="logo-mark">${ic("hanger")}</span><span class="logo-word">droba</span></button>`;
const SAFETY = [
  ["eye", "Inspect before you pay", "Check the item against its photos, grade and measurements or specs."],
  ["plug", "Test electronics and appliances", "Power them on. Check IMEI, serial numbers and battery health."],
  ["cash", "Pay the seller on delivery", "Never send money in advance or share OTPs and card PINs."],
  ["pin", "Meet somewhere safe for pickups", "Choose a public place in daylight, or bring someone along."],
  ["star", "Rate the seller afterwards", "Your rating helps the next buyer decide who to trust."],
];
const SAFETY_VEHICLE = [
  ["eye", "Inspect with a mechanic", "Check the engine and body, and test-drive before you agree a price."],
  ["box", "Verify the papers", "Customs duty, registration and proof of ownership should match the VIN."],
  ["cash", "Pay only after inspection", "Never pay a deposit to “hold” a vehicle you haven't seen."],
];
const safetyList = (n = 5, cls = "", list = SAFETY) => `<div class="safety ${cls}">${list.slice(0, n).map(([i, a, b]) => `<div>${ic(i)}<span><b>${a}</b><span>${b}</span></span></div>`).join("")}</div>`;

function pcard(p, o = {}) {
  const s = api.seller(p.seller);
  const inCart = S.cart.includes(p.id), saved = S.saved.includes(p.id);
  const tag = o.sponsored ? `<span class="tag tag-sponsored">Sponsored</span>` : (p.tag ? `<span class="tag tag-${p.tag}">${TAGS[p.tag]}</span>` : "<span></span>");
  const meta = p.dept === "Fashion" ? (p.size === "One size" ? p.brand : "Size " + p.size) : p.size;
  return `<article class="pcard ${o.sponsored ? "sponsored" : ""}">
    <div class="pcard-media">
      <button data-go="product/${p.id}" aria-label="${esc(p.title)}" style="display:block;width:100%;height:100%">${prodImg(p, 520)}</button>
      <div class="pcard-top">${tag}<button class="heart ${saved ? "on" : ""}" data-act="save" data-v="${p.id}" aria-label="${saved ? "Remove from saved" : "Save"}">${ic("heart", "sm")}</button></div>
      <div class="pcard-bottom">${condChip(p.cond, p.extra, p.dept)}</div>
    </div>
    <div class="pcard-info">
      <button class="pcard-seller" data-go="store/${s.id}">${vb(s.verified)}<span>${esc(s.name)}</span></button>
      <button class="pcard-title" data-go="product/${p.id}">${esc(p.title)}</button>
      <div class="pcard-row"><div style="min-width:0"><div class="price">${naira(p.price)}</div><div class="pcard-meta">${esc(meta)} · ${esc(s.city)}</div></div>
        <button class="add-cart ${inCart ? "in" : ""}" data-act="cart" data-v="${p.id}" aria-label="${inCart ? "In your bag" : "Add to bag"}">${ic(inCart ? "check" : "cartplus", "sm")}</button></div>
    </div></article>`;
}

function storeCard(s) {
  const items = api.bySeller(s.id).slice(0, 3);
  return `<a class="store-card" href="#/store/${s.id}" data-go="store/${s.id}">
    <div class="sc-banner">${pimg(s.banner, s.name, items[0] ? items[0].cat : "Vintage", items[0] ? items[0].color : "Red", 600, 'loading="lazy"')}</div>
    <div class="sc-body"><div class="store-logo" style="background:${s.color}">${s.initials}</div>
      <h4>${esc(s.name)} ${vb(s.verified)}</h4>
      <div class="sc-meta"><span>${ic("star", "sm")} ${s.rating}</span><span>${k(s.sold)} sold</span><span>${esc(s.area)}, ${esc(s.city)}</span></div>
      <div class="store-thumbs">${items.map(p => prodImg(p, 200)).join("")}</div></div></a>`;
}

function searchBox(key) {
  return `<div class="search" data-search>
    <form class="search-box" data-form="search" role="search"><span class="muted" style="display:grid">${ic("search", "sm")}</span>
      <input id="q-${key}" name="q" type="search" autocomplete="off" placeholder="Search dresses, iPhones, fridges, sofas…" value="${esc(S.f.q)}" data-search-input aria-label="Search Droba">
      <button class="search-go" aria-label="Search">${ic("arrowR", "sm")}</button></form>
    <div class="search-pop" hidden></div></div>`;
}
function searchPopHTML(v) {
  v = v.trim().toLowerCase();
  if (!v) {
    return `${S.recent.length ? `<h5>Recent</h5><div class="sugg-list" style="margin-bottom:14px">${S.recent.slice(0, 3).map(r => `<button data-act="search" data-v="${esc(r)}">${ic("clock", "sm")}${esc(r)}</button>`).join("")}</div>` : ""}
      <h5>Popular on Droba</h5><div class="chips">${POPULAR_SEARCHES.map(t => `<button class="chip" data-act="search" data-v="${esc(t)}">${esc(t)}</button>`).join("")}</div>
      <h5 style="margin-top:14px">Departments</h5><div class="chips">${DEPTS.map(d => `<button class="chip" data-act="shopDept" data-v="${d.id}">${ic(d.icon, "sm")}${d.id}</button>`).join("")}</div>`;
  }
  const pool = [...new Set([...POPULAR_SEARCHES, ...DEPTS.flatMap(d => [d.id, ...d.cats]), ...PRODUCTS.map(p => p.brand), ...STYLE_OPTIONS])];
  const hits = pool.filter(t => t.toLowerCase().includes(v)).slice(0, 6);
  const hl = (t) => { const i = t.toLowerCase().indexOf(v); return i < 0 ? esc(t) : esc(t.slice(0, i)) + "<b>" + esc(t.slice(i, i + v.length)) + "</b>" + esc(t.slice(i + v.length)); };
  return `<div class="sugg-list"><button data-act="search" data-v="${esc(v)}">${ic("search", "sm")}Search for “${esc(v)}”</button>${hits.map(t => `<button data-act="search" data-v="${esc(t)}">${ic("arrowR", "sm")}${hl(t)}</button>`).join("")}</div>`;
}

function modeSwitch(cur, dark = false) {
  return `<div class="mode-switch ${dark ? "dark" : ""}" role="group" aria-label="Switch mode">
    <button class="${cur === "buyer" ? "on" : ""}" data-act="mode" data-v="buyer">${ic("bag", "sm")}Shopping</button>
    <button class="${cur === "seller" ? "on" : ""}" data-act="mode" data-v="seller">${ic("tag", "sm")}Selling</button></div>`;
}

function menuPop() {
  const u = S.user, se = mySeller();
  return `<div class="menu-pop" data-pop>
    <div class="mp-head"><span class="avatar">${initials(u.name)}</span><div style="min-width:0"><b>${esc(u.name)}</b><div class="muted" style="font-size:13px;overflow:hidden;text-overflow:ellipsis">${esc(u.email)}</div></div></div>
    <button class="mp-switch" data-act="mode" data-v="seller">${ic("swap")}<span><b>Switch to selling</b><small>${se ? (se.type === "store" ? "Seller Studio · " + esc(se.name) : "Your listings · Free seller") : "Sell something. It's free"}</small></span></button>
    <button class="mp-item" data-go="account">${ic("user")}My account</button>
    <button class="mp-item" data-go="account">${ic("box")}My orders & ratings</button>
    <button class="mp-item" data-go="saved">${ic("heart")}Saved items</button>
    <button class="mp-item" data-act="editPrefs">${ic("sparkle")}Edit feed preferences</button>
    <button class="mp-item" data-act="logout">${ic("logout")}Log out</button></div>`;
}

function header() {
  const u = S.user;
  const onHome = CUR === "home";
  const navItem = (key, label) => `<button class="${onHome && S.feed === key ? "on" : ""}" data-act="feed" data-v="${key}">${label}</button>`;
  const f = S.f, onShop = CUR === "shop";
  return `<header class="hdr"><div class="wrap">
    <div class="hdr-row">${logo()}
      <button class="cat-btn hide-m ${ui.mega ? "on" : ""}" data-act="mega" aria-expanded="${ui.mega}">${ic("grid", "sm")}Categories${ic("chevD", "sm")}</button>
      ${searchBox("d")}
      <div class="hdr-actions">
        ${u ? modeSwitch("buyer") : `<button class="btn btn-outline-red btn-sm hide-m" data-act="mode" data-v="seller">${ic("tag", "sm")}Sell something</button>`}
        <button class="icon-btn hide-m" data-go="saved" aria-label="Saved items">${ic("heart")}${S.saved.length ? `<span class="count-dot">${S.saved.length}</span>` : ""}</button>
        <button class="icon-btn" data-act="openCart" aria-label="Your bag">${ic("bag")}${S.cart.length ? `<span class="count-dot">${S.cart.length}</span>` : ""}</button>
        ${u ? `<div style="position:relative"><button class="icon-btn" data-act="menu" aria-label="Account menu"><span class="avatar">${initials(u.name)}</span></button>${ui.menu ? menuPop() : ""}</div>`
      : `<button class="btn btn-ghost btn-sm hide-m" data-go="signin">Log in</button><button class="btn btn-primary btn-sm" data-act="join">Join</button>`}
      </div></div>
    <div class="m-search">${searchBox("m")}</div>
    <nav class="subnav" aria-label="Discover">${navItem("foryou", "For You")}${navItem("new", "New In")}${navItem("trending", "Trending")}<span class="sep"></span>
      <button class="m-only" data-act="mega">${ic("grid", "sm")}&nbsp;All categories</button>
      ${DEPTS.filter(d => NAV_DEPTS.includes(d.id)).map(d => `<button class="${onShop && f.dept.length === 1 && f.dept[0] === d.id && !f.cat.length && !f.dep.length ? "on" : ""}" data-act="shopDept" data-v="${d.id}">${d.id}</button>`).join("")}
      <button data-act="mega">More categories</button><span class="sep"></span><button class="hot" data-act="mode" data-v="seller">Sell something</button></nav>
  </div>${ui.mega ? megaHTML() : ""}</header>`;
}
const NAV_DEPTS = ["Fashion", "Phones & Tablets", "Computers", "Appliances", "Furniture", "Vehicles & Parts"];
function megaHTML() {
  return `<div class="mega" data-pop><div class="wrap"><div class="mega-head"><b>All categories</b><span style="display:flex;gap:6px;align-items:center"><button class="link" data-act="shopAll">Shop everything ${ic("arrowR", "sm")}</button><button class="icon-btn" data-act="mega" aria-label="Close categories">${ic("x")}</button></span></div>
    <div class="mega-grid">${DEPTS.map(d => `<div class="mega-col"><button class="mega-dept" data-act="shopDept" data-v="${d.id}"><span class="md-ic">${ic(d.icon, "sm")}</span>${d.id}<span class="muted num">${PRODUCTS.filter(p => p.dept === d.id).length}</span></button>
      <div class="mega-cats">${d.cats.map(c => `<button data-act="shopCat" data-v="${c}">${c}</button>`).join("")}${d.id === "Fashion" ? `<button data-act="shopDep" data-v="W">Women's fashion</button><button data-act="shopDep" data-v="M">Men's fashion</button>` : ""}</div></div>`).join("")}</div></div></div>`;
}

function tabbar() {
  const t = (r, icn, label, act) => `<button class="${CUR.split("/")[0] === r ? "on" : ""}" ${act ? `data-act="${act}"` : `data-go="${r}"`}>${ic(icn)}<span>${label}</span></button>`;
  return `<nav class="tabbar" aria-label="Main">${t("home", "home", "Home")}${t("shop", "search", "Shop", "shopAll")}
    <button class="tb-sell" data-act="mode" data-v="seller"><span class="plus">${ic("plus")}</span><span>Sell</span></button>
    ${t("saved", "heart", "Saved")}${t("account", "user", S.user ? "Me" : "Join", S.user ? "" : "join")}</nav>`;
}

function footer() {
  return `<footer class="footer"><div class="wrap"><div class="footer-grid">
    <div style="display:grid;gap:12px;align-content:start">${logo()}<p class="muted" style="max-width:36ch">Nigeria's marketplace for pre-loved everything: fashion, phones, furniture, appliances, cars and more. Droba connects you with sellers. You pay them on delivery.</p></div>
    <div><h5>Shop</h5><ul>${DEPTS.slice(0, 6).map(d => `<li><button data-act="shopDept" data-v="${d.id}">${d.id}</button></li>`).join("")}<li><button data-act="mega">All categories</button></li></ul></div>
    <div><h5>Sell</h5><ul><li><button data-act="mode" data-v="seller">Sell something free</button></li><li><button data-act="plans">Open a store</button></li><li><button data-act="sheet" data-v="grades">Condition guide</button></li></ul></div>
    <div><h5>Help</h5><ul><li><button data-act="sheet" data-v="safety">Buying safely</button></li><li><button data-act="sheet" data-v="grades">How grading works</button></li><li><span class="muted">hello@droba.ng</span></li></ul></div>
  </div><div class="footer-base"><span>© 2026 Droba. Pre-loved only. Droba does not handle payments between buyers and sellers.</span><span>Lagos · Abuja · Ibadan · Port Harcourt</span></div></div></footer>`;
}

/* =========================================================================
   BUYER VIEWS
   ========================================================================= */
function feedList() {
  const pr = prefs();
  const list = S.feed === "new" ? api.newIn(pr) : S.feed === "trending" ? api.trending(pr) : api.forYou(pr);
  const fd = S.feedDept || "";
  if (!fd) return list;
  // a picked department overrides personalisation so the chip always shows that whole department
  const all = S.feed === "new" ? api.newIn(null) : S.feed === "trending" ? api.trending(null) : api.forYou(null);
  return all.filter(p => p.dept === fd && (!S.feedCond || p.cond <= 2));
}
function feedGrid(list, limit) {
  const out = []; let si = 0;
  const fd = S.feedDept || "";
  const spons = SPONSORED_IDS.map(api.product).filter(p => !fd || p.dept === fd);
  list.slice(0, limit).forEach((p, i) => {
    out.push(pcard(p));
    if ((i + 1) % 6 === 0 && spons.length) out.push(pcard(spons[si++ % spons.length], { sponsored: true }));
    if (i === 10 && S.feed === "foryou" && !fd) out.push(`<section class="band" style="grid-column:1/-1"><div class="sec-head"><div><h2>Popular stores</h2><p>Premium stores buyers keep coming back to.</p></div></div><div class="stores">${api.stores().filter(s => s.verified).slice(0, 4).map(storeCard).join("")}</div></section>`);
  });
  return out.join("");
}
function feedFilterBar() {
  const fd = S.feedDept || "";
  return `<div class="feed-filter"><div class="chips scroll">
      <button class="chip ${!fd ? "on" : ""}" data-act="feedDept" data-v="">All</button>
      ${DEPTS.map(d => `<button class="chip ${fd === d.id ? "on" : ""}" data-act="feedDept" data-v="${d.id}">${ic(d.icon, "sm")}${d.id}</button>`).join("")}</div>
    <button class="btn btn-dark btn-sm" data-act="feedFilters">${ic("sliders", "sm")}Filters</button></div>`;
}

function viewHome() {
  const u = S.user, list = feedList();
  const limit = ui.more ? list.length : 21;
  const titles = { foryou: u ? "Picked for you" : "For You", new: "New In", trending: "Trending now" };
  const subs = { foryou: u ? "Based on what you shop for and what you've been viewing." : "Popular pre-loved finds across Droba.", new: "Fresh listings from the last few days.", trending: "Most saved this week." };
  const pr = prefs();
  const tunedTo = pr ? [(pr.depts.length ? pr.depts : ["Everything"]).join(", "), (pr.depts.includes("Fashion") || !pr.depts.length) ? { W: "Women", M: "Men", All: "" }[pr.dep] : ""].filter(Boolean).join(" · ") : "";
  const tuned = u
    ? `<div class="tuned">${ic("sparkle", "sm")}<span>Tuned for <b>${esc(tunedTo)}</b></span><button class="link" data-act="editPrefs">Edit</button></div>`
    : `<div class="tuned">${ic("sparkle", "sm")}<span>Want a feed that fits you?</span><button class="link" data-act="join">Personalise it</button></div>`;
  const hero = !u && S.feed === "foryou" ? `
    <section class="hero">
      <div class="hero-main">${pimg("1520006403909-838d6b92c22e", "Pre-loved items", "Vintage", "Brown", 1200, 'fetchpriority="high"')}
        <span class="eyebrow" style="color:rgba(255,255,255,.75)">Pre-loved only · Nigeria</span>
        <h1 style="margin-top:10px">Pre-loved everything, <span class="serif">honestly graded.</span></h1>
        <p>Fashion, phones, laptops, furniture, appliances, baby gear, cars and more from real homes and trusted stores. Every item is condition-graded, and you pay the seller on delivery.</p>
        <div class="hero-cta"><button class="btn btn-primary btn-lg" data-act="join">Start shopping</button><button class="btn btn-light btn-lg" data-act="mode" data-v="seller">Sell something</button></div>
      </div>
      <div class="hero-side">
        <div class="hero-card red">${pimg("1571175443880-49e1d25b2bc5", "A fridge for sale", "Fridges", "Blue", 600, 'class="hc-img"')}
          <div class="hc-body"><span class="eyebrow" style="color:rgba(255,255,255,.75)">No store needed</span><h3 style="margin-top:6px">Sell up to ${FREE_LIMIT} items free.</h3></div>
          <div class="hc-body"><button class="btn btn-light btn-sm" data-act="mode" data-v="seller">List an item ${ic("arrowR", "sm")}</button></div></div>
        <div class="hero-card cream"><div><span class="eyebrow">Buy safely</span><h3 style="margin-top:6px">Inspect it. Then pay the seller.</h3></div>
          <div class="grades"><span>Like New</span><span>First Grade</span><span>Fairly Used</span><span>Fair</span></div>
          <button class="link" data-act="sheet" data-v="safety">How buying on Droba works ${ic("arrowR", "sm")}</button></div>
      </div>
    </section>` : "";
  const deptRow = S.feed === "foryou" ? `<div class="sec-head"><div><h2>Shop by category</h2><p>Everything pre-owned, from wardrobes to car parks.</p></div><button class="link" data-act="mega">All categories ${ic("arrowR", "sm")}</button></div><div class="dept-row">${DEPTS.map(d => `<button class="dept" data-act="shopDept" data-v="${d.id}">${pimg(d.img, d.id, d.id, "Red", 600, 'loading="lazy"')}<span class="dept-l"><b>${d.id}</b><small>${d.blurb}</small></span></button>`).join("")}</div>
    <div class="sec-head"><div><h2 style="font-size:22px">Popular right now</h2></div></div><div class="cat-rail">${RAIL.map(c => `<button class="cat-tile" data-act="shopCat" data-v="${c}"><span class="ct-img">${pimg(CAT_IMG[c], c, c, "Red", 240, 'loading="lazy"')}</span>${c}</button>`).join("")}</div>` : "";
  return `<main class="wrap">
    <div class="feed-tabs"><div>${u ? `<span class="eyebrow">${greet()}, ${esc(first(u.name))}</span>` : ""}</div>${tuned}</div>
    ${hero}${deptRow}
    <div class="sec-head" id="feed"><div><h2>${titles[S.feed]}</h2><p>${subs[S.feed]}</p></div><button class="link" data-act="shopAll">See all ${ic("arrowR", "sm")}</button></div>
    ${feedFilterBar()}
    ${list.length ? `<div class="grid feed">${feedGrid(list, limit)}</div>` : `<div class="empty"><h3>Nothing here yet</h3><p class="muted">No ${esc(S.feedDept)} listings in this feed right now.</p><button class="btn btn-primary" data-act="feedDept" data-v="">Show everything</button></div>`}
    ${!ui.more && list.length > limit ? `<div style="display:flex;justify-content:center;margin-top:28px"><button class="btn btn-outline" data-act="more">Show more</button></div>` : ""}
    <section class="promise">
      <div><span class="p-ic">${ic("layers")}</span><div><h4>Graded condition</h4><p>Four clear grades, chosen by sellers and shown on every item.</p></div></div>
      <div><span class="p-ic">${ic("cash")}</span><div><h4>Pay on delivery</h4><p>Droba connects you with the seller. You pay them directly when it arrives.</p></div></div>
      <div><span class="p-ic">${ic("eye")}</span><div><h4>Inspect first</h4><p>Check it, test it, then pay. Never pay in advance.</p></div></div>
      <div><span class="p-ic">${ic("star")}</span><div><h4>Rate every seller</h4><p>Ratings after each order keep sellers honest.</p></div></div>
    </section>
    <section class="sell-band">
      <div><span class="eyebrow" style="color:#ff9aa8">Sell on Droba</span><h2 style="margin-top:10px">Sell one thing, or <span class="serif">open a store.</span></h2>
        <p>Got an old fridge, a sofa or a few dresses? List them free, no store needed. Selling often? A Premium store gives you your own storefront, more listings and free boosts.</p>
        <div class="hero-cta"><button class="btn btn-primary btn-lg" data-act="mode" data-v="seller">Sell something free</button><button class="btn btn-lg" style="color:#fff;border-color:rgba(255,255,255,.35)" data-act="plans">Compare store plans</button></div></div>
      <div class="sell-steps"><div><b>1</b><span>List up to ${FREE_LIMIT} items free with photos and a condition grade</span></div><div><b>2</b><span>Boost any listing from ${naira(BOOST_PRICES[0][1])} to reach more buyers</span></div><div><b>3</b><span>Buyers contact you, you deliver, they pay you</span></div></div>
    </section>
  </main>`;
}
function greet() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }

/* ----- Shop + filters -----
   Faceted filtering: every group's counts are worked out against all the OTHER active
   filters, so a buyer always sees how many items each option would give them. */
const stem = (w) => w.length > 3 ? w.replace(/(es|s)$/, "") : w;
const LISTED = [["", "Any time"], ["1", "Last 24 hours"], ["7", "Last 7 days"], ["30", "Last 30 days"]];
const PRICE_PRESETS = [["Under ₦10k", "", 10000], ["₦10k–50k", 10000, 50000], ["₦50k–150k", 50000, 150000], ["₦150k–500k", 150000, 500000], ["₦500k–2M", 500000, 2000000], ["₦2M+", 2000000, ""]];
function matches(p, f, skip) {
  const s = api.seller(p.seller);
  const on = (k) => k !== skip;
  if (on("dept") && f.dept.length && !f.dept.includes(p.dept)) return false;
  if (on("cat") && f.cat.length && !f.cat.includes(p.cat)) return false;
  if (on("dep") && f.dep.length && (p.dept !== "Fashion" || !(f.dep.includes(p.dep) || p.dep === "U"))) return false;
  if (on("cond") && f.cond.length && !f.cond.includes(p.cond)) return false;
  if (on("extra") && f.extra && !p.extra) return false;
  if (on("noFlaws") && f.noFlaws && p.flaws.length) return false;
  if (on("tested") && f.tested && !p.tested) return false;
  if (on("origin") && f.origin.length && !f.origin.includes(p.origin)) return false;
  if (on("size") && f.size.length && !f.size.includes(p.size)) return false;
  if (on("brand") && f.brand.length && !f.brand.includes(p.brand)) return false;
  if (on("color") && f.color.length && !f.color.includes(p.color)) return false;
  if (on("price") && f.min && p.price < +f.min) return false;
  if (on("price") && f.max && p.price > +f.max) return false;
  if (on("city") && f.city.length && !f.city.includes(s.city)) return false;
  if (on("sellerType") && f.sellerType.length && !f.sellerType.includes(s.type)) return false;
  if (on("verified") && f.verified && !s.verified) return false;
  if (on("deliver") && f.deliver && !p.deliver) return false;
  if (on("pickup") && f.pickup && !p.pickup) return false;
  if (on("offers") && f.offers && !p.offers) return false;
  if (on("listed") && f.listed && p.days > +f.listed) return false;
  return true;
}
function filtered(skip) {
  const f = S.f;
  let list = PRODUCTS.map(p => ({ p, score: 1 }));
  if (f.q) {
    const words = f.q.toLowerCase().split(/[\s,]+/).filter(Boolean).map(stem);
    list = list.map(({ p }) => {
      const s = api.seller(p.seller);
      const hay = [p.title, p.brand, p.cat, p.dept, p.color, p.size, p.origin, ...p.styles, s.name, GRADES[p.cond - 1].name].join(" ").toLowerCase();
      return { p, score: words.filter(w => hay.includes(w)).length };
    }).filter(x => x.score > 0);
  }
  list = list.filter(({ p }) => matches(p, f, skip));
  const sorters = { rec: (a, b) => b.score - a.score || b.p.saves - a.p.saves, new: (a, b) => a.p.days - b.p.days, low: (a, b) => a.p.price - b.p.price, high: (a, b) => b.p.price - a.p.price, saved: (a, b) => b.p.saves - a.p.saves };
  return list.sort(sorters[f.sort] || sorters.rec).map(x => x.p);
}
const FLAG_LABELS = { extra: "Tags on / boxed / papers", noFlaws: "No flaws", tested: "Tested & working", verified: "Verified sellers", deliver: "Seller delivers", pickup: "Pickup available", offers: "Open to offers" };
function activeFilters() {
  const f = S.f, out = [];
  f.dept.forEach(v => out.push(["dept", v, v]));
  f.cat.forEach(v => out.push(["cat", v, v]));
  f.dep.forEach(v => out.push(["dep", v, { W: "Women", M: "Men", U: "Unisex" }[v]]));
  f.cond.forEach(v => out.push(["cond", v, GRADES[v - 1].name]));
  f.size.forEach(v => out.push(["size", v, v]));
  f.brand.forEach(v => out.push(["brand", v, v]));
  f.color.forEach(v => out.push(["color", v, v]));
  f.origin.forEach(v => out.push(["origin", v, v]));
  if (f.min || f.max) out.push(["price", 0, `${f.min ? naira(f.min) : "₦0"} – ${f.max ? naira(f.max) : "any"}`]);
  f.city.forEach(v => out.push(["city", v, v]));
  f.sellerType.forEach(v => out.push(["sellerType", v, v === "store" ? "Stores" : "Individual sellers"]));
  if (f.listed) out.push(["listed", f.listed, LISTED.find(x => x[0] === f.listed)[1]]);
  Object.keys(FLAG_LABELS).forEach(k => { if (f[k]) out.push([k, true, FLAG_LABELS[k]]); });
  return out;
}
function filtersPanel(prefix) {
  const f = S.f;
  const facet = (key) => filtered(key);
  const cb = (key, val, label, count, numeric) => `<label class="check ${count === 0 && !f[key].includes(val) ? "zero" : ""}"><input type="checkbox" data-chg="f" data-k="${key}" data-v="${esc(val)}" ${numeric ? 'data-num="1"' : ""} ${f[key].includes(val) ? "checked" : ""}>${label}<span class="cnt">${count}</span></label>`;
  const tg = (key, label, count) => `<label class="switch"><span>${label}${count != null ? ` <span class="cnt">${count}</span>` : ""}</span><input type="checkbox" data-chg="flag" data-k="${key}" ${f[key] ? "checked" : ""}></label>`;
  const group = (id, title, body, open) => `<details class="fgroup" data-fg="${id}" ${(ui.fg[id] ?? open) ? "open" : ""}><summary>${title}${ic("chevD", "sm")}</summary><div class="fbody">${body}</div></details>`;
  const tally = (list, fn) => { const m = new Map(); list.forEach(p => { const k = fn(p); if (k) m.set(k, (m.get(k) || 0) + 1); }); return m; };
  const shownDepts = f.dept.length ? DEPTS.filter(d => f.dept.includes(d.id)) : DEPTS;
  const fashionOn = shownDepts.some(d => d.id === "Fashion");
  const techOn = shownDepts.some(d => d.kind === "tech");

  // Department + category (nested so every category is reachable without picking a department first)
  const deptBase = facet("dept"), catBase = facet("cat");
  const deptBody = DEPTS.map(d => {
    const n = deptBase.filter(p => p.dept === d.id).length;
    const showCats = f.dept.includes(d.id) || d.cats.some(c => f.cat.includes(c)) || ui.fg["d:" + d.id];
    return `<div class="dept-f">${cb("dept", d.id, `${ic(d.icon, "sm")}${d.id}`, n)}
      <button class="dept-f-more" data-act="fgToggle" data-v="d:${d.id}" aria-label="Show ${esc(d.id)} categories">${ic(showCats ? "chevD" : "chevR", "sm")}</button></div>
      ${showCats ? `<div class="sub-f">${d.cats.map(c => cb("cat", c, c, catBase.filter(p => p.cat === c).length)).join("")}</div>` : ""}`;
  }).join("");

  // Brands (top by count, expandable)
  const brandMap = [...tally(facet("brand"), p => p.brand)].sort((a, b) => b[1] - a[1]);
  f.brand.forEach(b => { if (!brandMap.find(x => x[0] === b)) brandMap.push([b, 0]); });
  const brands = ui.fg.allBrands ? brandMap : brandMap.slice(0, 8);
  // Colours
  const colorMap = tally(facet("color"), p => p.color);
  // Size / capacity for non-fashion when one department is picked
  const one = f.dept.length === 1 ? f.dept[0] : null;
  const specMap = one && one !== "Fashion" ? [...tally(facet("size").filter(p => p.dept === one), p => p.size)] : [];
  // Fashion sizes
  const sizes = (label, arr) => { const m = tally(facet("size"), p => p.size); return `<div class="lbl muted" style="font-size:12px;margin-top:4px">${label}</div><div class="size-grid">${arr.map(sz => `<button class="${f.size.includes(sz) ? "on" : ""} ${!m.get(sz) && !f.size.includes(sz) ? "zero" : ""}" data-act="ftog" data-v="size|${sz}">${sz}</button>`).join("")}</div>`; };
  const cityMap = tally(facet("city"), p => api.seller(p.seller).city);
  const stMap = tally(facet("sellerType"), p => api.seller(p.seller).type);
  const condBase = facet("cond");
  const originBase = facet("origin");
  const listedBase = facet("listed");
  const priceBase = facet("price");
  const flagN = (k, fn) => facet(k).filter(fn).length;

  return `
    ${group("dept", "Category", deptBody, true)}
    ${fashionOn ? group("dep", "Fashion for", [["W", "Women"], ["M", "Men"], ["U", "Unisex"]].map(([v, l]) => cb("dep", v, l, facet("dep").filter(p => p.dept === "Fashion" && p.dep === v).length)).join(""), f.dep.length > 0) : ""}
    ${group("price", "Price", `<div class="price-inputs"><input id="${prefix}-min" inputmode="numeric" placeholder="Min ₦" value="${esc(f.min)}" data-chg="price" data-k="min" aria-label="Minimum price"><span class="muted">–</span><input id="${prefix}-max" inputmode="numeric" placeholder="Max ₦" value="${esc(f.max)}" data-chg="price" data-k="max" aria-label="Maximum price"></div>
      <div class="chips">${PRICE_PRESETS.map(([l, a, b]) => { const n = priceBase.filter(p => (!a || p.price >= a) && (!b || p.price <= b)).length; return `<button class="chip ${String(f.min) === String(a) && String(f.max) === String(b) ? "on" : ""}" style="height:32px;font-size:13px" data-act="fprice" data-v="${a}|${b}">${l} <span class="cnt">${n}</span></button>`; }).join("")}</div>`, true)}
    ${group("cond", "Condition", GRADES.map(g => `<label class="check"><input type="checkbox" data-chg="f" data-k="cond" data-v="${g.id}" data-num="1" ${f.cond.includes(g.id) ? "checked" : ""}>${condBars(g.id)} ${g.name}<span class="cnt">${condBase.filter(p => p.cond === g.id).length}</span></label>`).join("") +
      tg("noFlaws", "No flaws noted", flagN("noFlaws", p => !p.flaws.length)) + tg("extra", "Tags on, boxed or papers", flagN("extra", p => p.extra)), true)}
    ${techOn ? group("tech", "Working & origin", tg("tested", "Tested & working", flagN("tested", p => p.tested)) +
      [["Tokunbo", "Tokunbo (foreign-used)"], ["Nigerian-used", "Nigerian-used"]].map(([v, l]) => cb("origin", v, l, originBase.filter(p => p.origin === v).length)).join(""), f.tested || f.origin.length > 0) : ""}
    ${fashionOn ? group("size", "Size (fashion)", sizes("Clothing", ["XS", "S", "M", "L", "XL"]) + sizes("Shoes (EU)", ["38", "39", "41", "42", "43", "44"]) + sizes("Waist", ["28", "30", "32", "34"]), f.size.length > 0) : ""}
    ${specMap.length ? group("spec", one === "Vehicles & Parts" ? "Transmission / engine" : "Size, storage or capacity", specMap.map(([v, n]) => cb("size", v, esc(v), n)).join(""), true) : ""}
    ${group("brand", "Brand", brands.map(([b, n]) => cb("brand", b, esc(b), n)).join("") + (brandMap.length > 8 ? `<button class="link" style="font-size:13.5px;justify-self:start" data-act="fgToggle" data-v="allBrands">${ui.fg.allBrands ? "Show fewer" : `Show all ${brandMap.length} brands`}</button>` : ""), f.brand.length > 0)}
    ${group("color", "Colour", `<div class="swatches">${Object.keys(TINTS).map(c => { const n = colorMap.get(c) || 0; return `<button class="sw ${f.color.includes(c) ? "on" : ""} ${!n && !f.color.includes(c) ? "zero" : ""}" data-act="ftog" data-v="color|${c}" title="${c} (${n})"><i style="background:${TINTS[c][1]}"></i>${c}</button>`; }).join("")}</div>`, f.color.length > 0)}
    ${group("city", "Seller location", CITIES.map(c => cb("city", c, c, cityMap.get(c) || 0)).join(""), f.city.length > 0)}
    ${group("seller", "Seller", cb("sellerType", "store", `${ic("store", "sm")}Stores`, stMap.get("store") || 0) + cb("sellerType", "individual", `${ic("user", "sm")}Individual sellers`, stMap.get("individual") || 0) + tg("verified", `Verified only`, flagN("verified", p => !!api.seller(p.seller).verified)), f.sellerType.length > 0 || f.verified)}
    ${group("deal", "Delivery & deals", tg("deliver", "Seller delivers", flagN("deliver", p => p.deliver)) + tg("pickup", "Pickup available", flagN("pickup", p => p.pickup)) + tg("offers", "Open to offers", flagN("offers", p => p.offers)), f.deliver || f.pickup || f.offers)}
    ${group("listed", "Date listed", LISTED.map(([v, l]) => `<label class="check"><input type="radio" name="${prefix}-listed" data-chg="listed" value="${v}" ${f.listed === v ? "checked" : ""}>${l}${v ? `<span class="cnt">${listedBase.filter(p => p.days <= +v).length}</span>` : ""}</label>`).join(""), !!f.listed)}`;
}
const QUICK = [
  ["Like New", (f) => f.cond.includes(1), "cond|1"],
  ["Under ₦50k", (f) => !f.min && String(f.max) === "50000", "under50"],
  ["Lagos", (f) => f.city.includes("Lagos"), "city|Lagos"],
  ["Abuja", (f) => f.city.includes("Abuja"), "city|Abuja"],
  ["Tested & working", (f) => f.tested, "flag|tested"],
  ["Stores only", (f) => f.sellerType.length === 1 && f.sellerType[0] === "store", "stores"],
  ["Verified", (f) => f.verified, "flag|verified"],
  ["Pickup available", (f) => f.pickup, "flag|pickup"],
  ["Open to offers", (f) => f.offers, "flag|offers"],
  ["Listed this week", (f) => f.listed === "7", "week"],
];
function viewShop() {
  const res = filtered(), f = S.f, af = activeFilters();
  const title = f.q ? `“${esc(f.q)}”` : f.cat.length === 1 ? f.cat[0] : f.dep.length === 1 && f.dept.length <= 1 ? { W: "Women's fashion", M: "Men's fashion", U: "Unisex fashion" }[f.dep[0]] : f.dept.length === 1 ? f.dept[0] : "Shop all";
  return `<main class="wrap"><div class="shop">
    <aside class="filters" aria-label="Filters"><div class="filters-head"><b>Filters</b>${af.length ? `<button class="link" data-act="clearF">Clear all (${af.length})</button>` : ""}</div>${filtersPanel("side")}</aside>
    <section style="min-width:0">
      <div class="shop-head"><div><span class="eyebrow">${f.q ? "Search results" : "Pre-loved"}</span><h1 style="margin-top:4px">${title}</h1></div><span class="muted num">${res.length} item${res.length === 1 ? "" : "s"}</span></div>
      ${!f.q && !f.dept.length && !f.cat.length ? `<div class="chips scroll" style="margin-bottom:12px">${DEPTS.map(d => `<button class="chip" data-act="shopDept" data-v="${d.id}">${ic(d.icon, "sm")}${d.id}</button>`).join("")}</div>` : ""}
      ${f.dept.length === 1 && !f.q ? `<div class="chips scroll" style="margin-bottom:12px">${DEPTS.find(d => d.id === f.dept[0]).cats.map(c => `<button class="chip ${f.cat.includes(c) ? "on" : ""}" data-act="toggleCat" data-v="${c}">${c}</button>`).join("")}</div>` : ""}
      <div class="quick-row"><button class="btn btn-dark btn-sm filter-btn" data-act="sheet" data-v="filters">${ic("sliders", "sm")}All filters${af.length ? ` · ${af.length}` : ""}</button>
        <div class="chips scroll">${QUICK.map(([l, on, v]) => `<button class="chip qchip ${on(f) ? "on" : ""}" data-act="qc" data-v="${v}">${on(f) ? ic("check", "sm") : ""}${l}</button>`).join("")}</div></div>
      <div class="toolbar">
        <div class="active-filters">${af.map(([key, v, l]) => `<span class="af">${esc(l)}<button data-act="rmF" data-v="${key}|${esc(v)}" aria-label="Remove ${esc(l)}">${ic("x")}</button></span>`).join("")}
          ${af.length > 1 ? `<button class="link" style="font-size:13.5px" data-act="clearF">Clear all</button>` : ""}</div>
        <select class="select" id="sort" data-chg="sort" aria-label="Sort">${[["rec", "Recommended"], ["new", "Newest first"], ["low", "Price: low to high"], ["high", "Price: high to low"], ["saved", "Most saved"]].map(([v, l]) => `<option value="${v}" ${f.sort === v ? "selected" : ""}>${l}</option>`).join("")}</select>
      </div>
      ${res.length ? `<div class="grid">${res.map(p => pcard(p)).join("")}</div>`
      : `<div class="empty"><span class="e-ic">${ic("search", "lg")}</span><h3>Nothing matches yet</h3><p class="muted">Try removing a filter or searching a broader term like “phone”, “sofa” or “dress”.</p><button class="btn btn-primary" data-act="clearF">Clear filters</button></div>`}
    </section></div></main>`;
}

/* ----- Product ----- */
function viewProduct(id) {
  const p = api.product(id);
  if (!p) return `<main class="wrap"><div class="empty" style="margin-top:40px"><h3>This item is no longer available</h3><button class="btn btn-primary" data-go="home">Back to For You</button></div></main>`;
  const s = api.seller(p.seller), g = api.grade(p.cond);
  const fashion = p.dept === "Fashion";
  const hard = kindOf(p.dept) === "tech";
  const shots = [["Front", ""], ["Detail", "zoom-detail"], [fashion ? "Label" : "Close-up", "zoom-label"]];
  const cur = shots[ui.gIdx % shots.length];
  const inCart = S.cart.includes(p.id), saved = S.saved.includes(p.id);
  const more = api.bySeller(s.id).filter(x => x.id !== p.id).slice(0, 4);
  const similar = PRODUCTS.filter(x => x.cat === p.cat && x.id !== p.id && x.seller !== s.id).slice(0, 4);
  return `<main class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><button data-go="home">Home</button>${ic("chevR", "sm")}<button data-act="shopDept" data-v="${p.dept}">${p.dept}</button>${ic("chevR", "sm")}<button data-act="shopCat" data-v="${p.cat}">${p.cat}</button>${ic("chevR", "sm")}<span>${esc(p.title)}</span></nav>
    <div class="pdp">
      <div class="gallery">
        <div class="g-thumbs">${shots.map(([l, c], i) => `<button class="${i === ui.gIdx ? "on" : ""} ${c}" data-act="gal" data-v="${i}" aria-label="${l} photo">${prodImg(p, 200)}<span>${l}</span></button>`).join("")}</div>
        <div class="g-main ${cur[1]}">${prodImg(p, 1100, "")}
          <span class="g-label pill" style="background:rgba(255,255,255,.94)">${ic("camera", "sm")}${cur[0]}</span>
          <button class="g-nav l" data-act="gal" data-v="${(ui.gIdx + 2) % 3}" aria-label="Previous photo">${ic("chevL")}</button>
          <button class="g-nav r" data-act="gal" data-v="${(ui.gIdx + 1) % 3}" aria-label="Next photo">${ic("chevR")}</button>
          <div class="g-dots">${shots.map((_, i) => `<i class="${i === ui.gIdx ? "on" : ""}"></i>`).join("")}</div>
        </div>
      </div>
      <div class="pdp-info">
        <button class="seller-mini" data-go="store/${s.id}" style="text-align:left"><span class="store-logo ${s.type === "individual" ? "round" : ""}" style="background:${s.color || "var(--ink-2)"}">${s.initials}</span>
          <span style="flex:1;min-width:0"><span class="sm-name">${esc(s.name)} ${vb(s.verified)}<span class="pill" style="height:20px;font-size:11px">${sellerKind(s)}</span></span><span class="sm-meta"><span>${ic("star", "sm")} ${s.rating} (${s.reviews})</span><span>${k(s.sold)} sold</span><span>${esc(s.area)}, ${esc(s.city)}</span></span></span>
          <span class="link" style="font-size:13.5px">${s.type === "store" ? "Visit store" : "Profile"} ${ic("chevR", "sm")}</span></button>
        <div class="pdp-title">
          <div class="brand">${esc(p.brand)}</div>
          <h1>${esc(p.title)}</h1>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">${p.tag ? `<span class="tag tag-${p.tag}">${TAGS[p.tag]}</span>` : ""}${p.origin ? `<span class="pill">${p.origin === "Tokunbo" ? "Tokunbo (foreign-used)" : "Nigerian-used"}</span>` : ""}${p.tested ? `<span class="pill ok">${ic("check", "sm")}Tested & working</span>` : ""}<span class="pill">${ic("heart", "sm")}${p.saves} saves</span><span class="pill">Listed ${p.days === 0 ? "today" : p.days + "d ago"}</span></div>
          <div class="pdp-price"><span class="price">${naira(p.price)}</span>${p.retail ? `<span class="was">Est. new price <s>${naira(p.retail)}</s></span>` : ""}</div>
        </div>
        <div class="box cond-box">
          <div class="cb-head"><div><span class="eyebrow">Condition</span><div class="cb-grade">${g.name}${p.extra ? ` <span class="pill red" style="vertical-align:middle">${extraLabel(p.dept)}</span>` : ""}</div></div><button class="link" style="font-size:13.5px" data-act="sheet" data-v="grades">Grade guide</button></div>
          <div class="cond-scale">${[1, 2, 3, 4].map(i => `<span class="seg ${i <= 5 - p.cond ? "f" : ""}"></span>`).join("")}</div>
          <div class="cond-labels">${GRADES.map(x => `<span class="${x.id === p.cond ? "cur" : ""}">${x.short}</span>`).join("")}</div>
          <p class="cb-desc">${g.desc}</p>
          ${p.flaws.length ? `<div class="flaws">${p.flaws.map(fl => `<span class="pill warn">${esc(fl)}</span>`).join("")}</div>` : `<div class="flaws"><span class="pill ok">${ic("check", "sm")}No flaws noted</span></div>`}
          ${p.note ? `<div class="cb-note">${ic("msg", "sm")}<span><b>Seller's note:</b> ${esc(p.note)}</span></div>` : ""}
        </div>
        <div class="box"><h4>${ic(fashion ? "ruler" : "info", "sm")}${fashion ? "Size & measurements" : "Specs & dimensions"}</h4>
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><span class="pill dark">${fashion ? "Size " : ""}${esc(p.size)}</span>${p.sizeNote ? `<span class="pill">${esc(p.sizeNote)}</span>` : ""}${fashion ? `<span class="pill">${{ W: "Women", M: "Men", U: "Unisex" }[p.dep]}</span>` : ""}</div>
          <table class="meas">${p.meas.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table></div>
        <div class="buy-row">
          <button class="btn ${inCart ? "btn-dark" : "btn-primary"} btn-lg" data-act="cart" data-v="${p.id}">${ic(inCart ? "check" : "bag", "sm")}${inCart ? "In your bag" : "Add to bag"}</button>
          <button class="btn btn-dark btn-lg" data-act="buyNow" data-v="${p.id}">Order now</button>
          <button class="btn btn-ghost btn-lg ${saved ? "saved" : ""}" style="padding:0 16px" data-act="save" data-v="${p.id}" aria-label="${saved ? "Saved" : "Save"}">${ic("heart")}</button>
        </div>
        <div class="box contact"><div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span><b style="display:block">Ask ${esc(shortName(s))} a question</b><span class="muted" style="font-size:13.5px">Usually replies ${esc(s.responds)}</span></span>
          <span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-light btn-sm" data-act="msgSeller">${ic("msg", "sm")}Message</button><button class="btn btn-light btn-sm" data-act="showPhone">${ic("phone", "sm")}${ui.showPhone ? `<span class="num" style="user-select:all">${esc(s.phone)}</span>` : "Show number"}</button></span></div></div>
        <div class="pay-note"><h4>${ic("cash", "sm")}You pay the seller on delivery</h4><p class="muted" style="font-size:14px;margin:6px 0 12px">Droba connects you with ${esc(shortName(s))}; we don't take payments. Ships from ${esc(s.area)}, ${esc(s.city)}. Delivery or pickup is agreed with the seller.</p>
          ${p.dept === "Vehicles & Parts" ? safetyList(3, "", SAFETY_VEHICLE) : safetyList(hard ? 3 : 1)}<button class="link" style="font-size:13.5px;margin-top:10px" data-act="sheet" data-v="safety">More safety tips</button></div>
      </div>
    </div>
    ${more.length ? `<section style="margin-top:56px"><div class="sec-head"><div><h2>More from ${esc(s.name)}</h2></div><button class="link" data-go="store/${s.id}">View all ${ic("arrowR", "sm")}</button></div><div class="grid g4">${more.map(x => pcard(x)).join("")}</div></section>` : ""}
    ${similar.length ? `<section style="margin-top:48px"><div class="sec-head"><div><h2>You may also like</h2></div></div><div class="grid g4">${similar.map(x => pcard(x)).join("")}</div></section>` : ""}
    <div class="sticky-buy"><div><div class="muted" style="font-size:12px">${g.name} · Pay on delivery</div><span class="price">${naira(p.price)}</span></div>
      <button class="btn btn-ghost ${saved ? "saved" : ""}" style="padding:0 14px" data-act="save" data-v="${p.id}" aria-label="Save">${ic("heart")}</button>
      <button class="btn ${inCart ? "btn-dark" : "btn-primary"}" data-act="cart" data-v="${p.id}">${inCart ? "In your bag" : "Add to bag"}</button></div>
  </main>`;
}

/* ----- Store / seller profile ----- */
function storeData(id) {
  if (id === "me") {
    const se = mySeller();
    if (!se) return null;
    const store = se.type === "store";
    return { id: "me", type: se.type, plan: se.plan, name: store ? se.name : S.user.name, initials: initials(store ? se.name : S.user.name), verified: null, city: se.city, area: se.area || se.city, rating: 4.8, reviews: 12, sold: S.listings.filter(l => l.status === "sold").length + 9, joined: "2026", responds: "within 1 hour", banner: se.banner || "1540221652346-e5dd6b50f3e7", color: "#C8102E", bio: se.bio || "Pre-loved pieces. Details and measurements on every listing.", ig: se.ig || "", tiktok: se.tiktok || "", phone: se.phone || "", own: true };
  }
  return api.seller(id);
}
function viewStore(id) {
  const s = storeData(id);
  if (!s) return `<main class="wrap"><div class="empty" style="margin-top:40px"><h3>Seller not found</h3><button class="btn btn-primary" data-go="home">Back home</button></div></main>`;
  const items = s.own ? S.listings.filter(l => l.status === "active") : api.bySeller(s.id);
  const following = S.following.includes(s.id);
  const store = s.type === "store";
  const vtext = s.verified === "business" ? "Verified Business: CAC registration and business address checked, with 200+ completed orders." : s.verified ? "Verified Store: ID and phone checked, with 50+ completed orders at 4.5★ or higher." : store ? "Not verified yet. Stores can apply after 50 completed orders." : "Individual seller. ID not verified. Check items carefully and pay only on delivery.";
  const ownCard = (l) => `<article class="pcard"><div class="pcard-media">${listingImg(l, 520)}<div class="pcard-bottom">${condChip(l.cond, l.extra, l.dept)}</div></div><div class="pcard-info"><span class="pcard-seller"><span>${esc(s.name)}</span></span><span class="pcard-title">${esc(l.title)}</span><div class="pcard-row"><div class="price">${naira(l.price)}</div></div></div></article>`;
  const actions = s.own ? `<button class="btn btn-primary" data-go="studio/new">${ic("plus", "sm")}New listing</button>` : `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ${following ? "btn-dark" : "btn-primary"}" data-act="follow" data-v="${s.id}">${following ? ic("check", "sm") + "Following" : ic("plus", "sm") + "Follow"}</button><button class="btn btn-ghost" data-act="msgSeller">${ic("msg", "sm")}Message</button></div>`;
  const ownTip = s.own ? `<div class="tip" style="margin-top:14px;position:relative;z-index:2">${ic("eye")}<span>This is how buyers see you. ${store ? `<button class="link" data-go="studio/storefront">Edit storefront</button> · ` : `<button class="link" data-go="studio/plans">Get a full storefront</button> · `}<button class="link" data-act="mode" data-v="seller">Back to selling</button></span></div>` : "";
  const tabs = `<div class="tabs-line" style="margin-bottom:20px"><button class="${ui.storeTab === "shop" ? "on" : ""}" data-act="storeTab" data-v="shop">${store ? "Shop" : "Items"} <span class="n">${items.length}</span></button><button class="${ui.storeTab === "reviews" ? "on" : ""}" data-act="storeTab" data-v="reviews">Ratings <span class="n">${s.reviews}</span></button></div>
    ${ui.storeTab === "shop" ? (items.length ? `<div class="grid">${items.map(p => s.own ? ownCard(p) : pcard(p)).join("")}</div>` : `<div class="empty"><h3>No items right now</h3></div>`)
      : `<div class="box"><div style="display:flex;gap:16px;align-items:center;padding-bottom:14px;border-bottom:1px solid var(--line-2)"><span style="font-family:var(--f-display);font-size:44px;font-weight:800">${s.rating}</span><div>${stars(s.rating)}<div class="muted" style="font-size:13px">${s.reviews} ratings from buyers who received their items</div></div></div>
        ${REVIEWS.slice(0, store ? 3 : 1).map(r => `<div class="review"><div style="display:flex;justify-content:space-between;gap:10px"><b>${esc(r.name)}</b><span class="muted" style="font-size:12.5px">${r.when}</span></div>${stars(r.stars)}<p style="font-size:14.5px">${esc(r.text)}</p><span class="muted" style="font-size:12.5px">Bought: ${esc(r.item)}</span></div>`).join("")}</div>`}`;
  if (!store) {
    return `<main class="wrap">${ownTip}
      <div class="ind-head"><span class="avatar xl">${s.initials}</span><div style="min-width:0"><span class="pill">${ic("user", "sm")}Individual seller</span><h1 style="margin-top:8px">${esc(s.name)}</h1>
        <div class="sf-stats"><span><b>${s.rating}</b>${stars(s.rating)} (${s.reviews})</span><span><b>${s.sold}</b>sold</span><span>${ic("pin", "sm")} ${esc(s.area)}, ${esc(s.city)}</span><span>${ic("clock", "sm")} On Droba since ${s.joined}</span></div></div>${actions}</div>
      <div class="verify-note" style="margin-bottom:22px">${ic("info", "sm")} ${vtext}</div>
      ${tabs}</main>`;
  }
  return `<main>
    <div class="wrap" style="padding-inline:0;max-width:var(--wrap)"><div class="sf-banner">${pimg(s.banner, s.name + " banner", items[0] ? items[0].cat : "Vintage", items[0] ? items[0].color : "Red", 1600)}</div></div>
    <div class="wrap">${ownTip}
      <div class="sf-head" style="${s.own ? "margin-top:16px" : ""}">
        <span class="store-logo" style="background:${s.color}">${s.initials}</span>
        <div style="min-width:0"><h1>${esc(s.name)} ${s.verified ? `<span class="sf-badge ${s.verified === "business" ? "biz" : ""}">${vb(s.verified)}${s.verified === "business" ? "Verified Business" : "Verified Store"}</span>` : ""}</h1>
          <div class="sf-stats"><span><b>${s.rating}</b>${stars(s.rating)} (${s.reviews})</span><span><b>${k(s.sold)}</b>sold</span><span>${ic("pin", "sm")} ${esc(s.area)}, ${esc(s.city)}</span><span>${ic("clock", "sm")} Replies ${esc(s.responds)}</span></div></div>
        ${actions}
      </div>
      <div class="sf-body">
        <aside class="sf-about">
          <div class="box" style="display:grid;gap:14px"><h4>About</h4><p style="font-size:14.5px;color:var(--ink-2)">${esc(s.bio)}</p>
            <div class="socials">${s.ig ? `<div><span>Instagram</span><b>${esc(s.ig)}</b></div>` : ""}${s.tiktok ? `<div><span>TikTok</span><b>${esc(s.tiktok)}</b></div>` : ""}${s.phone ? `<div><span>Phone / WhatsApp</span><b class="num">${esc(s.phone)}</b></div>` : ""}<div><span>On Droba since</span><b>${s.joined}</b></div></div>
            <div class="verify-note">${s.verified ? vb(s.verified) : ic("info", "sm")} ${vtext}</div></div>
        </aside>
        <section style="min-width:0">${tabs}</section>
      </div></div></main>`;
}

/* ----- Saved, account, order request ----- */
function viewSaved() {
  const items = S.saved.map(api.product).filter(Boolean);
  return `<main class="wrap"><div class="shop-head" style="padding-top:28px"><div><span class="eyebrow">Your list</span><h1 style="margin-top:4px">Saved items</h1></div><span class="muted">${items.length} saved</span></div>
    ${items.length ? `<div class="grid">${items.map(p => pcard(p)).join("")}</div>` : `<div class="empty"><span class="e-ic">${ic("heart", "lg")}</span><h3>Nothing saved yet</h3><p class="muted">Tap the heart on anything to keep it here. Pre-loved items are one of one, so save what you love.</p><button class="btn btn-primary" data-act="feed" data-v="foryou">Browse For You</button></div>`}</main>`;
}
const DEMO_BUYER_ORDERS = () => [
  { id: "DRB-10391", pids: [24], seller: "s5", status: "Confirmed", when: "6 Oct", total: 24000, rated: 0 },
  { id: "DRB-10233", pids: [6], seller: "s2", status: "Delivered", when: "12 Sep", total: 38000, rated: 0 },
  { id: "DRB-10102", pids: [51], seller: "s10", status: "Delivered", when: "30 Aug", total: 310000, rated: 5 },
];
function buyerOrders() { if (!S.demoOrdersSeeded) { S.myOrders = [...S.myOrders, ...DEMO_BUYER_ORDERS()]; S.demoOrdersSeeded = true; } return S.myOrders; }
const buyerPill = (s) => `<span class="pill ${s === "Delivered" ? "ok" : s === "Confirmed" ? "info" : "warn"}">${s === "Confirmed" ? "Seller confirmed" : s}</span>`;
function viewAccount() {
  const u = S.user;
  if (!u) return `<main class="wrap"><div class="empty" style="margin-top:40px"><span class="e-ic">${ic("user", "lg")}</span><h3>Join Droba</h3><p class="muted">Create an account to save items, send order requests and sell your own things.</p><button class="btn btn-primary" data-act="join">Create account</button><button class="link" data-go="signin">I already have an account</button></div></main>`;
  const se = mySeller();
  const orders = buyerOrders();
  const pr = prefs();
  return `<main class="wrap"><div class="acct">
    <aside style="display:grid;gap:16px;align-content:start">
      <div class="acct-card"><div style="display:flex;gap:14px;align-items:center"><span class="avatar lg">${initials(u.name)}</span><div style="min-width:0"><h3 style="font-size:22px">${esc(u.name)}</h3><div class="muted" style="font-size:13.5px;overflow:hidden;text-overflow:ellipsis">${esc(u.email)}</div></div></div>
        <div><div class="lbl" style="margin-bottom:8px">Your For You feed</div><div class="chips">${(pr.depts.length ? pr.depts : ["Everything"]).map(d => `<span class="pill dark">${esc(d)}</span>`).join("")}${(u.styles || []).map(s => `<span class="pill">${esc(s)}</span>`).join("")}</div></div>
        <button class="btn btn-ghost btn-sm" data-act="editPrefs">${ic("sparkle", "sm")}Edit preferences</button></div>
      <div class="mode-card"><span class="eyebrow" style="color:#ff9aa8">${se ? (se.type === "store" ? "Your store" : "Free seller") : "Selling"}</span>
        <h3 style="font-size:22px">${se ? esc(sellerName()) : "Got something to sell?"}</h3>
        <p>${se ? `${activeCount()} active listings · ${PLANS.find(p => p.id === se.plan).label}. Shopping and selling share one account.` : `List up to ${FREE_LIMIT} items free. No store needed. Switch between shopping and selling whenever you like.`}</p>
        <button class="btn btn-primary" data-act="mode" data-v="seller">${ic("swap", "sm")}${se ? "Switch to selling" : "Sell something"}</button></div>
    </aside>
    <section style="display:grid;gap:18px;min-width:0;align-content:start">
      <div class="panel"><div class="panel-head"><h3>My orders</h3><span class="muted" style="font-size:13px">You pay sellers directly on delivery</span></div>
        ${orders.map(o => { const p = api.product(o.pids[0]), s = api.seller(o.seller); return `<div class="order-row">${prodImg(p, 200)}<div style="min-width:0"><b style="display:block">${esc(p.title)}${o.pids.length > 1 ? ` + ${o.pids.length - 1} more` : ""}</b><span class="muted" style="font-size:13px">${esc(s.name)} · ${o.id} · ${o.when} · ${naira(o.total)}</span>
          <div style="margin-top:6px">${o.status === "Delivered" ? (o.rated ? `<span class="muted" style="font-size:13px;display:inline-flex;gap:6px;align-items:center">You rated ${stars(o.rated)}</span>` : `<button class="btn btn-primary btn-sm" data-act="rateOpen" data-v="${o.id}">${ic("star", "sm")}Rate ${esc(shortName(s))}</button>`) : `<span class="muted" style="font-size:13px">${o.status === "Confirmed" ? "Inspect it on arrival, then pay the seller." : "The seller will call you to confirm."}</span>`}</div></div>${buyerPill(o.status)}</div>`; }).join("")}</div>
      <div class="panel"><div class="panel-head"><h3>Settings</h3></div><div class="panel-body" style="display:grid;gap:4px">
        ${[["pin", "Delivery addresses", "2 saved"], ["phone", "Phone number", "Shared with sellers when you send a request"], ["bell", "Notifications", "Seller replies, price drops, new from stores you follow"], ["shield", "Login & security", "Phone verified"]].map(([i, a, b]) => `<button class="mp-item" style="display:flex;gap:12px;align-items:center;padding:12px 6px;text-align:left;width:100%">${ic(i)}<span style="flex:1"><b style="display:block;font-weight:650">${a}</b><span class="muted" style="font-size:13px">${b}</span></span>${ic("chevR", "sm")}</button>`).join("")}</div></div>
    </section></div></main>`;
}
function cartGroups() {
  const groups = {};
  S.cart.map(api.product).filter(Boolean).forEach(p => { (groups[p.seller] = groups[p.seller] || []).push(p); });
  return groups;
}
const cartTotal = () => S.cart.map(api.product).filter(Boolean).reduce((a, p) => a + p.price, 0);
function viewCheckout() {
  const g = cartGroups(), n = Object.keys(g).length;
  if (!S.cart.length) return `<main class="wrap"><div class="empty" style="margin-top:40px"><span class="e-ic">${ic("bag", "lg")}</span><h3>Your bag is empty</h3><button class="btn btn-primary" data-act="feed" data-v="foryou">Find something pre-loved</button></div></main>`;
  const u = S.user || {};
  const opt = (v, icn, title, sub) => `<button class="rcard ${ui.ship === v ? "on" : ""}" data-act="ship" data-v="${v}"><span class="rc-dot"></span><span style="flex:1"><h4>${ic(icn, "sm")}${title}</h4><p>${sub}</p></span></button>`;
  return `<main class="wrap"><div class="checkout">
    <section style="display:grid;gap:18px;min-width:0">
      <div><span class="eyebrow">Order request</span><h1 style="font-size:clamp(28px,3vw,40px);margin-top:4px">Send your request to ${n === 1 ? "the seller" : n + " sellers"}.</h1><p class="muted" style="margin-top:8px;max-width:60ch">Droba connects you with sellers. Each seller will call or message you to confirm and arrange delivery. You pay them directly when the item arrives.</p></div>
      <div class="box" style="display:grid;gap:16px"><h4>${ic("user", "sm")}How sellers can reach you</h4>
        <div class="form-grid"><div class="field"><label for="co-name">Full name</label><input class="input" id="co-name" value="${esc(u.name || "")}" placeholder="Amara Okafor"></div>
          <div class="field"><label for="co-phone">Phone (shared with the seller)</label><div class="input-pre"><span>+234</span><input id="co-phone" inputmode="tel" placeholder="801 234 5678" value="${esc(u.phone || "")}"></div></div>
          <div class="field full"><label for="co-addr">Delivery address</label><input class="input" id="co-addr" placeholder="12 Adeola Odeku Street, Victoria Island"></div>
          <div class="field"><label for="co-city">City</label><select id="co-city">${CITIES.map(c => `<option>${c}</option>`).join("")}</select></div>
          <div class="field"><label for="co-note">Note for the seller (optional)</label><input class="input" id="co-note" placeholder="Best time to call, landmark…"></div></div></div>
      <div class="box" style="display:grid;gap:12px"><h4>${ic("truck", "sm")}Delivery</h4><div class="radio-cards">
        ${opt("deliver", "truck", "Seller delivers to me", "The seller tells you the delivery fee when they confirm. Pay it with the item.")}
        ${opt("pickup", "pin", "I'll pick it up", "Arrange a time and a safe public place with the seller.")}</div></div>
      <div class="box" style="display:grid;gap:12px"><h4>${ic("cash", "sm")}Payment: on delivery, to the seller</h4>
        <p class="muted" style="font-size:14px">Droba never asks you to pay online. Pay the seller in cash or by transfer only after you've checked the item.</p>
        <div class="soft-warn">${ic("info")}<span><b>Stay safe.</b> Inspect and test everything before you pay. Don't send money in advance, even if a seller asks. If something isn't as described, don't pay, and report the listing.</span></div></div>
    </section>
    <aside class="co-sum box" style="display:grid;gap:14px"><h4>Your request</h4>
      ${Object.entries(g).map(([sid, ps]) => `<div style="display:grid;gap:10px"><div class="muted" style="font-size:13px;font-weight:700;display:flex;gap:6px;align-items:center">${esc(api.seller(sid).name)} ${vb(api.seller(sid).verified)}</div>${ps.map(p => `<div style="display:flex;gap:12px;align-items:center">${prodImg(p, 200, 'style="width:52px;height:64px;border-radius:8px;object-fit:cover;flex:none"')}<div style="flex:1;min-width:0"><div style="font-weight:650;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.title)}</div><div class="muted" style="font-size:12.5px">${GRADES[p.cond - 1].name} · ${esc(p.size)}</div></div><b class="num">${naira(p.price)}</b></div>`).join("")}</div>`).join('<hr style="border:0;border-top:1px solid var(--line-2);margin:0">')}
      <div style="display:grid;gap:8px;border-top:1px solid var(--line-2);padding-top:14px">
        <div class="sum-row"><span>Items</span><span class="num">${naira(cartTotal())}</span></div>
        <div class="sum-row"><span>Delivery</span><span class="muted">${ui.ship === "pickup" ? "Pickup" : "Agreed with seller"}</span></div>
        <div class="sum-row total"><span>Pay on delivery</span><span class="num">${naira(cartTotal())}</span></div></div>
      <button class="btn btn-primary btn-lg btn-block" data-act="placeOrder">${ic("msg", "sm")}Send request${n > 1 ? "s" : ""}</button>
      <p class="muted" style="font-size:12.5px;text-align:center">Nothing is charged. Sellers get your name, phone and address.</p></aside>
  </div></main>`;
}
function viewOrderDone(id) {
  const o = S.myOrders.find(x => x.id === id) || S.myOrders[0];
  const s = o ? api.seller(o.seller) : null;
  const steps = [["msg", "Seller confirms", `${s ? esc(s.name) : "The seller"} will call or message you, usually ${s ? esc(s.responds) : "soon"}.`], ["truck", "Delivery or pickup", "Agree on a time, place and any delivery fee."], ["eye", "Inspect and test", "Check it matches the photos, grade and specs."], ["cash", "Pay the seller", "Cash or transfer, directly to them, only when you're happy."], ["star", "Rate the seller", "Takes 10 seconds and helps every buyer after you."]];
  return `<main class="wrap" style="max-width:720px;padding-block:48px"><div class="box" style="padding:32px;display:grid;gap:18px;justify-items:start">
    <span class="done-hero">${ic("check")}</span><span class="eyebrow">Request ${esc(o ? o.id : "")}</span><h1 style="font-size:38px">Request sent.</h1>
    <p style="color:var(--ink-2)">You haven't paid anything. Here's what happens next:</p>
    <ol class="next-steps">${steps.map(([i, a, b]) => `<li><span class="ns-ic">${ic(i, "sm")}</span><span><b>${a}</b><span>${b}</span></span></li>`).join("")}</ol>
    <div class="soft-warn">${ic("info")}<span>If anyone asks you to pay before you've seen the item, stop and report it to Droba.</span></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" data-go="account">View my orders</button><button class="btn btn-ghost" data-act="feed" data-v="foryou">Keep shopping</button></div></div></main>`;
}

/* =========================================================================
   ONBOARDING
   ========================================================================= */
const OB_ART = {
  shop: { imgs: ["1517841905240-472988babdf9", "1573866926487-a1865558a9cf", "1496181133206-80ce9b88a853"], cats: ["Dresses", "Sofas", "Laptops"], q: 'Pre-loved everything, <span class="serif">graded honestly.</span>', cap: "Fashion, phones, furniture, appliances, cars and more, from real homes and trusted stores across Nigeria." },
  sell: { imgs: ["1571175443880-49e1d25b2bc5", "1540221652346-e5dd6b50f3e7", "1593359677879-a4bb92f829d1"], cats: ["Fridges", "Jackets", "TVs"], q: 'Your old things, <span class="serif">someone\'s next favourite.</span>', cap: "List a few items free, or open a store. Buyers contact you and pay on delivery." },
};
function obShell(body, art = "shop", step = 0, total = 0) {
  const a = OB_ART[art];
  return `<div class="ob">
    <aside class="ob-visual"><div class="ob-collage">${a.imgs.map((i, n) => `<div>${pimg(i, "Pre-loved item", a.cats[n], "Red", 900)}</div>`).join("")}</div>
      ${logo(true, "home")}
      <div><blockquote>${a.q}</blockquote><p class="ob-cap">${a.cap}</p></div></aside>
    <section class="ob-panel">
      <div class="ob-top">${step ? `<button class="link" style="color:var(--ink)" data-act="back">${ic("arrowL", "sm")}Back</button>` : `<span></span>`}
        ${total ? `<div class="ob-steps" aria-label="Step ${step} of ${total}">${Array.from({ length: total }, (_, i) => `<i class="${i < step ? "f" : ""}"></i>`).join("")}</div>` : `<button class="link" data-act="guest">Browse as guest</button>`}</div>
      ${body}
    </section></div>`;
}
const errBox = () => ui.errs.length ? `<div class="pill red" style="height:auto;padding:8px 12px;white-space:normal">${ui.errs.map(esc).join(" ")}</div>` : "";
function viewWelcome() {
  return obShell(`
    <div><span class="eyebrow">Welcome to Droba</span><h1 style="margin-top:10px">What brings you here?</h1><p class="lead">Pick one to start. You can do both with the same account.</p></div>
    <div class="role-cards">
      <button class="role" data-act="role" data-v="shop"><span class="r-ic">${ic("bag", "lg")}</span><span><h3>I'm here to shop</h3><p>Pre-loved fashion, phones, furniture, appliances, cars and more, picked for you.</p></span><span class="r-go">${ic("arrowR")}</span></button>
      <button class="role sell" data-act="role" data-v="sell"><span class="r-ic">${ic("tag", "lg")}</span><span><h3>I'm here to sell</h3><p>List a few items free, or open your own store.</p></span><span class="r-go">${ic("arrowR")}</span></button>
    </div>
    <div class="both-note">${ic("swap")}<span><b>Shop and sell from one account.</b> Switch between Shopping and Selling anytime.</span></div>
    <div class="ob-foot"><span class="muted">Already on Droba? <button class="link" data-go="signin">Log in</button></span><span class="muted" style="font-size:12.5px">Pre-loved items only</span></div>`, "shop");
}
function viewSignup() {
  const sell = S.ob.role === "sell";
  return obShell(`
    <div><span class="eyebrow">Create account · Step 1 of 3</span><h1 style="margin-top:10px">${sell ? "Let's get you selling." : "Join Droba."}</h1><p class="lead">${sell ? "One account for buying and selling. Buyers will see your first name or store name." : "Save items, follow stores and get a feed tuned to you."}</p></div>
    <div class="social-btns"><button class="btn btn-ghost" data-act="quickSignup">${ic("user", "sm")}Continue with Google</button><button class="btn btn-ghost" data-act="quickSignup">${ic("user", "sm")}Continue with Apple</button></div>
    <div class="divider">or with email</div>
    <form data-form="signup" style="display:grid;gap:14px" novalidate>
      <div class="field"><label for="su-name">Full name</label><input class="input" id="su-name" name="name" autocomplete="name" placeholder="Amara Okafor"></div>
      <div class="field"><label for="su-email">Email</label><input class="input" id="su-email" name="email" autocomplete="email" placeholder="amara@email.com"></div>
      <div class="field"><label for="su-phone">Phone number</label><div class="input-pre"><span>+234</span><input id="su-phone" name="phone" inputmode="tel" placeholder="801 234 5678"></div><span class="hint">Buyers and sellers use this to arrange delivery.</span></div>
      <div class="field"><label for="su-pass">Password</label><input class="input" id="su-pass" name="pass" type="password" autocomplete="new-password" placeholder="At least 8 characters"></div>
      ${errBox()}
      <button class="btn btn-primary btn-lg btn-block" type="submit">Continue ${ic("arrowR", "sm")}</button>
      <p class="muted" style="font-size:12.5px">By continuing you agree to Droba's Terms. Everything listed on Droba must be pre-owned.</p>
    </form>`, sell ? "sell" : "shop", 1, 3);
}
function viewSignin() {
  return obShell(`
    <div><span class="eyebrow">Welcome back</span><h1 style="margin-top:10px">Log in to Droba.</h1></div>
    <form data-form="signin" style="display:grid;gap:14px" novalidate>
      <div class="field"><label for="si-email">Email or phone</label><input class="input" id="si-email" value="amara@email.com"></div>
      <div class="field"><label for="si-pass">Password</label><input class="input" id="si-pass" type="password" value="password123"></div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Log in</button></form>
    <div class="ob-foot"><span class="muted">New here? <button class="link" data-go="welcome">Create an account</button></span><button class="link" data-act="guest">Browse as guest</button></div>`, "shop", 0, 0);
}
function viewObDep() {
  const u = S.user, depts = u.depts || [], d = u.dep;
  const fashion = depts.includes("Fashion");
  return obShell(`
    <div><span class="eyebrow">Your feed · Step 2 of 3</span><h1 style="margin-top:10px">What are you shopping for?</h1><p class="lead">Pick as many as you like. You can still browse everything.</p></div>
    <div class="big-choice four">${DEPTS.map(x => `<button class="${depts.includes(x.id) ? "on" : ""}" data-act="obDept" data-v="${x.id}"><div class="bc-img">${pimg(x.img, x.id, x.id, "Red", 400)}${depts.includes(x.id) ? `<span class="bc-check">${ic("check", "sm")}</span>` : ""}</div><div class="bc-l">${x.id}</div></button>`).join("")}</div>
    <button class="link" style="justify-self:start" data-act="obAllDepts">${depts.length === DEPTS.length ? "Clear all" : "I'm interested in everything"}</button>
    ${fashion ? `<div class="field"><span class="lbl">For fashion, show me</span><div class="chips">${[["W", "Women's"], ["M", "Men's"], ["All", "Both"]].map(([v, l]) => `<button class="chip ${d === v ? "on" : ""}" data-act="obDep" data-v="${v}">${l}</button>`).join("")}</div></div>` : ""}
    <button class="btn btn-primary btn-lg btn-block" data-go="ob-style" ${depts.length && (!fashion || d) ? "" : "disabled"}>Continue ${ic("arrowR", "sm")}</button>`, "shop", 2, 3);
}
function viewObStyle() {
  const u = S.user, st = u.styles || [], sz = u.sizes || [], depts = u.depts || [];
  const fashion = !depts.length || depts.includes("Fashion");
  const home = !depts.length || depts.some(d => d !== "Fashion");
  const chips = (arr) => `<div class="chips">${arr.map(s => `<button class="chip ${st.includes(s) ? "on-red" : ""}" data-act="obStyle" data-v="${esc(s)}">${st.includes(s) ? ic("check", "sm") : ""}${esc(s)}</button>`).join("")}</div>`;
  return obShell(`
    <div><span class="eyebrow">Your feed · Step 3 of 3</span><h1 style="margin-top:10px">Fine-tune your feed.</h1><p class="lead">Optional, but it helps. Your feed keeps learning from what you view and save.</p></div>
    ${fashion ? `<div class="field"><span class="lbl">Your style</span>${chips(STYLE_OPTIONS)}</div>` : ""}
    ${home ? `<div class="field"><span class="lbl">Home & tech</span>${chips(HOME_INTERESTS)}</div>` : ""}
    ${fashion ? `<div class="field"><span class="lbl">Your sizes</span>
      <div class="chips">${["XS", "S", "M", "L", "XL", "XXL"].map(s => `<button class="chip ${sz.includes(s) ? "on" : ""}" data-act="obSize" data-v="${s}">${s}</button>`).join("")}</div>
      <div class="chips">${["EU 38", "EU 39", "EU 40", "EU 41", "EU 42", "EU 43", "EU 44"].map(s => `<button class="chip ${sz.includes(s) ? "on" : ""}" data-act="obSize" data-v="${s}">${s}</button>`).join("")}</div></div>` : ""}
    <button class="btn btn-primary btn-lg btn-block" data-go="ob-done">See my feed ${ic("arrowR", "sm")}</button>`, "shop", 3, 3);
}
function viewObDone() {
  const u = S.user;
  return obShell(`
    <span class="done-hero">${ic("check")}</span>
    <div><h1>You're in, ${esc(first(u.name))}.</h1><p class="lead">Your For You feed is ready${(u.depts || []).length ? `, tuned for <b>${u.depts.map(esc).join(", ")}</b>` : ""}.</p></div>
    <div class="box" style="display:grid;gap:12px"><h4>${ic("cash", "sm")}How buying works on Droba</h4>${safetyList(5, "compact")}</div>
    <button class="btn btn-primary btn-lg btn-block" data-act="finishShop">Start shopping ${ic("arrowR", "sm")}</button>
    <div class="both-note">${ic("tag")}<span><b>Got things you don't use?</b> Sell them with this same account. <button class="link" data-act="mode" data-v="seller">Start selling</button></span></div>`, "shop", 3, 3);
}
/* --- seller onboarding --- */
function viewObSell() {
  return obShell(`
    <div><span class="eyebrow">Selling · Step 2 of 3</span><h1 style="margin-top:10px">How do you want to sell?</h1><p class="lead">You can start free and open a store later.</p></div>
    <div class="role-cards">
      <button class="role" data-act="sellType" data-v="individual"><span class="r-ic">${ic("tag", "lg")}</span><span><h3>Just sell a few things <span class="pill ok" style="vertical-align:middle">Free</span></h3><p>Up to ${FREE_LIMIT} items at a time. No store needed. You can still boost any listing.</p></span><span class="r-go">${ic("arrowR")}</span></button>
      <button class="role sell" data-act="sellType" data-v="store"><span class="r-ic">${ic("store", "lg")}</span><span><h3>Open a store <span class="pill red" style="vertical-align:middle">From ${naira(PLANS[1].price)}/mo</span></h3><p>Your own storefront with banner and logo, 150+ listings, analytics and free boosts every month.</p></span><span class="r-go">${ic("arrowR")}</span></button>
    </div>
    <button class="link" data-act="plans" style="justify-self:start">Compare everything you get</button>`, "sell", 2, 3);
}
function viewObQuick() {
  const ob = S.ob;
  return obShell(`
    <div><span class="eyebrow">Free seller · Step 3 of 3</span><h1 style="margin-top:10px">Where are you selling from?</h1><p class="lead">Buyers see your first name, city and rating. Your phone is shared only with buyers who send you a request.</p></div>
    <form data-form="quick" style="display:grid;gap:16px" novalidate>
      <div class="form-grid"><div class="field"><label for="qk-city">City</label><select id="qk-city" name="city">${CITIES.map(c => `<option ${ob.city === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        <div class="field"><label for="qk-area">Area</label><input class="input" id="qk-area" name="area" placeholder="Surulere" value="${esc(ob.area || "")}"></div>
        <div class="field full"><label for="qk-phone">Phone for buyers</label><div class="input-pre"><span>+234</span><input id="qk-phone" name="phone" inputmode="tel" placeholder="801 234 5678" value="${esc(ob.phone || S.user.phone || "")}"></div></div></div>
      <div class="notice">${ic("info")}<span>Droba doesn't handle payments. Buyers inspect the item and pay you <b>on delivery</b>. Only list things that are <b>pre-owned</b>.</span></div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">${ic("camera", "sm")}List my first item</button></form>`, "sell", 3, 3);
}
function viewObStore() {
  const ob = S.ob;
  const cats = ob.cats || [];
  const handle = ob.handle || slug(ob.storeName || "");
  return obShell(`
    <div><span class="eyebrow">Your store · Step 3 of 4</span><h1 style="margin-top:10px">Name your store.</h1><p class="lead">This is what buyers see on your listings and storefront. You can change it later.</p></div>
    <form data-form="store" style="display:grid;gap:16px" novalidate>
      <div class="field"><label for="st-name">Store name</label><input class="input" id="st-name" name="storeName" placeholder="e.g. Amara's Corner" value="${esc(ob.storeName || "")}" data-live="storeName"></div>
      <div class="field"><label for="st-handle">Store link</label><div class="input-pre"><span>droba.ng/</span><input id="st-handle" name="handle" value="${esc(handle)}" placeholder="amarascorner" data-live="handle"></div></div>
      <div class="form-grid"><div class="field"><label for="st-city">City</label><select id="st-city" name="city">${CITIES.map(c => `<option ${ob.city === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        <div class="field"><label for="st-area">Area</label><input class="input" id="st-area" name="area" placeholder="Yaba" value="${esc(ob.area || "")}"></div>
        <div class="field full"><label for="st-phone">Store phone / WhatsApp</label><div class="input-pre"><span>+234</span><input id="st-phone" name="phone" inputmode="tel" placeholder="801 234 5678" value="${esc(ob.phone || S.user.phone || "")}"></div></div></div>
      <div class="field"><span class="lbl">What will you sell?</span><div class="chips">${DEPTS.map(d => `<button type="button" class="chip ${cats.includes(d.id) ? "on" : ""}" data-act="obCat" data-v="${d.id}">${ic(d.icon, "sm")}${d.id}</button>`).join("")}</div></div>
      ${errBox()}
      <button class="btn btn-primary btn-lg btn-block" type="submit">Continue ${ic("arrowR", "sm")}</button></form>`, "sell", 3, 4);
}
function viewObPlan() {
  const cur = S.ob.plan === "Business" ? "Business" : "Premium";
  return obShell(`
    <div><span class="eyebrow">Your store · Step 4 of 4</span><h1 style="margin-top:10px">Pick a store plan.</h1><p class="lead">Stores are paid monthly. Cancel anytime and you'll go back to selling free.</p></div>
    <div class="radio-cards">${PLANS.slice(1).map(p => `<button class="rcard ${cur === p.id ? "on" : ""}" data-act="obPlan" data-v="${p.id}"><span class="rc-dot"></span><span style="flex:1"><h4>${p.label} <span class="pill">${naira(p.price)}/mo</span></h4><p>${p.blurb} ${p.listings} · ${p.storefront.split(":")[0]} · ${p.boosts}.</p></span></button>`).join("")}</div>
    <div class="tip">${ic("info")}<span>Billing connects with the backend later. Nothing is charged in this preview.</span></div>
    <button class="btn btn-primary btn-lg btn-block" data-act="createStore">Open my store ${ic("arrowR", "sm")}</button>
    <button class="link" data-act="sellType" data-v="individual" style="justify-self:center">Not ready? Start as a free seller</button>`, "sell", 4, 4);
}
function viewObStoreDone() {
  const se = mySeller();
  return obShell(`
    <span class="done-hero">${ic("store")}</span>
    <div><h1>${esc(se.name)} is open.</h1><p class="lead">Your store lives at <b>droba.ng/${esc(se.handle)}</b>. Add your first item and buyers can start finding it.</p></div>
    <div style="display:grid;gap:10px"><button class="btn btn-primary btn-lg btn-block" data-act="firstListing">${ic("camera", "sm")}List your first item</button><button class="btn btn-ghost btn-lg btn-block" data-act="enterStudio">Go to Seller Studio</button></div>
    <div class="both-note">${ic("swap")}<span><b>Shopping too?</b> Tap <b>Shopping</b> in the mode switch anytime. Your bag and saved items stay put.</span></div>`, "sell", 4, 4);
}

/* =========================================================================
   SELLER STUDIO
   ========================================================================= */
function studioShell(sub, title, body, actions = "") {
  const se = mySeller(), store = isStore();
  const n = (s) => S.listings.filter(l => l.status === s).length;
  const pending = S.orders.filter(o => o.status === "New request").length;
  const item = (r, icn, label, extra = "") => `<button class="${sub === r ? "on" : ""}" data-go="studio${r ? "/" + r : ""}">${ic(icn)}${label}${extra}</button>`;
  const tb = (r, icn, label) => `<button class="${sub === r ? "on" : ""}" data-go="studio${r ? "/" + r : ""}">${ic(icn)}<span>${label}</span></button>`;
  return `<div class="studio">
    <aside class="side">
      <div style="display:flex;align-items:baseline;gap:4px">${logo(true, "studio")}<span class="logo-sub">${store ? "studio" : "selling"}</span></div>
      <button class="btn btn-primary btn-block side-cta" data-go="studio/new">${ic("plus", "sm")}New listing</button>
      <nav aria-label="Seller Studio">${item("", "chart", "Overview")}${item("listings", "tag", "Listings", `<span class="pill">${n("active")}</span>`)}${item("orders", "box", "Order requests", pending ? `<span class="pill">${pending}</span>` : "")}${item("promote", "zap", "Boost")}
        ${store ? item("storefront", "store", "Storefront") + item("plans", "gem", "Plan & billing") : item("plans", "store", "Open a store", `<span class="pill" style="background:rgba(255,255,255,.14)">${ic("lock", "sm")}</span>`)}</nav>
      <div class="side-foot">
        <button class="store-chip" data-go="store/me" style="text-align:left;color:inherit"><span class="store-logo ${store ? "" : "round"}">${initials(sellerName())}</span><span style="min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(sellerName())}</b><small>${PLANS.find(p => p.id === se.plan).label} · ${store ? "View store" : "View profile"}</small></span></button>
        ${modeSwitch("seller", true)}
      </div></aside>
    <div class="studio-main">
      <div class="studio-mtop">${logo(true, "studio")}${modeSwitch("seller", true)}</div>
      <div class="studio-top"><h2>${title}</h2><div class="st-right">${actions}</div></div>
      <div class="studio-body">${body}</div>
      <nav class="tabbar" aria-label="Seller Studio">${tb("", "chart", "Overview")}${tb("listings", "tag", "Listings")}
        <button class="tb-sell ${sub === "new" ? "on" : ""}" data-go="studio/new"><span class="plus">${ic("plus")}</span><span>List</span></button>${tb("orders", "box", "Requests")}${store ? tb("storefront", "store", "Store") : tb("plans", "store", "Get a store")}</nav>
    </div></div>`;
}
function spark(arr, color = "var(--red)") {
  const max = Math.max(...arr), min = Math.min(...arr);
  const pts = arr.map((v, i) => [(i / (arr.length - 1)) * 100, 32 - ((v - min) / (max - min || 1)) * 28]);
  const line = pts.map(p => p.join(",")).join(" ");
  const last = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true"><path d="M0,36 L${line.replace(/ /g, " L")} L100,36 Z" fill="${color}" opacity=".1"/><polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/><circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="${color}"/></svg>`;
}
const statusPill = (l) => l.status === "sold" ? `<span class="pill dark">Sold</span>` : l.status === "draft" ? `<span class="pill">Draft</span>` : l.boost ? `<span class="pill red">${ic("zap", "sm")}Boosted · ${l.boost}d left</span>` : `<span class="pill ok">Active</span>`;
const orderPill = (s) => `<span class="pill ${s === "Delivered" ? "ok" : s === "Confirmed" ? "info" : s === "Declined" ? "" : "warn"}">${s}</span>`;
const activeCount = () => S.listings.filter(l => l.status === "active").length;

function viewStudioHome() {
  const se = mySeller(), store = isStore(), active = S.listings.filter(l => l.status === "active");
  const lim = PLAN_LIMIT[se.plan];
  const top = active.slice().sort((a, b) => b.views - a.views).slice(0, 4);
  const pending = S.orders.filter(o => o.status === "New request");
  const kpi = (icn, label, val, delta, data) => `<div class="kpi"><span class="k-l">${ic(icn, "sm")}${label}</span><span class="k-v">${val}</span>${spark(data)}<span class="k-d ${delta < 0 ? "down" : ""}">${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs last 30 days</span></div>`;
  const credits = BOOST_CREDITS[se.plan] ? (se.credits ?? BOOST_CREDITS[se.plan]) : 0;
  const planCard = store
    ? `<div class="plan-card"><div style="display:flex;justify-content:space-between;align-items:center"><span class="eyebrow" style="color:#ff9aa8">Your plan</span><span class="pill" style="background:rgba(255,255,255,.12);color:#fff">${PLANS.find(p => p.id === se.plan).label}</span></div>
        <h3>${se.plan === "Business" ? "Everything unlocked." : "Your store is live."}</h3>
        <div class="usage"><div class="u-row"><span>Active listings</span><b class="num">${active.length} / ${lim === Infinity ? "∞" : lim}</b></div><div class="bar"><i style="width:${lim === Infinity ? 12 : Math.min(100, active.length / lim * 100)}%"></i></div></div>
        <div class="usage"><div class="u-row"><span>Free boosts this month</span><b class="num">${credits} / ${BOOST_CREDITS[se.plan]}</b></div></div>
        ${se.plan !== "Business" ? `<button class="btn btn-light btn-block" data-go="studio/plans">Go Business</button>` : ""}</div>`
    : `<div class="plan-card"><div style="display:flex;justify-content:space-between;align-items:center"><span class="eyebrow" style="color:#ff9aa8">Free seller</span><span class="pill" style="background:rgba(255,255,255,.12);color:#fff">No store</span></div>
        <div class="usage"><div class="u-row"><span>Active listings</span><b class="num">${active.length} / ${FREE_LIMIT}</b></div><div class="bar"><i style="width:${Math.min(100, active.length / FREE_LIMIT * 100)}%"></i></div></div>
        <h3 style="font-size:19px">Selling often? Open a store.</h3>
        <ul class="mini-list"><li>${ic("check", "sm")}Your own storefront and store link</li><li>${ic("check", "sm")}150 listings, 10 photos each</li><li>${ic("check", "sm")}3 free boosts every month</li></ul>
        <button class="btn btn-light btn-block" data-go="studio/plans">Open a store · ${naira(PLANS[1].price)}/mo</button></div>`;
  const body = `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><span class="eyebrow">${greet()}, ${esc(first(S.user.name))}</span><h1 style="font-size:clamp(26px,3vw,36px);margin-top:4px">${pending.length ? `${pending.length} new order request${pending.length > 1 ? "s" : ""}.` : "No new requests right now."}</h1></div><span class="pill">Last 30 days · sample data</span></div>
    <div class="kpis">
      ${store ? kpi("store", "Store visits", "1,284", 12, [40, 52, 48, 61, 58, 72, 69, 80, 77, 92]) : kpi("user", "Profile visits", "86", 9, [3, 5, 4, 6, 8, 7, 9, 8, 10, 12])}
      ${kpi("eye", "Item views", store ? "4,930" : "550", 8, [210, 260, 240, 300, 280, 330, 310, 360, 350, 390])}
      ${kpi("heart", "Saves", store ? "312" : "59", 21, [8, 12, 10, 14, 18, 15, 22, 20, 26, 30])}
      ${kpi("star", "Rating", store ? "4.8" : "4.9", 2, [4.5, 4.6, 4.6, 4.7, 4.7, 4.7, 4.8, 4.8, 4.8, 4.8])}
    </div>
    <div class="two-col">
      <div class="panel"><div class="panel-head"><h3>New order requests</h3><button class="link" data-go="studio/orders">All requests ${ic("arrowR", "sm")}</button></div>
        ${pending.length ? pending.map(o => { const l = S.listings.find(x => x.id === o.lid) || S.listings[0]; return `<div class="order-row">${listingImg(l, 200)}<div style="min-width:0"><b style="display:block">${esc(l.title)}</b><span class="muted" style="font-size:13px">${esc(o.buyer)} · ${esc(o.city)} · ${o.when}</span></div><button class="btn btn-primary btn-sm" data-act="confirmOrder" data-v="${o.id}">${ic("phone", "sm")}Confirm</button></div>`; }).join("")
      : `<div class="panel-body muted">Nothing waiting. Boost a listing to reach more buyers.</div>`}
        <div class="panel-head" style="border-top:1px solid var(--line);border-bottom:0"><h3>Your listings</h3><button class="link" data-go="studio/listings">Manage ${ic("arrowR", "sm")}</button></div>
        <div class="panel-body" style="padding-top:0">${top.length ? top.map(l => `<div class="toprow">${listingImg(l, 200)}<div class="tr-t"><b>${esc(l.title)}</b><small>${naira(l.price)} · ${GRADES[(l.cond || 2) - 1].name}</small></div><span class="muted num" style="font-size:13px;text-align:right">${ic("eye", "sm")} ${k(l.views)}<br>${ic("heart", "sm")} ${l.saves}</span></div>`).join("") : `<p class="muted">No active listings yet.</p>`}</div></div>
      <div style="display:grid;gap:16px;align-content:start">
        ${planCard}
        <div class="panel"><div class="panel-head"><h3>Quick actions</h3></div><div class="panel-body" style="display:grid;gap:8px">
          ${[["camera", "List a new item", "studio/new"], ["zap", `Boost a listing · from ${naira(BOOST_PRICES[0][1])}`, "studio/promote"], store ? ["store", "Customise storefront", "studio/storefront"] : ["gem", "Compare store plans", "studio/plans"], ["eye", store ? "See your store as a buyer" : "See your profile as a buyer", "store/me"]].map(([i, l, r]) => `<button class="pick" data-go="${r}" style="border-color:var(--line)"><span class="p-ic" style="width:40px;height:40px;border-radius:10px;background:var(--blush);color:var(--red);display:grid;place-items:center">${ic(i, "sm")}</span><b style="flex:1;font-weight:650">${l}</b>${ic("chevR", "sm")}</button>`).join("")}</div></div>
        <div class="tip">${ic("cash")}<span><b>Getting paid:</b> buyers pay you directly on delivery. Let them inspect and test first. Good ratings bring more buyers.</span></div>
      </div></div>`;
  return studioShell("", "Overview", body, `<button class="btn btn-ghost btn-sm hide-m" data-go="store/me">${ic("eye", "sm")}${store ? "View store" : "View profile"}</button><button class="btn btn-primary btn-sm" data-go="studio/new">${ic("plus", "sm")}New listing</button>`);
}
function viewStudioListings() {
  const tabs = [["active", "Active"], ["sold", "Sold"], ["draft", "Drafts"]];
  const list = S.listings.filter(l => l.status === ui.ltab);
  const free = !isStore();
  const body = `
    ${free ? `<div class="tip">${ic("info")}<span>Free sellers can have <b>${FREE_LIMIT} active listings</b> at a time. You're using ${activeCount()}. <button class="link" data-go="studio/plans">Open a store</button> for up to 150.</span></div>` : ""}
    <div class="tabs-line">${tabs.map(([v, l]) => `<button class="${ui.ltab === v ? "on" : ""}" data-act="ltab" data-v="${v}">${l} <span class="n">${S.listings.filter(x => x.status === v).length}</span></button>`).join("")}</div>
    <div class="panel">${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th>Price</th><th>Condition</th><th>Views</th><th>Saves</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody>
      ${list.map(l => `<tr><td><div class="t-item">${listingImg(l, 200)}<span><b>${esc(l.title)}</b><small>${esc(l.cat)}${l.size ? " · " + esc(l.size) : ""}</small></span></div></td>
        <td class="num"><b>${naira(l.price)}</b></td><td>${condChip(l.cond || 2, l.extra, l.dept)}</td><td class="num">${k(l.views)}</td><td class="num">${l.saves}</td><td>${statusPill(l)}</td>
        <td><div class="t-actions">${l.status === "active" ? `<button class="btn btn-ghost btn-sm" data-act="boostThis" data-v="${l.id}">${ic("zap", "sm")}Boost</button><button class="btn btn-ghost btn-sm" data-act="markSold" data-v="${l.id}">Mark sold</button>` : l.status === "draft" ? `<button class="btn btn-primary btn-sm" data-act="publishDraft" data-v="${l.id}">Publish</button>` : `<button class="btn btn-ghost btn-sm" data-act="relist" data-v="${l.id}">Relist</button>`}
          <button class="icon-btn" data-act="delListing" data-v="${l.id}" aria-label="Delete listing">${ic("trash", "sm")}</button></div></td></tr>`).join("")}
      </tbody></table></div>` : `<div class="empty" style="border:0"><span class="e-ic">${ic("tag", "lg")}</span><h3>No ${ui.ltab === "draft" ? "drafts" : ui.ltab + " listings"}</h3><button class="btn btn-primary" data-go="studio/new">${ic("plus", "sm")}New listing</button></div>`}</div>`;
  return studioShell("listings", "Listings", body, `<button class="btn btn-primary btn-sm" data-go="studio/new">${ic("plus", "sm")}New listing</button>`);
}
function viewStudioOrders() {
  const body = `<div class="tip">${ic("cash")}<span>Droba doesn't collect payments. <b>Call the buyer to confirm</b>, agree delivery or pickup, and collect payment when they've inspected the item. Mark it delivered so they can rate you.</span></div>
    <div class="panel">${S.orders.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Request</th><th>Item</th><th>Buyer</th><th>Price</th><th>Status</th><th style="text-align:right">Next step</th></tr></thead><tbody>
    ${S.orders.map(o => { const l = S.listings.find(x => x.id === o.lid) || S.listings[0]; return `<tr><td><b>${o.id}</b><br><small class="muted">${o.when}</small></td><td><div class="t-item">${listingImg(l, 200)}<span><b>${esc(l.title)}</b><small>${GRADES[(l.cond || 2) - 1].name}</small></span></div></td><td>${esc(o.buyer)}<br><small class="muted">${esc(o.city)}</small>${o.status !== "Declined" ? `<br><small class="num" style="user-select:all">${esc(o.phone)}</small>` : ""}</td><td class="num"><b>${naira(o.amount)}</b></td><td>${orderPill(o.status)}</td>
      <td><div class="t-actions">${o.status === "New request" ? `<button class="btn btn-ghost btn-sm" data-act="declineOrder" data-v="${o.id}">Decline</button><button class="btn btn-primary btn-sm" data-act="confirmOrder" data-v="${o.id}">${ic("phone", "sm")}Confirm</button>` : o.status === "Confirmed" ? `<button class="btn btn-primary btn-sm" data-act="deliverOrder" data-v="${o.id}">${ic("check", "sm")}Delivered & paid</button>` : o.status === "Delivered" ? (o.rating ? `<span style="display:inline-flex;gap:6px;align-items:center;font-size:13px" class="muted">Buyer rated ${stars(o.rating)}</span>` : `<span class="muted" style="font-size:13px">Waiting for buyer's rating</span>`) : `<span class="muted" style="font-size:13px">Declined</span>`}</div></td></tr>`; }).join("")}
    </tbody></table></div>` : `<div class="empty" style="border:0"><span class="e-ic">${ic("box", "lg")}</span><h3>No requests yet</h3><p class="muted">When a buyer sends a request for one of your items, it shows up here with their phone number.</p></div>`}</div>`;
  return studioShell("orders", "Order requests", body);
}
function viewStudioPromote() {
  const se = mySeller(), active = S.listings.filter(l => l.status === "active");
  const pick = active.find(l => l.id === ui.pick) || active[0];
  const credits = BOOST_CREDITS[se.plan] ? (se.credits ?? BOOST_CREDITS[se.plan]) : 0;
  const price = BOOST_PRICES.find(d => d[0] === ui.dur)[1];
  const body = `
    <div class="two-col">
      <div class="panel"><div class="panel-head"><h3>Boost a listing</h3><span class="pill">${credits ? `${credits} free boost${credits === 1 ? "" : "s"} left` : "Pay per boost"}</span></div>
        <div class="panel-body" style="display:grid;gap:18px">
          ${active.length ? `<div style="display:grid;gap:8px"><span class="lbl">1. Choose an item</span><div class="pick-list">${active.map(l => `<button class="pick ${pick && pick.id === l.id ? "on" : ""}" data-act="pick" data-v="${l.id}">${listingImg(l, 200)}<span style="flex:1;min-width:0"><b style="display:block;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(l.title)}</b><small class="muted">${naira(l.price)} · ${k(l.views)} views</small></span>${l.boost ? `<span class="pill red">${l.boost}d left</span>` : ""}</button>`).join("")}</div></div>
          <div style="display:grid;gap:8px"><span class="lbl">2. How long?</span><div class="dur">${BOOST_PRICES.map(([d, p]) => `<button class="${ui.dur === d ? "on" : ""}" data-act="dur" data-v="${d}"><b>${d} days</b><span>${naira(p)}${credits ? " or 1 free boost" : ""}</span></button>`).join("")}</div></div>
          <div class="tip">${ic("zap")}<span>Boosted items show higher in <b>For You</b>, search and category pages, marked Sponsored. Any seller can boost, store or not.</span></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">${credits ? `<button class="btn btn-primary" data-act="boost" data-v="credit">${ic("zap", "sm")}Use 1 free boost</button>` : ""}<button class="btn ${credits ? "btn-ghost" : "btn-primary"}" data-act="boost" data-v="pay">${ic("zap", "sm")}Boost for ${naira(price)}</button></div>`
      : `<div class="empty" style="border:0"><h3>No active listings to boost</h3><button class="btn btn-primary" data-go="studio/new">List an item</button></div>`}
        </div></div>
      <div style="display:grid;gap:16px;align-content:start">
        <div class="panel"><div class="panel-head"><h3>Featured listing</h3><span class="pill">${naira(7500)} / 7 days</span></div><div class="panel-body" style="display:grid;gap:12px"><p class="muted" style="font-size:14px">Put one item in the Featured section on the Droba homepage for a week.</p><button class="btn btn-dark btn-sm" data-act="feature">Feature ${pick ? esc(pick.title.split(" ").slice(0, 3).join(" ")) : "an item"}</button></div></div>
        <div class="panel locked-card"><div class="panel-head"><h3>Campaigns</h3><span class="pill dark">Business</span></div><div class="panel-body" style="display:grid;gap:10px"><p class="muted" style="font-size:14px">Promote a group of items at once: new arrivals, a category, items under a price, or a custom collection.</p><div class="chips"><span class="chip">New arrivals</span><span class="chip">Under ₦50k</span><span class="chip">Phones</span></div></div>
          ${se.plan !== "Business" ? `<div class="lock-over">${ic("lock", "lg")}<b>Available on Business stores</b><button class="btn btn-primary btn-sm" data-go="studio/plans">See plans</button></div>` : ""}</div>
      </div></div>`;
  return studioShell("promote", "Boost", body);
}
function viewStudioStorefront() {
  const se = mySeller();
  if (!isStore()) return viewStudioPlans();
  const banners = ["1540221652346-e5dd6b50f3e7", "1445205170230-053b83016050", "1611967164521-abae8fba4668", "1496181133206-80ce9b88a853"];
  const bannerCats = ["Jackets", "Dresses", "Sofas", "Laptops"];
  const cur = ui.banner || se.banner || banners[0];
  const body = `<div class="editor">
    <form class="panel" data-form="storefront" novalidate><div class="panel-head"><h3>Store details</h3></div><div class="panel-body" style="display:grid;gap:16px">
      <div class="field"><span class="lbl">Banner</span><div class="photo-slots" style="grid-template-columns:repeat(4,minmax(0,1fr))">${banners.map((b, i) => `<button type="button" class="slot filled" style="aspect-ratio:16/9;${cur === b ? "outline:2.5px solid var(--red);outline-offset:2px" : ""}" data-act="banner" data-v="${b}">${pimg(b, "Banner option", bannerCats[i], "Red", 400)}</button>`).join("")}</div><span class="hint">Or upload your own (1600 × 500).</span></div>
      <div class="form-grid"><div class="field"><label for="sf-name">Store name</label><input class="input" id="sf-name" name="name" value="${esc(se.name)}"></div>
        <div class="field"><label for="sf-city">City</label><select id="sf-city" name="city">${CITIES.map(c => `<option ${se.city === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        <div class="field full"><label for="sf-bio">About your store</label><textarea class="textarea" id="sf-bio" name="bio" maxlength="240" placeholder="What do you sell? Where do you source? How fast do you deliver?">${esc(se.bio || "")}</textarea><span class="hint">Shown at the top of your storefront. 240 characters max.</span></div>
        <div class="field"><label for="sf-ig">Instagram</label><input class="input" id="sf-ig" name="ig" value="${esc(se.ig || "")}" placeholder="@yourstore"></div>
        <div class="field"><label for="sf-tt">TikTok</label><input class="input" id="sf-tt" name="tiktok" value="${esc(se.tiktok || "")}" placeholder="@yourstore"></div>
        <div class="field full"><label for="sf-wa">Phone / WhatsApp for buyers</label><div class="input-pre"><span>+234</span><input id="sf-wa" name="phone" value="${esc(se.phone || "")}" placeholder="801 234 5678"></div></div></div>
      <div style="border:1px solid var(--line);border-radius:var(--r-md);padding:16px;display:grid;gap:8px"><b>Featured items & collections</b><p class="muted" style="font-size:14px">Pin up to 6 items to the top of your store and group items into collections like “Home office setup”.</p>
        ${se.plan === "Premium" ? `<div class="chips"><span class="chip on">Featured</span><span class="chip">New arrivals</span><span class="chip" style="opacity:.6">${ic("lock", "sm")}Collections on Business</span></div>` : `<div class="chips"><span class="chip on">Featured</span><span class="chip">New arrivals</span><span class="chip">${ic("plus", "sm")}Collection</span></div>`}</div>
      <div class="ed-actions"><button type="button" class="btn btn-ghost" data-go="store/me">${ic("eye", "sm")}Preview</button><button class="btn btn-primary" type="submit">Save storefront</button></div>
    </div></form>
    <div class="preview-col"><span class="eyebrow">Store card preview</span>
      <div class="store-card" style="pointer-events:none"><div class="sc-banner">${pimg(cur, "Banner", bannerCats[banners.indexOf(cur)] || "Vintage", "Red", 600)}</div><div class="sc-body"><div class="store-logo" style="background:var(--red)">${initials(se.name)}</div><h4>${esc(se.name)}</h4><div class="sc-meta"><span>${esc(se.area || se.city)}, ${esc(se.city)}</span><span>${activeCount()} items</span></div>
        <div class="store-thumbs">${S.listings.filter(l => l.status === "active").slice(0, 3).map(l => listingImg(l, 200)).join("")}</div></div></div>
      <div class="tip">${ic("shield")}<span>Reach 50 completed orders with a 4.5★ rating to apply for the <b>Verified Store</b> badge.</span></div></div></div>`;
  return studioShell("storefront", "Storefront", body);
}
function plansGrid(cur, mode) {
  return `<div class="plans">${PLANS.map(p => {
    const btnCls = p.id === "Business" ? "btn-light" : "btn-primary";
    let btn;
    if (mode === "studio") btn = cur === p.id ? `<button class="btn ${p.id === "Business" ? "btn-light" : "btn-ghost"} btn-block" disabled>Your current plan</button>` : `<button class="btn ${btnCls} btn-block" data-act="setPlan" data-v="${p.id}">${p.id === "Free" ? "Switch to free selling" : cur === "Free" ? "Open a " + p.label.toLowerCase() : "Switch to " + p.label}</button>`;
    else btn = `<button class="btn ${btnCls} btn-block" data-act="planGo" data-v="${p.id}">${p.id === "Free" ? "Sell something free" : "Open a " + p.label.toLowerCase()}</button>`;
    return `<div class="plan ${p.id === "Premium" ? "feat" : ""} ${p.id === "Business" ? "dark" : ""}">
      <div class="p-name">${p.label}${p.id === "Premium" ? `<span class="pill red">Most popular</span>` : ""}${cur === p.id ? `<span class="pill ${p.id === "Business" ? "" : "dark"}">Current</span>` : ""}</div>
      <div class="p-price">${p.price ? naira(p.price) : "₦0"}<small> / month</small></div><p style="opacity:.8;font-size:14px">${p.blurb}</p>
      <ul>${[p.listings, p.photos, p.storefront, p.analytics, p.boosts, p.visibility, p.badge, p.promo].map(f => `<li>${ic("check")}<span>${f}</span></li>`).join("")}</ul>${btn}</div>`;
  }).join("")}</div>`;
}
function viewStudioPlans() {
  const se = mySeller();
  const rows = [["Active listings", "", "listings"], ["Photos per item", "", "photos"], ["Your page", "What buyers see when they tap your name", "storefront"], ["Analytics", "", "analytics"], ["Boosts", `Anyone can boost from ${naira(BOOST_PRICES[0][1])}`, "boosts"], ["Visibility", "", "visibility"], ["Trust", "", "badge"], ["Promotion tools", "", "promo"]];
  const body = `${!isStore() ? `<div><span class="eyebrow">You're a free seller</span><h1 style="font-size:clamp(26px,3vw,36px);margin-top:4px">Want your own store?</h1><p class="muted" style="margin-top:6px;max-width:60ch">Stores get a storefront page with banner, logo, bio and socials, a store link to share, more listings, analytics and free boosts every month.</p></div>` : ""}
    ${plansGrid(se.plan, "studio")}
    <div class="panel"><div class="panel-head"><h3>Compare</h3></div><div class="tbl-wrap"><table class="compare"><thead><tr><th></th>${PLANS.map(p => `<th>${p.label}</th>`).join("")}</tr></thead><tbody>
      ${rows.map(([l, sub, key]) => `<tr><td>${l}${sub ? `<small>${sub}</small>` : ""}</td>${PLANS.map(p => `<td>${p[key]}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>
    <div class="tip">${ic("info")}<span>Plan billing and boost payments connect to the backend later. Droba only charges sellers for stores and boosts. Buyers never pay Droba.</span></div>`;
  return studioShell("plans", isStore() ? "Plan & billing" : "Open a store", body);
}

/* ----- Listing editor ----- */
function draftPreview() {
  const d = S.draft;
  const front = d.photos.Front;
  const fake = { title: d.title || "Your item title", cat: d.cat || "Dresses", color: d.color || "Red", img: front || "", cond: d.cond || 2 };
  const dept = d.cat ? deptOf(d.cat) : "Fashion";
  return `<article class="pcard"><div class="pcard-media">${front ? listingImg(fake, 520) : `<div style="display:grid;place-items:center;height:100%;color:var(--muted);text-align:center;gap:6px;padding:20px">${ic("camera", "lg")}<span style="font-size:13px">Add a front photo</span></div>`}
      ${d.cond ? `<div class="pcard-bottom">${condChip(d.cond, d.extra, dept)}</div>` : ""}<div class="pcard-top"><span class="tag tag-new">New</span><span class="heart">${ic("heart", "sm")}</span></div></div>
    <div class="pcard-info"><span class="pcard-seller"><span>${esc(sellerName())}</span></span><span class="pcard-title">${esc(d.title || "Your item title")}</span>
      <div class="pcard-row"><div><div class="price">${num(d.price) ? naira(num(d.price)) : "₦—"}</div><div class="pcard-meta">${d.size ? (dept === "Fashion" ? "Size " : "") + esc(d.size) : "—"} · ${esc(mySeller().city)}</div></div><span class="add-cart">${ic("cartplus", "sm")}</span></div></div></article>`;
}
const TITLE_HINT = { Fashion: "Red satin midi dress", "Phones & Tablets": "iPhone 12, 128GB, blue", Computers: "HP EliteBook 840, 16GB / 512GB", "TV, Audio & Gaming": "PS5 disc edition with 2 pads", Appliances: "Samsung 450L double-door fridge", Furniture: "Grey 3-seater fabric sofa", "Home & Kitchen": "5-piece stainless pot set", "Kids & Baby": "Chicco travel stroller", "Sports & Fitness": "Treadmill, foldable", "Books & Hobbies": "Yamaha acoustic guitar", "Beauty & Wellness": "Dyson hair dryer", "Vehicles & Parts": "Toyota Camry 2010, automatic" };
const BRAND_HINT = { "Phones & Tablets": "Apple, Samsung, Tecno…", Computers: "HP, Dell, Apple…", "TV, Audio & Gaming": "Sony, LG, JBL…", Appliances: "LG, Samsung, Thermocool…", Furniture: "Ikea, Unbranded…", "Vehicles & Parts": "Toyota, Honda, Lexus…" };
function viewStudioNew() {
  const d = S.draft, se = mySeller(), step = ui.step;
  const dept = d.cat ? deptOf(d.cat) : "";
  const fashion = dept === "Fashion";
  const hard = !!dept && kindOf(dept) === "tech";
  const steps = ["Photos", "Details", "Condition", "Price"];
  const slots = ["Front", "Back", "Side", "Detail", fashion || !dept ? "Label" : "Serial / label"];
  const extra = PHOTO_LIMIT[se.plan] - 5;
  const sizeOpts = d.cat === "Sneakers" ? ["37", "38", "39", "40", "41", "42", "43", "44", "45"] : d.cat === "Jeans" ? ["26", "28", "30", "32", "34", "36"] : d.cat === "Bags" ? ["One size"] : ["XS", "S", "M", "L", "XL", "XXL"];
  const measL = d.cat === "Jeans" ? ["Waist (flat, cm)", "Inseam (cm)"] : d.cat === "Sneakers" ? ["EU size", "Insole length (cm)"] : d.cat === "Bags" ? ["Width (cm)", "Height (cm)"] : fashion ? ["Pit to pit (cm)", "Length (cm)"] : (deptInfo(dept).spec || ["Detail 1", "Detail 2"]);
  const similar = PRODUCTS.filter(p => (!d.cat || p.cat === d.cat) && (!d.cond || p.cond === d.cond)).map(p => p.price);
  const range = similar.length ? [Math.min(...similar), Math.max(...similar)] : null;
  const atLimit = !isStore() && activeCount() >= FREE_LIMIT;
  const extraOk = !fashion || d.cond === 1;
  const extraLbl = fashion || !dept ? "Original tags still attached" : { Furniture: "Assembly guide or receipt included", "Vehicles & Parts": "Papers complete (customs, registration)", "Books & Hobbies": "Original packaging included" }[dept] || "Original box included";
  let panel = "";
  if (step === 1) panel = `
    <div class="panel-body" style="display:grid;gap:16px"><div><h3 style="font-size:20px">Add photos</h3><p class="muted" style="margin-top:4px">Natural light, plain background. Show any flaws clearly${hard ? ", and the item switched on" : ""}. Up to ${PHOTO_LIMIT[se.plan]} photos.</p></div>
      <div class="photo-slots">${slots.map(sl => d.photos[sl] ? `<div class="slot filled">${listingImg({ img: d.photos[sl], title: sl, cat: d.cat || "Dresses", color: d.color || "Red" }, 300)}<span class="slot-l">${sl}</span><button type="button" class="slot-x" data-act="rmPhoto" data-v="${sl}" aria-label="Remove ${sl} photo">${ic("x", "sm")}</button></div>`
    : `<label class="slot ${sl === "Front" ? "req" : ""}">${ic("camera")}${sl}<input type="file" accept="image/*" data-photo="${sl}" aria-label="Upload ${sl} photo"></label>`).join("")}
        ${extra > 0 ? Array.from({ length: Math.min(extra, 5) }, (_, i) => `<label class="slot">${ic("plus")}Extra ${i + 1}<input type="file" accept="image/*" data-photo="Extra ${i + 1}"></label>`).join("") : `<div class="slot locked">${ic("lock")}More photos with a store</div>`}</div>
      <button type="button" class="link" data-act="samplePhotos" style="justify-self:start">${ic("sparkle", "sm")}Fill with sample photos (demo)</button></div>`;
  if (step === 2) panel = `
    <div class="panel-body" style="display:grid;gap:16px"><h3 style="font-size:20px">Describe it</h3>
      <div class="form-grid">
        <div class="field full"><label for="d-cat">Category</label><select id="d-cat" data-draft="cat" data-rerender="1"><option value="">Choose…</option>${DEPTS.map(dp => `<optgroup label="${dp.id}">${dp.cats.map(c => `<option ${d.cat === c ? "selected" : ""}>${c}</option>`).join("")}</optgroup>`).join("")}</select></div>
        <div class="field full"><label for="d-title">Title</label><input class="input" id="d-title" data-draft="title" maxlength="60" value="${esc(d.title)}" placeholder="e.g. ${TITLE_HINT[dept] || "Red satin midi dress"}"><span class="hint">Brand + item + key detail works best.</span></div>
        <div class="field"><label for="d-brand">Brand</label><input class="input" id="d-brand" data-draft="brand" value="${esc(d.brand)}" placeholder="${BRAND_HINT[dept] || "Zara, Nike, Unbranded…"}"></div>
        <div class="field"><label for="d-color">Colour</label><select id="d-color" data-draft="color"><option value="">Choose…</option>${Object.keys(TINTS).map(c => `<option ${d.color === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        ${fashion ? `<div class="field full"><span class="lbl">Who is it for?</span><div class="chips">${[["W", "Women"], ["M", "Men"], ["U", "Unisex"]].map(([v, l]) => `<button type="button" class="chip ${d.dep === v ? "on" : ""}" data-act="dset" data-v="dep|${v}">${l}</button>`).join("")}</div></div>
        <div class="field full"><span class="lbl">Size</span><div class="chips">${sizeOpts.map(s => `<button type="button" class="chip ${d.size === s ? "on" : ""}" data-act="dset" data-v="size|${s}">${s}</button>`).join("")}</div></div>`
      : dept ? `<div class="field"><label for="d-size">Size / capacity</label><input class="input" id="d-size" data-draft="size" value="${esc(d.size)}" placeholder="${deptInfo(dept).sizeHint || ""}"></div>
        ${hard ? `<div class="field"><span class="lbl">Where was it used?</span><div class="chips">${[["Tokunbo", "Tokunbo (foreign-used)"], ["Nigerian-used", "Nigerian-used"]].map(([v, l]) => `<button type="button" class="chip ${d.origin === v ? "on" : ""}" data-act="dset" data-v="origin|${v}">${l}</button>`).join("")}</div></div>` : ""}` : ""}
        ${dept ? `<div class="field"><label for="d-m1">${measL[0]}</label><input class="input" id="d-m1" data-draft="m1" value="${esc(d.m1)}"></div>
        <div class="field"><label for="d-m2">${measL[1]}</label><input class="input" id="d-m2" data-draft="m2" value="${esc(d.m2)}"></div>` : `<p class="muted full" style="font-size:14px">Pick a category to see the right size and detail fields.</p>`}
        <div class="field full"><label for="d-desc">Description</label><textarea class="textarea" id="d-desc" data-draft="desc" placeholder="${hard ? "How long you've used it, any repairs, what's included (charger, remote, box)." : "Fabric or material, fit, how often it was used, why you're selling."}">${esc(d.desc)}</textarea></div>
      </div></div>`;
  if (step === 3) panel = `
    <div class="panel-body" style="display:grid;gap:18px"><div><h3 style="font-size:20px">What condition is it in?</h3><p class="muted" style="margin-top:4px">Be honest. Buyers inspect before they pay, so accurate grades mean fewer cancelled deliveries and better ratings.</p></div>
      <div class="notice">${ic("info")}<span>Everything on Droba must be <b>pre-owned</b>. Unused shop stock isn't allowed.</span></div>
      <div class="grade-cards">${GRADES.map(g => `<button type="button" class="grade ${d.cond === g.id ? "on" : ""}" data-act="dset" data-v="cond|${g.id}"><div class="g-top"><h4>${g.name}</h4>${condBars(g.id)}</div><p>${g.desc}</p><ul>${g.rules.map(r => `<li>${r}</li>`).join("")}</ul></button>`).join("")}</div>
      ${hard ? `<label class="switch box-toggle"><span><b>Tested and working</b><br><span class="muted" style="font-size:13px">You've powered it on and everything works. Buyers will test it on delivery.</span></span><input type="checkbox" data-dchk="tested" ${d.tested ? "checked" : ""}></label>` : ""}
      <label class="switch box-toggle" style="${extraOk ? "" : "opacity:.5"}"><span><b>${extraLbl}</b><br><span class="muted" style="font-size:13px">${extraOk ? `Adds a “${extraLabel(dept || "Fashion")}” label to your listing.` : "Only for Like New fashion items."}</span></span><input type="checkbox" data-dchk="extra" ${d.extra ? "checked" : ""} ${extraOk ? "" : "disabled"}></label>
      <div class="field"><span class="lbl">Any flaws?</span><div class="chips">${flawsFor(dept || "Fashion").map(f => `<button type="button" class="chip ${d.flaws.includes(f) ? (f === "No flaws" ? "on" : "on-red") : ""}" data-act="flaw" data-v="${f}">${f}</button>`).join("")}</div></div>
      <div class="field"><label for="d-note">Note for buyers <span class="muted" style="font-weight:500">(optional)</span></label><input class="input" id="d-note" data-draft="note" value="${esc(d.note)}" placeholder="${hard ? "e.g. Battery lasts about 4 hours, small scratch on lid" : "e.g. Tiny mark inside collar, not visible when worn"}"></div></div>`;
  if (step === 4) panel = `
    <div class="panel-body" style="display:grid;gap:18px"><h3 style="font-size:20px">Set your price</h3>
      <div class="field"><label for="d-price">Price</label><div class="input-pre" style="max-width:280px"><span>₦</span><input id="d-price" inputmode="numeric" data-draft="price" value="${esc(d.price)}" placeholder="15,000"></div>
        ${range ? `<span class="hint">Similar ${d.cond ? GRADES[d.cond - 1].name.toLowerCase() + " " : ""}${(d.cat || "items").toLowerCase()} on Droba list for ${naira(range[0])} – ${naira(range[1])}.</span>` : ""}</div>
      <label class="switch" style="max-width:440px"><span><b>Open to offers</b><br><span class="muted" style="font-size:13px">Buyers can message you a lower price.</span></span><input type="checkbox" data-dchk="offers" ${d.offers ? "checked" : ""}></label>
      <div class="field"><span class="lbl">Delivery options</span><label class="check"><input type="checkbox" data-dchk="deliver" ${d.deliver ? "checked" : ""}>I can deliver (fee agreed with the buyer)</label><label class="check"><input type="checkbox" data-dchk="pickup" ${d.pickup ? "checked" : ""}>Buyer can pick up in ${esc(se.city)}</label></div>
      <div class="box" style="display:grid;gap:6px"><h4>${ic("cash", "sm")}How you get paid</h4><p class="muted" style="font-size:14px">Droba doesn't take payments. Buyers send you a request, you call to confirm, and they pay you on delivery after inspecting the item. Buyers reach you on <b class="num">${esc(se.phone || S.user.phone || "your phone")}</b>.</p></div>
      <label class="check boost-opt"><input type="checkbox" data-dchk="boostLaunch" ${d.boostLaunch ? "checked" : ""}><span><b>Boost at launch</b> · 3 days for ${naira(BOOST_PRICES[0][1])}${BOOST_CREDITS[se.plan] ? " or 1 free boost" : ""}</span></label>
      ${ui.errs.length ? `<div class="tip" style="background:var(--warn-bg)">${ic("info")}<span><b>Before you publish:</b> ${ui.errs.join(" · ")}</span></div>` : ""}</div>`;
  const body = `${atLimit ? `<div class="tip" style="background:var(--warn-bg)">${ic("info")}<span>You have ${FREE_LIMIT} active listings, the free limit. Mark one as sold, or <button class="link" data-go="studio/plans">open a store</button> to list more. You can still save this as a draft.</span></div>` : ""}
    <div class="editor"><div style="display:grid;gap:16px;min-width:0">
      <div class="stepper">${steps.map((s, i) => `<button class="${step === i + 1 ? "on" : ""} ${stepDone(i + 1) && step !== i + 1 ? "done" : ""}" data-act="step" data-v="${i + 1}"><b>${stepDone(i + 1) && step !== i + 1 ? ic("check", "sm") : i + 1}</b>${s}</button>`).join("")}</div>
      <div class="panel">${panel}<div class="panel-body" style="border-top:1px solid var(--line)"><div class="ed-actions">
        ${step > 1 ? `<button class="btn btn-ghost" data-act="step" data-v="${step - 1}">${ic("arrowL", "sm")}Back</button>` : `<button class="btn btn-ghost" data-act="saveDraft">Save as draft</button>`}
        ${step < 4 ? `<button class="btn btn-primary" data-act="step" data-v="${step + 1}">Next: ${steps[step]} ${ic("arrowR", "sm")}</button>` : `<button class="btn btn-primary" data-act="publish">${ic("check", "sm")}Publish listing</button>`}</div></div></div></div>
    <aside class="preview-col"><span class="eyebrow">Live preview</span><div id="preview">${draftPreview()}</div><div class="tip">${ic("eye")}<span>This is how your item appears in buyers' feeds.</span></div></aside></div>`;
  return studioShell("new", "New listing", body, `<button class="btn btn-ghost btn-sm" data-act="saveDraft">Save draft</button>`);
}
function stepDone(n) { const d = S.draft; return n === 1 ? !!d.photos.Front : n === 2 ? !!(d.title && d.cat && d.size) : n === 3 ? !!d.cond : !!num(d.price); }

/* =========================================================================
   SHEETS / DRAWERS (layer)
   ========================================================================= */
function cartDrawer() {
  const g = cartGroups();
  return `<div class="overlay" data-act="closeLayer"></div><aside class="drawer" role="dialog" aria-label="Your bag">
    <div class="drawer-head"><h3>Your bag <span class="muted" style="font-size:16px;font-weight:500">(${S.cart.length})</span></h3><button class="icon-btn" data-act="closeLayer" aria-label="Close">${ic("x")}</button></div>
    <div class="drawer-body">${S.cart.length ? Object.entries(g).map(([sid, ps]) => { const s = api.seller(sid); return `<div class="cart-group"><div class="cart-group-head">${ic(s.type === "store" ? "store" : "user", "sm")}${esc(s.name)} ${vb(s.verified)}<span class="muted">${esc(s.city)}</span></div>
      ${ps.map(p => `<div class="cart-item"><button data-go="product/${p.id}">${prodImg(p, 200)}</button><div style="min-width:0"><h4>${esc(p.title)}</h4><div class="ci-meta">${condBars(p.cond)} ${GRADES[p.cond - 1].name} · ${esc(p.size)}</div><button class="ci-remove" data-act="rmCart" data-v="${p.id}">Remove</button></div><b class="num">${naira(p.price)}</b></div>`).join("")}</div>`; }).join("")
      : `<div class="empty" style="margin-top:20px"><span class="e-ic">${ic("bag", "lg")}</span><h3>Your bag is empty</h3><p class="muted">Pre-loved items are one of one. When you see it, bag it.</p><button class="btn btn-primary" data-act="feed" data-v="foryou">Browse For You</button></div>`}
      ${S.cart.length ? `<div class="soft-warn">${ic("cash")}<span><b>You'll pay each seller on delivery.</b> Items aren't reserved until the seller confirms your request.</span></div>` : ""}</div>
    ${S.cart.length ? `<div class="drawer-foot"><div class="sum-row total"><span>To pay on delivery</span><span class="num">${naira(cartTotal())}</span></div><div class="sum-row"><span class="muted">Delivery fee</span><span class="muted">Agreed with each seller</span></div>
      <button class="btn btn-primary btn-lg btn-block" data-go="checkout">Send order request ${ic("arrowR", "sm")}</button><button class="btn btn-ghost btn-block" data-act="closeLayer">Keep shopping</button></div>` : ""}
  </aside>`;
}
function sheetWrap(title, body, foot = "") {
  const wide = window.innerWidth > 760;
  return `<div class="overlay" data-act="closeLayer"></div><aside class="${wide ? "drawer" : "sheet"}" role="dialog" aria-label="${esc(title)}">
    <div class="drawer-head" style="display:block"><div class="grab" ${wide ? "hidden" : ""}></div><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3>${title}</h3><button class="icon-btn" data-act="closeLayer" aria-label="Close">${ic("x")}</button></div></div>
    <div class="drawer-body">${body}</div>${foot ? `<div class="drawer-foot">${foot}</div>` : ""}</aside>`;
}
function rateSheet() {
  const o = S.myOrders.find(x => x.id === ui.rate.id); if (!o) return "";
  const s = api.seller(o.seller), p = api.product(o.pids[0]);
  return sheetWrap(`Rate ${esc(s.name)}`, `<div style="display:flex;gap:12px;align-items:center">${prodImg(p, 200, 'style="width:56px;height:68px;border-radius:10px;object-fit:cover"')}<div><b>${esc(p.title)}</b><div class="muted" style="font-size:13px">${o.id} · delivered</div></div></div>
    <div class="field"><span class="lbl">Overall</span><div class="rate-stars">${[1, 2, 3, 4, 5].map(i => `<button class="${i <= ui.rate.stars ? "on" : ""}" data-act="rateStar" data-v="${i}" aria-label="${i} star${i > 1 ? "s" : ""}">${ic("star")}</button>`).join("")}</div></div>
    <div class="field"><span class="lbl">Was it as described?</span><div class="chips"><button class="chip ${ui.rate.asDesc === true ? "on" : ""}" data-act="rateDesc" data-v="yes">Yes, matched the listing</button><button class="chip ${ui.rate.asDesc === false ? "on-red" : ""}" data-act="rateDesc" data-v="no">No, it didn't</button></div></div>
    <div class="field"><label for="rate-t">Comment (optional)</label><textarea class="textarea" id="rate-t" placeholder="Delivery, communication, condition…"></textarea></div>
    ${ui.rate.asDesc === false ? `<div class="soft-warn">${ic("info")}<span>Sorry about that. Your rating shows on the seller's profile, and we'll review the listing.</span></div>` : ""}`,
    `<button class="btn btn-primary btn-block" data-act="rateSubmit" ${ui.rate.stars ? "" : "disabled"}>Submit rating</button>`);
}
function layerHTML() {
  if (ui.cart) return cartDrawer();
  if (ui.sheet === "filters") return sheetWrap("Filters", `<div>${filtersPanel("sheet")}</div>`, `<div style="display:grid;grid-template-columns:1fr 2fr;gap:10px"><button class="btn btn-ghost" data-act="clearF">Clear</button><button class="btn btn-primary" data-act="closeLayer">Show ${filtered().length} items</button></div>`);
  if (ui.sheet === "grades") return sheetWrap("How condition grading works", `<p style="color:var(--ink-2)">Every item on Droba is pre-owned. Sellers choose one of four grades and must photograph any flaws. Check the item against its grade before you pay.</p>
    ${GRADES.map(g => `<div class="box" style="display:grid;gap:8px"><div style="display:flex;justify-content:space-between;align-items:center"><h4 style="font-family:var(--f-display);font-size:19px">${g.name}</h4>${condBars(g.id)}</div><p style="font-size:14px;color:var(--ink-2)">${g.desc}</p><ul style="margin:0;padding-left:18px;font-size:13.5px;color:var(--muted)">${g.rules.map(r => `<li>${r}</li>`).join("")}</ul></div>`).join("")}
    <div class="tip">${ic("tag")}<span><b>Tags on / With box</b> means original tags or packaging are included.</span></div>`, `<button class="btn btn-primary btn-block" data-act="shopGrade">Shop Like New & First Grade</button>`);
  if (ui.sheet === "safety") return sheetWrap("Buying safely on Droba", `<p style="color:var(--ink-2)">Droba connects buyers and sellers. <b>We don't handle payments</b>: you pay the seller directly, on delivery, once you're happy with the item.</p>${safetyList(5)}
    <div class="soft-warn">${ic("info")}<span>If a seller asks for payment in advance, a deposit, or an OTP, don't send it. Report the listing instead.</span></div>`);
  if (ui.sheet === "msg") return sheetWrap("Message seller", `<div class="tip">${ic("info")}<span>Messaging connects to the backend later. For now this shows the layout.</span></div><div class="field"><label for="msg-t">Your message</label><textarea class="textarea" id="msg-t">Hi! Is this still available? Can I see it working before I pay?</textarea></div><p class="muted" style="font-size:13px">Keep chats on Droba until you've met. Never pay before you've seen the item.</p>`, `<button class="btn btn-primary btn-block" data-act="sendMsg">Send message</button>`);
  if (ui.sheet === "plans") return sheetWrap("Ways to sell on Droba", plansGrid(mySeller()?.plan, "public").replace('class="plans"', 'class="plans" style="grid-template-columns:minmax(0,1fr)"'));
  if (ui.sheet === "rate") return rateSheet();
  return "";
}

/* ---------- prototype screen jumper ---------- */
function jumperHTML() {
  const sec = (t, items) => `<h6>${t}</h6>${items.map(([l, a]) => `<button data-act="jump" data-v="${a}">${l}</button>`).join("")}`;
  return `<div class="jumper">${ui.jumper ? `<div class="jumper-pop" data-pop>
    ${sec("Onboarding", [["Welcome · pick a role", "welcome"], ["Sign up", "signup"], ["Shopper: what you shop for", "ob-dep"], ["Shopper: fine-tune feed", "ob-style"], ["Seller: free or store?", "ob-sell"], ["Free seller: location & phone", "ob-quick"], ["Store: name your store", "ob-store"], ["Store: pick a plan", "ob-plan"]])}
    ${sec("Shopping", [["Home · For You", "home"], ["New In", "feed:new"], ["Shop with filters", "shop"], ["All categories menu", "megaOpen"], ["Kids & Baby department", "dept:Kids & Baby"], ["Search “iPhone”", "search"], ["Product: dress", "product/2"], ["Product: fridge", "product/50"], ["Product: laptop", "product/60"], ["Product: car", "product/93"], ["Store page", "store/s8"], ["Individual seller page", "store/i3"], ["Bag", "cart"], ["Order request", "checkout"], ["My orders + rating", "account"]])}
    ${sec("Selling", [["Free seller dashboard", "studio:free"], ["Store dashboard", "studio:store"], ["Listings", "studio/listings"], ["New listing", "studio/new"], ["Order requests", "studio/orders"], ["Boost", "studio/promote"], ["Storefront editor", "studio/storefront"], ["Plans", "studio/plans"], ["My public page", "store/me"]])}
    <h6>Demo</h6><button data-act="jump" data-v="reset">Reset demo data</button></div>` : ""}
    <button data-act="jumper" aria-expanded="${ui.jumper}">${ic("layers", "sm")}<span>Screens</span></button></div>`;
}

/* =========================================================================
   RENDER
   ========================================================================= */
const OB_ROUTES = ["ob-dep", "ob-style", "ob-done", "ob-sell", "ob-quick", "ob-store", "ob-plan", "ob-ready"];
function render() {
  const parts = CUR.split("/"), r = parts[0], a = parts[1];
  let html;
  const shopping = (inner, extraClass = "") => `<div class="page ${extraClass}">${header()}${inner}${footer()}${tabbar()}</div>`;
  if (r === "studio" && !mySeller()) { S.ob.role = "sell"; CUR = S.user ? "ob-sell" : "signup"; return render(); }
  if (OB_ROUTES.includes(r) && !S.user) { CUR = "signup"; return render(); }
  if (r === "ob-ready" && !isStore()) { CUR = "ob-store"; return render(); }
  switch (r) {
    case "welcome": html = viewWelcome(); break;
    case "signup": html = viewSignup(); break;
    case "signin": html = viewSignin(); break;
    case "ob-dep": html = viewObDep(); break;
    case "ob-style": html = viewObStyle(); break;
    case "ob-done": html = viewObDone(); break;
    case "ob-sell": html = viewObSell(); break;
    case "ob-quick": html = viewObQuick(); break;
    case "ob-store": html = viewObStore(); break;
    case "ob-plan": html = viewObPlan(); break;
    case "ob-ready": html = viewObStoreDone(); break;
    case "studio":
      S.mode = "seller";
      html = !a ? viewStudioHome() : a === "listings" ? viewStudioListings() : a === "orders" ? viewStudioOrders() : a === "promote" ? viewStudioPromote() : a === "storefront" ? viewStudioStorefront() : a === "plans" ? viewStudioPlans() : a === "new" ? viewStudioNew() : viewStudioHome();
      break;
    case "shop": html = shopping(viewShop()); break;
    case "product": html = shopping(viewProduct(a), "pdp-page"); break;
    case "store": html = shopping(viewStore(a)); break;
    case "saved": html = shopping(viewSaved()); break;
    case "account": html = shopping(viewAccount()); break;
    case "checkout": html = shopping(viewCheckout()); break;
    case "order": html = shopping(viewOrderDone(a)); break;
    default: CUR = "home"; html = shopping(viewHome());
  }
  if (r !== "studio" && !OB_ROUTES.includes(r) && !["welcome", "signup", "signin"].includes(r)) S.mode = "buyer";
  $("#app").innerHTML = html;
  renderLayer();
  save();
}
function renderLayer() { $("#layer").innerHTML = layerHTML(); $("#jump").innerHTML = jumperHTML(); document.body.style.overflow = (ui.cart || ui.sheet) ? "hidden" : ""; }

/* =========================================================================
   ACTIONS
   ========================================================================= */
function shopWith(patch) { S.f = Object.assign(FRESH_FILTERS(), patch); go("shop"); }
function ensureDemoUser(kind) {
  if (!S.user) S.user = { name: "Amara Okafor", email: "amara@email.com", phone: "801 234 5678", depts: ["Fashion", "Phones & Tablets", "Furniture", "Appliances"], dep: "W", styles: ["Vintage", "Going-out", "Living room", "Apple"], sizes: ["M", "EU 39"], seller: null };
  if (kind === "free" && (!S.user.seller || S.user.seller.type !== "individual")) {
    S.user.seller = { type: "individual", plan: "Free", city: "Lagos", area: "Surulere", phone: "801 234 5678" };
    S.listings = SEED_LISTINGS("free"); S.orders = SEED_ORDERS("free");
  }
  if (kind === "store" && (!S.user.seller || S.user.seller.type !== "store")) {
    S.user.seller = { type: "store", plan: "Premium", name: "Amara's Corner", handle: "amarascorner", city: "Lagos", area: "Yaba", phone: "801 234 5678", bio: "Pre-loved fashion, home pieces and gadgets. Everything tested and photographed in daylight.", ig: "@amarascorner", tiktok: "" };
    S.listings = SEED_LISTINGS("store"); S.orders = SEED_ORDERS("store");
  }
}
function switchMode(to) {
  if (to === "seller") {
    if (!S.user) { S.ob.role = "sell"; go("signup"); return; }
    if (!mySeller()) { S.ob.role = "sell"; go("ob-sell"); return; }
    S.mode = "seller"; go("studio"); toast("Switched to selling");
  } else {
    S.mode = "buyer"; go("home"); toast("Switched to shopping");
  }
}
function newUser(fields) { return Object.assign({ depts: [], dep: null, styles: [], sizes: [], seller: null }, fields); }
const ACT = {
  mode: (v) => switchMode(v),
  join: () => { S.ob.role = "shop"; go("welcome"); },
  guest: () => { S.feed = "foryou"; go("home"); },
  role: (v) => { S.ob.role = v; if (S.user) go(v === "sell" ? (mySeller() ? "studio" : "ob-sell") : "ob-dep"); else go("signup"); },
  back: () => { const prev = HIST.pop(); go(prev || "welcome", { back: true }); },
  quickSignup: () => { S.user = newUser({ name: "Amara Okafor", email: "amara@gmail.com", phone: "" }); go(S.ob.role === "sell" ? "ob-sell" : "ob-dep"); },
  obDept: (v) => { const a = S.user.depts = S.user.depts || []; a.includes(v) ? a.splice(a.indexOf(v), 1) : a.push(v); render(); },
  obDep: (v) => { S.user.dep = v; render(); },
  obAllDepts: () => { S.user.depts = S.user.depts && S.user.depts.length === DEPTS.length ? [] : DEPTS.map(d => d.id); render(); },
  obStyle: (v) => { const a = S.user.styles = S.user.styles || []; a.includes(v) ? a.splice(a.indexOf(v), 1) : a.push(v); render(); },
  obSize: (v) => { const a = S.user.sizes = S.user.sizes || []; a.includes(v) ? a.splice(a.indexOf(v), 1) : a.push(v); render(); },
  obCat: (v) => { syncForm("store"); const a = S.ob.cats = S.ob.cats || []; a.includes(v) ? a.splice(a.indexOf(v), 1) : a.push(v); render(); },
  obPlan: (v) => { S.ob.plan = v; render(); },
  sellType: (v) => { S.ob.sellType = v; go(v === "store" ? "ob-store" : "ob-quick"); },
  planGo: (v) => {
    ui.sheet = null;
    if (!S.user) { S.ob.role = "sell"; S.ob.plan = v; go("signup"); return; }
    if (mySeller()) { go("studio/plans"); return; }
    S.ob.plan = v; go(v === "Free" ? "ob-quick" : "ob-store");
  },
  createStore: () => {
    const ob = S.ob;
    S.user.seller = { type: "store", name: ob.storeName, handle: ob.handle || slug(ob.storeName), city: ob.city || "Lagos", area: ob.area || "", phone: ob.phone || S.user.phone || "", cats: ob.cats || [], plan: ob.plan === "Business" ? "Business" : "Premium", bio: "", ig: "", tiktok: "" };
    S.listings = []; S.orders = [];
    S.mode = "seller"; go("ob-ready");
  },
  firstListing: () => { S.draft = FRESH_DRAFT(); ui.step = 1; go("studio/new"); },
  enterStudio: () => go("studio"),
  finishShop: () => { S.feed = "foryou"; go("home"); toast("Your For You feed is ready"); },
  editPrefs: () => { S.ob.role = "shop"; go("ob-dep"); },
  logout: () => { S.user = null; S.mode = "buyer"; go("welcome"); toast("Logged out"); },
  menu: () => { ui.menu = !ui.menu; ui.mega = false; render(); },
  mega: () => { ui.mega = !ui.mega; ui.menu = false; render(); },
  feed: (v) => { S.feed = v; ui.more = false; if (CUR !== "home") go("home"); else { render(); window.scrollTo({ top: 0, behavior: "smooth" }); } },
  more: () => { ui.more = true; render(); },
  shopAll: () => shopWith({}),
  shopDept: (v) => shopWith({ dept: [v] }),
  shopCat: (v) => shopWith({ dept: [deptOf(v)], cat: [v] }),
  toggleCat: (v) => { const a = S.f.cat; a.includes(v) ? a.splice(a.indexOf(v), 1) : a.push(v); render(); },
  shopDep: (v) => shopWith({ dept: ["Fashion"], dep: [v] }),
  shopGrade: () => shopWith({ cond: [1, 2] }),
  search: (v) => { S.recent = [v, ...S.recent.filter(r => r.toLowerCase() !== v.toLowerCase())].slice(0, 5); shopWith({ q: v }); },
  save: (v) => { v = +v; const i = S.saved.indexOf(v); if (i >= 0) { S.saved.splice(i, 1); toast("Removed from saved"); } else { S.saved.push(v); toast("Saved", ["View saved", "goSaved"]); } render(); },
  goSaved: () => go("saved"),
  cart: (v) => { v = +v; if (S.cart.includes(v)) { ui.cart = true; renderLayer(); return; } S.cart.push(v); render(); toast("Added to your bag", ["View bag", "openCart"]); },
  buyNow: (v) => { v = +v; if (!S.cart.includes(v)) S.cart.push(v); go("checkout"); },
  rmCart: (v) => { S.cart = S.cart.filter(x => x !== +v); render(); },
  openCart: () => { ui.cart = true; ui.menu = false; renderLayer(); },
  closeLayer: () => { ui.cart = false; ui.sheet = null; render(); },
  sheet: (v) => { ui.sheet = v; renderLayer(); },
  plans: () => { if (mySeller()) go("studio/plans"); else { ui.sheet = "plans"; renderLayer(); } },
  msgSeller: () => { ui.sheet = "msg"; renderLayer(); },
  sendMsg: () => { ui.sheet = null; renderLayer(); toast("Message sent to seller"); },
  showPhone: () => { ui.showPhone = true; render(); },
  gal: (v) => { ui.gIdx = +v; render(); },
  follow: (v) => { const i = S.following.indexOf(v); i >= 0 ? S.following.splice(i, 1) : S.following.push(v); render(); toast(i >= 0 ? "Unfollowed" : "Following. New items will show in your feed"); },
  storeTab: (v) => { ui.storeTab = v; render(); },
  ftog: (v) => { const [key, val] = v.split("|"); const a = S.f[key]; a.includes(val) ? a.splice(a.indexOf(val), 1) : a.push(val); render(); },
  fgToggle: (v) => { ui.fg[v] = !ui.fg[v]; render(); },
  qc: (v) => {
    const f = S.f;
    if (v === "under50") { if (!f.min && String(f.max) === "50000") f.max = ""; else { f.min = ""; f.max = "50000"; } }
    else if (v === "stores") f.sellerType = f.sellerType.length === 1 && f.sellerType[0] === "store" ? [] : ["store"];
    else if (v === "week") f.listed = f.listed === "7" ? "" : "7";
    else { const [k, val] = v.split("|"); if (k === "flag") f[val] = !f[val]; else { const x = k === "cond" ? +val : val; f[k].includes(x) ? f[k].splice(f[k].indexOf(x), 1) : f[k].push(x); } }
    render();
  },
  feedDept: (v) => { S.feedDept = v; ui.more = false; render(); },
  feedFilters: () => shopWith(S.feedDept ? { dept: [S.feedDept] } : {}),
  fprice: (v) => { const [a, b] = v.split("|"); S.f.min = a; S.f.max = b; render(); },
  rmF: (v) => { const i = v.indexOf("|"), key = v.slice(0, i), val = v.slice(i + 1); if (key === "price") { S.f.min = ""; S.f.max = ""; } else if (key === "listed") S.f.listed = ""; else if (typeof S.f[key] === "boolean") S.f[key] = false; else S.f[key] = S.f[key].filter(x => String(x) !== val); render(); },
  clearF: () => { S.f = Object.assign(FRESH_FILTERS(), { q: S.f.q, sort: S.f.sort }); render(); },
  ship: (v) => { ui.ship = v; render(); },
  placeOrder: () => {
    const g = cartGroups(); let lastId;
    Object.entries(g).forEach(([sid, ps], i) => {
      lastId = "DRB-" + (10400 + Math.floor(Math.random() * 500) + i);
      S.myOrders.unshift({ id: lastId, pids: ps.map(p => p.id), seller: sid, status: "Waiting for seller", when: "Today", total: ps.reduce((a, p) => a + p.price, 0), rated: 0 });
    });
    S.cart = []; go("order/" + lastId);
  },
  rateOpen: (v) => { ui.rate = { id: v, stars: 0, asDesc: null }; ui.sheet = "rate"; renderLayer(); },
  rateStar: (v) => { ui.rate.stars = +v; renderLayer(); },
  rateDesc: (v) => { ui.rate.asDesc = v === "yes"; renderLayer(); },
  rateSubmit: () => { const o = S.myOrders.find(x => x.id === ui.rate.id); if (o) o.rated = ui.rate.stars; ui.sheet = null; render(); toast("Thanks. Your rating is on the seller's profile"); },
  // selling
  ltab: (v) => { ui.ltab = v; render(); },
  confirmOrder: (v) => { const o = S.orders.find(x => x.id === v); if (o) o.status = "Confirmed"; render(); toast(`Call ${o.buyer} on ${o.phone} to arrange delivery`); },
  declineOrder: (v) => { const o = S.orders.find(x => x.id === v); if (o) o.status = "Declined"; render(); toast("Request declined. The buyer has been told"); },
  deliverOrder: (v) => { const o = S.orders.find(x => x.id === v); if (o) o.status = "Delivered"; const l = S.listings.find(x => x.id === o.lid); if (l) { l.status = "sold"; l.boost = 0; } render(); toast("Marked delivered. We've asked the buyer to rate you"); },
  markSold: (v) => { const l = S.listings.find(x => x.id === v); l.status = "sold"; l.boost = 0; render(); toast("Marked as sold"); },
  relist: (v) => { if (!canActivate()) return; const l = S.listings.find(x => x.id === v); l.status = "active"; render(); toast("Listing is live again"); },
  publishDraft: (v) => { if (!canActivate()) return; const l = S.listings.find(x => x.id === v); l.status = "active"; render(); toast("Published"); },
  delListing: (v) => { const l = S.listings.find(x => x.id === v); S.listings = S.listings.filter(x => x.id !== v); render(); toast("Listing deleted", ["Undo", "undoDel"]); ACT._last = l; },
  undoDel: () => { if (ACT._last) { S.listings.push(ACT._last); ACT._last = null; render(); } },
  goPlans: () => go("studio/plans"),
  boostThis: (v) => { ui.pick = v; go("studio/promote"); },
  pick: (v) => { ui.pick = v; render(); },
  dur: (v) => { ui.dur = +v; render(); },
  boost: (v) => {
    const se = mySeller(), active = S.listings.filter(l => l.status === "active");
    const l = active.find(x => x.id === ui.pick) || active[0]; if (!l) return;
    if (v === "credit") se.credits = (se.credits ?? BOOST_CREDITS[se.plan]) - 1;
    l.boost = ui.dur; render(); toast(`${l.title} boosted for ${ui.dur} days${v === "pay" ? ". Payment opens with the backend" : ""}`);
  },
  feature: () => toast("Featured slot requested. Payment opens with the backend"),
  banner: (v) => { syncForm("storefront"); ui.banner = v; render(); },
  setPlan: (v) => {
    const se = mySeller();
    if (v === "Free") { Object.assign(se, { type: "individual", plan: "Free" }); render(); toast("You're now a free seller. Your storefront is hidden"); return; }
    const wasFree = se.type !== "store";
    Object.assign(se, { type: "store", plan: v, credits: BOOST_CREDITS[v] });
    if (!se.name) { se.name = first(S.user.name) + "'s Store"; se.handle = slug(se.name); }
    if (wasFree) { go("studio/storefront"); toast(`Your ${PLANS.find(p => p.id === v).label} is open. Set up your storefront`); }
    else { render(); toast(`You're now on ${PLANS.find(p => p.id === v).label}`); }
  },
  step: (v) => { ui.step = +v; ui.errs = []; render(); },
  dset: (v) => { const [key, val] = v.split("|"); S.draft[key] = key === "cond" ? +val : val; if (key === "cond" && +val !== 1 && deptOf(S.draft.cat || "Dresses") === "Fashion") S.draft.extra = false; if (key === "cond" && !S.draft.flaws.length && +val <= 2) S.draft.flaws = ["No flaws"]; render(); },
  flaw: (v) => { const d = S.draft; if (v === "No flaws") d.flaws = d.flaws.includes(v) ? [] : [v]; else { d.flaws = d.flaws.filter(f => f !== "No flaws"); d.flaws.includes(v) ? d.flaws.splice(d.flaws.indexOf(v), 1) : d.flaws.push(v); } render(); },
  rmPhoto: (v) => { delete S.draft.photos[v]; render(); },
  samplePhotos: () => { Object.assign(S.draft, { photos: { Front: "1626806787461-102c1bfaaea1", Back: "1604335399105-a0c585fd81a1", Detail: "1622473590925-e3616c0a41bf" }, title: S.draft.title || "Front-load washing machine, 7 kg", cat: S.draft.cat || "Washing machines", color: S.draft.color || "White", size: S.draft.size || "7 kg", origin: S.draft.origin || "Tokunbo" }); render(); },
  saveDraft: () => { S.listings.unshift(draftToListing("draft")); S.draft = FRESH_DRAFT(); ui.step = 1; ui.ltab = "draft"; go("studio/listings"); toast("Saved to drafts"); },
  publish: () => {
    const d = S.draft, errs = [];
    if (!d.photos.Front) errs.push("add a front photo");
    if (!d.title) errs.push("add a title");
    if (!d.cat) errs.push("choose a category");
    if (!d.size) errs.push("add a size");
    if (!d.cond) errs.push("choose a condition grade");
    if (!num(d.price)) errs.push("set a price");
    if (!isStore() && activeCount() >= FREE_LIMIT) errs.push(`free sellers can have ${FREE_LIMIT} active listings (mark one as sold, save as draft, or open a store)`);
    if (errs.length) { ui.errs = errs; render(); return; }
    S.listings.unshift(draftToListing("active"));
    S.draft = FRESH_DRAFT(); ui.step = 1; ui.ltab = "active"; go("studio/listings"); toast("Your listing is live");
  },
  jumper: () => { ui.jumper = !ui.jumper; renderLayer(); },
  jump: (v) => {
    ui.jumper = false;
    if (v === "reset") { try { localStorage.removeItem(STORE_KEY); } catch (e) { } S = DEFAULT_STATE(); HIST.length = 0; go("welcome"); toast("Demo reset"); return; }
    if (v === "studio:free" || v === "studio:store") { ensureDemoUser(v.split(":")[1]); go("studio"); return; }
    if (v.startsWith("studio") || v === "store/me") { if (!mySeller() || (v === "studio/storefront" && !isStore())) ensureDemoUser("store"); }
    if (["ob-dep", "ob-style", "account", "ob-sell"].includes(v)) ensureDemoUser();
    if (v === "ob-quick") { ensureDemoUser(); S.ob = { role: "sell", sellType: "individual", city: "Lagos" }; }
    if (v === "ob-store" || v === "ob-plan") { ensureDemoUser(); S.ob = { role: "sell", sellType: "store", storeName: S.ob.storeName || "Amara's Corner", city: "Lagos", cats: ["Fashion", "Phones & Tablets"], plan: "Premium" }; }
    if (v === "signup") S.ob.role = "shop";
    if (v.startsWith("feed:")) { S.feed = v.split(":")[1]; go("home"); return; }
    if (v.startsWith("dept:")) { ACT.shopDept(v.split(":")[1]); return; }
    if (v === "search") { ACT.search("iPhone"); return; }
    if (v === "megaOpen") { if (!["home", "shop"].includes(CUR.split("/")[0])) go("home"); ui.mega = true; render(); window.scrollTo(0, 0); return; }
    if (v === "cart") { if (!S.cart.length) S.cart = [8, 62, 50]; ui.cart = true; renderLayer(); return; }
    if (v === "checkout" && !S.cart.length) S.cart = [8, 62];
    if (v === "home") S.feed = "foryou";
    go(v);
  },
};
function canActivate() { if (!isStore() && activeCount() >= FREE_LIMIT) { toast(`Free limit reached: ${FREE_LIMIT} active listings`, ["Open a store", "goPlans"]); return false; } return true; }
function draftToListing(status) {
  const d = S.draft;
  return { id: "L" + Date.now(), title: d.title || "Untitled draft", cat: d.cat || "Dresses", dept: deptOf(d.cat || "Dresses"), dep: d.dep, size: d.size, price: num(d.price), cond: d.cond || 2, extra: d.extra, tested: d.tested, origin: d.origin, img: d.photos.Front || "", color: d.color || "Red", status, views: 0, saves: 0, boost: status === "active" && d.boostLaunch ? 3 : 0 };
}

/* form syncing helpers (keep typed values across re-renders) */
function syncForm(kind) {
  const f = $(`[data-form="${kind}"]`); if (!f) return;
  const d = new FormData(f);
  if (kind === "store" || kind === "quick") ["storeName", "handle", "city", "area", "phone"].forEach(k => { if (d.has(k)) S.ob[k] = d.get(k); });
  if (kind === "storefront") { const se = mySeller(); ["name", "city", "bio", "ig", "tiktok", "phone"].forEach(k => { if (d.has(k)) se[k] = d.get(k); }); }
}

/* ---------- event wiring ---------- */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-go],[data-act]");
  const inPop = e.target.closest("[data-pop],[data-search]");
  if (!inPop) {
    $$(".search-pop").forEach(p => p.hidden = true);
    if ((ui.menu || ui.jumper || ui.mega) && !(t && ["menu", "jumper", "mega"].includes(t.dataset.act))) { ui.menu = false; ui.jumper = false; ui.mega = false; if (!t) { render(); return; } }
  }
  if (!t) return;
  if (t.tagName === "INPUT" || t.tagName === "LABEL") return;
  e.preventDefault();
  if (t.dataset.go && !t.dataset.act) { go(t.dataset.go); return; }
  const fn = ACT[t.dataset.act];
  if (fn) fn(t.dataset.v, t, e);
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.chg === "f") { const key = t.dataset.k, v = t.dataset.num ? +t.dataset.v : t.dataset.v; const a = S.f[key]; t.checked ? (a.includes(v) || a.push(v)) : a.splice(a.indexOf(v), 1); render(); return; }
  if (t.dataset.chg === "flag") { S.f[t.dataset.k] = t.checked; render(); return; }
  if (t.dataset.chg === "price") { S.f[t.dataset.k] = t.value.replace(/\D/g, ""); render(); return; }
  if (t.dataset.chg === "sort") { S.f.sort = t.value; render(); return; }
  if (t.dataset.chg === "listed") { S.f.listed = t.value; render(); return; }
  if (t.dataset.dchk) { S.draft[t.dataset.dchk] = t.checked; save(); updatePreview(); return; }
  if (t.dataset.draft && t.dataset.rerender) {
    S.draft[t.dataset.draft] = t.value;
    if (t.dataset.draft === "cat") { S.draft.size = ""; S.draft.flaws = []; S.draft.m1 = ""; S.draft.m2 = ""; if (deptOf(t.value) === "Fashion") S.draft.origin = ""; }
    render(); return;
  }
  if (t.dataset.photo) {
    const file = t.files && t.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => { S.draft.photos[t.dataset.photo] = r.result; render(); };
    r.readAsDataURL(file);
  }
});
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.matches("[data-search-input]")) { const pop = t.closest("[data-search]").querySelector(".search-pop"); pop.innerHTML = searchPopHTML(t.value); pop.hidden = false; return; }
  if (t.dataset.draft && !t.dataset.rerender) { S.draft[t.dataset.draft] = t.value; save(); updatePreview(); return; }
  if (t.dataset.live === "storeName") { S.ob.storeName = t.value; const h = $("#st-handle"); if (h && !S.ob.handleEdited) { h.value = slug(t.value); S.ob.handle = h.value; } }
  if (t.dataset.live === "handle") { S.ob.handleEdited = true; S.ob.handle = slug(t.value); }
});
document.addEventListener("toggle", (e) => { const d = e.target; if (d.dataset && d.dataset.fg) ui.fg[d.dataset.fg] = d.open; }, true);
document.addEventListener("focusin", (e) => {
  const t = e.target;
  if (t.matches && t.matches("[data-search-input]")) { const pop = t.closest("[data-search]").querySelector(".search-pop"); pop.innerHTML = searchPopHTML(t.value); pop.hidden = false; }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { $$(".search-pop").forEach(p => p.hidden = true); if (ui.cart || ui.sheet || ui.menu || ui.jumper || ui.mega) { ui.cart = false; ui.sheet = null; ui.menu = false; ui.jumper = false; ui.mega = false; render(); } } });
document.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target, kind = f.dataset.form;
  if (kind === "search") { const v = f.q.value.trim(); if (v) ACT.search(v); else shopWith({}); return; }
  if (kind === "signup") {
    const name = f.elements.name.value.trim(), email = f.elements.email.value.trim(), phone = f.elements.phone.value.trim();
    const errs = []; if (!name) errs.push("Add your name."); if (!email) errs.push("Add your email."); if (!phone) errs.push("Add a phone number so buyers or sellers can reach you.");
    if (errs.length) { ui.errs = errs; render(); return; }
    S.user = newUser({ name, email, phone });
    go(S.ob.role === "sell" ? "ob-sell" : "ob-dep"); return;
  }
  if (kind === "signin") { ensureDemoUser(); S.feed = "foryou"; go("home"); toast("Welcome back, Amara"); return; }
  if (kind === "quick") {
    syncForm("quick");
    S.user.seller = { type: "individual", plan: "Free", city: S.ob.city || "Lagos", area: S.ob.area || "", phone: S.ob.phone || S.user.phone || "" };
    S.listings = []; S.orders = []; S.draft = FRESH_DRAFT(); ui.step = 1;
    S.mode = "seller"; go("studio/new"); toast("You're set up as a free seller. Add your first item"); return;
  }
  if (kind === "store") {
    syncForm("store");
    if (!(S.ob.storeName || "").trim()) { ui.errs = ["Give your store a name."]; render(); return; }
    S.ob.handle = S.ob.handle || slug(S.ob.storeName); go("ob-plan"); return;
  }
  if (kind === "storefront") { syncForm("storefront"); if (ui.banner) mySeller().banner = ui.banner; render(); toast("Storefront saved"); }
});
function updatePreview() { const p = $("#preview"); if (p) p.innerHTML = draftPreview(); }

/* ---------- boot ---------- */
CUR = parseHash() || "welcome";
render();
