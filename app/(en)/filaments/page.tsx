import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BambuFilamentCatalogExperience from "@/components/filaments/BambuFilamentCatalogExperience";
import { getVisibleCatalogRecords } from "@/lib/filaments/catalog/published-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "3D Printing Filament Library | OneClick Tools",
  description:
    "Browse 3D printing filaments by material, brand, or color. Search colors by name, HEX, or RGB. Compare specs and download Bambu Studio presets.",
  alternates: {
    canonical: "https://one-click-tools.com/filaments",
  },
};

export default async function FilamentCatalogPage() {
  const records = await getVisibleCatalogRecords();
  return (
    <PageShell>
      <SiteHeader />
      <BambuFilamentCatalogExperience locale="en" catalogRecords={records} />
      <SiteFooter />
    </PageShell>
  );
}
