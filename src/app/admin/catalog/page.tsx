import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { banners, categories } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import CatalogClient from "@/components/admin/CatalogClient";

export default async function AdminCatalog() {
  await requireAdmin();
  const [cats, bns] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.position)),
    db.select().from(banners).orderBy(asc(banners.position)),
  ]);
  return (
    <div>
      <h2 className="font-display text-xl font-bold">Categories &amp; homepage banners</h2>
      <p className="mt-0.5 text-sm text-faint">Navigation structure and promo slides on the homepage.</p>
      <CatalogClient
        categories={cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon, blurb: c.blurb ?? "", imageUrl: c.imageUrl ?? "", href: c.href ?? "", active: c.active }))}
        banners={bns.map((b) => ({
          id: b.id, title: b.title, subtitle: b.subtitle ?? "", ctaText: b.ctaText ?? "",
          ctaHref: b.ctaHref ?? "", hue: b.hue, active: b.active, position: b.position,
        }))}
      />
    </div>
  );
}
void desc;
