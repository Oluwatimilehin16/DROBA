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

async function shoot(page, name, { full = true } = {}) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: full });
}

function watch(page, label) {
  page.on("pageerror", (e) => problems.push(`[${label}] page error: ${e.message}`));
  // 401s are expected: the app checks for a session on every page load while signed out
  page.on("console", (m) => m.type() === "error" && !/401/.test(m.text()) && problems.push(`[${label}] console: ${m.text()}`));
  page.on("response", (r) => r.status() >= 500 && problems.push(`[${label}] ${r.status()} ${r.url()}`));
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
    ];
    for (const [name, path] of pages) {
      const res = await page.goto(WEB + path, { waitUntil: "domcontentloaded" });
      if (!res || (res.status() >= 400 && name !== "not-found")) problems.push(`[${size}] ${path} → ${res?.status()}`);
      await shoot(page, `${size}-${name}`);
    }
    await ctx.close();
  }

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

  await seller.goto(`${WEB}/sell`);
  await shoot(seller, "flow-08-sell-form");
  await seller.goto(`${WEB}/dashboard`);
  await shoot(seller, "flow-09-dashboard");

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
