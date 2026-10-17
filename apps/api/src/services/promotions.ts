import type { Campaign, Prisma, Seller } from "@prisma/client";
import { CAMPAIGN_INFO, CAMPAIGN_MAX_ITEMS, PLAN_RULES, type CampaignDTO, type CampaignInput } from "@droba/shared";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { naira } from "../lib/format.js";
import { badRequest, forbidden } from "../lib/errors.js";
import { bumpListingsVersion, invalidate, keys } from "../lib/cache.js";

/* Boost credits and Business campaigns.
   Paid stores get their plan's credits topped up once a month on their renewal date (unused credits
   carry over, up to the plan's amount). When card billing is added, the payment provider's renewal
   webhook should call topUpSeller() instead of the timer below. */

const PLAN_CREDITS = (plan: Seller["plan"]) => PLAN_RULES[plan].boostCredits;

/** Top up every paid store whose renewal date has passed, and move the date on by whole months. */
export async function topUpCredits(): Promise<number> {
  return prisma.$executeRaw`
    UPDATE sellers SET
      boost_credits = GREATEST(boost_credits, CASE plan WHEN 'BUSINESS' THEN ${PLAN_CREDITS("BUSINESS")}::int WHEN 'PREMIUM' THEN ${PLAN_CREDITS("PREMIUM")}::int ELSE 0 END),
      plan_renews_at = plan_renews_at + make_interval(days => 30 * (floor(extract(epoch FROM (now() - plan_renews_at)) / 2592000)::int + 1)),
      updated_at = now()
    WHERE plan <> 'FREE' AND plan_renews_at IS NOT NULL AND plan_renews_at <= now()`;
}

/** Background jobs for one API process. A Redis lock makes sure only one instance runs each tick. */
export function startJobs() {
  const tick = async () => {
    const lock = await redis.set("job:topup", "1", "EX", 240, "NX").catch(() => null);
    if (lock !== "OK") return;
    const n = await topUpCredits();
    if (n) logger.info({ sellers: n }, "monthly boost credits topped up");
  };
  const run = () => void tick().catch((err) => logger.warn({ err }, "credit top-up failed"));
  run();
  const t = setInterval(run, 5 * 60_000);
  t.unref();
  return () => clearInterval(t);
}

export function campaignDTO(c: Campaign): CampaignDTO {
  return { id: c.id, kind: c.kind, label: c.label, listingCount: c.listingCount, days: c.days, endsAt: c.endsAt.toISOString(), createdAt: c.createdAt.toISOString(), active: c.endsAt.getTime() > Date.now() };
}

/** Business stores: boost a whole group of listings for one credit */
export async function createCampaign(seller: Seller, input: CampaignInput): Promise<CampaignDTO> {
  if (!PLAN_RULES[seller.plan].campaigns) throw forbidden("Campaigns come with a Business store");
  const where: Prisma.ListingWhereInput = { sellerId: seller.id, status: "ACTIVE" };
  let label: string = CAMPAIGN_INFO[input.kind].label;
  switch (input.kind) {
    case "NEW_ARRIVALS":
      where.createdAt = { gte: new Date(Date.now() - 14 * 86400_000) };
      break;
    case "CATEGORY":
      where.category = input.category!;
      label = input.category!;
      break;
    case "UNDER_PRICE":
      where.price = { lte: input.maxPrice! };
      label = `Under ${naira(input.maxPrice!)}`;
      break;
    case "PICKED":
      where.id = { in: input.listingIds! };
      break;
  }
  const targets = await prisma.listing.findMany({ where, select: { id: true, boostedUntil: true }, orderBy: { createdAt: "desc" }, take: CAMPAIGN_MAX_ITEMS });
  if (!targets.length) throw badRequest("None of your live listings match that. Try another group.", { campaign: "No matching listings" });
  if (input.kind === "PICKED") label = `${targets.length} picked item${targets.length === 1 ? "" : "s"}`;

  const spent = await prisma.seller.updateMany({ where: { id: seller.id, boostCredits: { gte: 1 } }, data: { boostCredits: { decrement: 1 } } });
  if (spent.count === 0) throw badRequest("You have no boost credits left this month", { campaign: "No credits left" });

  const now = Date.now();
  const ms = input.days * 86400_000;
  const campaign = await prisma.$transaction(async (tx) => {
    for (const t of targets) await tx.listing.update({ where: { id: t.id }, data: { boostedUntil: new Date(Math.max(now, t.boostedUntil?.getTime() ?? 0) + ms) } });
    return tx.campaign.create({ data: { sellerId: seller.id, kind: input.kind, label, listingCount: targets.length, days: input.days, endsAt: new Date(now + ms) } });
  });
  await Promise.all([invalidate(...targets.map((t) => keys.listing(t.id)), keys.seller(seller.id), ...(seller.handle ? [keys.store(seller.handle)] : [])), bumpListingsVersion()]);
  return campaignDTO(campaign);
}

export async function listCampaigns(sellerId: string) {
  const rows = await prisma.campaign.findMany({ where: { sellerId }, orderBy: { createdAt: "desc" }, take: 20 });
  return rows.map(campaignDTO);
}
