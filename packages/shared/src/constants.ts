/* Product constants shared by the API and the web app.
   Changing a category or grade here changes it everywhere. */

export type DeptKind = "fashion" | "tech" | "goods";

export interface Department {
  id: string;
  label: string;
  icon: string;
  kind: DeptKind;
  blurb: string;
  categories: readonly string[];
  /** Labels for the two spec fields on non-fashion listings */
  specLabels?: readonly [string, string];
  sizeHint?: string;
}

export const DEPARTMENTS = [
  { id: "fashion", label: "Fashion", icon: "hanger", kind: "fashion", blurb: "Clothes, shoes, bags & watches", categories: ["Dresses", "Tops", "Shirts", "Jackets", "Jeans", "Shoes", "Sneakers", "Bags", "Watches & jewellery"] },
  { id: "phones", label: "Phones & Tablets", icon: "phone", kind: "tech", blurb: "Phones, tablets & smartwatches", categories: ["Phones", "Tablets", "Smartwatches", "Phone accessories"], specLabels: ["Storage / RAM", "Battery health (%)"], sizeHint: "e.g. 128GB" },
  { id: "computers", label: "Computers", icon: "laptop", kind: "tech", blurb: "Laptops, desktops & printers", categories: ["Laptops", "Desktops & monitors", "Printers", "Computer accessories"], specLabels: ["Processor", "RAM / storage"], sizeHint: "e.g. 16GB / 512GB" },
  { id: "tv-audio-gaming", label: "TV, Audio & Gaming", icon: "gamepad", kind: "tech", blurb: "TVs, speakers, consoles & cameras", categories: ["TVs", "Audio", "Gaming", "Cameras"], specLabels: ["Model", "What's included"], sizeHint: "e.g. 55 inch, 1TB" },
  { id: "appliances", label: "Appliances", icon: "fridge", kind: "tech", blurb: "Fridges, washers, kitchen & power", categories: ["Fridges", "Washing machines", "Kitchen appliances", "Fans & ACs", "Generators & solar"], specLabels: ["Capacity / size", "Power (W, V or KVA)"], sizeHint: "e.g. 450 L, 3.5 KVA" },
  { id: "furniture", label: "Furniture", icon: "sofa", kind: "goods", blurb: "Sofas, beds, tables & storage", categories: ["Sofas", "Chairs", "Tables", "Beds & mattresses", "Wardrobes & storage"], specLabels: ["Width (cm)", "Height (cm)"], sizeHint: "e.g. 3-seater" },
  { id: "home-kitchen", label: "Home & Kitchen", icon: "lamp", kind: "goods", blurb: "Decor, lighting & cookware", categories: ["Home decor", "Lighting", "Cookware", "Bedding & curtains"], specLabels: ["Dimensions", "Material"], sizeHint: "e.g. 5-piece set" },
  { id: "kids-baby", label: "Kids & Baby", icon: "baby", kind: "goods", blurb: "Strollers, toys & kids' clothes", categories: ["Strollers & car seats", "Toys", "Kids' clothing", "Baby gear"], specLabels: ["Age range", "Weight limit / size"], sizeHint: "e.g. 0–3 years" },
  { id: "sports-fitness", label: "Sports & Fitness", icon: "dumbbell", kind: "goods", blurb: "Gym gear, bikes & sports kit", categories: ["Gym equipment", "Bicycles", "Sports gear"], specLabels: ["Weight / size", "Model"], sizeHint: "e.g. 2 × 10 kg" },
  { id: "books-hobbies", label: "Books & Hobbies", icon: "book", kind: "goods", blurb: "Books, instruments & collectibles", categories: ["Books", "Musical instruments", "Art & collectibles"], specLabels: ["Author / maker", "Edition / model"], sizeHint: "e.g. 10 paperbacks" },
  { id: "beauty-wellness", label: "Beauty & Wellness", icon: "drop", kind: "tech", blurb: "Hair tools & wellness devices", categories: ["Hair & beauty tools", "Wellness devices"], specLabels: ["Model", "Power (W)"], sizeHint: "e.g. 2000W" },
  { id: "vehicles", label: "Vehicles & Parts", icon: "car", kind: "tech", blurb: "Cars, motorcycles & parts", categories: ["Cars", "Motorcycles", "Parts & accessories"], specLabels: ["Year", "Mileage (km)"], sizeHint: "e.g. Automatic, 1.8L" },
] as const satisfies readonly Department[];

