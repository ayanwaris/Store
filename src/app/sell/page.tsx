import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { getDefaultCommission } from "@/lib/ops";
import SellerApplyForm from "@/components/SellerApplyForm";
import { Store, ShieldCheck, BarChart3, Banknote, CheckCircle2, Clock3, XCircle, PauseOctagon } from "lucide-react";

export const metadata: Metadata = { title: "Sell on KeyHaven" };

export default async function SellPage() {
  const user = await getSessionUser();
  const commission = await getDefaultCommission();

  let panel: React.ReactNode = null;
  if (user?.sellerStatus === "pending") {
    panel = (
      <div className="card mx-auto mt-8 max-w-lg p-5 text-center sm:mt-10 sm:p-8">
        <Clock3 size={36} className="mx-auto text-amber-300" />
        <h2 className="mt-4 font-display text-xl font-bold">Application under review</h2>
        <p className="mt-2 text-sm text-mute">
          Our team verifies every store manually. You&apos;ll get a notification the moment {user.storeName} is approved — usually within a day.
        </p>
      </div>
    );
  } else if (user?.sellerStatus === "approved") {
    panel = (
      <div className="card mx-auto mt-8 max-w-lg p-5 text-center sm:mt-10 sm:p-8">
        <CheckCircle2 size={36} className="mx-auto text-mint" />
        <h2 className="mt-4 font-display text-xl font-bold">You&apos;re an approved seller</h2>
        <p className="mt-2 text-sm text-mute">Your store {user.storeName} is live. Manage offers, keys and payouts in the dashboard.</p>
        <Link href="/seller" className="btn btn-primary mt-5">Open seller dashboard</Link>
      </div>
    );
  } else if (user?.sellerStatus === "rejected") {
    panel = (
      <div className="card mx-auto mt-8 max-w-lg p-5 text-center sm:mt-10 sm:p-8">
        <XCircle size={36} className="mx-auto text-rose-300" />
        <h2 className="mt-4 font-display text-xl font-bold">Application rejected</h2>
        <p className="mt-2 text-sm text-mute">You can adjust your store details and apply again below.</p>
      </div>
    );
  } else if (user?.sellerStatus === "suspended") {
    panel = (
      <div className="card mx-auto mt-8 max-w-lg p-5 text-center sm:mt-10 sm:p-8">
        <PauseOctagon size={36} className="mx-auto text-rose-300" />
        <h2 className="mt-4 font-display text-xl font-bold">Seller account suspended</h2>
        <p className="mt-2 text-sm text-mute">Contact support to resolve outstanding issues.</p>
        <Link href="/account/support" className="btn btn-outline mt-5">Open a ticket</Link>
      </div>
    );
  }

  return (
    <div className="container-x py-8 md:py-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="chip mx-auto border-brand/30 bg-brand/10 text-brand-bright">Marketplace partners</p>
        <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
          Sell keys. <span className="text-gradient">Keep margin.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-mute">
          Reach thousands of buyers hunting for deals. Transparent commission, real-time ledger,
          instant settlement to your balance, and payouts on request.
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:mt-10 md:grid-cols-4 md:gap-4">
        {[
          { icon: Store, t: "Your storefront", d: "A public store page with live ratings and all your listings." },
          { icon: ShieldCheck, t: "Fraud screening", d: "Key validation workflows and buyer verification protect both sides." },
          { icon: BarChart3, t: "Real analytics", d: "Sales, revenue and conversion data, updated with every order." },
          { icon: Banknote, t: "Fast payouts", d: `Only ${commission}% default commission. Withdraw from €25.` },
        ].map((f) => (
          <div key={f.t} className="card p-4 sm:p-5">
            <f.icon size={20} className="text-brand" />
            <h3 className="mt-3 font-display font-bold">{f.t}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-mute">{f.d}</p>
          </div>
        ))}
      </div>

      {panel ?? (
        <div className="mx-auto mt-8 max-w-lg sm:mt-10">
          {user ? (
            <SellerApplyForm />
          ) : (
            <div className="card p-5 text-center sm:p-8">
              <p className="font-display text-lg font-bold">Create an account first</p>
              <p className="mt-1 text-sm text-mute">Seller applications require a verified KeyHaven account.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link href="/register?next=/sell" className="btn btn-primary">Sign up</Link>
                <Link href="/login?next=/sell" className="btn btn-outline">Log in</Link>
              </div>
            </div>
          )}
        </div>
      )}

      {user?.sellerStatus === "rejected" && (
        <div className="mx-auto mt-6 max-w-lg">
          <SellerApplyForm heading="Re-apply with improved details" />
        </div>
      )}
    </div>
  );
}
