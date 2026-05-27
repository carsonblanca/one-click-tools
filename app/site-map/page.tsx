import Link from "next/link";
import tools from "../../data/tools.json";
import categories from "../../data/categories.json";

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

  const categoriesWithTools = categoryList.filter((category) =>
    toolList.some((tool) => tool.categorySlug === category.slug)
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.25),transparent_40%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold">
            OneClick Tools
          </Link>

          <nav className="hidden gap-6 text-sm text-white/60 md:flex">
            <Link href="/" className="hover:text-white">
              Home
            </Link>

            <Link href="/#tools" className="hover:text-white">
              Tools
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-16">
        <div className="mb-6 inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300">
          Human-Friendly Site Map
        </div>

        <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
          Browse all tools.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
          Explore every free online tool on OneClick Tools, grouped by category
          for easier browsing.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/50">
          Looking for the XML sitemap for search engines?{" "}
          <a
            href="/sitemap.xml"
            className="text-purple-300 hover:text-purple-200"
          >
            Open sitemap.xml
          </a>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="space-y-14">
          {categoriesWithTools.map((category) => {
            const categoryTools = toolList.filter(
              (tool) => tool.categorySlug === category.slug
            );

            return (
              <section key={category.slug}>
                <div className="mb-6 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <h2 className="text-3xl font-bold">
                      {category.name} Tools
                    </h2>

                    <p className="mt-2 text-white/50">
                      {category.description}
                    </p>
                  </div>

                  <div className="hidden rounded-full bg-white/10 px-4 py-2 text-sm text-white/50 md:block">
                    {categoryTools.length} tools
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {categoryTools.map((tool) => (
                    <Link
                      key={tool.slug}
                      href={`/tools/${tool.slug}`}
                      className="block rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-purple-500/30 hover:bg-white/[0.05]"
                    >
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <h3 className="text-xl font-semibold">{tool.name}</h3>

                        <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
                          {tool.category || tool.tag}
                        </span>
                      </div>

                      <p className="leading-7 text-white/60">
                        {tool.desc || tool.description}
                      </p>

                      <div className="mt-6 text-sm text-purple-300">
                        Open Tool →
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-10 text-center text-sm text-white/40">
        © 2026 OneClick Tools
      </footer>
    </main>
  );
}