export type DepartmentId = (typeof DEPARTMENTS)[number]["id"];
export const DEPARTMENT_IDS = DEPARTMENTS.map((d) => d.id) as [DepartmentId, ...DepartmentId[]];
export const ALL_CATEGORIES: string[] = DEPARTMENTS.flatMap((d) => [...d.categories]);

export function departmentOf(category: string): Department | undefined {
  return DEPARTMENTS.find((d) => (d.categories as readonly string[]).includes(category));
}
export function departmentById(id: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.id === id);
}

export const CONDITIONS = ["LIKE_NEW", "FIRST_GRADE", "FAIRLY_USED", "FAIR"] as const;
export type Condition = (typeof CONDITIONS)[number];
export const CONDITION_INFO: Record<Condition, { label: string; bars: number; description: string }> = {
  LIKE_NEW: { label: "Like New", bars: 4, description: "Used briefly. No visible signs of use. Original tags or box may be included." },
  FIRST_GRADE: { label: "First Grade", bars: 3, description: "Gently used and well kept. Only tiny signs of use up close." },
  FAIRLY_USED: { label: "Fairly Used", bars: 2, description: "Used regularly. Light wear such as small scratches or fading. Works as it should." },
  FAIR: { label: "Fair", bars: 1, description: "Visible wear and priced to match. Still usable." },
};

export const GENDERS = ["WOMEN", "MEN", "UNISEX"] as const;
export type Gender = (typeof GENDERS)[number];

export const ORIGINS = ["TOKUNBO", "NIGERIAN_USED"] as const;
export type Origin = (typeof ORIGINS)[number];

export const SELLER_TYPES = ["INDIVIDUAL", "STORE"] as const;
export type SellerType = (typeof SELLER_TYPES)[number];

export const STORE_PLANS = ["FREE", "PREMIUM", "BUSINESS"] as const;
export type StorePlan = (typeof STORE_PLANS)[number];

export interface PlanRule {
  label: string;
  priceNaira: number;
  photosPerListing: number;
  storefront: boolean;
  storeSearch: boolean;
  /** Topped up to this many every month (on the plan's renewal date) */
  boostCredits: number;
  /** How far back analytics go: 0 = no analytics page */
  analyticsDays: number;
  /** Category breakdown, where buyers are, and the views → requests funnel */
  advancedAnalytics: boolean;
  /** Boost a group of listings at once */
  campaigns: boolean;
  /** Opening hours, delivery areas, shop address and store policy on the storefront */
  businessDetails: boolean;
}

export const PLAN_RULES: Record<StorePlan, PlanRule> = {
  FREE: { label: "Free seller", priceNaira: 0, photosPerListing: 4, storefront: false, storeSearch: false, boostCredits: 0, analyticsDays: 0, advancedAnalytics: false, campaigns: false, businessDetails: false },
  PREMIUM: { label: "Premium store", priceNaira: 5000, photosPerListing: 10, storefront: true, storeSearch: false, boostCredits: 3, analyticsDays: 30, advancedAnalytics: false, campaigns: false, businessDetails: false },
  BUSINESS: { label: "Business store", priceNaira: 15000, photosPerListing: 15, storefront: true, storeSearch: true, boostCredits: 10, analyticsDays: 90, advancedAnalytics: true, campaigns: true, businessDetails: true },
};

