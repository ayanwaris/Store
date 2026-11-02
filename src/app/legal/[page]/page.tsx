import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Legal" };

const PAGES: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terms of Service",
    body: [
      "KeyHaven is a demonstration multi-vendor digital marketplace. All products, sellers, prices and orders are fictional and no real goods or money change hands.",
      "Sellers are independent vendors approved through an application workflow. The marketplace charges a commission on each sale and provides buyer protection covering non-delivery and invalid keys.",
      "Digital keys are delivered instantly and are licensed, not sold. Region restrictions apply exactly as displayed on each listing. Reselling keys purchased with a buyer account is prohibited.",
      "Refund policy: buyers may request a refund on delivered items from the order page. Approved refunds revoke the delivered keys and return funds via the original payment method.",
      "Accounts may be suspended for fraud, abuse, chargeback misuse, or attempts to circumvent platform security.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "We store only the data required to operate the marketplace: your name, email, bcrypt-hashed password, order history, and the keys delivered to you.",
      "Payment is processed by the configured payment provider (sandbox by default). Card numbers never touch our servers or our database.",
      "Session cookies are httpOnly and expire after 30 days. A separate cookie stores your anonymous cart token until you log in, at which point carts merge.",
      "You may request account deletion by opening a support ticket. Order records are retained in anonymized ledger form for accounting integrity.",
    ],
  },
};

export default async function LegalPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const doc = PAGES[page];
  if (!doc) notFound();
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="font-display text-3xl font-bold">{doc.title}</h1>
      <p className="mt-1 text-sm text-faint">Last updated: 2026 · Demo document</p>
      <div className="mt-6 space-y-4">
        {doc.body.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-mute">{p}</p>
        ))}
      </div>
    </div>
  );
}
