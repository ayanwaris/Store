# KEYHAVEN — multi-vendor digital key marketplace

A complete, original marketplace inspired by the observable UX of G2A.com — rebuilt from
scratch with no proprietary code, branding, or assets. Buy keys, gift cards, software and
subscriptions from competing sellers; sellers manage inventory and payouts; admins run the
platform.

![Stack](https://img.shields.io/badge/Next.js%2016-16.2-black) ![Drizzle](https://img.shields.io/badge/Drizzle-PostgreSQL-blue)

## Feature map

| Area | Highlights |
|---|---|
| **Buyer** | hero search w/ autocomplete, categories, filters/sorting/pagination, product pages w/ multi-seller offer tables & best-offer pick, wishlist, recently viewed, cart, coupons, service fee, sandbox checkout (card/PayPal), instant key delivery + library, order history, refund requests, verified reviews, notifications, support tickets |
| **Seller** | application + admin approval workflow, storefront page, offer CRUD, bulk key inventory upload (dup-safe), live stock, sales ledger w/ commission math, 14-day revenue chart, payout requests |
| **Admin** | KPI dashboard & revenue chart, users (ban/role), sellers (approve/reject/suspend/commission), products & featured, categories, homepage banners, orders + refunds pipeline, coupons, payouts settlement, review moderation, support ticket inbox, platform settings, audit log |
| **Platform** | key reservation (`FOR UPDATE SKIP LOCKED`), transactional delivery, double-entry-ish ledger, rate limiting, origin checks, bcrypt, HttpOnly sessions, RBAC, Zod-validated APIs |

## Stack & why

- **Next.js 16 App Router** — SSR storefront + API route handlers in one deployable.
- **PostgreSQL + Drizzle ORM** — typed schema, real transactions for checkout/refunds/payouts.
- **Tailwind v4 design system** — custom token theme, original dark "vault" identity.
- **Payments** — provider interface (`src/lib/payments.ts`). `PAYMENT_PROVIDER=sandbox` is fully
  functional out of the box; Stripe/Razorpay slots are wired via env keys.
- **Images** — procedural, deterministic cover art (no copyrighted game artwork).

## Quickstart

```bash
npm install
cp .env.example .env            # set DATABASE_URL
npx drizzle-kit push            # create tables
npx tsx src/db/seed.ts          # demo data (catalog, sellers, keys, demo orders…)
npm run dev                     # http://localhost:3000
```

### Demo accounts (dummy — never real secrets)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@keyhaven.app` | `Admin!23456` |
| Seller (approved, “KeyForge Trading”) | `seller@keyhaven.app` | `Seller!23456` |
| Buyer (has orders, keys, wishlist) | `buyer@keyhaven.app` | `Buyer!23456` |

More sellers: `seller2@keyhaven.app` … `seller5@keyhaven.app` (same password).
Coupons: `WELCOME10` (10% > €5), `GAMER20` (20% > €30), `FLAT5`.

## Sandbox payments

- Success card: `4242 4242 4242 4242`, any future expiry, any CVC.
- Decline card: `4000 0000 0000 0002` — order stays *pending_payment*, retry or cancel
  (cancellation releases reserved keys back to stock).
- Live providers: set `PAYMENT_PROVIDER=stripe|razorpay` + env keys and implement the two
  SDK calls in `src/lib/payments.ts`. No card data is stored anywhere.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | dev server |
| `npm run build && npm start` | production |
| `npx drizzle-kit push` | apply DB schema |
| `npx tsx src/db/seed.ts` | reset + seed demo data |
| `npm run typecheck` / `npx tsc --noEmit` | types |
| `BASE=http://localhost:3000 bash scripts/smoke.sh` | end-to-end API smoke: register → cart → checkout → pay → delivery verified → decline path |

## Testing

`scripts/smoke.sh` covers the critical buyer path end-to-end against a running server.
QA checklist and results tracked in `docs/PROGRESS.md`. See `docs/RESEARCH.md` and
`docs/IMPLEMENTATION_PLAN.md` for the reverse-engineering notes and architecture plan.

## Environment variables

See `.env.example`. Required: `DATABASE_URL`. Optional: `PAYMENT_PROVIDER`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`NEXT_PUBLIC_APP_URL`.

## Deployment

Any Node host + managed Postgres. `npm run build` then `npm start`; schema via
`npx drizzle-kit push`; seed is optional (demo). Set `NODE_ENV=production` (secure cookies
activate automatically).

## Tooling note

This sandbox additionally carries **REA** (`rea-agents`, MIT) and **Ghidra 12.1.3**
(user-local, headless) for legitimate binary/app reverse-engineering work — details in
`docs/TOOLING.md`.

## Legal

KeyHaven is an original demo project with a fictional catalog. It is not affiliated with
or endorsed by G2A. All product names are invented for demonstration.