/** The three selling options, worded exactly as on the pricing cards. Single source of truth for every plan picker. */
export const PLAN_DETAILS: Record<StorePlan, { label: string; priceNaira: number; blurb: string; tag?: string; features: string[] }> = {
  FREE: {
    label: "Free seller",
    priceNaira: 0,
    blurb: "Sell as much as you like. No store needed.",
    features: ["Unlimited listings", "4 photos per item", "Simple seller profile (no store page)", "Views and saves", "Pay per boost", "Standard search", "Buyer ratings on your profile", "Boost single items"],
  },
  PREMIUM: {
    label: "Premium store",
    priceNaira: 5000,
    blurb: "Your own store on Droba.",
    tag: "Most popular",
    features: ["Unlimited listings", "10 photos per item", "Custom storefront: banner, logo, bio and your own store link", "Detailed analytics", "3 boost credits / month", "Search visibility boost", "Verified Store badge (after review)", "Boost single items"],
  },
  BUSINESS: {
    label: "Business store",
    priceNaira: 15000,
    blurb: "For established businesses.",
    features: ["Unlimited listings", "15 photos per item", "Professional storefront with collections and in-store search", "Advanced analytics", "10 boost credits / month", "Priority placement in Trending, New In & Popular Stores", "Verified Business badge", "Campaigns by category, price or collection"],
  },
};

/** Paid boosts for any listing: [days, price in naira] */
export const BOOST_PRICES = [
  [3, 1500],
  [7, 3000],
  [14, 5000],
] as const;

