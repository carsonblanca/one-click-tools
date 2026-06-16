import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import FilamentDetailPageContent from "@/components/filaments/FilamentDetailPageContent";
import { getCatalogRecord } from "@/lib/filaments/catalog";

export async function generateMetadata({ params }: { params: Promise<{ filamentId: string }> }): Promise<Metadata> {
  const { filamentId } = await params;
  const record = getCatalogRecord(filamentId);
  if (!record) return { title: "Filament Not Found | OneClick Tools" };
  return {
    title: `${record.color.colorNameEn} - ${record.brand} Filament | OneClick Tools`,
    description: `Details for ${record.brand} ${record.productLine} ${record.materialType} filament in ${record.color.colorNameEn}.`,
    alternates: { canonical: `https://one-click-tools.com/filaments/${record.id}` },
  };
}

export default async function FilamentDetailPage({ params }: { params: Promise<{ filamentId: string }> }) {
  const { filamentId } = await params;
  const record = getCatalogRecord(filamentId);
  if (!record) redirect("/tools/bambu-filament-preset-generator");

  return (
    <PageShell>
      <SiteHeader />
      <FilamentDetailPageContent filamentId={filamentId} />
      <SiteFooter />
    </PageShell>
  );
}
