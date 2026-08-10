import Link from "next/link";
import { notFound } from "next/navigation";
import FilamentAdminEditor, { type FilamentAdminEditorDraft } from "@/components/admin/FilamentAdminEditor";
import { requireAdminScope } from "@/lib/admin/auth";
import { getFilamentDraftById } from "@/lib/filaments/imports/supabase-import-repository";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function objectArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function positiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export default async function FilamentEditPage({ params }: { params: Promise<{ filamentId: string }> }) {
  await requireAdminScope("display.view");
  const { filamentId } = await params;
  const row = await getFilamentDraftById(filamentId);
  if (!row) notFound();
  await requireAdminScope(row.publication_status === "published" ? "display.published.edit" : "display.draft.edit");

  const data = objectValue(row.draft_data);
  const productLine = objectValue(data.productLine);
  const parameters = objectValue(data.parameters);
  const colors = objectArray(data.colors).length ? objectArray(data.colors) : objectArray(data.canonicalColors);
  const productKey = String(data.productKey || productLine.productKey || productLine.productLineId || row.draft_key);
  const editorDraft: FilamentAdminEditorDraft = {
    id: row.id,
    sourceRunId: row.source_run_id,
    productName: row.product_line_name || String(productLine.name || ""),
    productKey,
    brandId: row.brand_id,
    materialType: row.material_type || String(productLine.materialType || ""),
    series: String(productLine.series || ""),
    variant: row.variant || String(productLine.variant || ""),
    netWeightG: positiveNumber(productLine.netWeightG),
    netWeightOptionsG: Array.isArray(productLine.netWeightOptionsG) ? productLine.netWeightOptionsG.filter((item): item is number => typeof item === "number" && item > 0) : [],
    filamentDiameterMm: positiveNumber(productLine.diameterMm),
    colors,
    parameters: objectValue(parameters.fields),
    images: objectArray(data.images),
    spoolAndPackaging: Object.keys(objectValue(data.spoolAndPackaging)).length ? objectValue(data.spoolAndPackaging) : null,
    compatibility: Object.keys(objectValue(data.compatibility)).length ? objectValue(data.compatibility) : null,
    brandDefaults: Object.keys(objectValue(data.brandDefaults)).length ? objectValue(data.brandDefaults) : null,
    productOverrides: Object.keys(objectValue(data.productOverrides)).length ? objectValue(data.productOverrides) : null,
    notes: typeof data.notes === "string" ? data.notes : "",
    evidence: objectArray(data.evidence),
    reviewStatus: row.review_status,
    publicationStatus: row.publication_status,
    enabled: data.enabled !== false && String(data.enabled).toLowerCase() !== "false",
    updatedAt: row.updated_at,
    parameterCandidateCount: Array.isArray(parameters.candidates) ? parameters.candidates.length : 0,
    parameterEvidenceCount: Array.isArray(parameters.sourceEvidence) ? parameters.sourceEvidence.length : 0,
  };

  return (
    <div className="space-y-5">
      <header><p className="text-sm text-[#667281]">耗材管理</p><h1 className="text-2xl font-semibold text-[#18202A]">编辑 {editorDraft.productName || "未命名耗材"}</h1><p className="mt-2 text-sm text-[#667281]">直接编辑当前数据库草稿；既有候选、证据和来源链会保留，发布状态变更继续走现有资格校验。</p></header>
      <FilamentAdminEditor draft={editorDraft} />
      <Link href={`/admin/filaments/${encodeURIComponent(row.id)}`} className="text-sm text-[#1F5FAF] hover:underline">返回耗材详情</Link>
    </div>
  );
}
