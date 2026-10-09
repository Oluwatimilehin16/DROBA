# Droba

Nigeria's marketplace for pre-loved everything: fashion, phones, computers, furniture, appliances, baby gear, cars and more.
Droba connects buyers and sellers. Buyers pay the seller **on delivery**, after inspecting the item, then rate them.

This repo is the **frontend prototype** (no backend yet).

## Run it
- **Quickest:** open `index.html` in your browser.
- **In VS Code:** install the recommended *Live Server* extension, right-click `index.html` → *Open with Live Server*.

Product photos load from Unsplash, so you need an internet connection to see them.

## Editing
Edit the files in `src/`, then rebuild `index.html`:

```bash
python3 build.py
```

| File | What's in it |
| --- | --- |
| `src/styles.css` | Design tokens (colours, fonts) at the top, then every component |
| `src/data.js` | Departments & categories, condition grades, sellers, products, plans, and the mock `api` object |
| `src/app.js` | Screens, routing, state and event handling (plain JavaScript, no framework) |
| `build.py` | Combines `src/` into the single-file `index.html` |

## Connecting the backend
Every screen reads data through `api.*` in `src/data.js` (`api.products()`, `api.forYou(prefs)`, `api.seller(id)` …).
Replace those with `fetch()` calls that return the same shapes. Actions that change data (add to bag, send order request,
publish listing, mark delivered, rate seller) live in the `ACT` object in `src/app.js`; each is where a POST/PATCH call goes.

## Business rules in this build
- **12 departments** (`DEPTS` in `src/data.js`): Fashion, Phones & Tablets, Computers, TV Audio & Gaming, Appliances,
  Furniture, Home & Kitchen, Kids & Baby, Sports & Fitness, Books & Hobbies, Beauty & Wellness, Vehicles & Parts.
  Each has a `kind` (fashion / tech / goods) that decides which listing fields and filters apply.
- **Condition grades:** Like New, First Grade, Fairly Used, Fair. Everything must be pre-owned.
- **No payments on Droba.** Buyers send an order request → seller calls to confirm → buyer pays seller on delivery → buyer rates seller.
- **Sellers:** anyone can sell up to 5 items free with no store. A storefront is paid (Premium ₦5,000/mo, Business ₦15,000/mo).
  Anyone can pay to boost a listing. Prices and limits are placeholders in `PLANS`, `FREE_LIMIT` and `BOOST_PRICES`.
- **One account, two modes:** switch between Shopping and Selling at any time.

## Screen map
Use the **Screens** button (bottom-right) to jump anywhere. Remove `jumperHTML()` before launch.
