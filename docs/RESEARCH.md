# Phase 1–2: Investigation of G2A.COM (reference research)

> Method: direct fetch of g2a.com is blocked by Cloudflare for non-browser agents, so this
> document combines browser-observable knowledge of G2A's public pages, its official
> documentation (sell.on.g2a.com, support center), and well-established patterns of key
> marketplaces (Kinguin, Eneba) that mirror G2A's flows. Everything implemented is
> **original code, branding and assets** — no proprietary code, images, or mark copied.

## 1.1 Sitemap (target structure, mapped to our app)

| Reference area | Our route |
|---|---|
| Homepage | `/` |
| Category listing (games, gift cards, software, subscriptions, points) | `/category/[slug]` |
| Search results + autocomplete | `/search`, `/api/search/suggest` |
| Product detail (multi-seller offers) | `/product/[slug]` |
| Individual seller storefront | `/store/[slug]` |
| Cart | `/cart` |
| Checkout + payment selection | `/checkout` |
| Order confirmation / key delivery | `/order/[number]` |
| Register / Login / Forgot / Reset | `/login`, `/register`, `/forgot-password`, `/reset-password` |
| Buyer dashboard | `/account` (overview, orders, library, wishlist, reviews, notifications, settings, support) |
| Seller registration (verification workflow) | `/sell` |
| Seller dashboard | `/seller` (overview, offers+inventory, orders, payouts, reviews, settings) |
| Admin panel | `/admin` (stats, users, sellers, products, categories, orders+refunds, coupons, payouts, reviews, tickets, banners, audit logs, settings) |
| Support center | `/support` + ticket threads |
| Legal/compliance | `/legal/terms`, `/legal/privacy` |

G2A specifics mirrored: hero search, category nav with mega menu, "from €X" pricing,
seller offer tables with positive-feedback %, instant-delivery badges, region/platform
chips, coupon field + service fee at checkout, post-purchase digital key reveal,
user "library" of purchased keys, seller rating pages, Money-Back-Guarantee style support.

## 1.2 UI/UX findings applied

- Dark navy theme, vivid orange CTAs, dense product grids, cover-art cards at ~3:4,
  price-first typography, discount badge (we compute `-x%` vs RRP), star ratings,
  seller feedback % with counts, sticky glass header with large pill search,
  horizontal-scroll deal rails, trust/stat counters, footer with category link matrix.
- Behavior: debounced suggestions, keyboard-navigable search menu, optimistic cart
  badge updates, skeleton loading, empty states, hover lift+glow on cards, mobile drawer.

## 1.3 Functional findings applied

- Multi-seller marketplace: same product listed by N sellers, different price/region/stock.
- Discovery: full-text-ish name search, category/facets (platform, region, kind, price band),
  sorting (popular/price asc/desc/newest/rating), related products, bestsellers, trending.
- Purchase: cart with qty, coupons, service fee, checkout, multi-payment selection,
  sandbox capture, key reservation → delivery on capture, order history, key reveal.
- Account: sessions, password reset tokens, email-verification flag, wishlist,
  recently viewed, notifications, support tickets + thread messages.
- Seller: application + admin approval, storefront, offer CRUD, key inventory upload,
  order tracking, commission + ledger, payout requests, reviews.
- Buyer protection: refund requests → admin approve/reject, key revocation, ledger reversal.

## Phase 2: technology inference (G2A) vs our stack

Confirmed/observable: heavy CDN usage (images on `images.g2a.com`), Cloudflare edge,
SSR HTML with client hydration, cookie-based session, payment iframes/redirects to
processors. Assumed: micro-service backend, search cluster, queue-based fulfillment.

**Our selection (why):** Next.js App Router (SSR + route handlers = one deployable with
excellent SEO + fast transitions), PostgreSQL+Drizzle (typed, transactional key reservation
with `FOR UPDATE SKIP LOCKED`), session-cookie auth with bcrypt (simple, auditable),
payment-provider abstraction with a fully working **sandbox provider** + seams for
Stripe/Razorpay via env. S3-compatible storage is abstracted behind generated local
assets for this build.
