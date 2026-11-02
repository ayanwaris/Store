import {
  pgTable, uuid, text, integer, numeric, boolean, timestamp, jsonb,
  uniqueIndex, index, primaryKey,
} from "drizzle-orm/pg-core";

/* ---------------------------------- auth ---------------------------------- */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("buyer"), // buyer | admin
  avatarHue: integer("avatar_hue").notNull().default(25),
  banned: boolean("banned").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // opaque token
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const passwordResets = pgTable("password_resets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

/* --------------------------------- catalog -------------------------------- */

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull().default("Gamepad2"),
  blurb: text("blurb"),
  position: integer("position").notNull().default(0),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description").notNull(),
  howToActivate: text("how_to_activate"),
  rrp: numeric("rrp", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  platform: text("platform").notNull(),
  region: text("region").notNull().default("GLOBAL"),
  kind: text("kind").notNull().default("game"), // game | giftcard | software | subscription | points | dlc
  genre: text("genre"),
  coverHue: integer("cover_hue").notNull().default(262),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  ratingAvg: numeric("rating_avg", { precision: 3, scale: 2, mode: "number" }).notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("products_category_idx").on(t.categoryId),
  index("products_kind_idx").on(t.kind),
  index("products_platform_idx").on(t.platform),
]);

/* --------------------------------- sellers -------------------------------- */

export const sellerProfiles = pgTable("seller_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  storeName: text("store_name").notNull(),
  slug: text("slug").notNull().unique(),
  about: text("about"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected | suspended
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2, mode: "number" }).notNull().default(12),
  ratingAvg: numeric("rating_avg", { precision: 5, scale: 2, mode: "number" }).notNull().default(0), // % positive
  ratingCount: integer("rating_count").notNull().default(0),
  totalSales: integer("total_sales").notNull().default(0),
  balance: numeric("balance", { precision: 14, scale: 2, mode: "number" }).notNull().default(0),
  lifetimeRevenue: numeric("lifetime_revenue", { precision: 14, scale: 2, mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const offers = pgTable("offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sellerId: uuid("seller_id").notNull().references(() => sellerProfiles.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  region: text("region").notNull().default("GLOBAL"),
  active: boolean("active").notNull().default(true),
  stockCount: integer("stock_count").notNull().default(0),
  soldCount: integer("sold_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("offers_product_idx").on(t.productId),
  index("offers_seller_idx").on(t.sellerId),
]);

export const inventoryKeys = pgTable("inventory_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  status: text("status").notNull().default("available"), // available | reserved | sold | revoked
  orderItemId: uuid("order_item_id"),
  reservedAt: timestamp("reserved_at", { withTimezone: true }),
  soldAt: timestamp("sold_at", { withTimezone: true }),
}, (t) => [
  index("keys_offer_status_idx").on(t.offerId, t.status),
  index("keys_order_item_idx").on(t.orderItemId),
]);

/* ---------------------------------- cart ---------------------------------- */

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("cart_items_unique").on(t.cartId, t.offerId),
  index("cart_items_cart_idx").on(t.cartId),
]);

/* --------------------------------- orders --------------------------------- */

export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  kind: text("kind").notNull().default("percent"), // percent | fixed
  value: numeric("value", { precision: 10, scale: 2, mode: "number" }).notNull(),
  minSubtotal: numeric("min_subtotal", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  number: text("number").notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending_payment"), // pending_payment | completed | cancelled | partially_refunded | refunded
  subtotal: numeric("subtotal", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  discount: numeric("discount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  fee: numeric("fee", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  total: numeric("total", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  couponCode: text("coupon_code"),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
}, (t) => [index("orders_user_idx").on(t.userId)]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  offerId: uuid("offer_id").notNull().references(() => offers.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  sellerId: uuid("seller_id").notNull().references(() => sellerProfiles.id),
  title: text("title").notNull(),
  price: numeric("price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  status: text("status").notNull().default("awaiting_payment"), // awaiting_payment | delivered | cancelled | refunded
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("order_items_order_idx").on(t.orderId),
  index("order_items_seller_idx").on(t.sellerId),
]);

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  ref: text("ref").notNull().unique(),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  method: text("method"),
  status: text("status").notNull().default("initiated"), // initiated | succeeded | failed | refunded | partially_refunded
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const refunds = pgTable("refunds", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
  requestedBy: uuid("requested_by").notNull().references(() => users.id),
  processedBy: uuid("processed_by").references(() => users.id),
  amount: numeric("amount", { precision: 10, scale: 2, mode: "number" }).notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

/* ------------------------------- engagement ------------------------------- */

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
  sellerId: uuid("seller_id").references(() => sellerProfiles.id, { onDelete: "cascade" }),
  orderItemId: uuid("order_item_id").references(() => orderItems.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("reviews_product_idx").on(t.productId),
  index("reviews_seller_idx").on(t.sellerId),
  index("reviews_author_idx").on(t.authorId),
]);

export const wishlists = pgTable("wishlists", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.productId] })]);

export const recentlyViewed = pgTable("recently_viewed", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.productId] })]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("info"),
  title: text("title").notNull(),
  body: text("body"),
  href: text("href"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("notifications_user_idx").on(t.userId, t.read)]);

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("open"), // open | pending | closed
  priority: text("priority").notNull().default("normal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------ marketplace ------------------------------- */

export const payouts = pgTable("payouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerId: uuid("seller_id").notNull().references(() => sellerProfiles.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  method: text("method").notNull().default("bank_transfer"),
  status: text("status").notNull().default("pending"), // pending | paid | rejected
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  processedBy: uuid("processed_by").references(() => users.id),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind").notNull(), // sale | commission | payout | refund | adjustment
  sellerId: uuid("seller_id").references(() => sellerProfiles.id, { onDelete: "set null" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 14, scale: 2, mode: "number" }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("transactions_seller_idx").on(t.sellerId), index("transactions_kind_idx").on(t.kind)]);

/* --------------------------------- platform ------------------------------- */

export const banners = pgTable("banners", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  ctaText: text("cta_text"),
  ctaHref: text("cta_href"),
  hue: integer("hue").notNull().default(262),
  active: boolean("active").notNull().default(true),
  position: integer("position").notNull().default(0),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: text("entity_id"),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("audit_logs_created_idx").on(t.createdAt)]);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
});

/* ---------------------------------- types --------------------------------- */

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type SellerProfile = typeof sellerProfiles.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type InventoryKey = typeof inventoryKeys.$inferSelect;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
export type Banner = typeof banners.$inferSelect;
