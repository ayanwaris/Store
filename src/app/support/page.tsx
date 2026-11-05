import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { buildLoginUrl } from "@/lib/redirect";
import { LifeBuoy, Package, KeyRound, CreditCard, Store, ChevronRight } from "lucide-react";

export const metadata: Metadata = { title: "Help center" };

const FAQS = [
  {
    icon: KeyRound,
    q: "When do I get my key?",
    a: "Instantly. As soon as your payment is captured, keys appear on the order page and in your library (Account → My keys). They are also kept behind a reveal control so you won't flash them on a stream.",
  },
  {
    icon: Package,
    q: "A key doesn't work — what now?",
    a: "Open the order, use “Request refund” on the item, and our team reviews it. Approved refunds revoke the key from circulation and return your money via the original payment method.",
  },
  {
    icon: CreditCard,
    q: "Which payment methods are supported?",
    a: "Cards and PayPal in sandbox mode out of the box. Stripe Checkout and Razorpay (UPI/NetBanking) activate automatically once API keys are configured. We never store card numbers.",
  },
  {
    icon: Store,
    q: "How do seller ratings work?",
    a: "Only buyers with a completed purchase can rate a seller. The percentage you see is the share of 4–5 star feedback across the seller's history.",
  },
  {
    icon: LifeBuoy,
    q: "Region locks",
    a: "Every listing shows a region chip (GLOBAL, EU, US…). A region-locked key only redeems on accounts in that region. When in doubt, ask the seller or support before buying.",
  },
];

export default async function SupportPage() {
  const user = await getSessionUser();
  return (
    <div className="container-x max-w-4xl py-8 md:py-12">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold md:text-4xl">How can we help?</h1>
        <p className="mt-2 text-mute">Instant answers below, or open a ticket and a human replies fast.</p>
        <Link href={user ? "/account/support" : buildLoginUrl("/account/support")} className="btn btn-primary mt-5">
          Open a support ticket <ChevronRight size={15} />
        </Link>
      </div>
      <div className="mt-8 space-y-3 sm:mt-10">
        {FAQS.map((f) => (
          <details key={f.q} className="card group p-4 open:border-brand/30 sm:p-5">
            <summary className="flex cursor-pointer items-center gap-3 text-sm font-bold marker:hidden">
              <f.icon size={17} className="shrink-0 text-brand" />
              {f.q}
              <ChevronRight size={15} className="ml-auto text-faint transition group-open:rotate-90" />
            </summary>
            <p className="mt-3 pl-8 text-sm leading-relaxed text-mute">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
