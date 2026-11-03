import { requireAdmin } from "@/lib/auth";
import { getAdsConfig, getNewsletterConfig, getPromoBanner, getThemeSettings } from "@/lib/site-data";
import SiteSettingsClient from "@/components/admin/SiteSettingsClient";

export default async function AdminSite() {
  await requireAdmin();
  const [theme, promo, ads, newsletter] = await Promise.all([getThemeSettings(), getPromoBanner(), getAdsConfig(), getNewsletterConfig()]);
  return (
    <div>
      <h2 className="font-display text-xl font-bold">Site &amp; theme</h2>
      <p className="mt-0.5 text-sm text-faint">Global look and feel, the promotional banner, advertising and the newsletter.</p>
      <SiteSettingsClient theme={theme} promo={promo} ads={ads} newsletter={newsletter} />
    </div>
  );
}
