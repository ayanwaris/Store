import { getSessionUser } from "@/lib/auth";
import HomeSection from "@/components/home/HomeSections";
import { getAdsConfig, getHomeSections, getNewsletterConfig, loadHomeSections } from "@/lib/site-data";

/**
 * The homepage is entirely data-driven: the ordered section list lives in the database
 * (settings → "homepage_sections", edited in Admin → Homepage). Nothing here hard-codes the
 * order. Sections that are disabled, unconfigured or empty are simply not rendered, so there
 * are never empty containers or gaps.
 */
export default async function HomePage() {
  const [user, sections, ads, newsletter] = await Promise.all([
    getSessionUser(), getHomeSections(), getAdsConfig(), getNewsletterConfig(),
  ]);
  const rendered = await loadHomeSections(sections, { userId: user?.id ?? null, ads, newsletter });

  return (
    <div className="pb-4">
      {rendered.map((r, i) => (
        <HomeSection key={r.section.id} rendered={r} first={i === 0} newsletter={newsletter} />
      ))}
    </div>
  );
}
