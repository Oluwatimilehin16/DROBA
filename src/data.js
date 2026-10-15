/* =========================================================================
   Droba mock data + API layer.
   Every screen reads through `api.*`. When the backend is ready, swap these
   functions for fetch() calls that return the same shapes.
   ========================================================================= */

const UNSPLASH = (id, w = 700) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;

/* Departments → categories. kind decides which listing fields apply:
   fashion = gender + clothing sizes · tech = tested/working + Tokunbo/Nigerian-used + specs · goods = size + dimensions. */
const DEPTS = [
  { id: "Fashion", icon: "hanger", kind: "fashion", img: "1445205170230-053b83016050", blurb: "Clothes, shoes, bags & watches", cats: ["Dresses", "Tops", "Shirts", "Jackets", "Jeans", "Shoes", "Sneakers", "Bags", "Watches & jewellery"] },
  { id: "Phones & Tablets", icon: "phone2", kind: "tech", img: "1573148195900-7845dcb9b127", blurb: "Phones, tablets & smartwatches", cats: ["Phones", "Tablets", "Smartwatches", "Phone accessories"], spec: ["Storage / RAM", "Battery health (%)"], sizeHint: "e.g. 128GB" },
  { id: "Computers", icon: "laptop", kind: "tech", img: "1496181133206-80ce9b88a853", blurb: "Laptops, desktops & printers", cats: ["Laptops", "Desktops & monitors", "Printers", "Computer accessories"], spec: ["Processor", "RAM / storage"], sizeHint: "e.g. 16GB / 512GB" },
  { id: "TV, Audio & Gaming", icon: "gamepad", kind: "tech", img: "1593359677879-a4bb92f829d1", blurb: "TVs, speakers, consoles & cameras", cats: ["TVs", "Audio", "Gaming", "Cameras"], spec: ["Model", "What's included"], sizeHint: "e.g. 55 inch, 1TB" },
  { id: "Appliances", icon: "fridge", kind: "tech", img: "1536353284924-9220c464e262", blurb: "Fridges, washers, kitchen & power", cats: ["Fridges", "Washing machines", "Kitchen appliances", "Fans & ACs", "Generators & solar"], spec: ["Capacity / size", "Power (W, V or KVA)"], sizeHint: "e.g. 450 L, 8 kg, 3.5 KVA" },
  { id: "Furniture", icon: "sofa", kind: "goods", img: "1555041469-a586c61ea9bc", blurb: "Sofas, beds, tables & storage", cats: ["Sofas", "Chairs", "Tables", "Beds & mattresses", "Wardrobes & storage"], spec: ["Width (cm)", "Height (cm)"], sizeHint: "e.g. 3-seater, 6 × 6 ft" },
  { id: "Home & Kitchen", icon: "lamp", kind: "goods", img: "1517991104123-1d56a6e81ed9", blurb: "Decor, lighting & cookware", cats: ["Home decor", "Lighting", "Cookware", "Bedding & curtains"], spec: ["Dimensions", "Material"], sizeHint: "e.g. 5-piece set" },
  { id: "Kids & Baby", icon: "baby", kind: "goods", img: "1559135141-2bea6465fccf", blurb: "Strollers, toys & kids' clothes", cats: ["Strollers & car seats", "Toys", "Kids' clothing", "Baby gear"], spec: ["Age range", "Weight limit / size"], sizeHint: "e.g. 0–3 years" },
  { id: "Sports & Fitness", icon: "dumbbell", kind: "goods", img: "1532298229144-0ec0c57515c7", blurb: "Gym gear, bikes & sports kit", cats: ["Gym equipment", "Bicycles", "Sports gear"], spec: ["Weight / size", "Model"], sizeHint: "e.g. 2 × 10 kg, 54cm frame" },
  { id: "Books & Hobbies", icon: "book", kind: "goods", img: "1512820790803-83ca734da794", blurb: "Books, instruments & collectibles", cats: ["Books", "Musical instruments", "Art & collectibles"], spec: ["Author / maker", "Edition / model"], sizeHint: "e.g. 10 paperbacks" },
  { id: "Beauty & Wellness", icon: "drop", kind: "tech", img: "1522336284037-91f7da073525", blurb: "Hair tools & wellness devices", cats: ["Hair & beauty tools", "Wellness devices"], spec: ["Model", "Power (W)"], sizeHint: "e.g. 2000W" },
  { id: "Vehicles & Parts", icon: "car", kind: "tech", img: "1547245324-d777c6f05e80", blurb: "Cars, motorcycles & parts", cats: ["Cars", "Motorcycles", "Parts & accessories"], spec: ["Year", "Mileage (km)"], sizeHint: "e.g. Automatic, 1.8L" },
];
const deptOf = (cat) => (DEPTS.find(d => d.cats.includes(cat)) || DEPTS[0]).id;
const deptInfo = (id) => DEPTS.find(d => d.id === id) || DEPTS[0];
const kindOf = (dept) => deptInfo(dept).kind;
const isFashion = (cat) => deptOf(cat) === "Fashion";

/* Condition grades. Every Droba item is pre-owned; sellers pick the grade. */
const GRADES = [
  { id: 1, name: "Like New", short: "Like New",
    desc: "Used briefly. No visible signs of use. Original tags or box may be included.",
    rules: ["No marks, scratches or fading", "Works and looks as new", "Tags-on or boxed allowed"] },
  { id: 2, name: "First Grade", short: "First Grade",
    desc: "Gently used and well kept. Only tiny signs of use when you look up close.",
    rules: ["No stains, cracks or dents", "Fully working", "Minor softening or light marks"] },
  { id: 3, name: "Fairly Used", short: "Fairly Used",
    desc: "Used regularly. Light wear such as small scratches, slight fading or pilling. Works as it should.",
    rules: ["Light scratches, fading or pilling", "Nothing that affects use", "Every flaw listed and photographed"] },
  { id: 4, name: "Fair", short: "Fair",
    desc: "Visible wear and priced to match. Still usable, good for everyday use or fixing up.",
    rules: ["Visible wear, marks or dents", "Every flaw photographed", "Priced lower to reflect it"] },
];

const FLAWS = {
  fashion: ["No flaws", "Small stain", "Light pilling", "Fading", "Loose thread", "Missing button", "Scuffs", "Worn sole", "Stretched"],
  tech: ["No flaws", "Scratches", "Dents", "Battery wear", "Screen marks", "Noisy", "Missing part", "No charger", "No box"],
  goods: ["No flaws", "Scratches", "Fabric wear", "Fading", "Small stain", "Loose part", "Chipped edge", "Missing piece"],
  "Vehicles & Parts": ["No flaws", "Scratches", "Dents", "Needs servicing", "AC needs work", "Minor rust", "Tyres worn"],
};
const flawsFor = (dept) => FLAWS[dept] || FLAWS[kindOf(dept)];
const EXTRA = { Fashion: "Tags on", Furniture: "Assembly guide", "Vehicles & Parts": "Papers complete", "Books & Hobbies": "Original packaging" };
const extraLabel = (dept) => EXTRA[dept] || "With box";

const TAGS = { bestseller: "Best Seller", trending: "Trending", new: "New", popular: "Popular" };

const CAT_IMG = {
  Dresses: "1571924849183-a68a3879348d", Sneakers: "1552346154-21d32810aba3", Bags: "1584917865442-de89df76afd3",
  Phones: "1573148195900-7845dcb9b127", Laptops: "1588872657578-7efd1f1555ed", Fridges: "1630459065645-549fe5a56db4",
  Sofas: "1573866926487-a1865558a9cf", Gaming: "1507457379470-08b800bebc67", "Generators & solar": "1700318092011-6e4666e94ab5",
  "Strollers & car seats": "1559135141-2bea6465fccf", Bicycles: "1532298229144-0ec0c57515c7", Cars: "1547245324-d777c6f05e80",
};
const RAIL = ["Dresses", "Sneakers", "Phones", "Laptops", "Fridges", "Generators & solar", "Sofas", "Gaming", "Strollers & car seats", "Bicycles", "Cars", "Bags"];

