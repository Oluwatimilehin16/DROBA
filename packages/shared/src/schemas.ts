/* Request validation shared by API (enforced) and web (form hints). */
import { z } from "zod";
import { ALL_CATEGORIES, CITY_NAMES, CONDITIONS, DELIVERY_METHODS, DEPARTMENT_IDS, GENDERS, LIMITS, MODES, ORDER_ACTIONS, ORIGINS, RESERVED_HANDLES, STORE_PLANS, SELLER_TYPES, LISTING_STATUSES } from "./constants.js";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
const password = z.string().min(8, "Use at least 8 characters").max(128);
/** Nigerian phone in local (0803…) or international (+234803…) form, normalised to +234XXXXXXXXXX */
export const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+?234|0)?[789][01]\d{8}$/.test(v), "Enter a valid Nigerian phone number")
  .transform((v) => "+234" + v.replace(/^(\+?234|0)/, ""));

export const latLng = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email,
  password,
  phone: phone.optional(),
  city: z.enum(CITY_NAMES).optional(),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password").max(128) });
export type LoginInput = z.infer<typeof loginSchema>;

export const tokenSchema = z.object({ token: z.string().min(16).max(256) });
export const emailOnlySchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(16).max(256), password });

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: phone.nullable(),
    city: z.enum(CITY_NAMES).nullable(),
    location: latLng.nullable(),
  })
  .partial();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const switchModeSchema = z.object({ mode: z.enum(MODES) });

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters")
  .max(30)
  .regex(/^[a-z0-9]+$/, "Letters and numbers only")
  .refine((h) => !(RESERVED_HANDLES as readonly string[]).includes(h), "That link is reserved");

export const createSellerSchema = z
  .object({
    type: z.enum(SELLER_TYPES),
    storeName: z.string().trim().min(2).max(60).optional(),
    handle: handleSchema.optional(),
    plan: z.enum(STORE_PLANS).default("FREE"),
    city: z.enum(CITY_NAMES),
    area: z.string().trim().max(60).optional(),
    phone: phone.optional(),
    bio: z.string().trim().max(240).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "STORE") {
      if (!v.storeName) ctx.addIssue({ code: "custom", path: ["storeName"], message: "Give your store a name" });
      if (!v.handle) ctx.addIssue({ code: "custom", path: ["handle"], message: "Choose a store link" });
      if (v.plan === "FREE") ctx.addIssue({ code: "custom", path: ["plan"], message: "Stores need the Premium or Business plan" });
    } else if (v.plan !== "FREE") {
      ctx.addIssue({ code: "custom", path: ["plan"], message: "Individual sellers use the Free plan" });
    }
  });
export type CreateSellerInput = z.infer<typeof createSellerSchema>;

export const updateSellerSchema = z
  .object({
    storeName: z.string().trim().min(2).max(60),
    handle: handleSchema,
    city: z.enum(CITY_NAMES),
    area: z.string().trim().max(60).nullable(),
    phone: phone.nullable(),
    bio: z.string().trim().max(240).nullable(),
    bannerUrl: z.string().url().nullable(),
    logoUrl: z.string().url().nullable(),
  })
  .partial();
export type UpdateSellerInput = z.infer<typeof updateSellerSchema>;

export const changePlanSchema = z.object({ plan: z.enum(STORE_PLANS) });

const photo = z.object({ url: z.string().url().max(1000), label: z.string().trim().max(30).optional() });

export const listingBaseSchema = z.object({
  title: z.string().trim().min(3, "Add a title").max(LIMITS.titleMax),
  description: z.string().trim().max(LIMITS.descriptionMax).default(""),
  price: z.coerce.number().int("Whole naira only").min(100, "Price must be at least ₦100").max(500_000_000),
  category: z.string().refine((c) => ALL_CATEGORIES.includes(c), "Choose a category"),
  condition: z.enum(CONDITIONS),
  brand: z.string().trim().max(60).optional(),
  size: z.string().trim().max(40).optional(),
  color: z.string().trim().max(30).optional(),
  gender: z.enum(GENDERS).optional(),
  origin: z.enum(ORIGINS).optional(),
  tested: z.boolean().optional(),
  extra: z.boolean().optional(),
  flaws: z.array(z.string().trim().max(40)).max(10).default([]),
  specs: z.array(z.tuple([z.string().trim().max(40), z.string().trim().max(80)])).max(12).default([]),
  photos: z.array(photo).min(1, "Add at least one photo").max(LIMITS.maxPhotosAbsolute),
  city: z.enum(CITY_NAMES).optional(),
  area: z.string().trim().max(60).optional(),
  location: latLng.optional(),
  openToOffers: z.boolean().default(true),
  canDeliver: z.boolean().default(true),
  allowPickup: z.boolean().default(true),
  status: z.enum(["DRAFT", "ACTIVE"]).default("ACTIVE"),
});
export const createListingSchema = listingBaseSchema;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export const updateListingSchema = listingBaseSchema.partial().extend({ status: z.enum(LISTING_STATUSES).optional() });
export type UpdateListingInput = z.infer<typeof updateListingSchema>;

const csv = <T extends [string, ...string[]]>(values: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.enum(values)));

export const SORTS = ["relevance", "newest", "popular", "price_asc", "price_desc", "distance"] as const;
export const searchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  /** One department, or several comma-separated (the For You feed passes the shopper's interests) */
  department: csv(DEPARTMENT_IDS as unknown as [string, ...string[]]).optional(),
  category: z.string().max(60).optional(),
  condition: csv(CONDITIONS as unknown as [string, ...string[]]).optional(),
  gender: z.enum(GENDERS).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  city: z.enum(CITY_NAMES).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(LIMITS.radiusKmMax).optional(),
  sellerType: z.enum(SELLER_TYPES).optional(),
  verified: z.coerce.boolean().optional(),
  tested: z.coerce.boolean().optional(),
  sellerId: z.string().max(40).optional(),
  sort: z.enum(SORTS).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(24),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const startConversationSchema = z.object({
  listingId: z.string().min(1).max(40),
  message: z.string().trim().min(1, "Write a message").max(LIMITS.messageMax),
});
export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(LIMITS.messageMax),
  /** Client-generated id so retries never create duplicates */
  clientId: z.string().max(64).optional(),
});

export const ratingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
  listingId: z.string().max(40).optional(),
});

export const presignSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().min(1).max(8 * 1024 * 1024, "Photos must be under 8MB"),
});

/** Checkout: one request per seller is created from the bag */
export const createOrderSchema = z
  .object({
    listingIds: z.array(z.string().min(1).max(40)).min(1, "Your bag is empty").max(30),
    deliveryMethod: z.enum(DELIVERY_METHODS),
    name: z.string().trim().min(2, "Enter your name").max(80),
    phone,
    address: z.string().trim().max(200).optional(),
    city: z.enum(CITY_NAMES),
    note: z.string().trim().max(300).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.deliveryMethod === "DELIVERY" && (!v.address || v.address.length < 5)) ctx.addIssue({ code: "custom", path: ["address"], message: "Enter the delivery address" });
  });
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderActionSchema = z.object({ action: z.enum(ORDER_ACTIONS), reason: z.string().trim().max(200).optional() });
