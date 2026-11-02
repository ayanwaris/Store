import { pgTable, foreignKey, unique, uuid, text, timestamp, integer, boolean, index, numeric, jsonb, uniqueIndex, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const carts = pgTable("carts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	token: text().notNull(),
	userId: uuid("user_id"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "carts_user_id_users_id_fk"
		}).onDelete("set null"),
	unique("carts_token_unique").on(table.token),
]);

export const banners = pgTable("banners", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	subtitle: text(),
	ctaText: text("cta_text"),
	ctaHref: text("cta_href"),
	hue: integer().default(262).notNull(),
	active: boolean().default(true).notNull(),
	position: integer().default(0).notNull(),
});

export const offers = pgTable("offers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	sellerId: uuid("seller_id").notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	region: text().default('GLOBAL').notNull(),
	active: boolean().default(true).notNull(),
	stockCount: integer("stock_count").default(0).notNull(),
	soldCount: integer("sold_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("offers_product_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	index("offers_seller_idx").using("btree", table.sellerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "offers_product_id_products_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [sellerProfiles.id],
			name: "offers_seller_id_seller_profiles_id_fk"
		}).onDelete("cascade"),
]);

export const coupons = pgTable("coupons", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	kind: text().default('percent').notNull(),
	value: numeric({ precision: 10, scale:  2 }).notNull(),
	minSubtotal: numeric("min_subtotal", { precision: 10, scale:  2 }).default('0').notNull(),
	active: boolean().default(true).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	usageLimit: integer("usage_limit"),
	usedCount: integer("used_count").default(0).notNull(),
}, (table) => [
	unique("coupons_code_unique").on(table.code),
]);

export const notifications = pgTable("notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	type: text().default('info').notNull(),
	title: text().notNull(),
	body: text(),
	href: text(),
	read: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("notifications_user_idx").using("btree", table.userId.asc().nullsLast().op("bool_ops"), table.read.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const orderItems = pgTable("order_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	offerId: uuid("offer_id").notNull(),
	productId: uuid("product_id").notNull(),
	sellerId: uuid("seller_id").notNull(),
	title: text().notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	quantity: integer().default(1).notNull(),
	status: text().default('awaiting_payment').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("order_items_order_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("order_items_seller_idx").using("btree", table.sellerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [offers.id],
			name: "order_items_offer_id_offers_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "order_items_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [sellerProfiles.id],
			name: "order_items_seller_id_seller_profiles_id_fk"
		}),
]);

export const inventoryKeys = pgTable("inventory_keys", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	offerId: uuid("offer_id").notNull(),
	code: text().notNull(),
	status: text().default('available').notNull(),
	orderItemId: uuid("order_item_id"),
	reservedAt: timestamp("reserved_at", { withTimezone: true, mode: 'string' }),
	soldAt: timestamp("sold_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("keys_offer_status_idx").using("btree", table.offerId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("keys_order_item_idx").using("btree", table.orderItemId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [offers.id],
			name: "inventory_keys_offer_id_offers_id_fk"
		}).onDelete("cascade"),
]);

export const categories = pgTable("categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	icon: text().default('Gamepad2').notNull(),
	blurb: text(),
	position: integer().default(0).notNull(),
}, (table) => [
	unique("categories_slug_unique").on(table.slug),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	actorId: uuid("actor_id"),
	action: text().notNull(),
	entity: text(),
	entityId: text("entity_id"),
	meta: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("audit_logs_created_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.actorId],
			foreignColumns: [users.id],
			name: "audit_logs_actor_id_users_id_fk"
		}).onDelete("set null"),
]);

export const passwordResets = pgTable("password_resets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "password_resets_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("password_resets_token_unique").on(table.token),
]);

export const payments = pgTable("payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	provider: text().notNull(),
	ref: text().notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	method: text(),
	status: text().default('initiated').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "payments_order_id_orders_id_fk"
		}).onDelete("cascade"),
	unique("payments_ref_unique").on(table.ref),
]);

export const orders = pgTable("orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	number: text().notNull(),
	userId: uuid("user_id").notNull(),
	status: text().default('pending_payment').notNull(),
	subtotal: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	discount: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	fee: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	total: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	couponCode: text("coupon_code"),
	paymentMethod: text("payment_method"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("orders_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "orders_user_id_users_id_fk"
		}),
	unique("orders_number_unique").on(table.number),
]);

export const payouts = pgTable("payouts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sellerId: uuid("seller_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	method: text().default('bank_transfer').notNull(),
	status: text().default('pending').notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	processedBy: uuid("processed_by"),
}, (table) => [
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [sellerProfiles.id],
			name: "payouts_seller_id_seller_profiles_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.processedBy],
			foreignColumns: [users.id],
			name: "payouts_processed_by_users_id_fk"
		}),
]);