const POPULAR_SEARCHES = ["iPhone", "Fridge", "Generator", "Sofa", "PS4", "Maxi dresses", "Laptop", "Stroller", "Toyota Corolla", "Sneakers", "Washing machine", "Smart TV"];

const STYLE_OPTIONS = ["Vintage", "Y2K", "Streetwear", "Minimal", "Office", "Owambe", "Denim", "Going-out", "Sporty", "Luxury pre-loved"];
const HOME_INTERESTS = ["Living room", "Bedroom", "Kitchen", "Home office", "Apple", "Android", "Gaming & audio", "Power & solar", "Baby & kids", "Fitness", "Reading & music", "Cars"];

const CITIES = ["Lagos", "Abuja", "Ibadan", "Port Harcourt", "Enugu", "Kano", "Benin City"];

/* Sellers. type "store" = paid Premium/Business storefront; "individual" = free seller, no store. */
const SELLERS = {
  s1: { id: "s1", handle: "luxecloset", type: "store", name: "Luxe Closet", initials: "LC", verified: "business", city: "Lagos", area: "Lekki", rating: 4.9, reviews: 412, sold: 1240, joined: "2023", responds: "within 1 hour", plan: "Business",
        banner: "1445205170230-053b83016050", color: "#3B0A12", phone: "0801 234 5678",
        bio: "Curated pre-loved designer pieces. Every bag is checked before listing and photographed in natural light.", ig: "@luxecloset.ng", tiktok: "@luxecloset",
        biz: { address: null, hours: "Daily, 9am – 9pm", zones: "Lagos same day · nationwide 2–4 days", policy: "Not as described? Return within 48 hours for a full refund." } },
  s2: { id: "s2", handle: "yabavintage", type: "store", name: "Yaba Vintage Co.", initials: "YV", verified: "seller", city: "Lagos", area: "Yaba", rating: 4.8, reviews: 286, sold: 860, joined: "2023", responds: "within 2 hours", plan: "Premium",
        banner: "1540221652346-e5dd6b50f3e7", color: "#C8102E", phone: "0802 555 0192",
        bio: "Hand-picked first grade from Yaba market bales. 90s outerwear, shirts and statement coats.", ig: "@yabavintage", tiktok: "@yabavintageco" },
  s3: { id: "s3", handle: "kicksarchive", type: "store", name: "Kicks Archive", initials: "KA", verified: "seller", city: "Abuja", area: "Wuse II", rating: 4.7, reviews: 133, sold: 412, joined: "2024", responds: "within 3 hours", plan: "Premium",
        banner: "1556906781-9a412961c28c", color: "#1F1414", phone: "0803 111 2244",
        bio: "Pre-owned sneakers, deep cleaned and photographed sole-up. Sizes EU 39 to 46.", ig: "@kicksarchive.abj", tiktok: "@kicksarchive" },
  s5: { id: "s5", handle: "denimdepot", type: "store", name: "Denim Depot NG", initials: "DD", verified: "seller", city: "Port Harcourt", area: "GRA", rating: 4.6, reviews: 201, sold: 530, joined: "2024", responds: "within 4 hours", plan: "Premium",
        banner: "1559551409-dadc959f76b8", color: "#285E9E", phone: "0806 222 7788",
        bio: "Levi's, Wrangler and Lee. Real waist and inseam measurements on every pair.", ig: "@denimdepot.ng", tiktok: "@denimdepotng" },
  s7: { id: "s7", handle: "bagladylagos", type: "store", name: "Bag Lady Lagos", initials: "BL", verified: "seller", city: "Lagos", area: "Ikeja", rating: 4.8, reviews: 190, sold: 640, joined: "2023", responds: "within 1 hour", plan: "Premium",
        banner: "1590874103328-eac38a683ce7", color: "#9E0B22", phone: "0808 444 9900",
        bio: "Pre-loved handbags only. Interior photos, strap drop and dust bag info on every listing.", ig: "@bagladylagos", tiktok: "@bagladylagos" },
  s8: { id: "s8", handle: "gadgetcorner", type: "store", name: "Gadget Corner", initials: "GC", verified: "business", city: "Lagos", area: "Computer Village, Ikeja", rating: 4.7, reviews: 520, sold: 2100, joined: "2023", responds: "within 1 hour", plan: "Business",
        banner: "1496181133206-80ce9b88a853", color: "#1F1414", phone: "0809 700 1122",
        bio: "Tokunbo and Nigerian-used phones and laptops. Battery health, IMEI and serial checked on every device. Test before you pay.", ig: "@gadgetcorner.ng", tiktok: "@gadgetcornerng",
        biz: { address: "Block C, Shop 22, Computer Village, Ikeja, Lagos", hours: "Mon–Sat, 9am – 6pm", zones: "Lagos same day · nationwide 2–3 days", policy: "7-day warranty on phones and laptops. Test before you pay." } },
  s9: { id: "s9", handle: "homeswapabuja", type: "store", name: "HomeSwap Abuja", initials: "HS", verified: "seller", city: "Abuja", area: "Gwarinpa", rating: 4.8, reviews: 96, sold: 240, joined: "2024", responds: "within 2 hours", plan: "Premium",
        banner: "1611967164521-abae8fba4668", color: "#52101B", phone: "0810 333 4455",
        bio: "Pre-owned sofas, dining sets and accent chairs from relocating families. Delivery within Abuja.", ig: "@homeswap.abj", tiktok: "" },
  s10: { id: "s10", handle: "alabahub", type: "store", name: "Alaba Appliance Hub", initials: "AA", verified: "seller", city: "Lagos", area: "Alaba", rating: 4.5, reviews: 158, sold: 470, joined: "2024", responds: "within 3 hours", plan: "Premium",
        banner: "1484154218962-a197022b5858", color: "#285E9E", phone: "0811 909 8080",
        bio: "Tested Tokunbo fridges, freezers and washing machines. We plug in and demo before you pay.", ig: "@alabaappliancehub", tiktok: "" },
  s11: { id: "s11", handle: "littleonesabuja", type: "store", name: "Little Ones Abuja", initials: "LO", verified: "seller", city: "Abuja", area: "Garki", rating: 4.9, reviews: 74, sold: 190, joined: "2024", responds: "within 1 hour", plan: "Premium",
        banner: "1596461404969-9ae70f2830c1", color: "#C8102E", phone: "0814 555 2020",
        bio: "Gently used strollers, toys and baby gear from Abuja families. Everything cleaned and sanitised before listing.", ig: "@littleones.abj", tiktok: "" },
  s12: { id: "s12", handle: "fitgearlagos", type: "store", name: "FitGear Lagos", initials: "FG", verified: null, city: "Lagos", area: "Lekki", rating: 4.6, reviews: 41, sold: 98, joined: "2025", responds: "within 2 hours", plan: "Premium",
        banner: "1576678927484-cc907957088c", color: "#1F1414", phone: "0815 678 3434",
        bio: "Pre-owned gym equipment and bikes. We help you load up and can deliver within Lagos.", ig: "@fitgear.lagos", tiktok: "" },
  i1: { id: "i1", type: "individual", name: "Temi Ogunleye", initials: "TO", city: "Ibadan", area: "Bodija", rating: 4.9, reviews: 14, sold: 21, joined: "2025", responds: "within 1 hour", phone: "0805 987 6543" },
  i2: { id: "i2", type: "individual", name: "Ada Nwosu", initials: "AN", city: "Lagos", area: "Surulere", rating: 4.6, reviews: 9, sold: 12, joined: "2025", responds: "same day", phone: "0807 333 4455" },
  i3: { id: "i3", type: "individual", name: "Emeka Obi", initials: "EO", city: "Enugu", area: "Independence Layout", rating: 5.0, reviews: 3, sold: 3, joined: "2026", responds: "within 2 hours", phone: "0812 456 7890" },
  i4: { id: "i4", type: "individual", name: "Halima Bello", initials: "HB", city: "Abuja", area: "Maitama", rating: 4.8, reviews: 6, sold: 7, joined: "2026", responds: "same day", phone: "0813 222 1199" },
  i5: { id: "i5", type: "individual", name: "Bayo Adekunle", initials: "BA", city: "Lagos", area: "Ikorodu", rating: 4.7, reviews: 11, sold: 15, joined: "2025", responds: "within 3 hours", phone: "0816 404 1188" },
  i6: { id: "i6", type: "individual", name: "Ngozi Eze", initials: "NE", city: "Port Harcourt", area: "Rumuola", rating: 4.9, reviews: 8, sold: 9, joined: "2026", responds: "within 1 hour", phone: "0817 909 3030" },
};

