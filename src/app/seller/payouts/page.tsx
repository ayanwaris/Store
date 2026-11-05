import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payouts, sellerProfiles } from "@/db/schema";
import { requireSeller } from "@/lib/auth";
import { fmtEUR, formatDate, statusTone } from "@/lib/utils";
import { RequestPayoutButton } from "@/components/seller/PayoutButton";
import { Banknote } from "lucide-react";

export default async function PayoutsPage() {
  const { sellerId } = await requireSeller();
  const [seller, list] = await Promise.all([
    db.select().from(sellerProfiles).where(eq(sellerProfiles.id, sellerId)).limit(1).then((r) => r[0]!),
    db.select().from(payouts).where(eq(payouts.sellerId, sellerId)).orderBy(desc(payouts.createdAt)),
  ]);

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-4 p-4 sm:gap-5 sm:p-6">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mint/15 text-mint"><Banknote size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-faint">Withdrawable balance</p>
          <p className="font-display text-3xl font-bold text-mint">{fmtEUR(seller.balance)}</p>
        </div>
        <RequestPayoutButton balance={seller.balance} />
      </div>
      <p className="text-xs text-faint">
        Requesting a payout moves the entire balance into a pending wire (bank transfer). Minimum €25.
        An administrator settles payouts; rejected payouts return funds to your balance.
      </p>

      <div className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3.5 sm:px-5 sm:py-4">
          <h2 className="font-display font-bold">Payout history</h2>
        </div>
        {list.length === 0 ? (
          <p className="p-6 text-sm text-mute">No payouts requested yet.</p>
        ) : (
          <div className="p-3 sm:p-0">
          <table className="table-x table-stack">
            <thead><tr><th>Requested</th><th>Method</th><th>Status</th><th>Processed</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td data-label="Requested" className="text-mute">{formatDate(p.createdAt)}</td>
                  <td data-label="Method" className="text-mute">{p.method.replace("_", " ")}</td>
                  <td data-label="Status"><span className={`chip border text-[10px] ${statusTone(p.status)}`}>{p.status}</span></td>
                  <td data-label="Processed" className="text-mute">{p.processedAt ? formatDate(p.processedAt) : "—"}</td>
                  <td data-label="Amount" className="text-right font-display font-bold">{fmtEUR(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
