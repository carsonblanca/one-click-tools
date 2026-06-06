import Link from "next/link";
import type { Metadata } from "next";
import BasicPageContent from "../../components/BasicPageContent";
import PageShell from "../../components/PageShell";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata: Metadata = {
  title: "Privacy Policy | OneClick Tools",
  description:
    "Read the OneClick Tools privacy policy, including how browser-based tools are designed to process user-entered content locally where possible.",
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <SiteHeader />

      <BasicPageContent
        eyebrow="Privacy Policy"
        title="Privacy-first basics in plain English."
        intro="This policy explains how OneClick Tools approaches user-entered content, browser-based tools, and possible third-party services."
        sections={[
          {
            title: "Browser-based tools",
            paragraphs: [
              "OneClick Tools is designed so browser tools run locally where possible. For many tools, the text, image, file, or other content you enter is processed by your browser on your device.",
              "User-entered content is not intentionally uploaded to OneClick Tools servers by these tools. You should still avoid entering highly sensitive information into any online tool unless you are comfortable doing so.",
            ],
          },
          {
            title: "Third-party services",
            paragraphs: [
              "Third-party services may be used for hosting, analytics, search indexing, security, performance, and ads in the future. These services may process technical information such as IP address, browser details, device information, referral pages, and usage events.",
              "If advertising is added, advertising partners may use cookies or similar technologies to serve, measure, and improve ads. Their use of information may be governed by their own privacy policies.",
            ],
          },
          {
            title: "No unnecessary accounts",
            paragraphs: [
              "OneClick Tools does not require users to create an account to use the tools. This helps keep the experience simple and limits the amount of account information involved.",
              "The site may still receive standard technical logs from hosting and infrastructure providers, as most websites do.",
            ],
          },
          {
            title: "Changes to this policy",
            paragraphs: [
              "This policy may be updated as the site changes, including if analytics, advertising, or other services are added or changed.",
              "The latest version will be posted on this page.",
            ],
          },
        ]}
      >
        <div>
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="mt-3 leading-8">
            Questions about privacy can be sent through the{" "}
            <Link href="/contact" className="underline">
              contact page
            </Link>
            .
          </p>
        </div>
      </BasicPageContent>

      <SiteFooter />
    </PageShell>
  );
}
