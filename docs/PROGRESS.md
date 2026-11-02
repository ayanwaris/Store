# Progress Tracker

## Tooling
- [x] REA `rea-agents@6.8.0` installed globally; `rea setup --yes` → ready; doctor healthy
- [x] Ghidra 12.1.3 at `~/tools/ghidra12` + Temurin JDK 21 (~`~/tools/jdk`); headless verified
- [x] REA ↔ Ghidra provider registered (`GHIDRA_INSTALL_DIR`, doctor: healthy)
- Note: Ghidra 12.2's launcher rejects this image's Temurin build; 12.1.3 (REA's expected
  version) works headless. GUI requires an X display (headless sandbox by design).

## Research & planning
- [x] RESEARCH.md — sitemap, UI/UX findings, functional analysis, tech inference
- [x] IMPLEMENTATION_PLAN.md — architecture, schema, API surface, workflows, test plan

## Build (all complete)
- [x] Schema (24 tables, indexes) + `drizzle-kit push`
- [x] Seed: 38 products, 130 offers, 1,530 keys, 96 reviews, 5 sellers, demo orders/ledger,
      coupons, banners, tickets, payouts, notifications, audit entries
- [x] Core libs: auth/sessions, payments (sandbox provider), rate limit, commerce engine, ops
- [x] Buyer pages: home, category, search, product, storefront, cart, checkout, order,
      account (overview/orders/library/wishlist/reviews/notifications/settings/support)
- [x] Seller: apply flow, overview, offers(+edit modals), new listing, keys upload,
      sales ledger, payouts, reviews, settings
- [x] Admin: overview, users, sellers, products, catalog+banners, orders(+detail), coupons,
      payouts, refunds, moderation+tickets, audit logs, settings
- [x] 35 API endpoints, Zod-validated, RBAC-guarded, audit-logged

## QA results (executed, all green)
- [x] `npx next typegen` ✓
- [x] `tsc --noEmit` ✓ (0 errors)
- [x] `npm run build` ✓ (73 routes)
- [x] `scripts/smoke.sh` ✓ — register→cart(2)→coupon→checkout→confirm→delivery verified→
      decline path 402→cancel (stock release)→wishlist
- [x] RBAC: buyer→/api/admin/stats = 403; anon→/api/orders = 401
- [x] Seeded accounts: buyer 2 completed orders; admin stats sane; seller has 27 offers
- [x] Page renders: /, category, product, store, cart, sell, support, login → all 200

## Bugs found & fixed during build
1. Seed: random seller-offer pairing missed the demo-order target → fallback lookup added.
2. `db.query` used without schema wiring → `drizzle(pool, { schema })`.
3. Raw-SQL result typing → explicit `rows` casts.
4. `numeric` columns → `mode: "number"` to keep totals arithmetic in JS.

## Deferred / by design
- Stripe/Razorpay = provider seams (env), sandbox is the demo payment rail.
- Membership/loyalty & affiliate = referral code on users + documented stub.
- Cover art is procedural/original; hero image AI-generated (public/img/hero.jpg).
