import Link from "next/link";
import { KeyRound, ShieldCheck, Zap, RefreshCcw } from "lucide-react";
import FooterNewsletter from "@/components/site/FooterNewsletter";
import { categoryHref } from "@/lib/category-icons";
import type { NewsletterConfig } from "@/lib/site-config";

export default function Footer({ categories, newsletter, hideNewsletterOnHome }: {
  categories: { name: string; slug: string; href?: string | null }[];
  newsletter: NewsletterConfig;
  hideNewsletterOnHome: boolean;
}) {
  return (
    <footer className="glass mt-12 border-t border-line md:mt-20">
      <FooterNewsletter config={newsletter} hideOnHome={hideNewsletterOnHome} />

      <div className="container-x grid grid-cols-2 gap-x-6 gap-y-8 py-10 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-10 md:py-12">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="bg-gold grid h-9 w-9 place-items-center rounded-xl">
              <KeyRound size={18} className="text-on-brand" />
            </span>
            <span className="font-display text-lg font-bold">KEY<span className="text-brand">HAVEN</span></span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-mute">
            A digital marketplace where vetted sellers compete on price. Instant delivery, buyer protection, and honest reviews.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-faint">
            <span className="flex items-center gap-1.5"><Zap size={13} className="text-brand" /> Instant delivery</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-mint" /> Buyer protection</span>
            <span className="flex items-center gap-1.5"><RefreshCcw size={13} className="text-vio" /> Refund support</span>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-faint">Marketplace</p>
          <ul className="space-y-0.5 text-sm md:space-y-2">
            <li><Link className="link inline-block py-1.5 md:py-0" href="/search?sort=popular">Bestsellers</Link></li>
            {categories.slice(0, 5).map((c) => (
              <li key={c.slug}><Link className="link inline-block py-1.5 md:py-0" href={categoryHref(c)}>{c.name}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-faint">Selling</p>
          <ul className="space-y-0.5 text-sm md:space-y-2">
            <li><Link className="link inline-block py-1.5 md:py-0" href="/sell">Become a seller</Link></li>
            <li><Link className="link inline-block py-1.5 md:py-0" href="/seller">Seller dashboard</Link></li>
            <li><Link className="link inline-block py-1.5 md:py-0" href="/legal/terms">Seller terms</Link></li>
            <li><Link className="link inline-block py-1.5 md:py-0" href="/legal/terms">Commission &amp; fees</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-faint">Support</p>
          <ul className="space-y-0.5 text-sm md:space-y-2">
            <li><Link className="link inline-block py-1.5 md:py-0" href="/support">Help center</Link></li>
            <li><Link className="link inline-block py-1.5 md:py-0" href="/account/support">My tickets</Link></li>
            <li><Link className="link inline-block py-1.5 md:py-0" href="/legal/terms">Terms of service</Link></li>
            <li><Link className="link inline-block py-1.5 md:py-0" href="/legal/privacy">Privacy policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-5 text-center text-xs text-faint md:flex-row md:text-left">
          <p>© {new Date().getFullYear()} KeyHaven — demo marketplace with an original, fictional catalog. Not affiliated with G2A.</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {["VISA", "MASTERCARD", "PAYPAL", "STRIPE", "RAZORPAY"].map((p) => (
              <span key={p} className="chip text-[10px] font-bold tracking-wider">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
