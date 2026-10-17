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

export const PLAN_RULES: Record<StorePlan, { label: string; priceNaira: number; photosPerListing: number; storefront: boolean; storeSearch: boolean; boostCredits: number }> = {
  FREE: { label: "Free seller", priceNaira: 0, photosPerListing: 4, storefront: false, storeSearch: false, boostCredits: 0 },
  PREMIUM: { label: "Premium store", priceNaira: 5000, photosPerListing: 10, storefront: true, storeSearch: false, boostCredits: 3 },
  BUSINESS: { label: "Business store", priceNaira: 15000, photosPerListing: 15, storefront: true, storeSearch: true, boostCredits: 10 },
};

export const MODES = ["BUYER", "SELLER"] as const;
export type Mode = (typeof MODES)[number];

export const LISTING_STATUSES = ["DRAFT", "ACTIVE", "SOLD", "REMOVED"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

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
] as const;

export const LIMITS = {
  titleMax: 80,
  descriptionMax: 3000,
  messageMax: 2000,
  pageSizeMax: 48,
  radiusKmMax: 500,
  maxPhotosAbsolute: 15,
} as const;
