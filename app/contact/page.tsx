import type { Metadata } from "next";
import BasicPageContent from "../../components/BasicPageContent";
import PageShell from "../../components/PageShell";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

const contactEmail = "gainerht@gmail.com";

export const metadata: Metadata = {
  title: "Contact OneClick Tools | Bug Reports and Suggestions",
  description:
    "Contact OneClick Tools to report bugs, suggest tools, or ask questions about the site.",
};

export default function ContactPage() {
  return (
    <PageShell>
      <SiteHeader />

      <BasicPageContent
        eyebrow="Contact"
        title="Get in touch."
        intro="Use this page to report bugs, suggest new tools, or ask questions about OneClick Tools."
        sections={[
          {
            title: "Email",
            paragraphs: [
              `The best way to contact OneClick Tools is by email at ${contactEmail}.`,
              "Please include the tool name, page URL, browser, device, and a short description if you are reporting a bug.",
            ],
          },
          {
            title: "Suggestions",
            paragraphs: [
              "Tool suggestions are welcome, especially small browser-based utilities that can run locally without user accounts or uploads.",
              "There is no backend contact form on this page. Using email keeps the contact flow simple and transparent.",
            ],
          },
        ]}
      >
        <a href={`mailto:${contactEmail}`} className="text-lg font-semibold underline">
          {contactEmail}
        </a>
      </BasicPageContent>

      <SiteFooter />
    </PageShell>
  );
}
