import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { fmtEUR, formatDate, ORDER_STATUS_LABEL, statusTone } from "@/lib/utils";
import { Package, KeyRound, Heart, Bell, ArrowRight, Share2, Copy } from "lucide-react";

export default async function AccountOverview() {
  const user = await requireUser();

  const statsRows = await db.execute(sql`
    select
      (select count(*) from orders o where o.user_id = ${user.id})::int as orders,
      (select count(*) from orders o where o.user_id = ${user.id} and o.status = 'completed')::int as completed,
      (select count(*) from inventory_keys k join order_items oi on oi.id = k.order_item_id
         join orders o on o.id = oi.order_id
         where o.user_id = ${user.id} and k.status = 'sold')::int as keys,
      (select count(*) from wishlists w where w.user_id = ${user.id})::int as wishlist,
      (select count(*) from notifications n where n.user_id = ${user.id} and n.read = false)::int as unread,
      (select referral_code from users u2 where u2.id = ${user.id}) as "referralCode"
  `);
  const stats = (statsRows as unknown as { rows: Array<Record<string, unknown>> }).rows[0] ?? {};

  const recentOrders = (await db.execute(sql`
    select o.number, o.status, o.total::float8 as total, o.created_at as "createdAt",
           (select count(*) from order_items oi where oi.order_id = o.id)::int as items
    from orders o where o.user_id = ${user.id}
    order by o.created_at desc limit 5
  `) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  const recentViewed = (await db.execute(sql`
    select p.slug, p.title, p.platform
    from recently_viewed rv join products p on p.id = rv.product_id
    where rv.user_id = ${user.id} order by rv.viewed_at desc limit 6
  `) as unknown as { rows: Array<{ slug: string; title: string; platform: string }> }).rows;

  const cards = [
    { icon: Package, label: "Orders", value: stats.orders ?? 0, href: "/account/orders" },
    { icon: KeyRound, label: "Keys owned", value: stats.keys ?? 0, href: "/account/library" },
    { icon: Heart, label: "Wishlist", value: stats.wishlist ?? 0, href: "/account/wishlist" },
    { icon: Bell, label: "Unread alerts", value: stats.unread ?? 0, href: "/account/notifications" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card hover-lift p-4">
            <c.icon size={18} className="text-brand" />
            <p className="mt-2.5 font-display text-2xl font-bold">{String(c.value)}</p>
            <p className="text-xs text-faint">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* referral */}
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-vio/15 text-vio"><Share2 size={18} /></span>
        <div className="flex-1">
          <p className="font-display font-bold">Invite friends, earn credit</p>
          <p className="text-sm text-mute">Share your referral code — rewards apply to their first purchase.</p>
        </div>
        <code className="chip border border-vio/30 bg-vio/10 px-3 py-1.5 font-mono text-sm text-vio">
          {String(stats.referralCode ?? "—")}
        </code>
      </div>

      {/* recent orders */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display font-bold">Recent orders</h2>
          <Link href="/account/orders" className="btn btn-ghost btn-sm">All orders <ArrowRight size={13} /></Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="p-5 text-sm text-mute">No orders yet — your purchases will show up here.</p>
        ) : (
          <div className="divide-y divide-line-soft">
            {recentOrders.map((o) => (
              <Link key={String(o.number)} href={`/order/${o.number}`} className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-white/2">
                <Package size={16} className="shrink-0 text-faint" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{String(o.number)}</p>
                  <p className="text-xs text-faint">{formatDate(String(o.createdAt))} · {String(o.items)} item(s)</p>
                </div>
                <span className={`chip border text-[10px] ${statusTone(String(o.status))}`}>
                  {ORDER_STATUS_LABEL[String(o.status)] ?? String(o.status)}
                </span>
                <span className="font-display font-bold">{fmtEUR(Number(o.total))}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* recently viewed */}
      {recentViewed.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-bold">Recently viewed</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {recentViewed.map((p) => (
              <Link key={p.slug} href={`/product/${p.slug}`} className="chip hover:border-brand/40 hover:text-brand-bright">
                {p.title} <span className="text-faint">· {p.platform}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
void Copy;
