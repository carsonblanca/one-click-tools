import Link from "next/link";
import tools from "../data/tools.json";
import categories from "../data/categories.json";
import ToolsBrowser from "../components/ToolsBrowser";

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
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.25),transparent_40%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold">
            OneClick Tools
          </Link>

          <nav className="hidden gap-6 text-sm text-white/60 md:flex">
            <a href="#tools" className="hover:text-white">
              Tools
            </a>

            <Link href="/site-map" className="hover:text-white">
              Site Map
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-24 pb-20">
        <div className="mb-6 inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300">
          Free Online Tools
        </div>

        <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
          Simple tools for fast everyday work.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
          OneClick Tools provides free online utilities for developers,
          creators and everyday users. Search, browse, and use tools instantly
          with no login required.
        </p>
      </section>

      <ToolsBrowser tools={toolList} categories={categoryList} />

      <footer className="relative z-10 border-t border-white/10 py-10 text-center text-sm text-white/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-6 md:flex-row md:justify-between">
          <div>© 2026 OneClick Tools</div>

          <div className="flex gap-5">
            <Link href="/site-map" className="hover:text-white">
              Site Map
            </Link>

            <a href="/sitemap.xml" className="hover:text-white">
              XML Sitemap
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}