import Link from "next/link";
import type { Metadata } from "next";
import BasicPageContent from "../../components/BasicPageContent";
import PageShell from "../../components/PageShell";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata: Metadata = {
  title: "Terms of Use | OneClick Tools",
  description:
    "Read the OneClick Tools terms of use for lawful use, as-is tools, user responsibility, and important result review.",
};

export default function TermsPage() {
  return (
    <PageShell>
      <SiteHeader />

      <BasicPageContent
        eyebrow="Terms of Use"
        title="Terms for using OneClick Tools."
        intro="These terms describe the basic rules for using OneClick Tools and the responsibilities that remain with each user."
        sections={[
          {
            title: "Lawful use",
            paragraphs: [
              "You may use OneClick Tools for lawful purposes only. Do not use the site to create, transform, or distribute content in a way that violates laws, rights, or applicable rules.",
              "You are responsible for the content you enter and for how you use generated, converted, formatted, or processed results.",
            ],
          },
          {
            title: "Tools are provided as-is",
            paragraphs: [
              "OneClick Tools is provided as-is. The tools are designed to be useful, but they may contain errors, limitations, or edge cases.",
              "Results should be reviewed by users, especially for technical, legal, financial, security, or other important use cases.",
            ],
          },
          {
            title: "Availability",
            paragraphs: [
              "There is no guarantee that OneClick Tools will be available without interruption. The site may change, pause, or remove tools or pages over time.",
              "We may update the design, features, routes, or content to improve the site or respond to operational needs.",
            ],
          },
          {
            title: "Related policies",
            paragraphs: [
              "The privacy policy explains how the site approaches browser-based processing, third-party services, and possible future advertising.",
              "Questions, bug reports, and tool suggestions can be sent through the contact page.",
            ],
          },
        ]}
      >
        <div className="flex flex-wrap gap-4">
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          <Link href="/contact" className="underline">
            Contact
          </Link>
        </div>
      </BasicPageContent>

      <SiteFooter />
    </PageShell>
  );
}
