import Link from "next/link";
import { KeyRound, ShieldCheck, Zap, RefreshCcw } from "lucide-react";
import NewsletterForm from "@/components/NewsletterForm";

export default function Footer({ categories }: { categories: { name: string; slug: string }[] }) {
  return (
    <footer className="mt-20 border-t border-line bg-panel/60">
      {/* newsletter band */}
      <div className="border-b border-line">
        <div className="container-x flex flex-col items-center gap-5 py-10 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h3 className="font-display text-xl font-bold">Drops, deals &amp; key alerts</h3>
            <p className="mt-1 text-sm text-mute">Join 40,000+ gamers saving on every release. No spam, unsubscribe anytime.</p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-bright to-brand-deep">
              <KeyRound size={18} className="text-white" />
            </span>
            <span className="font-display text-lg font-bold">KEY<span className="text-brand">HAVEN</span></span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-mute">
            A digital marketplace where vetted sellers compete on price. Instant delivery, buyer protection, and honest reviews.
          </p>
          <div className="mt-5 flex gap-4 text-xs text-faint">
            <span className="flex items-center gap-1.5"><Zap size={13} className="text-brand" /> Instant delivery</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-mint" /> Buyer protection</span>
            <span className="flex items-center gap-1.5"><RefreshCcw size={13} className="text-vio" /> Refund support</span>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-faint">Marketplace</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="link" href="/search?sort=popular">Bestsellers</Link></li>
            {categories.slice(0, 5).map((c) => (
              <li key={c.slug}><Link className="link" href={`/category/${c.slug}`}>{c.name}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-faint">Selling</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="link" href="/sell">Become a seller</Link></li>
            <li><Link className="link" href="/seller">Seller dashboard</Link></li>
            <li><Link className="link" href="/legal/terms">Seller terms</Link></li>
            <li><Link className="link" href="/legal/terms">Commission &amp; fees</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-faint">Support</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="link" href="/support">Help center</Link></li>
            <li><Link className="link" href="/account/support">My tickets</Link></li>
            <li><Link className="link" href="/legal/terms">Terms of service</Link></li>
            <li><Link className="link" href="/legal/privacy">Privacy policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-5 text-xs text-faint md:flex-row">
          <p>© {new Date().getFullYear()} KeyHaven — demo marketplace with an original, fictional catalog. Not affiliated with G2A.</p>
          <div className="flex flex-wrap gap-1.5">
            {["VISA", "MASTERCARD", "PAYPAL", "STRIPE", "RAZORPAY"].map((p) => (
              <span key={p} className="chip text-[10px] font-bold tracking-wider">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
