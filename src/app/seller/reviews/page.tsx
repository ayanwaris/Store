import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireSeller } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import RatingStars from "@/components/RatingStars";
import { Star } from "lucide-react";

export default async function SellerReviewsPage() {
  const { sellerId } = await requireSeller();
  const rows = ((await db.execute(sql`
    select r.id, r.rating, r.comment, r.created_at as "createdAt", u.name as "authorName"
    from reviews r join users u on u.id = r.author_id
    where r.seller_id = ${sellerId}
    order by r.created_at desc limit 50
  `)) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  const dist = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    n: rows.filter((r) => Number(r.rating) === s).length,
  }));
  const avg = rows.length ? rows.reduce((a, r) => a + Number(r.rating), 0) / rows.length : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="card h-fit p-6 text-center">
        <Star size={28} className="mx-auto fill-amber-400 text-amber-400" />
        <p className="mt-2 font-display text-4xl font-bold">{avg ? avg.toFixed(1) : "—"}</p>
        <p className="text-xs text-faint">{rows.length} written review{rows.length === 1 ? "" : "s"} shown (full history {">"} counts)</p>
        <div className="mt-4 space-y-1.5">
          {dist.map((d) => (
            <div key={d.star} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-faint">{d.star}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${rows.length ? (d.n / rows.length) * 100 : 0}%` }} />
              </div>
              <span className="w-6 text-right text-faint">{d.n}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="card p-10 text-center text-sm text-mute">No written reviews yet.</div>
        )}
        {rows.map((r) => (
          <div key={String(r.id)} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{String(r.authorName)}</p>
              <span className="flex items-center gap-3">
                <RatingStars value={Number(r.rating)} />
                <span className="text-xs text-faint">{formatDate(String(r.createdAt))}</span>
              </span>
            </div>
            {r.comment ? <p className="mt-2 text-sm text-mute">{String(r.comment)}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
