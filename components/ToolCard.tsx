import Link from "next/link";

type ToolCardProps = {
  name: string;
  slug: string;
  desc: string;
  tag: string;
};

export default function ToolCard({
  name,
  slug,
  desc,
  tag,
}: ToolCardProps) {
  return (
    <Link
      href={`/tools/${slug}`}
      className="block rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl transition hover:-translate-y-1 hover:border-purple-500/30 hover:bg-white/[0.05]"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="text-2xl font-semibold">{name}</div>

        <div className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
          {tag}
        </div>
      </div>

      <p className="leading-7 text-white/60">{desc}</p>

      <div className="mt-8 text-sm text-purple-300">
        Open Tool →
      </div>
    </Link>
  );
}