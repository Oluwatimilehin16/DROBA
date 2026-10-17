// Screenshots of key pages at phone and desktop sizes, plus a signed-in chat flow.
// Usage: WEB_URL=http://localhost:3000 SCREENS_DIR=./screens node e2e/screens.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://localhost:4000";
const DIR = process.env.SCREENS_DIR ?? "screens";
mkdirSync(DIR, { recursive: true });

const sizes = { phone: { width: 390, height: 844 }, desktop: { width: 1366, height: 900 } };
const problems = [];
let current = "";

async function shoot(page, name, { full = true } = {}) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: full });
}

function watch(page, label) {
  page.on("pageerror", (e) => problems.push(`[${label}] ${page.url().replace(WEB, "")} page error: ${e.message}`));
  // 401s are expected: the app checks for a session on every page load while signed out
  page.on("console", (m) => m.type() === "error" && !/401/.test(m.text()) && !(current === "not-found" && /404/.test(m.text())) && problems.push(`[${label}] ${current}: ${m.text()}`));
  page.on("response", (r) => r.status() === 404 && current !== "not-found" && problems.push(`[${label}] ${current}: 404 ${r.url()}`));
  page.on("response", (r) => r.status() >= 500 && problems.push(`[${label}] ${current}: ${r.status()} ${r.url()}`));
}

