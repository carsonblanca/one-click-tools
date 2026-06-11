import type { Metadata } from "next";
import LocalizedHomeContent from "../../components/LocalizedHomeContent";
import PageShell from "../../components/PageShell";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { localizedHome } from "../../lib/localizedContent";

export const metadata: Metadata = {
  title: localizedHome["zh-cn"].metadataTitle,
  description: localizedHome["zh-cn"].metadataDescription,
};

export default function SimplifiedChineseHomePage() {
  return (
    <PageShell>
      <SiteHeader />

      <LocalizedHomeContent locale="zh-cn" />

      <SiteFooter />
    </PageShell>
  );
}
