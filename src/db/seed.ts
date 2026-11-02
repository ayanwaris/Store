/**
 * KEYHAVEN seed — demo dataset with dummy credentials only.
 * Run:  npx tsx src/db/seed.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "./index";
import * as s from "./schema";
import { genKey, mulberry32, slugify } from "../lib/utils";

const rand = mulberry32(1337);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const ri = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const price = (rrp: number, lo: number, hi: number) =>
  Math.max(0.49, Math.floor(rrp * (lo + rand() * (hi - lo))) + 0.99);
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

async function main() {
  console.log("→ truncating tables…");
  await db.execute(sql`truncate table users, categories, coupons, banners, settings restart identity cascade`);

  /* ------------------------------- settings ------------------------------- */
  await db.insert(s.settings).values([
    { key: "fees", value: { percent: 3, fixed: 0.49 } },
    { key: "default_commission", value: 12 },
    { key: "support_email", value: "support@keyhaven.app" },
  ]);

  /* --------------------------------- users -------------------------------- */
  console.log("→ users & sellers…");
  const bcrypt = (await import("bcryptjs")).default;
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const [admin] = await db.insert(s.users).values({
    name: "Ava Sterling", email: "admin@keyhaven.app", passwordHash: hash("Admin!23456"),
    role: "admin", emailVerified: true, avatarHue: 262, referralCode: "KEYH-AVA",
  }).returning();
  const [buyer] = await db.insert(s.users).values({
    name: "Alex Rivera", email: "buyer@keyhaven.app", passwordHash: hash("Buyer!23456"),
    emailVerified: true, avatarHue: 20, referralCode: "KEYH-ALEX",
  }).returning();
  const reviewerNames: Array<[string, string]> = [
    ["Mia Chen", "mia@keyhaven.app"], ["Theo Novak", "theo@keyhaven.app"], ["Zara Iqbal", "zara@keyhaven.app"],
  ];
  const reviewers = await db.insert(s.users).values(
    reviewerNames.map(([name, email], i) => ({
      name, email, passwordHash: hash("Buyer!23456"), emailVerified: true, avatarHue: 120 + i * 70,
      referralCode: `KEYH-${name.split(" ")[0].toUpperCase()}`,
    })),
  ).returning();

  const sellerSeeds = [
    { storeName: "KeyForge Trading", email: "seller@keyhaven.app", rating: 99.1, count: 15230, commission: 10, hue: 25 },
    { storeName: "NovaKeys", email: "seller2@keyhaven.app", rating: 99.8, count: 22745, commission: 8, hue: 262 },
    { storeName: "Arcadia Digital", email: "seller3@keyhaven.app", rating: 99.2, count: 11940, commission: 11, hue: 190 },
    { storeName: "PixelVault GG", email: "seller4@keyhaven.app", rating: 98.4, count: 8112, commission: 12, hue: 330 },
    { storeName: "LootDrop Store", email: "seller5@keyhaven.app", rating: 96.9, count: 3417, commission: 14, hue: 90 },
  ];
  const sellerUsers = await db.insert(s.users).values(
    sellerSeeds.map((sd) => ({
      name: sd.storeName, email: sd.email, passwordHash: hash("Seller!23456"),
      emailVerified: true, avatarHue: sd.hue, referralCode: `KEYH-${sd.storeName.split(" ")[0].toUpperCase().slice(0, 8)}`,
    })),
  ).returning();

  const sellers = await db.insert(s.sellerProfiles).values(
    sellerSeeds.map((sd, i) => ({
      userId: sellerUsers[i].id, storeName: sd.storeName, slug: slugify(sd.storeName),
      about: `${sd.storeName} — trusted KeyHaven partner since 2019. Instant delivery, Europe-based support, keys sourced from authorized distributors.`,
      status: "approved", commissionRate: sd.commission,
      ratingAvg: sd.rating, ratingCount: sd.count,
      totalSales: Math.floor(sd.count * 3.1), lifetimeRevenue: Math.round(sd.count * 3.1 * 21.5 * 100) / 100,
      balance: ri(40, 900),
    })),
  ).returning();

  /* ------------------------------- categories ------------------------------ */
  console.log("→ categories…");
  const catSeeds = [
    { name: "Games", icon: "Gamepad2", blurb: "AAA blockbusters, indie darlings and everything between." },
    { name: "Gift Cards", icon: "Gift", blurb: "Wallet top-ups and store credit for every platform." },
    { name: "Software", icon: "AppWindow", blurb: "Productivity, creativity and security licenses." },
    { name: "Subscriptions", icon: "BadgeCheck", blurb: "Game passes and premium memberships." },
    { name: "Game Points", icon: "Coins", blurb: "In-game currency and credit packs." },
    { name: "DLC & Add-ons", icon: "Puzzle", blurb: "Expansions, season passes and cosmetics." },
  ];
  const cats = await db.insert(s.categories).values(
    catSeeds.map((c, i) => ({ ...c, slug: slugify(c.name), position: i })),
  ).returning();
  const catId = (slug: string) => cats.find((c) => c.slug === slug)!.id;

  /* -------------------------------- products ------------------------------- */
  console.log("→ products…");
  type P = {
    t: string; sub: string; kind: string; platform: string; region?: string; genre?: string;
    rrp: number; hue: number; featured?: boolean; cat: string; tags?: string[];
  };
  const productSeeds: P[] = [
    { t: "Neon Ronin: Zero Dawn", sub: "Cyber-samurai action RPG", kind: "game", platform: "Vapor", genre: "Action RPG", rrp: 59.99, hue: 305, featured: true, cat: "games", tags: ["open-world", "singleplayer", "cyberpunk"] },
    { t: "Starforge Odyssey", sub: "Procedural space exploration", kind: "game", platform: "Vapor", genre: "Simulation", rrp: 49.99, hue: 212, featured: true, cat: "games", tags: ["space", "exploration"] },
    { t: "Iron Vanguard III", sub: "Squad-based tactical FPS", kind: "game", platform: "Vapor", genre: "FPS", rrp: 39.99, hue: 8, cat: "games", tags: ["multiplayer", "esports"] },
    { t: "Mystic Vale: Echoes", sub: "Atmospheric narrative adventure", kind: "game", platform: "Orbit", genre: "Adventure", rrp: 29.99, hue: 152, cat: "games", tags: ["story-rich"] },
    { t: "Quantum Siege", sub: "Grand strategy, quantum warfare", kind: "game", platform: "Vapor", genre: "Strategy", rrp: 44.99, hue: 195, cat: "games", tags: ["4x", "multiplayer"] },
    { t: "Drift Kings Underground", sub: "Street racing after midnight", kind: "game", platform: "XCore", genre: "Racing", rrp: 34.99, hue: 24, cat: "games", tags: ["racing"] },
    { t: "Realm of Ash", sub: "Dark fantasy soulslike epic", kind: "game", platform: "Vapor", genre: "Action RPG", rrp: 59.99, hue: 265, featured: true, cat: "games", tags: ["soulslike", "dark-fantasy"] },
    { t: "Frostline Frontier", sub: "Arctic survival co-op", kind: "game", platform: "PlayZone", genre: "Survival", rrp: 39.99, hue: 202, cat: "games", tags: ["co-op"] },
    { t: "Pixel Raiders DX", sub: "Retro dungeon crawler", kind: "game", platform: "SwitchUp", genre: "Indie", rrp: 14.99, hue: 122, cat: "games", tags: ["pixel-art"] },
    { t: "Shadow Protocol: Ghostnet", sub: "Espionage stealth thriller", kind: "game", platform: "Vapor", genre: "Stealth", rrp: 49.99, hue: 282, featured: true, cat: "games", tags: ["stealth"] },
    { t: "Mecha Foundry", sub: "Build, pilot, trade giant mechs", kind: "game", platform: "Vapor", genre: "Builder", rrp: 24.99, hue: 38, cat: "games", tags: ["crafting"] },
    { t: "Aetherfall Tactics", sub: "Turn-based sky-fleet combat", kind: "game", platform: "Orbit", genre: "Tactics", rrp: 29.99, hue: 232, cat: "games", tags: ["turn-based"] },
    { t: "Gravewind Hollow", sub: "Folk-horror mystery", kind: "game", platform: "PlayZone", genre: "Horror", rrp: 19.99, hue: 342, cat: "games", tags: ["horror"] },
    { t: "Solar Drift Alliance", sub: "Anti-grav league racing", kind: "game", platform: "XCore", genre: "Racing", rrp: 27.99, hue: 47, cat: "games", tags: ["racing", "multiplayer"] },
    { t: "Catacombs of Kharos", sub: "Procedural roguelike delve", kind: "game", platform: "Vapor", genre: "Roguelike", rrp: 17.99, hue: 85, cat: "games", tags: ["roguelike"] },
    { t: "Voidrunner Cartel", sub: "Arena shooter syndicate wars", kind: "game", platform: "Vapor", genre: "FPS", rrp: 54.99, hue: 255, featured: true, cat: "games", tags: ["arena", "pvp"] },
    { t: "Bloomhaven", sub: "Cozy garden-life sim", kind: "game", platform: "SwitchUp", genre: "Simulation", rrp: 19.99, hue: 132, cat: "games", tags: ["cozy", "farming"] },
    { t: "Chronoshift Arena", sub: "Time-bending hero shooter", kind: "game", platform: "PlayZone", genre: "Shooter", rrp: 24.99, hue: 182, cat: "games", tags: ["hero-shooter"] },
    { t: "Dice & Dilemmas", sub: "Party game of chaos choices", kind: "game", platform: "SwitchUp", genre: "Party", rrp: 12.99, hue: 62, cat: "games", tags: ["party", "local-coop"] },
    { t: "Apex Circuit 6", sub: "The definitive grand prix sim", kind: "game", platform: "XCore", genre: "Racing", rrp: 69.99, hue: 15, featured: true, cat: "games", tags: ["simulation", "racing"] },
    { t: "Warden of Tides", sub: "Mythic oceanic ARPG", kind: "game", platform: "Vapor", genre: "Action RPG", rrp: 44.99, hue: 197, cat: "games", tags: ["mythology"] },
    { t: "Scrapline Salvage", sub: "Post-collapse junkyard sandbox", kind: "game", platform: "Vapor", genre: "Sandbox", rrp: 22.99, hue: 97, cat: "games", tags: ["sandbox"] },
    // gift cards
    { t: "Vapor Wallet Card €20", sub: "Instant wallet top-up", kind: "giftcard", platform: "Vapor", rrp: 20, hue: 210, cat: "gift-cards", featured: true },
    { t: "Vapor Wallet Card €50", sub: "Instant wallet top-up", kind: "giftcard", platform: "Vapor", rrp: 50, hue: 215, cat: "gift-cards" },
    { t: "PlayZone Store Card €25", sub: "Store credit, EU accounts", kind: "giftcard", platform: "PlayZone", region: "EU", rrp: 25, hue: 240, cat: "gift-cards" },
    { t: "XCore Live Card €50", sub: "Store credit, US accounts", kind: "giftcard", platform: "XCore", region: "US", rrp: 50, hue: 100, cat: "gift-cards" },
    { t: "RockSocial Club Card €30", sub: "Membership credit", kind: "giftcard", platform: "RockSocial", rrp: 30, hue: 280, cat: "gift-cards" },
    { t: "Orbit Points Card €40", sub: "Orbit store top-up", kind: "giftcard", platform: "Orbit", rrp: 40, hue: 168, cat: "gift-cards" },
    // subscriptions
    { t: "Vapor Pass — 1 Month", sub: "100+ games rotating catalog", kind: "subscription", platform: "Vapor", rrp: 9.99, hue: 205, cat: "subscriptions", featured: true },
    { t: "PlayZone Plus — 3 Months", sub: "Monthly games + online play", kind: "subscription", platform: "PlayZone", rrp: 24.99, hue: 235, cat: "subscriptions" },
    { t: "XCore Game Pass — 1 Month", sub: "Day-one releases included", kind: "subscription", platform: "XCore", rrp: 12.99, hue: 105, cat: "subscriptions" },
    // software
    { t: "Vertex Office Suite 2026", sub: "Lifetime license, 1 PC", kind: "software", platform: "PC", rrp: 99.99, hue: 30, cat: "software" },
    { t: "VectorForge Studio Pro", sub: "Design & illustration suite, 1 year", kind: "software", platform: "PC", rrp: 79.99, hue: 318, cat: "software" },
    { t: "ShieldWall Antivirus Pro", sub: "3 devices, 12 months", kind: "software", platform: "PC", rrp: 39.99, hue: 150, cat: "software" },
    // points
    { t: "Chrono Credits — 1,000", sub: "In-game currency for Chronoshift Arena", kind: "points", platform: "PlayZone", rrp: 9.99, hue: 55, cat: "game-points" },
    { t: "Arena Bucks — 2,800", sub: "Voidrunner Cartel premium currency", kind: "points", platform: "Vapor", rrp: 24.99, hue: 75, cat: "game-points" },
    // dlc
    { t: "Realm of Ash: Emberfall DLC", sub: "The Emberfall expansion", kind: "dlc", platform: "Vapor", genre: "Action RPG", rrp: 24.99, hue: 275, cat: "dlc-add-ons" },
    { t: "Starforge Odyssey: Cartographer Pack", sub: "New star-charts & ships", kind: "dlc", platform: "Vapor", genre: "Simulation", rrp: 14.99, hue: 220, cat: "dlc-add-ons" },
  ];

  const ACTIVATE: Record<string, string> = {
    Vapor: "1. Open the Vapor client and sign in.\n2. Go to Library → Redeem a Key.\n3. Paste your KeyHaven key and confirm.\n4. The product appears in your library instantly.",
    PlayZone: "1. Sign in to your PlayZone account.\n2. Open Store → Redeem Codes.\n3. Enter the 12-digit key exactly as shown.\n4. Download from your library.",
    XCore: "1. Press the XCore button → Store → Redeem.\n2. Enter the 25-character key.\n3. The content is added to 'My games & apps'.",
    Orbit: "1. Launch Orbit and sign in.\n2. Menu → Redeem Code.\n3. Paste your key and confirm.",
    SwitchUp: "1. Open eShop on your console.\n2. Select 'Enter Code'.\n3. Type the 16-digit download code.",
    RockSocial: "1. Sign in to the RockSocial Club.\n2. Profile → Activate Key.\n3. Paste your code.",
    PC: "1. Download the installer from the official site.\n2. During activation, paste your license key.\n3. Activation binds to your account/machine count.",
  };

  const productsInserted = await db.insert(s.products).values(
    productSeeds.map((p, i) => {
      const desc = `${p.t} — ${p.sub}. Discover an original adventure crafted for ${p.platform}. ` +
        `Every order on KeyHaven is protected by our buyer guarantee: keys are sourced from vetted marketplace sellers, ` +
        `delivered digitally within seconds of payment, and backed by 24/7 support.\n\n` +
        `Platform: ${p.platform} · Region: ${p.region ?? "GLOBAL"} · Delivery: instant digital key.`;
      return {
        slug: slugify(p.t), title: p.t, subtitle: p.sub, description: desc,
        howToActivate: ACTIVATE[p.platform] ?? ACTIVATE.PC,
        rrp: p.rrp, categoryId: catId(p.cat), platform: p.platform,
        region: p.region ?? "GLOBAL", kind: p.kind, genre: p.genre ?? null,
        coverHue: p.hue, tags: p.tags ?? [], featured: !!p.featured,
        ratingAvg: Math.round((4 + rand() * 0.9) * 100) / 100,
        ratingCount: ri(120, 4200),
        createdAt: daysAgo(ri(2, 400)),
      };
    }),
  ).returning();

  /* ------------------------------ offers + keys ---------------------------- */
  console.log("→ offers & inventory…");
  type OfferRow = typeof s.offers.$inferInsert;
  const offerRows: OfferRow[] = [];
  const productOfferCount: number[] = [];
  for (const p of productsInserted) {
    const seed = productSeeds.find((ps) => slugify(ps.t) === p.slug)!;
    const nSellers = ri(2, 5);
    productOfferCount.push(nSellers);
    const chosen = new Set<number>();
    while (chosen.size < nSellers) chosen.add(ri(0, sellers.length - 1));
    for (const si of chosen) {
      const isCard = seed.kind === "giftcard";
      offerRows.push({
        productId: p.id, sellerId: sellers[si].id,
        price: isCard ? price(seed.rrp, 0.9, 0.99) : price(seed.rrp, 0.35, 0.75),
        region: seed.region ?? "GLOBAL", active: true,
        soldCount: 0, stockCount: 0,
        createdAt: daysAgo(ri(1, 300)),
      });
    }
  }
  const offersInserted = await db.insert(s.offers).values(offerRows).returning();

  console.log(`→ generating keys for ${offersInserted.length} offers…`);
  const allKeys: Array<typeof s.inventoryKeys.$inferInsert> = [];
  for (const o of offersInserted) {
    const n = ri(8, 16);
    for (let i = 0; i < n; i++) allKeys.push({ offerId: o.id, code: genKey(rand), status: "available" });
  }
  for (let i = 0; i < allKeys.length; i += 500) {
    await db.insert(s.inventoryKeys).values(allKeys.slice(i, i + 500));
  }
  await db.execute(sql`
    update offers o set stock_count = (select count(*) from inventory_keys k where k.offer_id = o.id and k.status = 'available')
  `);

  /* --------------------------------- reviews -------------------------------- */
  console.log("→ reviews…");
  const reviewTexts = [
    "Key arrived instantly, activated with zero issues. Will buy again.",
    "Smooth checkout and the price was the best I found anywhere.",
    "Had a question before buying — support replied within minutes.",
    "Exactly what I ordered. Key worked first try on my account.",
    "Great price vs the official store. Delivery was literally seconds.",
    "My third purchase from this seller. Consistently flawless.",
    "Code worked, but activation page confused me at first. 4/5.",
    "Fast delivery, fair price, no drama. Recommended.",
    "Bought as a gift — redemption worked perfectly.",
    "Solid seller. Key region matched the listing (GLOBAL).",
  ];
  const reviewerPool = [...reviewers, buyer];
  const productReviewRows: Array<typeof s.reviews.$inferInsert> = [];
  for (const p of productsInserted) {
    const n = ri(2, 4);
    const chosen = new Set<string>();
    for (let i = 0; i < n; i++) {
      const author = pick(reviewerPool);
      if (chosen.has(`${p.id}:${author.id}`)) continue;
      chosen.add(`${p.id}:${author.id}`);
      productReviewRows.push({
        authorId: author.id, productId: p.id, rating: rand() < 0.85 ? ri(4, 5) : 3,
        comment: pick(reviewTexts), createdAt: daysAgo(ri(1, 120)),
      });
    }
  }
  await db.insert(s.reviews).values(productReviewRows);
  const sellerReviewRows: Array<typeof s.reviews.$inferInsert> = [];
  for (const sel of sellers) {
    for (const author of reviewers) {
      if (rand() < 0.8) {
        sellerReviewRows.push({
          authorId: author.id, sellerId: sel.id, rating: rand() < 0.9 ? 5 : 4,
          comment: pick(reviewTexts), createdAt: daysAgo(ri(1, 200)),
        });
      }
    }
  }
  await db.insert(s.reviews).values(sellerReviewRows);

  /* --------------------------- demo orders (buyer) --------------------------- */
  console.log("→ demo orders, payments, ledger…");
  const feeCfg = { percent: 3, fixed: 0.49 };

  async function completedOrder(daysBack: number, code: string | null, specs: Array<{ offerIdx: number; qty: number }>) {
    const num = `KH-${Math.abs(daysBack * 7919 % 9999).toString(36).toUpperCase()}-${(1000 + ri(0, 8999))}`;
    const chosen = specs.map(({ offerIdx, qty }) => {
      const offer = offersInserted[offerIdx];
      return { offer, qty };
    });
    const subtotal = Math.round(chosen.reduce((a, c) => a + c.offer.price * c.qty, 0) * 100) / 100;
    const discount = code === "WELCOME10" ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
    const fee = Math.round(((subtotal - discount) * feeCfg.percent) / 100 * 100) / 100 + feeCfg.fixed;
    const total = Math.round((subtotal - discount + fee) * 100) / 100;
    const [order] = await db.insert(s.orders).values({
      number: num, userId: buyer.id, status: "completed", subtotal, discount, fee, total,
      couponCode: code, paymentMethod: "card", createdAt: daysAgo(daysBack), paidAt: daysAgo(daysBack),
    }).returning();
    await db.insert(s.payments).values({
      orderId: order.id, provider: "sandbox", ref: `sb_seed_${num}`, amount: total,
      method: "card", status: "succeeded", createdAt: daysAgo(daysBack), updatedAt: daysAgo(daysBack),
    });
    for (const { offer, qty } of chosen) {
      const prod = productsInserted.find((p) => p.id === offer.productId)!;
      const seller = sellers.find((x) => x.id === offer.sellerId)!;
      const [item] = await db.insert(s.orderItems).values({
        orderId: order.id, offerId: offer.id, productId: prod.id, sellerId: seller.id,
        title: prod.title, price: offer.price, quantity: qty, status: "delivered", createdAt: daysAgo(daysBack),
      }).returning();
      const keys = await db.select().from(s.inventoryKeys)
        .where(sql`${s.inventoryKeys.offerId} = ${offer.id} and status = 'available'`).limit(qty);
      for (const k of keys) {
        await db.update(s.inventoryKeys)
          .set({ status: "sold", orderItemId: item.id, soldAt: daysAgo(daysBack) })
          .where(sql`${s.inventoryKeys.id} = ${k.id}`);
      }
      const gross = Math.round(offer.price * qty * 100) / 100;
      const commission = Math.round(gross * seller.commissionRate) / 100;
      const net = Math.round((gross - commission) * 100) / 100;
      await db.insert(s.transactions).values([
        { kind: "sale", sellerId: seller.id, orderId: order.id, amount: net, note: `Sale: ${prod.title} x${qty}`, createdAt: daysAgo(daysBack) },
        { kind: "commission", sellerId: seller.id, orderId: order.id, amount: commission, note: `Commission ${seller.commissionRate}% — ${prod.title}`, createdAt: daysAgo(daysBack) },
      ]);
      await db.update(s.offers).set({
        soldCount: sql`${s.offers.soldCount} + ${qty}`,
        stockCount: sql`${s.offers.stockCount} - ${qty}`,
      }).where(sql`${s.offers.id} = ${offer.id}`);
      await db.update(s.sellerProfiles).set({
        balance: sql`${s.sellerProfiles.balance} + ${net}`,
        totalSales: sql`${s.sellerProfiles.totalSales} + ${qty}`,
      }).where(sql`${s.sellerProfiles.id} = ${seller.id}`);
    }
    return order;
  }

  const findOfferIdx = (slug: string, preferSeller?: number) => {
    const pid = productsInserted.find((p) => p.slug === slug)!.id;
    let idx = preferSeller != null
      ? offersInserted.findIndex((o) => o.productId === pid && o.sellerId === sellers[preferSeller].id)
      : -1;
    if (idx === -1) idx = offersInserted.findIndex((o) => o.productId === pid);
    if (idx === -1) throw new Error(`seed: no offer for ${slug}`);
    return idx;
  };
  const idxVoidrunner = findOfferIdx("voidrunner-cartel", 1);
  const idxVapor20 = findOfferIdx("vapor-wallet-card-20");
  const idxRealm = findOfferIdx("realm-of-ash", 0);
  const order1 = await completedOrder(10, "WELCOME10", [{ offerIdx: idxVoidrunner, qty: 1 }, { offerIdx: idxVapor20, qty: 1 }]);
  const order2 = await completedOrder(3, null, [{ offerIdx: idxRealm, qty: 1 }]);

  /* ---------------------------------- misc ---------------------------------- */
  console.log("→ coupons, banners, wishlist, notifications, tickets, payouts, audit…");
  await db.insert(s.coupons).values([
    { code: "WELCOME10", kind: "percent", value: 10, minSubtotal: 5, usedCount: 1 },
    { code: "GAMER20", kind: "percent", value: 20, minSubtotal: 30, expiresAt: new Date(Date.now() + 60 * 86_400_000) },
    { code: "FLAT5", kind: "fixed", value: 5, minSubtotal: 20, usageLimit: 100 },
  ]);

  await db.insert(s.banners).values([
    { title: "Realm of Ash — launch week", subtitle: "The soulslike everyone is talking about. Up to 35% off RRP from top-rated sellers.", ctaText: "Browse offers", ctaHref: "/product/realm-of-ash", hue: 265, position: 0 },
    { title: "Stack your Vapor Wallet", subtitle: "Wallet cards delivered in seconds. Never pay full price again.", ctaText: "Top up now", ctaHref: "/category/gift-cards", hue: 210, position: 1 },
    { title: "Software, creator-grade", subtitle: "Office, design & security suites at marketplace prices.", ctaText: "Shop software", ctaHref: "/category/software", hue: 30, position: 2 },
  ]);

  const wishlistSlugs = ["quantum-siege", "shadow-protocol-ghostnet", "apex-circuit-6", "vapor-pass-1-month", "starforge-odyssey"];
  await db.insert(s.wishlists).values(
    wishlistSlugs.map((sl) => ({
      userId: buyer.id, productId: productsInserted.find((p) => p.slug === sl)!.id,
    })),
  );
  await db.insert(s.recentlyViewed).values(
    ["voidrunner-cartel", "realm-of-ash", "neon-ronin-zero-dawn", "vapor-wallet-card-20", "iron-vanguard-iii"].map((sl, i) => ({
      userId: buyer.id, productId: productsInserted.find((p) => p.slug === sl)!.id,
      viewedAt: new Date(Date.now() - i * 3_600_000),
    })),
  );

  await db.insert(s.notifications).values([
    { userId: buyer.id, type: "order", title: `Order ${order1.number} completed`, body: "Keys delivered to your library.", href: `/order/${order1.number}`, read: true, createdAt: daysAgo(10) },
    { userId: buyer.id, type: "order", title: `Order ${order2.number} completed`, body: "Keys delivered to your library.", href: `/order/${order2.number}`, createdAt: daysAgo(3) },
    { userId: buyer.id, type: "promo", title: "GAMER20 is live", body: "20% off orders over €30, this month only.", href: "/category/games", createdAt: daysAgo(1) },
    { userId: sellerUsers[0].id, type: "sale", title: "New sale: Realm of Ash ×1", body: "Net payout credited to your balance.", href: "/seller/orders", createdAt: daysAgo(3) },
  ]);

  const [ticket] = await db.insert(s.supportTickets).values({
    userId: buyer.id, subject: "Key region question for XCore card", status: "pending", priority: "normal",
    createdAt: daysAgo(2), updatedAt: daysAgo(1),
  }).returning();
  await db.insert(s.ticketMessages).values([
    { ticketId: ticket.id, authorId: buyer.id, body: "Hey, before I buy the XCore Live Card — will it work on a US account? Listing says US region.", createdAt: daysAgo(2) },
    { ticketId: ticket.id, authorId: admin.id, body: "Hi Alex — yes, region-locked cards only redeem on accounts of the matching region. The US card will work on your US account. I flagged the listing as verified.", createdAt: daysAgo(1) },
  ]);
  await db.insert(s.supportTickets).values({
    userId: reviewers[0].id, subject: "Where do I find my invoice?", status: "closed", priority: "low",
    createdAt: daysAgo(12), updatedAt: daysAgo(11),
  });

  await db.insert(s.payouts).values([
    { sellerId: sellers[1].id, amount: 540.2, status: "pending", method: "bank_transfer", createdAt: daysAgo(1) },
    { sellerId: sellers[0].id, amount: 1200, status: "paid", method: "bank_transfer", createdAt: daysAgo(20), processedAt: daysAgo(18), processedBy: admin.id },
  ]);
  await db.insert(s.transactions).values({
    kind: "payout", sellerId: sellers[0].id, amount: -1200, note: "Payout settled via bank transfer", createdAt: daysAgo(18),
  });

  await db.insert(s.auditLogs).values([
    { actorId: admin.id, action: "seller.approve", entity: "seller_profile", entityId: sellers[0].id, meta: { storeName: "KeyForge Trading" }, createdAt: daysAgo(30) },
    { actorId: admin.id, action: "coupon.create", entity: "coupon", entityId: "GAMER20", meta: { value: 20 }, createdAt: daysAgo(5) },
    { actorId: admin.id, action: "payout.paid", entity: "payout", entityId: sellers[0].id, meta: { amount: 1200 }, createdAt: daysAgo(18) },
  ]);

  const stats = await db.execute(sql`
    select
      (select count(*) from products)::int as products,
      (select count(*) from offers)::int as offers,
      (select count(*) from inventory_keys)::int as keys,
      (select count(*) from reviews)::int as reviews
  `);
  console.log("✓ seed complete:", (stats as unknown as { rows: unknown[] }).rows[0]);
  console.log("  admin@keyhaven.app / Admin!23456");
  console.log("  seller@keyhaven.app / Seller!23456 (KeyForge Trading, approved)");
  console.log("  buyer@keyhaven.app / Buyer!23456");
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
