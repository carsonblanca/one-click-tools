import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BambuFilamentCatalogExperience from "@/components/filaments/BambuFilamentCatalogExperience";
import {
  listLocalPreviewKexcelledProducts,
  listPublishedKexcelledProducts,
  toPublicCatalogRecords,
} from "@/lib/filaments/catalog/published-kexcelled";
import type { CatalogRecord } from "@/lib/filaments/catalog/mock-catalog-ext";

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
  let extraRecords: CatalogRecord[] = [];
  try {
    const products = process.env.NODE_ENV === "production"
      ? await listPublishedKexcelledProducts()
      : await listLocalPreviewKexcelledProducts();
    extraRecords = toPublicCatalogRecords(products);
  } catch {
    extraRecords = [];
  }

  return (
    <PageShell>
      <SiteHeader />
      <BambuFilamentCatalogExperience locale="en" extraRecords={extraRecords} />
      <SiteFooter />
    </PageShell>
  );
}
