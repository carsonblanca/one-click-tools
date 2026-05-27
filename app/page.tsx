import tools from "../data/tools.json";
import categories from "../data/categories.json";
import ToolsBrowser from "../components/ToolsBrowser";
import HomeHero from "../components/HomeHero";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import PageShell from "../components/PageShell";

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

export default function Home() {
  const toolList = tools as Tool[];
  const categoryList = categories as Category[];

  return (
    <PageShell>
      <SiteHeader />

      <HomeHero tools={toolList} />

      <ToolsBrowser tools={toolList} categories={categoryList} />

      <SiteFooter />
    </PageShell>
  );
}