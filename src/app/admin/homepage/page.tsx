import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, sellerProfiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getHomeSections } from "@/lib/site-data";
import HomepageAdminClient from "@/components/admin/HomepageAdminClient";

export default async function AdminHomepage() {
  await requireAdmin();
  const [sections, cats] = await Promise.all([
    getHomeSections(),
    db.select({ slug: categories.slug, name: categories.name }).from(categories).orderBy(asc(categories.position)),
  ]);

  // resolve display names for hand-picked ids so the editor can show them
  const productIds = [...new Set(sections.flatMap((s) => s.settings.productIds ?? []))];
  const sellerIds = [...new Set(sections.flatMap((s) => s.settings.sellerIds ?? []))];
  const [prods, sells] = await Promise.all([
    productIds.length ? db.select({ id: products.id, title: products.title }).from(products).where(inArray(products.id, productIds)) : [],
    sellerIds.length ? db.select({ id: sellerProfiles.id, name: sellerProfiles.storeName }).from(sellerProfiles).where(inArray(sellerProfiles.id, sellerIds)) : [],
  ]);
  const labels: Record<string, string> = {};
  for (const p of prods) labels[p.id] = p.title;
  for (const s of sells) labels[s.id] = s.name;

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Homepage</h2>
      <p className="mt-0.5 text-sm text-faint">
        Reorder, hide, add and edit every section. Saved to the database — the storefront follows it immediately.
      </p>
      <HomepageAdminClient initial={sections} categories={cats} labels={labels} />
    </div>
  );
}
