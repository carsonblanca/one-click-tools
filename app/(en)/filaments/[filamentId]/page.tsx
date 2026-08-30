import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import FilamentDetailPageContent from "@/components/filaments/FilamentDetailPageContent";
import { CATALOG_RECORDS, getCatalogRecord } from "@/lib/filaments/catalog";
import {
  listLocalPreviewKexcelledProducts,
  listPublishedKexcelledProducts,
  toPublicCatalogRecords,
} from "@/lib/filaments/catalog/published-kexcelled";

export const dynamic = "force-dynamic";

async function resolveCatalogRecord(filamentId: string) {
  const staticRecord = getCatalogRecord(filamentId);
  if (staticRecord) return staticRecord;
  try {
    const products = process.env.NODE_ENV === "production"
      ? await listPublishedKexcelledProducts()
      : await listLocalPreviewKexcelledProducts();
    return toPublicCatalogRecords(products).find((record) => record.id === filamentId);
  } catch {
    return undefined;
  }
}

async function resolveRelatedRecords(filamentId: string) {
  if (getCatalogRecord(filamentId)) return CATALOG_RECORDS;
  try {
    const products = process.env.NODE_ENV === "production"
      ? await listPublishedKexcelledProducts()
      : await listLocalPreviewKexcelledProducts();
    return toPublicCatalogRecords(products);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ filamentId: string }> }): Promise<Metadata> {
  const { filamentId } = await params;
  const record = await resolveCatalogRecord(filamentId);
  if (!record) return { title: "Filament Not Found | OneClick Tools" };
  return {
    title: `${record.color.colorNameEn} - ${record.brand} Filament | OneClick Tools`,
    description: `Details for ${record.brand} ${record.productLine} ${record.materialType} filament in ${record.color.colorNameEn}.`,
    alternates: { canonical: `https://one-click-tools.com/filaments/${record.id}` },
  };
}

export default async function FilamentDetailPage({ params }: { params: Promise<{ filamentId: string }> }) {
  const { filamentId } = await params;
  const record = await resolveCatalogRecord(filamentId);
  if (!record) redirect("/tools/bambu-filament-preset-generator");
  const relatedRecords = await resolveRelatedRecords(filamentId);

  return (
    <PageShell>
      <SiteHeader />
      <FilamentDetailPageContent filamentId={filamentId} record={record} relatedRecords={relatedRecords} />
      <SiteFooter />
    </PageShell>
  );
}