export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const VERIFICATION_STATUSES = ["NONE", "PENDING", "APPROVED", "REJECTED"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const REPORT_REASONS = ["SCAM", "PROHIBITED", "MISLEADING", "COUNTERFEIT", "OFFENSIVE", "SPAM", "OTHER"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_REASON_INFO: Record<ReportReason, { label: string; hint: string }> = {
  SCAM: { label: "Scam or fraud", hint: "Asked for payment before delivery, fake item, or didn't show up" },
  PROHIBITED: { label: "Not allowed on Droba", hint: "Weapons, drugs, stolen goods, animals and so on" },
  MISLEADING: { label: "Not as described", hint: "Wrong photos, condition or price" },
  COUNTERFEIT: { label: "Fake or replica", hint: "Sold as an original brand but isn't" },
  OFFENSIVE: { label: "Offensive or abusive", hint: "Rude messages, hate, or harassment" },
  SPAM: { label: "Spam or duplicate", hint: "The same item posted many times, or an ad for something else" },
  OTHER: { label: "Something else", hint: "Tell us what happened" },
};
export const REPORT_STATUSES = ["OPEN", "RESOLVED", "DISMISSED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const REPORT_ACTIONS = ["dismiss", "resolve", "remove_listing", "suspend_seller"] as const;
export type ReportAction = (typeof REPORT_ACTIONS)[number];

export const CAMPAIGN_KINDS = ["NEW_ARRIVALS", "CATEGORY", "UNDER_PRICE", "PICKED"] as const;
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number];
export const CAMPAIGN_INFO: Record<CampaignKind, { label: string; blurb: string }> = {
  NEW_ARRIVALS: { label: "New arrivals", blurb: "Everything you listed in the last 14 days" },
  CATEGORY: { label: "A category", blurb: "All your items in one category, e.g. Phones" },
  UNDER_PRICE: { label: "Under a price", blurb: "Everything under an amount, e.g. under ₦50,000" },
  PICKED: { label: "Your own pick", blurb: "Choose the items yourself" },
};
/** How many listings one campaign can boost */
export const CAMPAIGN_MAX_ITEMS = 50;

/** What can't be sold on Droba. Shown on /prohibited, in the sell form, and used as the report reason "Not allowed". */
export const PROHIBITED_ITEMS: { group: string; items: string[] }[] = [
  { group: "Weapons and dangerous items", items: ["Guns, ammunition and parts", "Knives sold as weapons, machetes, tasers", "Explosives, fireworks and flammable chemicals"] },
  { group: "Drugs and medicine", items: ["Illegal drugs and anything used to take them", "Prescription medicine, codeine and tramadol", "Unregistered supplements and herbal cures"] },
  { group: "Stolen, fake or illegal goods", items: ["Anything stolen, or without proof of ownership when asked", "Fake or replica designer items sold as original", "Phones with a changed or blocked IMEI", "Vehicles without valid papers"] },
  { group: "People, animals and bodies", items: ["Live animals and wildlife products (ivory, skins)", "Human organs, blood, hair sold as body parts", "Services offering people for work, marriage or sex"] },
  { group: "Documents, money and accounts", items: ["ID cards, passports, certificates and licences", "Bank accounts, SIM cards registered to others, social media accounts", "Currency, crypto schemes, lottery and 'money doubling'"] },
  { group: "Adult and hateful content", items: ["Pornography and sexual services", "Items that promote hate or violence"] },
  { group: "Things that aren't pre-loved", items: ["Brand-new stock sold in bulk (Droba is for pre-owned items)", "Food, drinks and cosmetics that have been opened", "Used underwear and swimwear bottoms"] },
];

export const MODES = ["BUYER", "SELLER"] as const;
export type Mode = (typeof MODES)[number];

export const LISTING_STATUSES = ["DRAFT", "ACTIVE", "SOLD", "REMOVED"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "DECLINED", "CANCELLED", "DELIVERED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_INFO: Record<OrderStatus, { label: string; buyerLabel: string; tone: "warn" | "info" | "ok" | "muted" }> = {
  PENDING: { label: "New request", buyerLabel: "Waiting for seller", tone: "warn" },
  CONFIRMED: { label: "Confirmed", buyerLabel: "Seller confirmed", tone: "info" },
  DECLINED: { label: "Declined", buyerLabel: "Seller declined", tone: "muted" },
  CANCELLED: { label: "Cancelled", buyerLabel: "Cancelled", tone: "muted" },
  DELIVERED: { label: "Delivered", buyerLabel: "Delivered", tone: "ok" },
};
export const DELIVERY_METHODS = ["DELIVERY", "PICKUP"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];
export const ORDER_ACTIONS = ["confirm", "decline", "cancel", "delivered"] as const;
export type OrderAction = (typeof ORDER_ACTIONS)[number];

/** City centres used for "near me" when the user hasn't shared GPS, and as a listing fallback. */
export const CITIES = [
  { name: "Lagos", lat: 6.5244, lng: 3.3792 },
  { name: "Abuja", lat: 9.0765, lng: 7.3986 },
  { name: "Ibadan", lat: 7.3775, lng: 3.947 },
  { name: "Port Harcourt", lat: 4.8156, lng: 7.0498 },
  { name: "Enugu", lat: 6.4584, lng: 7.5464 },
  { name: "Kano", lat: 12.0022, lng: 8.592 },
  { name: "Benin City", lat: 6.335, lng: 5.6037 },
  { name: "Abeokuta", lat: 7.1475, lng: 3.3619 },
  { name: "Kaduna", lat: 10.5105, lng: 7.4165 },
  { name: "Jos", lat: 9.8965, lng: 8.8583 },
  { name: "Owerri", lat: 5.484, lng: 7.0351 },
  { name: "Uyo", lat: 5.0377, lng: 7.9128 },
  { name: "Warri", lat: 5.5167, lng: 5.75 },
  { name: "Ilorin", lat: 8.4966, lng: 4.5426 },
  { name: "Calabar", lat: 4.9757, lng: 8.3417 },
  { name: "Onitsha", lat: 6.1453, lng: 6.7858 },
  { name: "Akure", lat: 7.2571, lng: 5.2058 },
] as const;
export type CityName = (typeof CITIES)[number]["name"];
export const CITY_NAMES = CITIES.map((c) => c.name) as [CityName, ...CityName[]];
export function cityByName(name: string) {
  return CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

/** Paths a store handle may not take, because the web app uses them as routes. */
export const RESERVED_HANDLES = [
  "api", "admin", "account", "auth", "login", "signup", "logout", "verify-email", "forgot-password", "reset-password",
  "search", "listing", "listings", "sell", "seller", "dashboard", "messages", "saved", "store", "stores", "categories",
  "category", "help", "about", "terms", "privacy", "droba", "settings", "_next", "static", "public",
  "studio", "orders", "checkout", "bag", "welcome", "safety", "prohibited", "analytics", "report", "reports", "support", "legal",
] as const;

export const LIMITS = {
  titleMax: 80,
  descriptionMax: 3000,
  messageMax: 2000,
  pageSizeMax: 48,
  radiusKmMax: 500,
  maxPhotosAbsolute: 15,
} as const;