const browser = await chromium.launch();
try {
  // A listing and a store to visit
  const search = await (await fetch(`${API}/api/listings?limit=1&q=iphone`)).json();
  const listingId = search.items?.[0]?.id;

  for (const [size, viewport] of Object.entries(sizes)) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    watch(page, size);
    const pages = [
      ["home", "/"],
      ["search", "/search?department=appliances"],
      ["search-near-me", "/search?q=fridge&city=Lagos&sort=distance"],
      ["listing", `/listing/${listingId}`],
      ["store-business", "/gadgetcorner"],
      ["store-premium", "/yabavintage"],
      ["login", "/login"],
      ["signup", "/signup"],
      ["not-found", "/this-store-does-not-exist"],
      ["terms", "/terms"],
      ["privacy", "/privacy"],
      ["prohibited", "/prohibited"],
    ];
    for (const [name, path] of pages) {
      current = name;
      const res = await page.goto(WEB + path, { waitUntil: "domcontentloaded" });
      if (!res || (res.status() >= 400 && name !== "not-found")) problems.push(`[${size}] ${path} → ${res?.status()}`);
      await shoot(page, `${size}-${name}`);
    }
    await ctx.close();
  }

  current = "flows";
  // Signed-in flows on a phone: buyer messages a seller, seller sees it live
  const phone = sizes.phone;
  const buyerCtx = await browser.newContext({ viewport: phone });
  const buyer = await buyerCtx.newPage();
  watch(buyer, "buyer");
  await buyer.goto(`${WEB}/login`);
  await buyer.fill('input[name="email"]', "buyer@droba.ng");
  await buyer.fill('input[name="password"]', "droba-demo-123");
  await buyer.click('button[type="submit"]');
  await buyer.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
  await shoot(buyer, "flow-01-buyer-home");

  // Bag → two-step checkout → request sent (items from two different sellers)
  await buyer.goto(`${WEB}/search?department=phones&sort=newest`);
  await buyer.getByRole("button", { name: "Add to bag" }).first().click();
  await buyer.getByRole("dialog", { name: "Your bag" }).waitFor();
  await shoot(buyer, "flow-01a-bag-drawer", { full: false });
  await buyer.keyboard.press("Escape");
  await buyer.goto(`${WEB}/search?department=fashion&sort=newest`);
  await buyer.getByRole("button", { name: "Add to bag" }).first().click();
  await buyer.getByRole("dialog", { name: "Your bag" }).waitFor();
  await shoot(buyer, "flow-01b-bag-two-sellers", { full: false });
  await buyer.getByRole("button", { name: /send order request/i }).click();
  await buyer.waitForURL(/\/checkout/);
  await buyer.fill('input[name="phone"]', "0801 234 5678");
  await buyer.fill('input[name="address"]', "12 Adeola Odeku Street, Victoria Island");
  await shoot(buyer, "flow-01c-checkout-details");
  await buyer.getByRole("button", { name: /continue to review/i }).click();
  await buyer.getByRole("heading", { name: /check your request/i }).waitFor();
  await shoot(buyer, "flow-01d-checkout-review");
  await buyer.getByRole("button", { name: /send requests?$/i }).click();
  await buyer.waitForURL(/\/orders\/sent/, { timeout: 15000 });
  await buyer.getByText(/sent to/i).first().waitFor();
  await shoot(buyer, "flow-01e-request-sent");
  await buyer.goto(`${WEB}/orders`);
  await shoot(buyer, "flow-01f-my-orders");
  await buyer.goto(`${WEB}/account`);
  await shoot(buyer, "flow-01h-buyer-account");
  await buyer.goto(`${WEB}/seller/setup`);
  await buyer.getByText("Business store").first().waitFor();
  await shoot(buyer, "flow-01g-sell-plans");

  await buyer.goto(`${WEB}/listing/${listingId}`);
  await buyer.getByRole("button", { name: /message seller/i }).first().click();
  await buyer.waitForTimeout(300);
  await shoot(buyer, "flow-02-message-sheet", { full: false });
  await buyer.getByRole("button", { name: /^send/i }).first().click();
  await buyer.waitForURL(/\/messages\//, { timeout: 15000 });
  await shoot(buyer, "flow-03-buyer-chat", { full: false });

  const sellerCtx = await browser.newContext({ viewport: phone });
  const seller = await sellerCtx.newPage();
  watch(seller, "seller");
  await seller.goto(`${WEB}/login`);
  await seller.fill('input[name="email"]', "gadgetcorner@seed.droba.ng");
  await seller.fill('input[name="password"]', "droba-demo-123");
  await seller.click('button[type="submit"]');
  await seller.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
  await shoot(seller, "flow-04-seller-dashboard");
  await seller.goto(`${WEB}/messages`);
  await shoot(seller, "flow-05-seller-inbox", { full: false });
  await seller.locator("a[href^='/messages/']").first().click();
  await seller.waitForURL(/\/messages\//);
  const reply = `Yes it's available ${Date.now() % 1000}`;
  await seller.fill("textarea", reply);
  await seller.keyboard.press("Enter");
  // the buyer's open chat should show it without a reload
  await buyer.getByText(reply).waitFor({ timeout: 8000 }).catch(() => problems.push("realtime: buyer did not receive the seller's reply"));
  await shoot(buyer, "flow-06-buyer-received-live", { full: false });
  await shoot(seller, "flow-07-seller-chat", { full: false });

  // Buyer rates the seller from the chat
  await buyer.getByRole("button", { name: /^rate$/i }).click();
  await buyer.getByRole("radio", { name: "5 stars" }).click();
  await buyer.getByPlaceholder(/was it as described/i).fill("Exactly as described. Smooth handover.");
  await buyer.getByRole("button", { name: /submit rating/i }).click();
  await buyer.getByText(/thanks for rating/i).waitFor({ timeout: 8000 }).catch(() => problems.push("rating: no confirmation"));
  await shoot(buyer, "flow-07b-rated", { full: false });

  // Buyer reports a listing
  await buyer.goto(`${WEB}/listing/${listingId}`);
  await buyer.getByRole("button", { name: /report this listing/i }).click();
  await buyer.getByRole("radio", { name: /scam or fraud/i }).click();
  await shoot(buyer, "flow-07c-report-sheet", { full: false });
  await buyer.getByRole("button", { name: /send report/i }).click();
  await buyer.getByText(/thanks for telling us/i).waitFor({ timeout: 8000 }).catch(() => problems.push("report: no confirmation"));
  await shoot(buyer, "flow-07d-report-sent", { full: false });
  await buyer.getByRole("button", { name: /^done$/i }).click();

  // The bag follows the buyer to another device
  await buyer.goto(`${WEB}/search?department=fashion&sort=newest`);
  await buyer.getByRole("button", { name: "Add to bag" }).first().click();
  await buyer.getByRole("dialog", { name: "Your bag" }).waitFor();
  await buyer.waitForLoadState("networkidle").catch(() => {});
  await buyer.waitForTimeout(500);
  const laptopCtx = await browser.newContext({ viewport: sizes.desktop });
  const laptop = await laptopCtx.newPage();
  watch(laptop, "buyer-laptop");
  await laptop.goto(`${WEB}/login`);
  await laptop.fill('input[name="email"]', "buyer@droba.ng");
  await laptop.fill('input[name="password"]', "droba-demo-123");
  await laptop.click('button[type="submit"]');
  await laptop.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
  await laptop.getByRole("button", { name: /your bag, 1 items/i }).first().waitFor({ timeout: 8000 }).catch(() => problems.push("bag: not synced to the buyer's other device"));
  await laptop.getByRole("button", { name: /your bag, 1 items/i }).first().click().catch(() => {});
  await shoot(laptop, "flow-07e-bag-on-laptop", { full: false });
  await laptopCtx.close();

  await seller.goto(`${WEB}/sell`);
  await shoot(seller, "flow-08-sell-form");
  await seller.goto(`${WEB}/studio/orders`);
  await seller.getByRole("button", { name: /^confirm$/i }).first().click().catch(() => problems.push("orders: no Confirm button for the seller"));
  await seller.waitForTimeout(600);
  await shoot(seller, "flow-08b-seller-orders");
  await seller.goto(`${WEB}/studio`);
  await shoot(seller, "flow-09-studio");

  // Settings must actually save
  const saves = async (page, label, path, fill) => {
    await page.goto(`${WEB}${path}`);
    await fill(page);
    await page.getByRole("button", { name: /^save$/i }).first().click();
    await page.getByText("Saved", { exact: true }).first().waitFor({ timeout: 8000 }).catch(() => problems.push(`${label}: Save did not confirm`));
    await shoot(page, `flow-10-${label}`);
  };
  await saves(seller, "seller-account", "/account", (p) => p.fill('input[name="name"]', "Gadget Corner Ltd"));
  await saves(seller, "seller-storefront", "/studio/storefront", (p) => p.fill("textarea", "Tokunbo and Nigerian-used phones and laptops. Tested before you pay."));
  await saves(buyer, "buyer-account", "/account", (p) => p.fill('input[name="phone"]', "0803 555 0101"));

  // Seller Studio on a laptop
  const deskCtx = await browser.newContext({ viewport: sizes.desktop });
  const desk = await deskCtx.newPage();
  watch(desk, "studio-desktop");
  await desk.goto(`${WEB}/login`);
  await desk.fill('input[name="email"]', "luxecloset@seed.droba.ng");
  await desk.fill('input[name="password"]', "droba-demo-123");
  await desk.click('button[type="submit"]');
  await desk.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
  for (const [name, path] of [["overview", "/studio"], ["orders", "/studio/orders"], ["listings", "/studio/listings"], ["analytics", "/studio/analytics"], ["new", "/studio/new"], ["promote", "/studio/promote"], ["storefront", "/studio/storefront"], ["plan", "/studio/plan"], ["account", "/account"]]) {
    current = `studio-${name}`;
    await desk.goto(`${WEB}${path}`);
    if (name === "analytics") await desk.getByText("Views per day").waitFor({ timeout: 8000 }).catch(() => problems.push("analytics: chart did not load"));
    await shoot(desk, `desktop-studio-${name}`);
  }
  // Analytics: 90 days with hover read-out
  current = "studio-analytics-90";
  await desk.goto(`${WEB}/studio/analytics`);
  await desk.getByRole("button", { name: "90 days" }).click();
  await desk.waitForTimeout(800);
  const chart = desk.locator("svg[role=img]").first();
  const box = await chart.boundingBox();
  if (box) await desk.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await shoot(desk, "desktop-studio-analytics-90", { full: false });
  // Business campaign: boost a whole category for one credit
  current = "studio-campaign";
  await desk.goto(`${WEB}/studio/promote`);
  await desk.getByRole("radio", { name: /a category/i }).click();
  await desk.getByRole("button", { name: /start campaign/i }).click();
  await desk.getByText(/is live:/i).waitFor({ timeout: 8000 }).catch(() => problems.push("campaign: did not start"));
  await shoot(desk, "desktop-studio-campaign");
  await deskCtx.close();

  // Admin area
  const adminCtx = await browser.newContext({ viewport: sizes.desktop });
  const admin = await adminCtx.newPage();
  watch(admin, "admin");
  await admin.goto(`${WEB}/login`);
  await admin.fill('input[name="email"]', "admin@droba.ng");
  await admin.fill('input[name="password"]', "droba-demo-123");
  await admin.click('button[type="submit"]');
  await admin.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
  for (const [name, path] of [["overview", "/admin"], ["reports", "/admin/reports"], ["verifications", "/admin/verifications"], ["users", "/admin/users"], ["listings", "/admin/listings"]]) {
    current = `admin-${name}`;
    await admin.goto(`${WEB}${path}`);
    await shoot(admin, `desktop-admin-${name}`);
  }
  current = "admin-actions";
  await admin.goto(`${WEB}/admin/verifications`);
  await admin.getByRole("button", { name: /verify store/i }).first().click();
  await admin.getByText(/no stores waiting/i).waitFor({ timeout: 8000 }).catch(() => problems.push("admin: verification did not go through"));
  await admin.goto(`${WEB}/admin/reports`);
  await admin.getByRole("button", { name: /^dismiss$/i }).first().click();
  await admin.getByPlaceholder(/why \(optional\)/i).fill("Checked the chat, no problem found");
  await admin.getByRole("button", { name: /^dismiss$/i }).first().click();
  await admin.waitForTimeout(800);
  await admin.goto(`${WEB}/admin`);
  await admin.getByText(/dismissed a report/i).waitFor({ timeout: 8000 }).catch(() => problems.push("admin: action log missing"));
  await shoot(admin, "desktop-admin-after");
  await admin.setViewportSize(sizes.phone);
  await admin.goto(`${WEB}/admin/reports`);
  await shoot(admin, "phone-admin-reports");
  await adminCtx.close();

  await buyerCtx.close();
  await sellerCtx.close();
} catch (e) {
  problems.push(`script error: ${e?.stack ?? e}`);
} finally {
  await browser.close();
}

writeFileSync(`${DIR}/problems.txt`, problems.join("\n") || "none");
console.log(problems.length ? `PROBLEMS:\n${problems.join("\n")}` : "screens ok");
process.exit(problems.length ? 1 : 0);
