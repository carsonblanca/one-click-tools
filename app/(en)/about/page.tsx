import type { Metadata } from "next";
import BasicPageContent from "@/components/BasicPageContent";
import PageShell from "@/components/PageShell";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "About OneClick Tools | Browser-Based Utility Tools",
  description:
    "Learn about OneClick Tools, a collection of lightweight browser-based utilities for developers, creators, students, and everyday web users.",
};

export default function AboutPage() {
  return (
    <PageShell>
      <SiteHeader />

      <BasicPageContent
        eyebrow="About OneClick Tools"
        title="Lightweight tools for everyday web work."
        intro="OneClick Tools is a collection of focused utilities built to help people complete common browser, developer, text, image, SEO, and file tasks quickly."
        sections={[
          {
            title: "What this site does",
            paragraphs: [
              "OneClick Tools brings small, practical utilities into one clean interface. The goal is to reduce friction for quick tasks such as formatting JSON, converting files, cleaning text, generating metadata, resizing images, and checking common web references.",
              "Most tools are designed to run locally in your browser. That means the work happens on your device where possible, without requiring a login or account.",
            ],
          },
          {
            title: "Who it is for",
            paragraphs: [
              "The site is built for developers, creators, students, and everyday web users who need simple tools without heavy software or complicated setup.",
              "Each tool is intended to be direct, readable, and easy to use on desktop or mobile browsers.",
            ],
          },
          {
            title: "How we think about trust",
            paragraphs: [
              "OneClick Tools favors browser-based processing where practical and keeps the experience lightweight. The site is meant to be useful without collecting unnecessary information from users.",
              "Some outputs can affect technical, legal, financial, or important workflows, so users should review results before relying on them.",
            ],
          },
        ]}
      />

      <SiteFooter />
    </PageShell>
  );
}
