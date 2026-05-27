import tools from "../../data/tools.json";
import categories from "../../data/categories.json";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import SiteMapContent from "../../components/SiteMapContent";
import PageShell from "../../components/PageShell";

type Tool = {
  name: string;
  slug: string;
  tag: string;
  category: string;
  categorySlug: string;
  desc: string;
  description: string;
};

type Category = {
  name: string;
  slug: string;
  description: string;
};

export const metadata = {
  title: "Site Map | OneClick Tools",
  description:
    "Browse every free online tool available on OneClick Tools by category.",
};

export default function SiteMapPage() {
  const toolList = tools as Tool[];
  const categoryList = categories as Category[];

  return (
    <PageShell>
      <SiteHeader />

      <SiteMapContent tools={toolList} categories={categoryList} />

      <SiteFooter />
    </PageShell>
  );
}