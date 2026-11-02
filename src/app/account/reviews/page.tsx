import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import RatingStars from "@/components/RatingStars";
import { Star } from "lucide-react";

export default async function MyReviewsPage() {
  const user = await requireUser();
  const rows = (await db.execute(sql`
    select r.id, r.rating, r.comment, r.created_at as "createdAt",
           coalesce(p.title, sp.store_name) as target,
           p.slug, case when r.seller_id is not null then 'seller' else 'product' end as kind
    from reviews r
    left join products p on p.id = r.product_id
    left join seller_profiles sp on sp.id = r.seller_id
    where r.author_id = ${user.id}
    order by r.created_at desc
  `) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  return (
    <div>
      <h2 className="font-display text-xl font-bold">My reviews</h2>
      <p className="mt-0.5 text-sm text-faint">Feedback you&apos;ve published as a verified buyer.</p>
      {rows.length === 0 ? (
        <div className="card mt-5 flex flex-col items-center p-12 text-center">
          <Star size={36} className="text-faint" />
          <p className="mt-3 font-semibold">No reviews yet</p>
          <p className="mt-1 text-sm text-mute">After a purchase lands in your library you can review the product and its seller.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {rows.map((r) => (
            <div key={String(r.id)} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {String(r.target)}{" "}
                  <span className="chip ml-1 text-[10px]">{String(r.kind)}</span>
                </p>
                <span className="flex items-center gap-3">
                  <RatingStars value={Number(r.rating)} />
                  <span className="text-xs text-faint">{formatDate(String(r.createdAt))}</span>
                </span>
              </div>
              {r.comment ? <p className="mt-2 text-sm text-mute">{String(r.comment)}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
void desc; void eq; void reviews;
