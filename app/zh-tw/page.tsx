import type { Metadata } from "next";
import LocalizedHomeContent from "../../components/LocalizedHomeContent";
import PageShell from "../../components/PageShell";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { localizedHome } from "../../lib/localizedContent";

export const metadata: Metadata = {
  title: localizedHome["zh-tw"].metadataTitle,
  description: localizedHome["zh-tw"].metadataDescription,
};

export default function TraditionalChineseHomePage() {
  return (
    <PageShell>
      <SiteHeader />

      <LocalizedHomeContent locale="zh-tw" />

      <SiteFooter />
    </PageShell>
  );
}
