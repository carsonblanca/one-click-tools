import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import KexcelledAbsDownloadPanel from "@/components/filaments/KexcelledAbsDownloadPanel";
import { listPublishedKexcelledAbsProducts } from "@/lib/filaments/catalog/published-kexcelled";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kexcelled ABS 耗材预设 | OneClick Tools",
  description: "浏览已发布的 Kexcelled ABS 耗材并生成 Bambu Studio 预设。",
};

export default async function KexcelledAbsPage() {
  let products: Awaited<ReturnType<typeof listPublishedKexcelledAbsProducts>> = [];
  try {
    products = await listPublishedKexcelledAbsProducts();
  } catch {
    products = [];
  }

  return (
    <PageShell>
      <SiteHeader locale="zh-cn" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Kexcelled ABS</h1>
        <p className="mt-2 text-[#6B665D]">选择产品和打印机，生成可导入 Bambu Studio 的预设。</p>
        {products.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-[#E5DED0] bg-[#FFFDF7] p-5 text-sm text-[#6B665D]">当前没有已发布的 Kexcelled ABS 产品。</p>
        ) : (
          <div className="mt-8 space-y-6">
            {products.map((product) => (
              <section key={product.sourceRunId} className="space-y-4">
                <div className="rounded-2xl border border-[#E5DED0] bg-[#FFFDF7] p-5">
                  <h2 className="text-xl font-semibold">{product.productLine}</h2>
                  <p className="mt-1 text-sm text-[#6B665D]">{product.materialType} · {product.colors.length} 个颜色 · {product.colors.filter((color) => color.sku).length} 个 SKU</p>
                </div>
                <KexcelledAbsDownloadPanel product={product} />
              </section>
            ))}
          </div>
        )}
      </main>
      <SiteFooter locale="zh-cn" />
    </PageShell>
  );
}