/* dep: W/M/U (fashion only). cond: 1–4. extra: tags on / with box. origin: Tokunbo or Nigerian-used (non-fashion). */
const PRODUCTS = [
  // Fashion
  { id: 1, title: "White linen midi dress", brand: "Zara", seller: "s1", price: 28000, retail: 65000, cat: "Dresses", dep: "W", size: "M", sizeNote: "UK 12", cond: 1, extra: true, tag: "bestseller", img: "1571924848943-25c2c95bbb4b", color: "White", days: 2, saves: 214, styles: ["Minimal", "Going-out"], flaws: [], note: "Worn once to a brunch. Tags still on.", meas: [["Bust (pit to pit)", "46 cm"], ["Waist", "38 cm"], ["Length", "112 cm"]] },
  { id: 2, title: "Maroon one-shoulder gown", brand: "House of CB", seller: "s1", price: 45000, retail: 160000, cat: "Dresses", dep: "W", size: "S", sizeNote: "UK 8", cond: 1, tag: "trending", img: "1571924849183-a68a3879348d", color: "Red", days: 4, saves: 389, styles: ["Owambe", "Going-out"], flaws: [], note: "Worn once for a wedding. Dry cleaned.", meas: [["Bust (pit to pit)", "41 cm"], ["Waist", "33 cm"], ["Length", "148 cm"]] },
  { id: 3, title: "Floral wrap dress", brand: "Mango", seller: "i1", price: 15500, cat: "Dresses", dep: "W", size: "M", sizeNote: "UK 12", cond: 2, tag: "new", img: "1625646741211-711bdd65c570", color: "Red", days: 1, saves: 48, styles: ["Vintage", "Going-out"], flaws: [], note: "", meas: [["Bust (pit to pit)", "47 cm"], ["Length", "104 cm"]] },
  { id: 4, title: "Black satin slip dress", brand: "ASOS", seller: "i2", price: 12000, cat: "Dresses", dep: "W", size: "S", sizeNote: "UK 8", cond: 3, tag: null, img: "1603122630570-7fd434d470d0", color: "Black", days: 6, saves: 31, styles: ["Y2K", "Going-out"], flaws: ["Light pilling"], note: "Tiny pull near the hem, shown in photo 3.", meas: [["Bust (pit to pit)", "40 cm"], ["Length", "120 cm"]] },
  { id: 6, title: "Red wool longline coat", brand: "Vintage 90s", seller: "s2", price: 38000, cat: "Jackets", dep: "W", size: "M", sizeNote: "UK 12", cond: 2, tag: "trending", img: "1562347174-7370ad83dc47", color: "Red", days: 3, saves: 267, styles: ["Vintage", "Office"], flaws: [], note: "Heavy wool, fully lined.", meas: [["Pit to pit", "54 cm"], ["Length", "108 cm"], ["Sleeve", "60 cm"]] },
  { id: 7, title: "Beige V-neck knit top", brand: "Uniqlo", seller: "i2", price: 7500, cat: "Tops", dep: "W", size: "M", cond: 3, tag: "new", img: "1567966456076-905a50a06d8c", color: "Beige", days: 1, saves: 19, styles: ["Minimal", "Office"], flaws: ["Light pilling"], note: "Light pilling under the arms.", meas: [["Pit to pit", "49 cm"], ["Length", "62 cm"]] },
  { id: 8, title: "Red leather top-handle bag", brand: "Coach", seller: "s7", price: 52000, retail: 240000, cat: "Bags", dep: "W", size: "One size", cond: 1, tag: "bestseller", img: "1584917865442-de89df76afd3", color: "Red", days: 5, saves: 512, styles: ["Luxury pre-loved"], flaws: [], note: "Comes with dust bag and strap.", meas: [["Width", "28 cm"], ["Height", "20 cm"], ["Depth", "11 cm"]] },
  { id: 10, title: "Grey buckle satchel", brand: "Fossil", seller: "s1", price: 41000, cat: "Bags", dep: "W", size: "One size", cond: 2, tag: "popular", img: "1605733513597-a8f8341084e6", color: "Grey", days: 11, saves: 140, styles: ["Vintage"], flaws: [], note: "", meas: [["Width", "32 cm"], ["Height", "24 cm"]] },
  { id: 11, title: "Black leather shoulder bag", brand: "Gucci", seller: "s1", price: 185000, retail: 1400000, cat: "Bags", dep: "W", size: "One size", cond: 1, tag: "trending", img: "1548036328-c9fa89d128fa", color: "Black", days: 2, saves: 731, styles: ["Luxury pre-loved"], flaws: [], note: "Original receipt available. Inspect the serial tag before you pay.", meas: [["Width", "26 cm"], ["Height", "16 cm"], ["Strap drop", "54 cm"]] },
  { id: 12, title: "Pink mini handbag", brand: "Charles & Keith", seller: "s7", price: 22000, cat: "Bags", dep: "W", size: "One size", cond: 2, tag: "new", img: "1681747685985-a401c271156c", color: "Pink", days: 1, saves: 64, styles: ["Y2K", "Going-out"], flaws: [], note: "", meas: [["Width", "20 cm"], ["Height", "14 cm"]] },
  { id: 14, title: "Air Jordan 1 High", brand: "Nike", seller: "s3", price: 95000, retail: 220000, cat: "Sneakers", dep: "U", size: "43", sizeNote: "EU 43 / UK 8.5", cond: 2, tag: "bestseller", img: "1552346154-21d32810aba3", color: "Red", days: 3, saves: 604, styles: ["Streetwear"], flaws: ["Worn sole"], note: "Light creasing on toe box. Deep cleaned.", meas: [["EU size", "43"], ["Insole length", "27.5 cm"]] },
  { id: 16, title: "New Balance 574", brand: "New Balance", seller: "s3", price: 42000, cat: "Sneakers", dep: "U", size: "41", sizeNote: "EU 41", cond: 2, tag: "trending", img: "1551107696-a4b0c5a0d9a2", color: "Grey", days: 4, saves: 176, styles: ["Sporty"], flaws: [], note: "", meas: [["EU size", "41"], ["Insole length", "26.2 cm"]] },
  { id: 17, title: "Air Force 1 Low", brand: "Nike", seller: "s3", price: 36000, cat: "Sneakers", dep: "U", size: "44", sizeNote: "EU 44", cond: 3, tag: "popular", img: "1579338559194-a162d19bf842", color: "White", days: 7, saves: 203, styles: ["Streetwear"], flaws: ["Worn sole"], note: "", meas: [["EU size", "44"], ["Insole length", "28.4 cm"]] },
  { id: 20, title: "Blue Oxford button-down", brand: "Ralph Lauren", seller: "s2", price: 9500, cat: "Shirts", dep: "M", size: "L", cond: 2, tag: null, img: "1602810316693-3667c854239a", color: "Blue", days: 5, saves: 37, styles: ["Office", "Minimal"], flaws: [], note: "", meas: [["Pit to pit", "58 cm"], ["Length", "78 cm"]] },
  { id: 21, title: "White poplin shirt", brand: "M&S", seller: "s2", price: 8000, cat: "Shirts", dep: "M", size: "M", cond: 1, extra: true, tag: "new", img: "1602810318383-e386cc2a3ccf", color: "White", days: 1, saves: 15, styles: ["Office", "Minimal"], flaws: [], note: "Bought the wrong size, tried on once.", meas: [["Pit to pit", "54 cm"], ["Length", "76 cm"]] },
  { id: 24, title: "Classic denim trucker jacket", brand: "Levi's", seller: "s5", price: 24000, cat: "Jackets", dep: "U", size: "L", cond: 2, tag: "bestseller", img: "1611312449408-fcece27cdbb7", color: "Blue", days: 3, saves: 298, styles: ["Denim", "Vintage", "Streetwear"], flaws: [], note: "", meas: [["Pit to pit", "58 cm"], ["Length", "64 cm"]] },
  { id: 25, title: "Acid-wash trucker jacket", brand: "Wrangler", seller: "s5", price: 19500, cat: "Jackets", dep: "U", size: "M", cond: 3, tag: "trending", img: "1543076447-215ad9ba6923", color: "Blue", days: 2, saves: 154, styles: ["Denim", "Y2K"], flaws: ["Fading"], note: "Natural fade, adds to the vintage look.", meas: [["Pit to pit", "55 cm"], ["Length", "61 cm"]] },
  { id: 27, title: "Leather biker jacket", brand: "Vintage", seller: "s2", price: 48000, cat: "Jackets", dep: "M", size: "L", cond: 3, tag: "popular", img: "1559551409-dadc959f76b8", color: "Black", days: 13, saves: 190, styles: ["Vintage", "Streetwear"], flaws: ["Scuffs"], note: "Real leather, broken in nicely.", meas: [["Pit to pit", "57 cm"], ["Length", "66 cm"]] },
  { id: 28, title: "Straight-leg 501 jeans", brand: "Levi's", seller: "s5", price: 13000, cat: "Jeans", dep: "U", size: "32", sizeNote: "W32 L32", cond: 2, tag: null, img: "1614990354198-b06764dcb13c", color: "Blue", days: 5, saves: 77, styles: ["Denim", "Vintage"], flaws: [], note: "", meas: [["Waist (flat)", "41 cm"], ["Inseam", "81 cm"]] },
  { id: 29, title: "Light-wash mom jeans", brand: "Zara", seller: "i2", price: 11000, cat: "Jeans", dep: "W", size: "28", sizeNote: "W28", cond: 3, tag: "new", img: "1666861585341-5bd1e7b1ed71", color: "Blue", days: 1, saves: 26, styles: ["Denim", "Y2K"], flaws: ["Stretched"], note: "", meas: [["Waist (flat)", "36 cm"], ["Inseam", "72 cm"]] },
  // Furniture
  { id: 40, title: "Brown leather Chesterfield sofa", brand: "Unbranded", seller: "s9", price: 420000, retail: 1200000, cat: "Sofas", size: "3-seater", cond: 2, tag: "trending", img: "1573866926487-a1865558a9cf", color: "Brown", days: 3, saves: 388, styles: ["Living room"], flaws: ["Scratches"], note: "Relocating, must go. Light scratch on left arm.", meas: [["Width", "210 cm"], ["Depth", "92 cm"], ["Height", "78 cm"], ["Seats", "3"]] },
  { id: 41, title: "Green velvet sofa", brand: "Unbranded", seller: "i4", price: 260000, cat: "Sofas", size: "3-seater", cond: 2, tag: "new", img: "1555041469-a586c61ea9bc", color: "Green", days: 1, saves: 97, styles: ["Living room"], flaws: [], note: "Smoke-free, pet-free home.", meas: [["Width", "198 cm"], ["Depth", "88 cm"], ["Height", "82 cm"]] },
  { id: 42, title: "Grey fabric sofa with cushions", brand: "Ikea", seller: "s9", price: 185000, cat: "Sofas", size: "3-seater", cond: 3, tag: null, img: "1611967164521-abae8fba4668", color: "Grey", days: 8, saves: 64, styles: ["Living room"], flaws: ["Fabric wear"], note: "Covers are washable.", meas: [["Width", "204 cm"], ["Depth", "90 cm"]] },
  { id: 43, title: "Brown leather armchair", brand: "Unbranded", seller: "i3", price: 95000, cat: "Chairs", size: "1-seater", cond: 2, tag: null, img: "1601366533287-5ee4c763ae4e", color: "Brown", days: 4, saves: 45, styles: ["Living room", "Home office"], flaws: [], note: "", meas: [["Width", "80 cm"], ["Depth", "84 cm"], ["Height", "96 cm"]] },
  { id: 44, title: "Mustard accent chair", brand: "Unbranded", seller: "s9", price: 68000, cat: "Chairs", size: "1-seater", cond: 1, tag: "popular", img: "1586023492125-27b2c045efd7", color: "Yellow", days: 6, saves: 133, styles: ["Living room"], flaws: [], note: "Bought last year, barely used.", meas: [["Width", "72 cm"], ["Height", "84 cm"]] },
  { id: 45, title: "Wooden 5-piece dining set", brand: "Unbranded", seller: "s9", price: 210000, cat: "Tables", size: "4 chairs", cond: 2, tag: "bestseller", img: "1577140917170-285929fb55b7", color: "Brown", days: 5, saves: 202, styles: ["Dining"], flaws: [], note: "Solid wood. Delivery within Abuja available.", meas: [["Table", "150 × 90 cm"], ["Height", "76 cm"], ["Chairs", "4"]] },
  // Appliances
  { id: 50, title: "Silver French-door fridge", brand: "Samsung", seller: "s10", price: 480000, retail: 1350000, cat: "Fridges", size: "550 L", cond: 2, origin: "Tokunbo", tested: true, tag: "trending", img: "1536353284924-9220c464e262", color: "Silver", days: 2, saves: 341, styles: ["Kitchen"], flaws: ["Scratches"], note: "UK-used. Cools well, we'll plug it in for you before you pay.", meas: [["Capacity", "550 L"], ["Size (H × W)", "178 × 91 cm"], ["Power", "220V"], ["Freezer", "Bottom drawer"]] },
  { id: 51, title: "Black fridge with water dispenser", brand: "LG", seller: "s10", price: 310000, cat: "Fridges", size: "420 L", cond: 2, origin: "Tokunbo", tested: true, tag: "popular", img: "1630459065645-549fe5a56db4", color: "Black", days: 6, saves: 157, styles: ["Kitchen"], flaws: [], note: "", meas: [["Capacity", "420 L"], ["Size (H × W)", "172 × 70 cm"], ["Power", "220V"]] },
  { id: 52, title: "Retro blue mini fridge", brand: "Smeg", seller: "i2", price: 185000, cat: "Fridges", size: "130 L", cond: 3, origin: "Nigerian-used", tested: true, tag: null, img: "1571175443880-49e1d25b2bc5", color: "Blue", days: 9, saves: 88, styles: ["Kitchen"], flaws: ["Dents"], note: "Small dent on the side, works perfectly.", meas: [["Capacity", "130 L"], ["Height", "97 cm"]] },
  { id: 53, title: "Front-load washing machine", brand: "Bosch", seller: "s10", price: 220000, cat: "Washing machines", size: "8 kg", cond: 2, origin: "Tokunbo", tested: true, tag: "bestseller", img: "1626806787461-102c1bfaaea1", color: "White", days: 4, saves: 276, styles: ["Laundry"], flaws: [], note: "", meas: [["Load", "8 kg"], ["Spin", "1400 rpm"], ["Size (H × W)", "85 × 60 cm"]] },
  { id: 54, title: "White microwave oven", brand: "Panasonic", seller: "i1", price: 38000, cat: "Kitchen appliances", size: "25 L", cond: 2, origin: "Nigerian-used", tested: true, extra: true, tag: "new", img: "1585659722983-3a675dabf23d", color: "White", days: 1, saves: 22, styles: ["Kitchen"], flaws: [], note: "Comes in original box.", meas: [["Capacity", "25 L"], ["Power", "900 W"]] },
  { id: 55, title: "4-burner gas cooker", brand: "Thermocool", seller: "s10", price: 145000, cat: "Kitchen appliances", size: "4 burner", cond: 3, origin: "Nigerian-used", tested: true, tag: null, img: "1583471800737-36d8e3a83ceb", color: "White", days: 10, saves: 41, styles: ["Kitchen"], flaws: ["Scratches"], note: "Oven works. All four burners light.", meas: [["Burners", "4"], ["Size", "60 × 60 cm"]] },
  // Electronics
  { id: 60, title: "MacBook Pro 13\" (M1)", brand: "Apple", seller: "s8", price: 650000, retail: 1500000, cat: "Laptops", size: "8GB / 256GB", cond: 2, origin: "Tokunbo", tested: true, tag: "bestseller", img: "1496181133206-80ce9b88a853", color: "Silver", days: 2, saves: 512, styles: ["Apple", "Home office"], flaws: [], note: "Battery 89%, 212 cycles. Check the serial on Apple's site before paying.", meas: [["Chip", "Apple M1"], ["RAM / Storage", "8GB / 256GB"], ["Battery health", "89%"], ["Charger", "Included"]] },
  { id: 61, title: "Dell Latitude laptop", brand: "Dell", seller: "s8", price: 285000, cat: "Laptops", size: "16GB / 512GB", cond: 3, origin: "Tokunbo", tested: true, tag: null, img: "1588872657578-7efd1f1555ed", color: "Grey", days: 7, saves: 74, styles: ["Home office"], flaws: ["Scratches"], note: "", meas: [["CPU", "Intel Core i5, 8th gen"], ["RAM / Storage", "16GB / 512GB SSD"], ["Battery", "About 4 hours"]] },
  { id: 62, title: "iPhone 11, 128GB", brand: "Apple", seller: "s8", price: 330000, cat: "Phones", size: "128GB", cond: 2, origin: "Tokunbo", tested: true, extra: true, tag: "trending", img: "1573148195900-7845dcb9b127", color: "Silver", days: 1, saves: 433, styles: ["Apple"], flaws: ["Battery wear"], note: "Battery health 84%. Factory unlocked. Check IMEI on delivery.", meas: [["Storage", "128GB"], ["Battery health", "84%"], ["Network", "Factory unlocked"], ["Face ID", "Working"]] },
  { id: 63, title: "iPhone X, 64GB", brand: "Apple", seller: "i3", price: 175000, cat: "Phones", size: "64GB", cond: 3, origin: "Nigerian-used", tested: true, tag: null, img: "1523206489230-c012c64b2b48", color: "Silver", days: 5, saves: 58, styles: ["Apple"], flaws: ["Screen marks", "Battery wear"], note: "Small mark at the top of the screen, not visible when on.", meas: [["Storage", "64GB"], ["Battery health", "79%"]] },
  { id: 64, title: "Android phone, triple camera", brand: "Samsung", seller: "s8", price: 210000, cat: "Phones", size: "256GB", cond: 1, origin: "Tokunbo", tested: true, extra: true, tag: "new", img: "1592750475338-74b7b21085ab", color: "Grey", days: 0, saves: 31, styles: ["Android"], flaws: [], note: "Used for a month. Box and charger included.", meas: [["Storage", "256GB"], ["RAM", "8GB"], ["Battery health", "98%"]] },
  { id: 65, title: "55\" 4K smart TV", brand: "Samsung", seller: "i4", price: 290000, cat: "TVs", size: "55 inch", cond: 2, origin: "Nigerian-used", tested: true, tag: "popular", img: "1593359677879-a4bb92f829d1", color: "Black", days: 3, saves: 188, styles: ["Living room", "Gaming & audio"], flaws: [], note: "Wall bracket included.", meas: [["Screen", "55 inch, 4K UHD"], ["Smart", "Netflix, YouTube, Showmax"], ["Remote", "Included"]] },
  { id: 66, title: "43\" wall-mounted TV", brand: "LG", seller: "s8", price: 165000, cat: "TVs", size: "43 inch", cond: 3, origin: "Tokunbo", tested: true, tag: null, img: "1586024486164-ce9b3d87e09f", color: "Black", days: 8, saves: 47, styles: ["Living room"], flaws: ["Scratches"], note: "", meas: [["Screen", "43 inch, Full HD"]] },
  { id: 67, title: "Wireless over-ear headphones", brand: "Sony", seller: "i3", price: 85000, cat: "Audio", size: "Over-ear", cond: 2, origin: "Nigerian-used", tested: true, tag: "new", img: "1505740420928-5e560c06d30e", color: "Black", days: 2, saves: 66, styles: ["Gaming & audio"], flaws: [], note: "", meas: [["Battery", "About 25 hours"], ["Noise cancelling", "Yes"]] },
  { id: 68, title: "Gold wireless headphones", brand: "Beats", seller: "s8", price: 95000, cat: "Audio", size: "On-ear", cond: 2, origin: "Tokunbo", tested: true, tag: null, img: "1545127398-14699f92334b", color: "Yellow", days: 6, saves: 52, styles: ["Gaming & audio", "Apple"], flaws: [], note: "", meas: [["Battery", "About 40 hours"]] },
  // Fashion extras
  { id: 70, title: "Nude peep-toe pumps", brand: "Steve Madden", seller: "s1", price: 18000, cat: "Shoes", dep: "W", size: "39", sizeNote: "EU 39", cond: 2, tag: "new", img: "1581101767113-1677fc2beaa8", color: "Beige", days: 1, saves: 38, styles: ["Owambe", "Going-out"], flaws: [], note: "Worn to two events.", meas: [["EU size", "39"], ["Heel height", "10 cm"]] },
  { id: 71, title: "Chronograph watch, leather strap", brand: "Fossil", seller: "i5", price: 45000, cat: "Watches & jewellery", dep: "U", size: "42mm", cond: 2, extra: true, tag: null, img: "1542496658-e33a6d0d50f6", color: "Brown", days: 4, saves: 57, styles: ["Office", "Luxury pre-loved"], flaws: [], note: "New battery fitted last month. Box included.", meas: [["Case", "42 mm"], ["Strap", "Brown leather"]] },
  // Phones & Tablets
  { id: 72, title: "iPad 9th gen, 64GB Wi-Fi", brand: "Apple", seller: "s8", price: 185000, cat: "Tablets", size: "64GB", cond: 2, origin: "Tokunbo", tested: true, tag: "trending", img: "1561154464-82e9adf32764", color: "Grey", days: 2, saves: 140, styles: ["Apple"], flaws: [], note: "No iCloud lock. Charger included.", meas: [["Storage", "64GB"], ["Battery health", "91%"], ["Screen", "10.2 inch"]] },
  { id: 73, title: "Apple Watch Series 6, 44mm", brand: "Apple", seller: "i6", price: 95000, cat: "Smartwatches", size: "44mm", cond: 2, origin: "Nigerian-used", tested: true, tag: null, img: "1546868871-7041f2a55e12", color: "Grey", days: 5, saves: 49, styles: ["Apple", "Fitness"], flaws: ["Scratches"], note: "", meas: [["Size", "44 mm"], ["Battery health", "86%"]] },
  // Computers
  { id: 74, title: "iMac 21.5\" all-in-one", brand: "Apple", seller: "s8", price: 320000, cat: "Desktops & monitors", size: "8GB / 1TB", cond: 2, origin: "Tokunbo", tested: true, tag: null, img: "1527443224154-c4a3942d3acf", color: "Silver", days: 6, saves: 66, styles: ["Apple", "Home office"], flaws: [], note: "Keyboard and mouse included.", meas: [["Processor", "Intel Core i5"], ["RAM / storage", "8GB / 1TB"], ["Screen", "21.5 inch"]] },
  { id: 75, title: "HP all-in-one printer", brand: "HP", seller: "i5", price: 65000, cat: "Printers", size: "Print, scan, copy", cond: 3, origin: "Nigerian-used", tested: true, tag: null, img: "1612815154858-60aa4c59eaa6", color: "White", days: 9, saves: 12, styles: ["Home office"], flaws: ["Scratches"], note: "Comes with a half-full ink cartridge.", meas: [["Type", "Inkjet"], ["Wi-Fi", "Yes"]] },
  // TV, Audio & Gaming
  { id: 76, title: "PS4 Slim with controller", brand: "Sony", seller: "i5", price: 165000, cat: "Gaming", size: "500GB", cond: 2, origin: "Tokunbo", tested: true, tag: "trending", img: "1507457379470-08b800bebc67", color: "White", days: 1, saves: 210, styles: ["Gaming & audio"], flaws: [], note: "2 games included. Come and play it before you pay.", meas: [["Storage", "500GB"], ["Controllers", "1"], ["Games", "FIFA 23, GTA V"]] },
  { id: 77, title: "Canon DSLR with kit lens", brand: "Canon", seller: "i6", price: 280000, cat: "Cameras", size: "24MP", cond: 2, origin: "Nigerian-used", tested: true, tag: null, img: "1502982720700-bfff97f2ecac", color: "Black", days: 7, saves: 73, styles: ["Gaming & audio"], flaws: [], note: "Shutter count 12,400.", meas: [["Sensor", "24MP APS-C"], ["Lens", "18–55mm"], ["Shutter count", "12,400"]] },
  // Appliances extras
  { id: 78, title: "18\" standing fan", brand: "Binatone", seller: "i1", price: 22000, cat: "Fans & ACs", size: "18 inch", cond: 3, origin: "Nigerian-used", tested: true, tag: null, img: "1559719740-f4d59cf117cb", color: "Black", days: 3, saves: 18, styles: ["Bedroom"], flaws: ["Scratches"], note: "", meas: [["Blade size", "18 inch"], ["Speeds", "3"]] },
  { id: 79, title: "3.5 KVA petrol generator", brand: "Firman", seller: "s10", price: 210000, cat: "Generators & solar", size: "3.5 KVA", cond: 3, origin: "Nigerian-used", tested: true, tag: "popular", img: "1700318092011-6e4666e94ab5", color: "Red", days: 2, saves: 254, styles: ["Power & solar"], flaws: ["Scratches"], note: "Key start. Serviced last month. We'll start it in front of you.", meas: [["Output", "3.5 KVA"], ["Fuel", "Petrol"], ["Start", "Key + recoil"]] },
  // Furniture extras
  { id: 80, title: "Upholstered queen bed frame", brand: "Unbranded", seller: "s9", price: 240000, cat: "Beds & mattresses", size: "6 × 6 ft", cond: 2, tag: "new", img: "1560185128-e173042f79dd", color: "Beige", days: 1, saves: 61, styles: ["Bedroom"], flaws: [], note: "Mattress not included.", meas: [["Size", "6 × 6 ft"], ["Headboard height", "120 cm"]] },
  { id: 81, title: "Wooden 2-door cabinet", brand: "Unbranded", seller: "i4", price: 85000, cat: "Wardrobes & storage", size: "2-door", cond: 3, tag: null, img: "1558997519-83ea9252edf8", color: "Brown", days: 8, saves: 23, styles: ["Bedroom", "Living room"], flaws: ["Chipped edge"], note: "", meas: [["Width", "90 cm"], ["Height", "180 cm"]] },
  { id: 82, title: "Chest of drawers", brand: "Unbranded", seller: "s9", price: 70000, cat: "Wardrobes & storage", size: "5 drawers", cond: 2, tag: null, img: "1544691560-fc2053d97726", color: "Brown", days: 4, saves: 34, styles: ["Bedroom"], flaws: [], note: "", meas: [["Width", "80 cm"], ["Height", "110 cm"]] },
  // Home & Kitchen
  { id: 83, title: "Ceramic table lamp", brand: "Unbranded", seller: "i2", price: 15000, cat: "Lighting", size: "45 cm", cond: 1, extra: true, tag: "new", img: "1517991104123-1d56a6e81ed9", color: "Beige", days: 0, saves: 9, styles: ["Living room", "Bedroom"], flaws: [], note: "", meas: [["Height", "45 cm"], ["Bulb", "E27, included"]] },
  { id: 84, title: "Stainless steel pot set", brand: "Tefal", seller: "i1", price: 28000, cat: "Cookware", size: "5-piece", cond: 2, tag: null, img: "1523039031846-6b3f39302cb8", color: "Silver", days: 6, saves: 21, styles: ["Kitchen"], flaws: [], note: "", meas: [["Pieces", "5 pots with lids"], ["Material", "Stainless steel"]] },
  // Kids & Baby
  { id: 85, title: "Red travel stroller", brand: "Chicco", seller: "s11", price: 75000, cat: "Strollers & car seats", size: "0–3 years", cond: 2, tag: "new", img: "1559135141-2bea6465fccf", color: "Red", days: 1, saves: 88, styles: ["Baby & kids"], flaws: [], note: "Folds flat, rain cover included.", meas: [["Age range", "Birth – 3 years"], ["Weight limit", "15 kg"]] },
  { id: 86, title: "Wooden train set", brand: "Brio", seller: "s11", price: 12000, cat: "Toys", size: "3+ years", cond: 2, tag: null, img: "1596461404969-9ae70f2830c1", color: "Brown", days: 5, saves: 27, styles: ["Baby & kids"], flaws: [], note: "All pieces present.", meas: [["Age", "3+ years"], ["Pieces", "32"]] },
  { id: 87, title: "Alphabet block set", brand: "Unbranded", seller: "i6", price: 6500, cat: "Toys", size: "2+ years", cond: 3, tag: null, img: "1535572290543-960a8046f5af", color: "Yellow", days: 9, saves: 8, styles: ["Baby & kids"], flaws: ["Fading"], note: "", meas: [["Pieces", "26"]] },
  // Sports & Fitness
  { id: 88, title: "Road bike, 54cm frame", brand: "Giant", seller: "s12", price: 160000, cat: "Bicycles", size: "54cm frame", cond: 2, tag: "popular", img: "1532298229144-0ec0c57515c7", color: "Black", days: 3, saves: 96, styles: ["Fitness"], flaws: [], note: "New tyres fitted.", meas: [["Frame", "54 cm"], ["Gears", "16-speed"]] },
  { id: 89, title: "Dumbbell pair, 10 kg each", brand: "Unbranded", seller: "s12", price: 35000, cat: "Gym equipment", size: "2 × 10 kg", cond: 3, tag: null, img: "1638536532686-d610adfc8e5c", color: "Black", days: 6, saves: 29, styles: ["Fitness"], flaws: ["Scratches"], note: "", meas: [["Weight", "2 × 10 kg"]] },
  // Books & Hobbies
  { id: 90, title: "Acoustic guitar", brand: "Yamaha", seller: "i5", price: 55000, cat: "Musical instruments", size: "Full size", cond: 2, tag: null, img: "1567771736315-133752f63a69", color: "Brown", days: 4, saves: 44, styles: ["Reading & music"], flaws: [], note: "New strings. Soft case included.", meas: [["Model", "F310"], ["Size", "Full (4/4)"]] },
  { id: 91, title: "Novel bundle, 10 books", brand: "Mixed", seller: "i1", price: 18000, cat: "Books", size: "10 paperbacks", cond: 2, tag: "new", img: "1512820790803-83ca734da794", color: "Beige", days: 0, saves: 15, styles: ["Reading & music"], flaws: [], note: "Includes Adichie, Achebe and Soyinka titles.", meas: [["Books", "10 paperbacks"]] },
  // Beauty & Wellness
  { id: 92, title: "Professional hair dryer", brand: "Babyliss", seller: "i2", price: 25000, cat: "Hair & beauty tools", size: "2000W", cond: 2, origin: "Nigerian-used", tested: true, tag: null, img: "1522336284037-91f7da073525", color: "Grey", days: 3, saves: 19, styles: [], flaws: [], note: "", meas: [["Power", "2000W"], ["Attachments", "Concentrator nozzle"]] },
  // Vehicles & Parts
  { id: 93, title: "Toyota Corolla 2012, automatic", brand: "Toyota", seller: "i6", price: 6800000, cat: "Cars", size: "Automatic", cond: 2, origin: "Tokunbo", tested: true, extra: true, tag: "trending", img: "1547245324-d777c6f05e80", color: "White", days: 2, saves: 402, styles: ["Cars"], flaws: ["Scratches"], note: "Customs papers complete. Bring your mechanic for inspection.", meas: [["Year", "2012"], ["Mileage", "98,000 km"], ["Engine", "1.8L petrol"], ["Papers", "Customs + registration"]] },
  { id: 94, title: "Sports motorcycle, 600cc", brand: "Honda", seller: "i5", price: 2400000, cat: "Motorcycles", size: "600cc", cond: 2, origin: "Tokunbo", tested: true, tag: null, img: "1568772585407-9361f9bf3a87", color: "Red", days: 5, saves: 77, styles: ["Cars"], flaws: [], note: "", meas: [["Engine", "600cc"], ["Year", "2015"], ["Mileage", "21,000 km"]] },
].map(p => {
  const st = SELLERS[p.seller];
  return Object.assign({
    dept: deptOf(p.cat), dep: p.dep || "U", extra: false, origin: null, tested: false,
    deliver: st.type === "store" || p.id % 3 !== 0,      // seller can deliver
    pickup: st.type === "individual" || p.id % 2 === 0,  // buyer can collect
    offers: p.id % 4 !== 0,                              // open to offers
  }, p);
});

