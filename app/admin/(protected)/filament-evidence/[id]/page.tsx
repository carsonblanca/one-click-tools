import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdminScope } from "@/lib/admin/auth";
import { getFilamentEvidenceDraft } from "@/lib/filaments/evidence/evidence-draft-store";

export default async function FilamentEvidenceDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminScope("candidate.view");
  const { id } = await params;
  const draft = await getFilamentEvidenceDraft(id);
  if (!draft) notFound();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">证据草稿</h1>
          <p className="mt-1 text-sm text-[#667281]">{draft.id}</p>
        </div>
        <Link className="text-sm text-[#1F5FAF] hover:underline" href="/admin/filament-evidence">返回证据采集</Link>
      </div>
      <dl className="grid gap-3 border-y border-[#D9E0E7] py-4 text-sm md:grid-cols-3">
        <div><dt className="text-[#667281]">目标</dt><dd>{draft.targetBinding.brandLabel} / {draft.targetBinding.productLineLabel}</dd></div>
        <div><dt className="text-[#667281]">材料与证据类型</dt><dd>{draft.targetBinding.materialType} / {draft.targetBinding.evidenceTypeLabel}</dd></div>
        <div><dt className="text-[#667281]">状态</dt><dd>{draft.reviewStatus === "pending_review" ? "待审核" : draft.reviewStatus}</dd></div>
        <div><dt className="text-[#667281]">确认标题</dt><dd>{String(draft.titleEvidence.confirmedTitle || "未确认")}</dd></div>
        <div><dt className="text-[#667281]">色卡数量</dt><dd>{draft.cardCount}</dd></div>
        <div><dt className="text-[#667281]">原图</dt><dd>{draft.sourceImageName}</dd></div>
      </dl>
      <section>
        <h2 className="text-lg font-semibold">原始证据图</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/admin/filament-evidence/${draft.id}/source-image`}
          alt={draft.sourceImageName}
          className="mt-3 max-h-[560px] max-w-full border border-[#D9E0E7] object-contain"
        />
      </section>
      <section>
        <h2 className="text-lg font-semibold">裁切状态</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {draft.annotations.map((annotation, index) => (
            <div key={`${String(annotation.row)}-${String(annotation.column)}-${index}`} className="border border-[#D9E0E7] p-3 text-sm">
              <p className="font-medium">{String(annotation.row)}-{String(annotation.column)}</p>
              <p className="mt-1 text-[#667281]">{String(annotation.cropStatus || "manual")}</p>
              {Boolean(annotation.tailBoundaryCorrected) && <p className="mt-1 text-[#1F5FAF]">行尾边界已校正</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