export const products = pgTable("products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: text().notNull(),
	title: text().notNull(),
	subtitle: text(),
	description: text().notNull(),
	howToActivate: text("how_to_activate"),
	rrp: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	categoryId: uuid("category_id"),
	platform: text().notNull(),
	region: text().default('GLOBAL').notNull(),
	kind: text().default('game').notNull(),
	genre: text(),
	coverHue: integer("cover_hue").default(262).notNull(),
	tags: jsonb().default([]).notNull(),
	featured: boolean().default(false).notNull(),
	active: boolean().default(true).notNull(),
	ratingAvg: numeric("rating_avg", { precision: 3, scale:  2 }).default('0').notNull(),
	ratingCount: integer("rating_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("products_category_idx").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	index("products_kind_idx").using("btree", table.kind.asc().nullsLast().op("text_ops")),
	index("products_platform_idx").using("btree", table.platform.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "products_category_id_categories_id_fk"
		}).onDelete("set null"),
	unique("products_slug_unique").on(table.slug),
]);

export const reviews = pgTable("reviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id").notNull(),
	productId: uuid("product_id"),
	sellerId: uuid("seller_id"),
	orderItemId: uuid("order_item_id"),
	rating: integer().notNull(),
	comment: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("reviews_author_idx").using("btree", table.authorId.asc().nullsLast().op("uuid_ops")),
	index("reviews_product_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	index("reviews_seller_idx").using("btree", table.sellerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "reviews_author_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "reviews_product_id_products_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [sellerProfiles.id],
			name: "reviews_seller_id_seller_profiles_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderItemId],
			foreignColumns: [orderItems.id],
			name: "reviews_order_item_id_order_items_id_fk"
		}).onDelete("set null"),
]);

export const sessions = pgTable("sessions", {
	id: text().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("sessions_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const supportTickets = pgTable("support_tickets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	subject: text().notNull(),
	status: text().default('open').notNull(),
	priority: text().default('normal').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "support_tickets_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const settings = pgTable("settings", {
	key: text().primaryKey().notNull(),
	value: jsonb().notNull(),
});

export const ticketMessages = pgTable("ticket_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ticketId: uuid("ticket_id").notNull(),
	authorId: uuid("author_id").notNull(),
	body: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [supportTickets.id],
			name: "ticket_messages_ticket_id_support_tickets_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "ticket_messages_author_id_users_id_fk"
		}),
]);

export const sellerProfiles = pgTable("seller_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	storeName: text("store_name").notNull(),
	slug: text().notNull(),
	about: text(),
	status: text().default('pending').notNull(),
	commissionRate: numeric("commission_rate", { precision: 5, scale:  2 }).default('12').notNull(),
	ratingAvg: numeric("rating_avg", { precision: 5, scale:  2 }).default('0').notNull(),
	ratingCount: integer("rating_count").default(0).notNull(),
	totalSales: integer("total_sales").default(0).notNull(),
	balance: numeric({ precision: 14, scale:  2 }).default('0').notNull(),
	lifetimeRevenue: numeric("lifetime_revenue", { precision: 14, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "seller_profiles_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("seller_profiles_user_id_unique").on(table.userId),
	unique("seller_profiles_slug_unique").on(table.slug),
]);

export const refunds = pgTable("refunds", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	orderItemId: uuid("order_item_id").notNull(),
	requestedBy: uuid("requested_by").notNull(),
	processedBy: uuid("processed_by"),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	reason: text(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "refunds_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderItemId],
			foreignColumns: [orderItems.id],
			name: "refunds_order_item_id_order_items_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.requestedBy],
			foreignColumns: [users.id],
			name: "refunds_requested_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.processedBy],
			foreignColumns: [users.id],
			name: "refunds_processed_by_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	role: text().default('buyer').notNull(),
	avatarHue: integer("avatar_hue").default(25).notNull(),
	banned: boolean().default(false).notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	referralCode: text("referral_code"),
	referredBy: text("referred_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
	unique("users_referral_code_unique").on(table.referralCode),
]);

export const cartItems = pgTable("cart_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	cartId: uuid("cart_id").notNull(),
	offerId: uuid("offer_id").notNull(),
	quantity: integer().default(1).notNull(),
	addedAt: timestamp("added_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("cart_items_cart_idx").using("btree", table.cartId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("cart_items_unique").using("btree", table.cartId.asc().nullsLast().op("uuid_ops"), table.offerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.cartId],
			foreignColumns: [carts.id],
			name: "cart_items_cart_id_carts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [offers.id],
			name: "cart_items_offer_id_offers_id_fk"
		}).onDelete("cascade"),
]);

export const transactions = pgTable("transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	kind: text().notNull(),
	sellerId: uuid("seller_id"),
	orderId: uuid("order_id"),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("transactions_kind_idx").using("btree", table.kind.asc().nullsLast().op("text_ops")),
	index("transactions_seller_idx").using("btree", table.sellerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [sellerProfiles.id],
			name: "transactions_seller_id_seller_profiles_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "transactions_order_id_orders_id_fk"
		}).onDelete("set null"),
]);

export const recentlyViewed = pgTable("recently_viewed", {
	userId: uuid("user_id").notNull(),
	productId: uuid("product_id").notNull(),
	viewedAt: timestamp("viewed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "recently_viewed_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "recently_viewed_product_id_products_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.productId], name: "recently_viewed_user_id_product_id_pk"}),
]);

export const wishlists = pgTable("wishlists", {
	userId: uuid("user_id").notNull(),
	productId: uuid("product_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "wishlists_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "wishlists_product_id_products_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.productId], name: "wishlists_user_id_product_id_pk"}),
]);
