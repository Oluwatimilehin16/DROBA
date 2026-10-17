# Droba

Nigeria's marketplace for pre-loved everything: fashion, phones, computers, furniture, appliances, baby gear, cars and more.
Droba helps people **find** items near them, **chat** with the seller, and **meet or arrange delivery**. Buyers inspect, then pay the seller directly. Droba never handles that payment.

| Folder | What it is |
| --- | --- |
| `apps/api` | Backend: Node.js, Express 5, TypeScript, Socket.io, Prisma, PostgreSQL + PostGIS, Redis |
| `apps/web` | Frontend: Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| `packages/shared` | Types, validation (zod) and constants used by **both** apps, so the frontend and backend can't drift apart |
| `prototype/` | The original clickable HTML prototype (still live at https://oluwatimilehin16.github.io/DROBA/) |

## Run it on your computer

You need **Node.js 22.9+** and **Docker Desktop** (for the databases).

```bash
cp .env.example .env          # then put two long random strings in JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
docker compose up -d          # PostgreSQL + PostGIS on :5432, Redis on :6379
npm install
npm run db:migrate            # creates the tables
npm run db:seed               # 16 sellers and 66 listings from the prototype
npm run dev                   # API on http://localhost:4000, web on http://localhost:3000
                              # (also rebuilds shared code and applies new database changes first)
```

Demo logins (password `droba-demo-123`):
- Buyer: `buyer@droba.ng`
- Business store: `gadgetcorner@seed.droba.ng` (store page: http://localhost:3000/gadgetcorner)
- Premium store: `yabavintage@seed.droba.ng`
- Individual seller: `i1@seed.droba.ng`
- Admin (http://localhost:3000/admin): `admin@droba.ng`

Emails (verification, password reset) are printed in the API terminal while `EMAIL_PROVIDER=console`.
Photos are saved in `apps/api/.uploads` until you set `S3_BUCKET`.

### Admin and launch commands

```bash
npm run make-admin -- you@example.com          # let an account into /admin (add --remove to take it away)
npm run db:clear-demo                          # shows what the demo data is
npm run db:clear-demo -- --yes                 # deletes the demo sellers, listings, buyer and admin (do this before launch)
```

The admin area (`/admin`) handles buyer reports, store verification requests, suspending people and removing listings. Every decision is logged with who made it, and the person affected is emailed the reason.

The Terms (`/terms`), Privacy policy (`/privacy`) and Prohibited items (`/prohibited`) pages are a solid starting point, not legal advice: have a Nigerian lawyer review them before launch, and put your registered business name and address in `apps/web/src/components/legal.tsx`.

In VS Code, open the repo folder; `npm run dev` runs both apps. To run them separately: `npm run dev:api` and `npm run dev:web`.

## How it handles lots of people at once

- **Real-time chat** runs on Socket.io. Every API instance shares events through Redis, so you can run several copies behind a load balancer and two people on different servers still chat instantly. Messages are saved before they're delivered, retries never create duplicates (each message carries a client id), and typing, read receipts and online status are included. Online status is only sent to people who have that chat open, so 1,000 people coming online doesn't flood everyone.
- **Near me** uses PostGIS: every listing has a location point with a spatial index, so "closest first" and "within 10 km" stay fast as listings grow. Exact pins are rounded to about 100 m before they're shown.
- **Search** uses PostgreSQL full-text search plus trigram matching, so `iphnoe` still finds iPhones. Filter counts are worked out in the same request.
- **Redis** caches hot listings, store pages and search results (they refresh the moment a seller changes something), holds sessions so logging out takes effect instantly everywhere, and rate-limits sign-ups, logins and messages.
- **Passwords** are hashed with scrypt on Node's worker thread pool, so a rush of sign-ups doesn't freeze the server for everyone else.
- **Sessions**: a short-lived access token in memory plus a rotating, httpOnly refresh cookie. A stolen, reused refresh token ends the session.
- **Photos** upload straight from the browser to S3 or Cloudflare R2 (shrunk to 1600px first), never through the API.

Every push runs `.github/workflows/ci.yml`: type checks, 30+ API tests against real PostGIS and Redis, both builds, a load test (1,000 people signing up, connecting and chatting at once, plus 3,000 searches), and browser screenshots at phone and desktop sizes. Results land on the `ci-results` branch.

## API overview (all under `/api`)

| | |
| --- | --- |
| Auth | `POST /auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `/auth/verify-email`, `/auth/resend-verification`, `/auth/forgot-password`, `/auth/reset-password` |
| You | `GET/PATCH /me`, `POST /me/mode` (Buyer ⇄ Seller), `GET /me/saved`, `GET /me/following`, `GET /me/listings`, `GET /me/analytics?days=`, `GET/POST /me/campaigns`, `GET /me/bag`, `PUT /me/bag/:listingId`, `POST /me/bag/merge`, `POST /me/bag/remove` |
| Orders | `POST /orders`, `GET /orders`, `GET /orders/selling`, `GET /orders/:id`, `POST /orders/:id/status` |
| Reports | `POST /reports` (a listing or a seller) |
| Admin | `GET /admin/summary`, `GET /admin/actions`, `GET /admin/reports`, `POST /admin/reports/:id`, `GET /admin/verifications`, `POST /admin/verifications/:sellerId`, `POST /admin/sellers/:id/unverify`, `GET /admin/users`, `POST /admin/users/:id/suspend`, `POST /admin/users/:id/unsuspend`, `GET /admin/listings`, `POST /admin/listings/:id/remove`, `POST /admin/listings/:id/restore` |
| Sellers & stores | `POST /sellers`, `PATCH /sellers/me`, `POST /sellers/me/plan`, `POST /sellers/me/verification`, `GET /sellers/handle-available`, `GET /sellers/by-handle/:handle`, `GET /sellers/:id`, `GET /sellers/:id/contact`, `PUT/DELETE /sellers/:id/follow`, `GET/POST /sellers/:id/ratings` |
| Listings | `GET /listings` (search: `q`, `department`, `category`, `condition`, `gender`, `minPrice`, `maxPrice`, `city`, `lat`, `lng`, `radiusKm`, `sellerType`, `verified`, `tested`, `sellerId`, `sort`, `page`), `POST /listings`, `GET/PATCH/DELETE /listings/:id`, `GET /listings/:id/similar`, `POST /listings/:id/boost`, `PUT/DELETE /listings/:id/save` |
| Chat | `GET/POST /conversations`, `GET /conversations/unread`, `GET /conversations/:id`, `GET/POST /conversations/:id/messages`, `POST /conversations/:id/read` |
| Socket.io | client → server: `message:send`, `conversation:join`, `conversation:read`, `typing`; server → client: `message:new`, `conversation:read`, `typing`, `presence`, `unread:count` (typed in `packages/shared/src/events.ts`) |
| Other | `POST /uploads/presign`, `GET /meta`, `GET /health` |

## Going live (outline)

- **Database**: managed PostgreSQL with PostGIS (Supabase, Neon, AWS RDS). **Redis**: Upstash or Redis Cloud. **Photos**: Cloudflare R2 or S3 + a CDN.
- **API**: any host that keeps a Node process running with WebSockets (Render, Railway, Fly.io, AWS ECS). Use `apps/api/Dockerfile`; it runs migrations on start. Set `NODE_ENV=production`, real secrets, `EMAIL_PROVIDER=resend` (or `ses`), and `CORS_ORIGINS`/`WEB_URL` to your domain.
- **Web**: Vercel or the same host (`apps/web/Dockerfile`). Set `API_INTERNAL_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL=https://droba.ng` and the same `INTERNAL_API_KEY` as the API.
- Set `TRUST_PROXY` on the API to the number of proxies in front of it (load balancer, plus 1 if browser calls go through the Next.js `/api` rewrite), so rate limits see each visitor's real IP.

Not built yet: taking payment for Premium/Business plans and boosts (plans switch on immediately in this build; hook a provider such as Paystack into `POST /sellers/me/plan` and the boost endpoint, and have its renewal webhook top up boost credits instead of the timer in `services/promotions.ts`), and email or push notifications for new order requests.
