import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import FilamentComparePage from "@/components/filaments/FilamentComparePage";

export const metadata: Metadata = {
  title: "Filament Comparison Prototype | OneClick Tools",
  description:
    "Compare simulated Bambu Studio filament preset catalog entries side by side.",
  alternates: {
    canonical: "https://one-click-tools.com/filaments/compare",
  },
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const params = await searchParams;
  const ids = typeof params.ids === "string"
    ? params.ids.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  return (
    <PageShell>
      <SiteHeader />
      <FilamentComparePage ids={ids} locale="en" />
      <SiteFooter />
    </PageShell>
  );
}