/* Sponsored placements: boosted listings, shown every 7th slot in feeds. */
const SPONSORED_IDS = [60, 76, 50, 11, 79, 93, 40, 24];

const REVIEWS = [
  { name: "Ifeoma A.", stars: 5, text: "Exactly as described. I checked it at the door and paid the rider. Smooth.", item: "Maroon one-shoulder gown", when: "2 weeks ago" },
  { name: "Tunde B.", stars: 5, text: "Measurements were accurate and the seller answered every question before delivery.", item: "Classic denim trucker jacket", when: "1 month ago" },
  { name: "Chiamaka O.", stars: 4, text: "One tiny scuff that was shown in the photos, so no surprises.", item: "Grey buckle satchel", when: "1 month ago" },
];

/* Selling options. Free sellers list a few items with no storefront. A store is paid. */
const PLANS = [
  { id: "Free", label: "Free seller", price: 0, blurb: "Sell as much as you like. No store needed.", listings: "Unlimited listings", photos: "4 photos per item", storefront: "Simple seller profile (no store page)", analytics: "Views and saves", boosts: "Pay per boost", visibility: "Standard search", badge: "Buyer ratings on your profile", promo: "Boost single items" },
  { id: "Premium", label: "Premium store", price: 5000, blurb: "Your own store on Droba.", listings: "Unlimited listings", photos: "10 photos per item", storefront: "Custom storefront: banner, logo, bio, socials, featured items", analytics: "Detailed analytics", boosts: "3 boost credits / month", visibility: "Search visibility boost", badge: "Verified Store badge (after review)", promo: "Boost single items" },
  { id: "Business", label: "Business store", price: 15000, blurb: "For established businesses.", listings: "Unlimited listings", photos: "15 photos per item", storefront: "Professional storefront with collections", analytics: "Advanced analytics", boosts: "10 boost credits / month", visibility: "Priority placement in Trending, New In & Popular Stores", badge: "Verified Business badge", promo: "Campaigns by category, price or collection" },
];
const BOOST_PRICES = [[3, 1500], [7, 3000], [14, 5000]];

