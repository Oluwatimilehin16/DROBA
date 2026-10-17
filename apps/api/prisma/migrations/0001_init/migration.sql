-- Droba initial schema. Hand-written so PostGIS and full-text search are first-class:
--   * listings.location / users.location are geography points GENERATED from lat/lng (GiST indexed)
--   * listings.search_vector is a GENERATED weighted tsvector (GIN indexed)
--   * pg_trgm index on title for typo-tolerant search ("iphnoe" still finds "iPhone")

CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums
CREATE TYPE "Mode" AS ENUM ('BUYER', 'SELLER');
CREATE TYPE "SellerType" AS ENUM ('INDIVIDUAL', 'STORE');
CREATE TYPE "StorePlan" AS ENUM ('FREE', 'PREMIUM', 'BUSINESS');
CREATE TYPE "Condition" AS ENUM ('LIKE_NEW', 'FIRST_GRADE', 'FAIRLY_USED', 'FAIR');
CREATE TYPE "Gender" AS ENUM ('WOMEN', 'MEN', 'UNISEX');
CREATE TYPE "Origin" AS ENUM ('TOKUNBO', 'NIGERIAN_USED');
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD', 'REMOVED');
CREATE TYPE "EmailTokenType" AS ENUM ('VERIFY', 'RESET');

-- Users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "location" geography(Point, 4326) GENERATED ALWAYS AS (
        CASE WHEN "lat" IS NULL OR "lng" IS NULL THEN NULL
             ELSE ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography END
    ) STORED,
    "email_verified_at" TIMESTAMP(3),
    "active_mode" "Mode" NOT NULL DEFAULT 'BUYER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Sessions (refresh tokens, rotated)
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- Email verification / password reset tokens
CREATE TABLE "email_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "EmailTokenType" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_tokens_token_hash_key" ON "email_tokens"("token_hash");
CREATE INDEX "email_tokens_user_id_type_idx" ON "email_tokens"("user_id", "type");

-- Sellers (one per user; individual or store)
CREATE TABLE "sellers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "SellerType" NOT NULL,
    "plan" "StorePlan" NOT NULL DEFAULT 'FREE',
    "display_name" TEXT NOT NULL,
    "handle" TEXT,
    "city" TEXT NOT NULL,
    "area" TEXT,
    "phone" TEXT,
    "bio" TEXT,
    "logo_url" TEXT,
    "banner_url" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "boost_credits" INTEGER NOT NULL DEFAULT 0,
    "plan_renews_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sellers_user_id_key" ON "sellers"("user_id");
CREATE UNIQUE INDEX "sellers_handle_key" ON "sellers"("handle");

-- Listings
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "condition" "Condition" NOT NULL,
    "brand" TEXT,
    "size" TEXT,
    "color" TEXT,
    "gender" "Gender",
    "origin" "Origin",
    "tested" BOOLEAN NOT NULL DEFAULT false,
    "extra" BOOLEAN NOT NULL DEFAULT false,
    "flaws" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specs" JSONB NOT NULL DEFAULT '[]',
    "photos" JSONB NOT NULL DEFAULT '[]',
    "city" TEXT NOT NULL,
    "area" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "location" geography(Point, 4326) GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography
    ) STORED,
    "search_vector" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('english', coalesce("brand", '') || ' ' || coalesce("category", '')), 'B') ||
        setweight(to_tsvector('english', coalesce("description", '')), 'C')
    ) STORED,
    "open_to_offers" BOOLEAN NOT NULL DEFAULT true,
    "can_deliver" BOOLEAN NOT NULL DEFAULT true,
    "allow_pickup" BOOLEAN NOT NULL DEFAULT true,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "boosted_until" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "saves_count" INTEGER NOT NULL DEFAULT 0,
    "sold_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "listings_status_created_at_idx" ON "listings"("status", "created_at" DESC);
CREATE INDEX "listings_seller_id_status_idx" ON "listings"("seller_id", "status");
CREATE INDEX "listings_category_status_idx" ON "listings"("category", "status");
CREATE INDEX "listings_department_status_idx" ON "listings"("department", "status");
-- Not modelled in Prisma (raw-SQL search only)
CREATE INDEX "listings_location_gist" ON "listings" USING GIST ("location");
CREATE INDEX "listings_search_vector_gin" ON "listings" USING GIN ("search_vector");
CREATE INDEX "listings_title_trgm" ON "listings" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "listings_active_price_idx" ON "listings"("price") WHERE "status" = 'ACTIVE';

-- Saves
CREATE TABLE "saves" (
    "user_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saves_pkey" PRIMARY KEY ("user_id", "listing_id")
);
CREATE INDEX "saves_listing_id_idx" ON "saves"("listing_id");

-- Follows
CREATE TABLE "follows" (
    "user_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follows_pkey" PRIMARY KEY ("user_id", "seller_id")
);
CREATE INDEX "follows_seller_id_idx" ON "follows"("seller_id");

-- Conversations
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT,
    "buyer_id" TEXT NOT NULL,
    "seller_user_id" TEXT NOT NULL,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_body" TEXT,
    "last_message_sender_id" TEXT,
    "buyer_last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seller_last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "conversations_listing_id_buyer_id_key" ON "conversations"("listing_id", "buyer_id");
CREATE INDEX "conversations_buyer_id_last_message_at_idx" ON "conversations"("buyer_id", "last_message_at" DESC);
CREATE INDEX "conversations_seller_user_id_last_message_at_idx" ON "conversations"("seller_user_id", "last_message_at" DESC);

-- Messages
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "client_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "messages_sender_id_client_id_key" ON "messages"("sender_id", "client_id");
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at" DESC);

-- Ratings
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "rater_id" TEXT NOT NULL,
    "listing_id" TEXT,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ratings_stars_check" CHECK ("stars" BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX "ratings_seller_id_rater_id_key" ON "ratings"("seller_id", "rater_id");
CREATE INDEX "ratings_seller_id_created_at_idx" ON "ratings"("seller_id", "created_at" DESC);

-- Foreign keys
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saves" ADD CONSTRAINT "saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saves" ADD CONSTRAINT "saves_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follows" ADD CONSTRAINT "follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follows" ADD CONSTRAINT "follows_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rater_id_fkey" FOREIGN KEY ("rater_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
