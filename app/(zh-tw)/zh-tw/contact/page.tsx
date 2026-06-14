import type { Metadata } from "next";
import BasicPageContent from "@/components/BasicPageContent";
import PageShell from "@/components/PageShell";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { localizedBasicPages } from "@/lib/localizedContent";

const page = localizedBasicPages["zh-tw"].contact;

export const metadata: Metadata = {
  title: page.metadataTitle,
  description: page.metadataDescription,
};

export default function TraditionalChineseContactPage() {
  return (
    <PageShell>
      <SiteHeader />
      <BasicPageContent {...page} backHref="/zh-tw" backLabel="返回首頁" />
      <SiteFooter />
    </PageShell>
  );
}
