import Link from "next/link";
import tools from "../data/tools.json";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* BACKGROUND */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.25),transparent_40%)]" />

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="text-xl font-semibold">
            OneClick Tools
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-24 pb-20">
        <h1 className="text-6xl font-bold tracking-tight">
          Free Online Tools
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-white/60">
          Fast, clean and free online tools for developers,
          creators and everyday work.
        </p>
      </section>

      {/* TOOLS */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="block rounded-3xl border border-white/10 bg-white/[0.03] p-8 transition hover:-translate-y-1 hover:border-purple-500/30 hover:bg-white/[0.05]"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">
                  {tool.name}
                </h2>

                <div className="rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
                  {tool.tag}
                </div>
              </div>

              <p className="mt-4 text-white/60">
                {tool.desc}
              </p>

              <div className="mt-8 text-sm text-purple-300">
                Open Tool →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 py-10 text-center text-sm text-white/40">
        © 2026 OneClick Tools
      </footer>
    </main>
  );
}