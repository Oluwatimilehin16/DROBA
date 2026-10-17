-- Launch readiness: admin & reports, store verification, analytics, campaigns, synced bag, business details.
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "VerificationStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ReportReason" AS ENUM ('SCAM', 'PROHIBITED', 'MISLEADING', 'COUNTERFEIT', 'OFFENSIVE', 'SPAM', 'OTHER');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');
CREATE TYPE "CampaignKind" AS ENUM ('NEW_ARRIVALS', 'CATEGORY', 'UNDER_PRICE', 'PICKED');

ALTER TABLE "users"
  ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER',
  ADD COLUMN "suspended_at" TIMESTAMP(3),
  ADD COLUMN "suspended_reason" TEXT;

ALTER TABLE "sellers"
  ADD COLUMN "suspended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "verification_status" "VerificationStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "verification_note" TEXT,
  ADD COLUMN "verification_reply" TEXT,
  ADD COLUMN "verification_requested_at" TIMESTAMP(3),
  ADD COLUMN "shop_address" TEXT,
  ADD COLUMN "opening_hours" TEXT,
  ADD COLUMN "delivery_areas" TEXT,
  ADD COLUMN "store_policy" TEXT;
UPDATE "sellers" SET "verification_status" = 'APPROVED' WHERE "verified";
-- Paid stores need a date for their monthly boost top-up
UPDATE "sellers" SET "plan_renews_at" = now() + interval '30 days' WHERE "plan" <> 'FREE' AND "plan_renews_at" IS NULL;

ALTER TABLE "listings" ADD COLUMN "removed_reason" TEXT;

CREATE TABLE "listing_stats_daily" (
    "listing_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "listing_stats_daily_pkey" PRIMARY KEY ("listing_id", "day")
);
CREATE INDEX "listing_stats_daily_seller_id_day_idx" ON "listing_stats_daily"("seller_id", "day");
ALTER TABLE "listing_stats_daily" ADD CONSTRAINT "listing_stats_daily_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_stats_daily" ADD CONSTRAINT "listing_stats_daily_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "listing_id" TEXT,
    "seller_id" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolved_by_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at" DESC);
CREATE INDEX "reports_seller_id_idx" ON "reports"("seller_id");
CREATE INDEX "reports_listing_id_idx" ON "reports"("listing_id");
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "kind" "CampaignKind" NOT NULL,
    "label" TEXT NOT NULL,
    "listing_count" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "campaigns_seller_id_created_at_idx" ON "campaigns"("seller_id", "created_at" DESC);
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "bag_items" (
    "user_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bag_items_pkey" PRIMARY KEY ("user_id", "listing_id")
);
ALTER TABLE "bag_items" ADD CONSTRAINT "bag_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bag_items" ADD CONSTRAINT "bag_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "admin_actions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "admin_actions_created_at_idx" ON "admin_actions"("created_at" DESC);
