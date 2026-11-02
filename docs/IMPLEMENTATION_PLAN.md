# Phase 3: Implementation Plan — KEYHAVEN

Original brand: **KEYHAVEN** — "Every game. One vault." Dark navy + ember orange + violet.

## Architecture
- Next.js 16 App Router, React 19, TypeScript, Tailwind v4 (token-driven design system).
- PostgreSQL via Drizzle ORM; transactions around checkout, delivery, refunds, payouts.
- Auth: bcrypt password hashing, httpOnly cookie sessions (DB-backed, expiring),
  role/claims via `users.role` (`buyer`/`admin`) + approved `sellerProfiles` for sellers.
- Payments: `src/lib/payments` provider interface; **SandboxProvider** fully functional
  (test card `4000 0000 0000 0002` = decline), seams for Stripe/Razorpay (`PAYMENT_PROVIDER`).
- Rate limiting (in-memory sliding window) on auth/checkout; origin check on mutations;
  Zod validation on every mutating endpoint; admin audit logging.

## Database schema (Drizzle)
users, sessions, password_resets, categories, products, product_images (gallery JSON),
seller_profiles, offers, inventory_keys (available/reserved/sold/revoked), carts,
cart_items, coupons, orders, order_items, payments, refunds, reviews, wishlists,
recently_viewed, notifications, support_tickets, ticket_messages, payouts,
transactions (double-entry-ish ledger: sale/commission/payout/refund), banners,
audit_logs, settings. Indexes on hot lookups (offers.productId, keys(offerId,status),
orders.userId, reviews.sellerId ...). Money as `numeric(mode:'number')`.

## Key flows
1. **Checkout:** server cart → coupon → create order `pending_payment` + atomically reserve
   keys `FOR UPDATE SKIP LOCKED` → sandbox capture → `completed`: keys→sold, stock--,
   seller balance += price − commission, ledger rows, coupon usage, notifications.
   Cancel/failure releases reservations.
2. **Digital delivery:** keys never exposed pre-payment; reveal UI on order page;
   buyer `library` aggregates delivered items.
3. **Refunds:** buyer request → admin approve → item refunded, keys revoked, ledger reversal,
   seller balance adjusted; reject → status + notification.
4. **Seller:** apply → pending → admin approve → offer/inventory/payout management.
   Payout request → admin marks paid → ledger payout row, balance debited.
5. **Admin:** full CRUD/moderation with RBAC (`users.role='admin'`) + audit log writes.

## API surface (consistent `{ ok, data | error }` + HTTP codes)
- auth: `register|login|logout|password/forgot|password/reset`
- catalog: `GET /api/products`, `GET /api/products/[slug]`, `GET /api/categories`, `GET /api/search/suggest`
- cart: `GET/POST/DELETE /api/cart`, `PATCH/DELETE /api/cart/[itemId]`
- `POST /api/coupons/validate`, `POST /api/checkout`, `POST /api/checkout/confirm`, `POST /api/checkout/cancel`
- orders: `GET /api/orders`, `GET /api/orders/[id]`, `POST /api/orders/[id]/refund-request`
- wishlist, reviews, notifications(+read), support tickets(+messages)
- seller: `POST /api/seller/apply`; `/api/seller/[resource]` (`offers|orders|payouts|reviews|profile`), `/api/seller/offers/[id]`, `/api/seller/offers/[id]/keys`, `/api/seller/payouts/[id]`
- admin: `GET /api/admin/stats`; `/api/admin/[resource]` (`users|sellers|products|categories|coupons|payouts|banners|refunds|settings|logs`), `/api/admin/[resource]/[id]` incl. moderation actions; `POST /api/admin/orders/[id]/refund`

## Feature comparison
| Reference functionality | Our implementation | Priority | Status |
|---|---|---|---|
| Homepage, mega nav | ✅ original design | High | built |
| Catalog, search, filters, sort | ✅ DB-backed + autocomplete | High | built |
| Product pages, multi-offer tables | ✅ w/ best-offer pick | High | built |
| Cart, coupons, checkout, sandbox payments | ✅ | High | built |
| Digital delivery + library | ✅ reserved→sold keys | High | built |
| Accounts, reset, notifications, wishlist | ✅ | High | built |
| Seller onboarding + dashboard, payouts | ✅ approval flow, ledger | High | built |
| Admin panel (users→settings, refunds) | ✅ | High | built |
| Reviews & ratings | ✅ gated by purchase | Medium | built |
| Support tickets | ✅ threaded | Medium | built |
| Membership/loyalty, affiliate | Functional equivalent (settings + referral code field, deferred UI) | Medium | stubbed-by-design |
| Stripe/Razorpay live | Provider seams + env config | Medium | sandbox default |

## Testing strategy
- Seed-driven demo accounts; scripted API smoke test (`scripts/smoke.sh`) for auth→cart→
  checkout→confirm→delivery→review; manual checklist in `docs/PROGRESS.md`.
- `tsc --noEmit`, `next build`, `build_and_start` healthcheck gate all delivery.
