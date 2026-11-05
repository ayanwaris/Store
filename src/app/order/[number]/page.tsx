import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inventoryKeys, orderItems, orders, payments, products, refunds, sellerProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fmtEUR, formatDate, ORDER_STATUS_LABEL, statusTone } from "@/lib/utils";
import CoverArt from "@/components/CoverArt";
import { CancelOrderButton, KeyReveal, RefundRequestButton } from "@/components/OrderWidgets";
import { CheckCircle2, PartyPopper, ShieldCheck, Timer, XCircle } from "lucide-react";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({
  params, searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const user = await requireUser(); // logged-out visitors go to login and come back to this order
  const { number } = await params;
  const { paid } = await searchParams;

  const order = (
    await db.select().from(orders).where(eq(orders.number, number)).limit(1)
  )[0];
  if (!order || (order.userId !== user.id && user.role !== "admin")) notFound();

  const items = await db
    .select({
      id: orderItems.id, title: orderItems.title, price: orderItems.price,
      quantity: orderItems.quantity, status: orderItems.status,
      slug: products.slug, platform: products.platform, kind: products.kind, coverHue: products.coverHue,
      sellerName: sellerProfiles.storeName, sellerSlug: sellerProfiles.slug,
    })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .innerJoin(sellerProfiles, eq(sellerProfiles.id, orderItems.sellerId))
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.createdAt));

  const keys = await db
    .select({ id: inventoryKeys.id, code: inventoryKeys.code, status: inventoryKeys.status, orderItemId: inventoryKeys.orderItemId })
    .from(inventoryKeys)
    .innerJoin(orderItems, eq(orderItems.id, inventoryKeys.orderItemId))
    .where(eq(orderItems.orderId, order.id));

  const refundRows = await db.select().from(refunds).where(eq(refunds.orderId, order.id));
  const payment = (await db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1))[0];

  const isPaid = order.status === "completed";

  return (
    <div className="container-x max-w-4xl py-6 md:py-10">
      {/* hero status */}
      <div className="text-center">
        {isPaid ? (
          <>
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-mint/15 text-mint animate-float">
              {paid ? <PartyPopper size={28} /> : <CheckCircle2 size={28} />}
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">
              {paid ? "Payment complete — enjoy!" : "Order complete"}
            </h1>
            <p className="mt-1.5 text-sm text-mute">
              Your keys are below and saved in <Link href="/account/library" className="text-brand-bright hover:underline">your library</Link>. A receipt was sent to your notifications.
            </p>
          </>
        ) : order.status === "pending_payment" ? (
          <>
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-400/15 text-amber-300"><Timer size={28} /></span>
            <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Payment not finished</h1>
            <p className="mt-1.5 text-sm text-mute">This order is awaiting payment. Its keys are reserved temporarily.</p>
          </>
        ) : (
          <>
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-mute"><XCircle size={28} /></span>
            <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">{ORDER_STATUS_LABEL[order.status] ?? order.status}</h1>
            <p className="mt-1.5 text-sm text-mute">Order {order.number} · placed {formatDate(order.createdAt)}</p>
          </>
        )}
      </div>

      <div className="card mt-6 overflow-hidden sm:mt-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-line px-4 py-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-faint">Order</p>
            <p className="font-display font-bold">{order.number}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-faint">Placed</p>
            <p className="text-sm font-semibold">{formatDate(order.createdAt)}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-faint">Status</p>
            <span className={`chip mt-0.5 border ${statusTone(order.status)}`}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</span>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-faint">Total</p>
            <p className="font-display text-lg font-bold text-brand-bright">{fmtEUR(order.total)}</p>
          </div>
        </div>

        <div className="divide-y divide-line-soft">
          {items.map((it) => {
            const itemKeys = keys.filter((k) => k.orderItemId === it.id);
            const pendingRefund = refundRows.find((r) => r.orderItemId === it.id);
            return (
              <div key={it.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <Link href={`/product/${it.slug}`}>
                    <CoverArt title={it.title} hue={it.coverHue} platform={it.platform} kind={it.kind} className="h-20 w-16 rounded-lg" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${it.slug}`} className="font-semibold hover:text-brand-bright">{it.title}</Link>
                    <p className="mt-0.5 text-xs text-faint">
                      {it.platform} · sold by{" "}
                      <Link href={`/store/${it.sellerSlug}`} className="text-mute hover:text-brand-bright">{it.sellerName}</Link>
                    </p>
                    <span className={`chip mt-1.5 border text-[10px] ${statusTone(it.status)}`}>{it.status.replace("_", " ")}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold">{fmtEUR(it.price * it.quantity)}</p>
                    <p className="text-[11px] text-faint">qty {it.quantity}</p>
                  </div>
                </div>

                {/* keys */}
                {itemKeys.length > 0 && (
                  <div className="mt-4 space-y-2 rounded-xl border border-line bg-raised/30 p-3 sm:p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-faint">
                      Digital key{itemKeys.length > 1 ? "s" : ""}
                    </p>
                    {itemKeys.map((k) => (
                      <KeyReveal key={k.id} code={k.code} revoked={k.status === "revoked"} />
                    ))}
                  </div>
                )}

                {it.status === "delivered" && (
                  <div className="mt-3">
                    {pendingRefund ? (
                      <span className={`chip border ${statusTone(pendingRefund.status)}`}>
                        Refund {pendingRefund.status}
                      </span>
                    ) : (
                      <RefundRequestButton orderId={order.id} orderItemId={it.id} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* totals */}
        <div className="border-t border-line bg-raised/20 px-4 py-4 sm:px-5">
          <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd>{fmtEUR(order.subtotal)}</dd></div>
            {order.discount > 0 && (
              <div className="flex justify-between text-mint">
                <dt>Coupon{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd>−{fmtEUR(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between"><dt className="text-mute">Service fee</dt><dd>{fmtEUR(order.fee)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 font-bold">
              <dt>Total</dt><dd className="text-brand-bright">{fmtEUR(order.total)}</dd>
            </div>
            {payment && (
              <p className="pt-1 text-right text-[11px] text-faint">
                Paid via {payment.method ?? payment.provider} · ref {payment.ref.slice(0, 16)}…
              </p>
            )}
          </dl>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-faint">
          <ShieldCheck size={14} className="text-mint" />
          Protected by buyer guarantee — if a key fails, request a refund above and we step in.
        </p>
        {order.status === "pending_payment" && <CancelOrderButton orderId={order.id} />}
        {isPaid && <Link href="/account/library" className="btn btn-primary w-full sm:w-auto">Go to my library</Link>}
      </div>
    </div>
  );
}
