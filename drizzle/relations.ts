import { relations } from "drizzle-orm/relations";
import { users, carts, products, offers, sellerProfiles, notifications, orders, orderItems, inventoryKeys, auditLogs, passwordResets, payments, payouts, categories, reviews, sessions, supportTickets, ticketMessages, refunds, cartItems, transactions, recentlyViewed, wishlists } from "./schema";

export const cartsRelations = relations(carts, ({one, many}) => ({
	user: one(users, {
		fields: [carts.userId],
		references: [users.id]
	}),
	cartItems: many(cartItems),
}));

export const usersRelations = relations(users, ({many}) => ({
	carts: many(carts),
	notifications: many(notifications),
	auditLogs: many(auditLogs),
	passwordResets: many(passwordResets),
	orders: many(orders),
	payouts: many(payouts),
	reviews: many(reviews),
	sessions: many(sessions),
	supportTickets: many(supportTickets),
	ticketMessages: many(ticketMessages),
	sellerProfiles: many(sellerProfiles),
	refunds_requestedBy: many(refunds, {
		relationName: "refunds_requestedBy_users_id"
	}),
	refunds_processedBy: many(refunds, {
		relationName: "refunds_processedBy_users_id"
	}),
	recentlyVieweds: many(recentlyViewed),
	wishlists: many(wishlists),
}));

export const offersRelations = relations(offers, ({one, many}) => ({
	product: one(products, {
		fields: [offers.productId],
		references: [products.id]
	}),
	sellerProfile: one(sellerProfiles, {
		fields: [offers.sellerId],
		references: [sellerProfiles.id]
	}),
	orderItems: many(orderItems),
	inventoryKeys: many(inventoryKeys),
	cartItems: many(cartItems),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	offers: many(offers),
	orderItems: many(orderItems),
	category: one(categories, {
		fields: [products.categoryId],
		references: [categories.id]
	}),
	reviews: many(reviews),
	recentlyVieweds: many(recentlyViewed),
	wishlists: many(wishlists),
}));

export const sellerProfilesRelations = relations(sellerProfiles, ({one, many}) => ({
	offers: many(offers),
	orderItems: many(orderItems),
	payouts: many(payouts),
	reviews: many(reviews),
	user: one(users, {
		fields: [sellerProfiles.userId],
		references: [users.id]
	}),
	transactions: many(transactions),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const orderItemsRelations = relations(orderItems, ({one, many}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	offer: one(offers, {
		fields: [orderItems.offerId],
		references: [offers.id]
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id]
	}),
	sellerProfile: one(sellerProfiles, {
		fields: [orderItems.sellerId],
		references: [sellerProfiles.id]
	}),
	reviews: many(reviews),
	refunds: many(refunds),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	orderItems: many(orderItems),
	payments: many(payments),
	user: one(users, {
		fields: [orders.userId],
		references: [users.id]
	}),
	refunds: many(refunds),
	transactions: many(transactions),
}));

export const inventoryKeysRelations = relations(inventoryKeys, ({one}) => ({
	offer: one(offers, {
		fields: [inventoryKeys.offerId],
		references: [offers.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.actorId],
		references: [users.id]
	}),
}));

export const passwordResetsRelations = relations(passwordResets, ({one}) => ({
	user: one(users, {
		fields: [passwordResets.userId],
		references: [users.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	order: one(orders, {
		fields: [payments.orderId],
		references: [orders.id]
	}),
}));

export const payoutsRelations = relations(payouts, ({one}) => ({
	sellerProfile: one(sellerProfiles, {
		fields: [payouts.sellerId],
		references: [sellerProfiles.id]
	}),
	user: one(users, {
		fields: [payouts.processedBy],
		references: [users.id]
	}),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	products: many(products),
}));

export const reviewsRelations = relations(reviews, ({one}) => ({
	user: one(users, {
		fields: [reviews.authorId],
		references: [users.id]
	}),
	product: one(products, {
		fields: [reviews.productId],
		references: [products.id]
	}),
	sellerProfile: one(sellerProfiles, {
		fields: [reviews.sellerId],
		references: [sellerProfiles.id]
	}),
	orderItem: one(orderItems, {
		fields: [reviews.orderItemId],
		references: [orderItems.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const supportTicketsRelations = relations(supportTickets, ({one, many}) => ({
	user: one(users, {
		fields: [supportTickets.userId],
		references: [users.id]
	}),
	ticketMessages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({one}) => ({
	supportTicket: one(supportTickets, {
		fields: [ticketMessages.ticketId],
		references: [supportTickets.id]
	}),
	user: one(users, {
		fields: [ticketMessages.authorId],
		references: [users.id]
	}),
}));

export const refundsRelations = relations(refunds, ({one}) => ({
	order: one(orders, {
		fields: [refunds.orderId],
		references: [orders.id]
	}),
	orderItem: one(orderItems, {
		fields: [refunds.orderItemId],
		references: [orderItems.id]
	}),
	user_requestedBy: one(users, {
		fields: [refunds.requestedBy],
		references: [users.id],
		relationName: "refunds_requestedBy_users_id"
	}),
	user_processedBy: one(users, {
		fields: [refunds.processedBy],
		references: [users.id],
		relationName: "refunds_processedBy_users_id"
	}),
}));

export const cartItemsRelations = relations(cartItems, ({one}) => ({
	cart: one(carts, {
		fields: [cartItems.cartId],
		references: [carts.id]
	}),
	offer: one(offers, {
		fields: [cartItems.offerId],
		references: [offers.id]
	}),
}));

export const transactionsRelations = relations(transactions, ({one}) => ({
	sellerProfile: one(sellerProfiles, {
		fields: [transactions.sellerId],
		references: [sellerProfiles.id]
	}),
	order: one(orders, {
		fields: [transactions.orderId],
		references: [orders.id]
	}),
}));

export const recentlyViewedRelations = relations(recentlyViewed, ({one}) => ({
	user: one(users, {
		fields: [recentlyViewed.userId],
		references: [users.id]
	}),
	product: one(products, {
		fields: [recentlyViewed.productId],
		references: [products.id]
	}),
}));

export const wishlistsRelations = relations(wishlists, ({one}) => ({
	user: one(users, {
		fields: [wishlists.userId],
		references: [users.id]
	}),
	product: one(products, {
		fields: [wishlists.productId],
		references: [products.id]
	}),
}));