/* ---------- API layer (mock) ---------- */
const api = {
  products: () => PRODUCTS,
  product: (id) => PRODUCTS.find(p => p.id === +id),
  seller: (id) => SELLERS[id],
  sellers: () => Object.values(SELLERS),
  stores: () => Object.values(SELLERS).filter(s => s.type === "store"),
  bySeller: (sid) => PRODUCTS.filter(p => p.seller === sid),
  grade: (n) => GRADES[n - 1],
  // For You: departments the user picked, gender for fashion, then interest overlap, then saves.
  forYou(prefs) {
    const depts = prefs?.depts?.length ? prefs.depts : DEPTS.map(d => d.id);
    const dep = prefs?.dep || "All";
    const likes = prefs?.styles || [];
    return PRODUCTS
      .filter(p => depts.includes(p.dept))
      .filter(p => p.dept !== "Fashion" || dep === "All" || p.dep === dep || p.dep === "U")
      .map(p => ({ p, s: (p.styles.filter(s => likes.includes(s)).length * 300) + p.saves - p.days * 10 }))
      .sort((a, b) => b.s - a.s).map(x => x.p);
  },
  newIn: (prefs) => api.forYou(prefs).slice().sort((a, b) => a.days - b.days),
  trending: (prefs) => api.forYou(prefs).slice().sort((a, b) => (b.saves / (b.days + 2)) - (a.saves / (a.days + 2))),
};

/* ---------- Image fallback ----------
   Product photos are hotlinked from Unsplash. If a photo can't load (offline,
   blocked by a sandbox), a drawn placeholder in Droba colours takes its place. */
const SHAPES = {
  Dresses: '<path d="M43 26h14l2 14 13 58H28l13-58z"/><path d="M43 26l-3-10M57 26l3-10" fill="none" stroke-width="2.5"/>',
  Tops: '<path d="M30 34l12-7q8 6 16 0l12 7 8 15-10 4-2-4v40H34V49l-2 4-10-4z"/>',
  Shirts: '<path d="M30 34l12-7 8 8 8-8 12 7 8 15-10 4-2-4v40H34V49l-2 4-10-4z"/><path d="M50 35v54" fill="none" stroke-width="2"/>',
  Jackets: '<path d="M28 34l14-8 8 10 8-10 14 8 6 58H62V60H38v32H22z"/><path d="M50 36v24" fill="none" stroke-width="2"/>',
  Jeans: '<path d="M34 24h32l5 74H57l-7-50-7 50H29z"/>',
  Bags: '<path d="M26 52h48l5 44H21z"/><path d="M38 52q0-18 12-18t12 18" fill="none" stroke-width="3.5"/>',
  Sneakers: '<path d="M16 80l4-18q14 2 24-8l8 4q14 14 30 16 6 2 4 12H16z"/><path d="M16 88h70" fill="none" stroke-width="3"/>',
  Shoes: '<path d="M20 58h10l6 14q18 4 34 12 6 3 10 4v6H24l-2-8z"/><path d="M23 86v12" fill="none" stroke-width="4"/>',
  "Watches & jewellery": '<rect x="42" y="20" width="16" height="22" rx="3"/><rect x="42" y="78" width="16" height="22" rx="3"/><circle cx="50" cy="60" r="20"/><circle cx="50" cy="60" r="14" fill="#fff" opacity=".6"/>',
  Phones: '<rect x="36" y="20" width="28" height="78" rx="6"/><rect x="39.5" y="26" width="21" height="62" rx="2" fill="#fff" opacity=".55"/>',
  Tablets: '<rect x="24" y="24" width="52" height="70" rx="5"/><rect x="28.5" y="29" width="43" height="60" rx="2" fill="#fff" opacity=".55"/>',
  Smartwatches: '<rect x="42" y="18" width="16" height="24" rx="3"/><rect x="42" y="78" width="16" height="24" rx="3"/><rect x="34" y="40" width="32" height="40" rx="9"/><rect x="39" y="45" width="22" height="30" rx="5" fill="#fff" opacity=".55"/>',
  Laptops: '<rect x="25" y="32" width="50" height="36" rx="3"/><rect x="29" y="36" width="42" height="28" fill="#fff" opacity=".55"/><path d="M16 70h68l-6 8H22z"/>',
  Printers: '<rect x="18" y="48" width="64" height="30" rx="4"/><rect x="30" y="32" width="40" height="16"/><rect x="30" y="72" width="40" height="20" fill="#fff" opacity=".75"/>',
  TVs: '<rect x="14" y="28" width="72" height="46" rx="3"/><rect x="18" y="32" width="64" height="38" fill="#fff" opacity=".5"/><path d="M42 74l-6 14M58 74l6 14M30 88h40" fill="none" stroke-width="3"/>',
  Audio: '<path d="M27 68V56a23 23 0 0 1 46 0v12" fill="none" stroke-width="5"/><rect x="21" y="62" width="15" height="26" rx="5"/><rect x="64" y="62" width="15" height="26" rx="5"/>',
  Gaming: '<path d="M30 46h40a14 14 0 0 1 14 14l3 16a8 8 0 0 1-14 6l-7-9H34l-7 9a8 8 0 0 1-14-6l3-16a14 14 0 0 1 14-14z"/><path d="M34 56v12M28 62h12" stroke="#fff" stroke-width="3.5"/><circle cx="64" cy="58" r="3.5" fill="#fff"/><circle cx="71" cy="65" r="3.5" fill="#fff"/>',
  Cameras: '<rect x="16" y="42" width="68" height="44" rx="6"/><rect x="28" y="33" width="20" height="11" rx="2"/><circle cx="50" cy="64" r="15" fill="#fff" opacity=".6"/><circle cx="50" cy="64" r="8"/>',
  Fridges: '<rect x="31" y="18" width="38" height="80" rx="4"/><path d="M31 45h38M61 26v12M61 53v22" fill="none" stroke="#fff" stroke-width="2.5"/>',
  "Washing machines": '<rect x="27" y="24" width="46" height="70" rx="4"/><circle cx="50" cy="63" r="16" fill="#fff" opacity=".7"/><circle cx="50" cy="63" r="9"/><path d="M33 34h14" stroke="#fff" stroke-width="3"/>',
  "Kitchen appliances": '<rect x="18" y="40" width="64" height="42" rx="4"/><rect x="24" y="46" width="38" height="30" rx="2" fill="#fff" opacity=".6"/><path d="M71 50v4M71 60v4" stroke="#fff" stroke-width="3"/>',
  "Fans & ACs": '<circle cx="50" cy="46" r="24" fill="none" stroke-width="3"/><path d="M50 46l-7-18a8 8 0 0 1 14 0zM50 46l18 6a8 8 0 0 1-8 13zM50 46l-11 15a8 8 0 0 1-7-14z"/><path d="M50 70v22M36 94h28" fill="none" stroke-width="4"/>',
  "Generators & solar": '<rect x="18" y="40" width="64" height="42" rx="4"/><rect x="26" y="48" width="24" height="18" fill="#fff" opacity=".6"/><path d="M18 40l7-9h50l7 9" fill="none" stroke-width="3"/><circle cx="30" cy="88" r="6"/><circle cx="70" cy="88" r="6"/>',
  Sofas: '<path d="M22 46h56v16H22z"/><path d="M18 60h64v22H18z"/><path d="M12 54h12v28H12zM76 54h12v28H76z"/><path d="M20 82v8M80 82v8" fill="none" stroke-width="3.5"/>',
  Chairs: '<path d="M34 30h32v36H34z"/><path d="M28 62h44v14H28z"/><path d="M32 76l-4 18M68 76l4 18" fill="none" stroke-width="3.5"/>',
  Tables: '<path d="M14 48h72v7H14z"/><path d="M22 55v38M78 55v38" fill="none" stroke-width="4.5"/>',
  "Beds & mattresses": '<path d="M16 36v58M84 60v34" fill="none" stroke-width="4.5"/><rect x="16" y="60" width="68" height="20" rx="3"/><rect x="22" y="48" width="22" height="12" rx="4"/>',
  "Wardrobes & storage": '<rect x="26" y="18" width="48" height="80" rx="3"/><path d="M50 18v80" stroke="#fff" stroke-width="2.5"/><path d="M45 54v8M55 54v8" stroke="#fff" stroke-width="3"/>',
  Lighting: '<path d="M36 24h28l10 30H26z"/><path d="M50 54v34M37 92h26" fill="none" stroke-width="4"/>',
  Cookware: '<path d="M24 54h52v24a12 12 0 0 1-12 12H36a12 12 0 0 1-12-12z"/><path d="M16 57h8M76 57h8" stroke-width="4"/><rect x="34" y="45" width="32" height="6" rx="3"/>',
  "Strollers & car seats": '<path d="M28 40a26 26 0 0 1 42 22H28z"/><path d="M24 62h52l-6 16H32z"/><circle cx="35" cy="88" r="6"/><circle cx="66" cy="88" r="6"/><path d="M76 62l8-24" fill="none" stroke-width="3"/>',
  Toys: '<rect x="20" y="60" width="26" height="26" rx="3"/><rect x="52" y="60" width="26" height="26" rx="3"/><rect x="36" y="32" width="26" height="26" rx="3"/>',
  Bicycles: '<circle cx="28" cy="74" r="16" fill="none" stroke-width="4"/><circle cx="74" cy="74" r="16" fill="none" stroke-width="4"/><path d="M28 74l14-28h24l8 28M42 46l12 28 12-28M36 40h12" fill="none" stroke-width="3.5"/>',
  "Gym equipment": '<rect x="16" y="42" width="11" height="36" rx="3"/><rect x="73" y="42" width="11" height="36" rx="3"/><rect x="27" y="49" width="8" height="22" rx="2"/><rect x="65" y="49" width="8" height="22" rx="2"/><path d="M35 60h30" stroke-width="5"/>',
  Books: '<rect x="24" y="28" width="16" height="64" rx="2"/><rect x="42" y="34" width="15" height="58" rx="2"/><rect x="60" y="30" width="16" height="62" rx="2" transform="rotate(8 68 61)"/>',
  "Musical instruments": '<circle cx="44" cy="76" r="16"/><circle cx="52" cy="58" r="11"/><path d="M56 52l20-30" stroke-width="5"/><circle cx="46" cy="72" r="5" fill="#fff" opacity=".7"/>',
  "Hair & beauty tools": '<path d="M22 40h42a14 14 0 0 1 0 28H22z"/><rect x="38" y="66" width="13" height="30" rx="4"/><circle cx="64" cy="54" r="6" fill="#fff" opacity=".7"/>',
  Cars: '<path d="M12 82V66l10-4 11-14h34l12 14 9 4v16z"/><path d="M37 52h12v10H30zM53 52h11l8 10H53z" fill="#fff" opacity=".7"/><circle cx="29" cy="84" r="7"/><circle cx="72" cy="84" r="7"/>',
  Motorcycles: '<circle cx="25" cy="78" r="13" fill="none" stroke-width="4"/><circle cx="76" cy="78" r="13" fill="none" stroke-width="4"/><path d="M25 78l18-20h18l15 20M43 58l-6-10h-8M61 58l6-12h8" fill="none" stroke-width="4"/><path d="M43 58h18l-4 10H47z"/>',
  Vintage: '<path d="M50 30a5 5 0 1 1 5-5c0 3-5 4-5 8v3"/><path d="M50 36L22 58h56z"/>',
};
Object.assign(SHAPES, {
  "Phone accessories": SHAPES.Phones, "Desktops & monitors": SHAPES.TVs, "Computer accessories": SHAPES.Laptops, Kitchen: SHAPES["Kitchen appliances"],
  "Home decor": SHAPES.Lighting, "Bedding & curtains": SHAPES["Beds & mattresses"], "Kids' clothing": SHAPES.Tops, "Baby gear": SHAPES["Strollers & car seats"],
  "Sports gear": SHAPES["Gym equipment"], "Art & collectibles": SHAPES.Vintage, "Wellness devices": SHAPES["Hair & beauty tools"], "Parts & accessories": SHAPES.Cars,
  Fashion: SHAPES.Dresses, "Phones & Tablets": SHAPES.Phones, Computers: SHAPES.Laptops, "TV, Audio & Gaming": SHAPES.Gaming, Appliances: SHAPES.Fridges,
  Furniture: SHAPES.Sofas, "Home & Kitchen": SHAPES.Lighting, "Kids & Baby": SHAPES["Strollers & car seats"], "Sports & Fitness": SHAPES.Bicycles,
  "Books & Hobbies": SHAPES.Books, "Beauty & Wellness": SHAPES["Hair & beauty tools"], "Vehicles & Parts": SHAPES.Cars,
});
const TINTS = { Red: ["#F6D3D3", "#C8102E"], White: ["#F3ECE2", "#B9A58C"], Black: ["#E3DAD7", "#3B2A2A"], Blue: ["#DCE5F1", "#3C5F93"], Brown: ["#EEDFCF", "#8A5A36"], Grey: ["#E7E3DF", "#6E6763"], Silver: ["#E9E9EC", "#7E808A"], Pink: ["#F8DEE3", "#C7607A"], Beige: ["#F2E7D7", "#B08D63"], Purple: ["#E8DDF0", "#7A5A98"], Green: ["#DDEBDF", "#2E6B45"], Yellow: ["#F7EBC9", "#B88A1B"] };
function placeholder(cat = "Vintage", color = "Red") {
  const [bg, fg] = TINTS[color] || TINTS.Red;
  const shape = SHAPES[cat] || SHAPES.Vintage;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 125"><rect width="100" height="125" fill="${bg}"/><circle cx="50" cy="60" r="38" fill="#fff" opacity=".45"/><g fill="${fg}" stroke="${fg}" stroke-linejoin="round" opacity=".88" transform="translate(0 4)">${shape}</g></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
