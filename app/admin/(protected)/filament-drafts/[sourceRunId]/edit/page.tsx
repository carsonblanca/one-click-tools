import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
import { getFilamentDraftBySourceRunId } from "@/lib/filaments/imports/supabase-import-repository";
import { getManualBrand } from "@/lib/filaments/manual-filament-types";
import { manualParameterTemplate } from "@/lib/filaments/manual-parameter-template";
import DraftDetailClient from "../DraftDetailClient";
import ManualFilamentForm from "../../../brands/[brandId]/filaments/new/ManualFilamentForm";
import { resolveImportedProductLineName } from "@/lib/filaments/catalog/product-line-name";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayValue(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

function candidateValue(candidates: Record<string, unknown>[], key: string): string {
  const candidate = candidates.find((item) => text(item.key) === key);
  return text(candidate?.value).replace(/\s*(mm|g)\s*$/i, "");
}

export default async function EditManualFilamentDraftPage({
  params,
}: {
  params: Promise<{ sourceRunId: string }>;
}) {
  const session = await requireAdminScope("display.draft.edit");
  if (session.role !== "admin" && session.role !== "codex") {
    redirect("/admin/forbidden");
  }
  const { sourceRunId } = await params;

  const draft = await getFilamentDraftBySourceRunId(sourceRunId);
  if (!draft) notFound();

  const brand = getManualBrand(draft.brand_id);
  if (!brand) notFound();

  const data = objectValue(draft.draft_data);
  const sourceType = text(data.sourceType);

  if (sourceType !== "manual") {
    const brand = objectValue(data.brand);
    const productLine = objectValue(data.productLine);
    const parameterBlock = objectValue(data.parameters);
    const parameterFields = objectValue(parameterBlock.fields);
    const parameterCandidates = arrayValue(parameterBlock.candidates);
    const productLineForEdit = {
      ...productLine,
      name: resolveImportedProductLineName({ rowName: draft.product_line_name, materialType: draft.material_type, draftData: data }),
      diameterMm: text(productLine.diameterMm) || candidateValue(parameterCandidates, "filamentDiameter"),
      netWeightG: text(productLine.netWeightG) || candidateValue(parameterCandidates, "netWeight"),
    };
    const parameterSourceEvidence = arrayValue(parameterBlock.sourceEvidence);
    const colors = arrayValue(data.canonicalColors).length
      ? arrayValue(data.canonicalColors)
      : arrayValue(data.colors);
    const manualParameters = arrayValue(parameterBlock.manualParameters).length
      ? arrayValue(parameterBlock.manualParameters)
      : arrayValue(parameterBlock.items);

    return (
      <main className="space-y-6">
        <header>
          <p className="text-sm text-slate-500">导入草稿安全编辑</p>
          <h1 className="text-2xl font-semibold">{resolveImportedProductLineName({ rowName: draft.product_line_name, materialType: draft.material_type, draftData: data }) || "未命名耗材"}</h1>
          <p className="mt-2 text-sm text-slate-600">
            仅修改明确编辑字段；参数候选、图片资产和导入证据保持不变。
          </p>
        </header>
        <DraftDetailClient
          sourceRunId={sourceRunId}
          brandId={draft.brand_id}
          brand={brand}
          productLine={productLineForEdit}
          colors={colors}
          manualParameters={manualParameters}
          parameterFields={parameterFields}
          parameterCandidates={parameterCandidates}
          parameterStatus={text(parameterBlock.status) || "missing"}
          parameterSourceType={text(parameterBlock.sourceType) || "missing"}
          parameterSourceEvidence={parameterSourceEvidence}
          parameterReviewNote={text(parameterBlock.reviewNote)}
        />
      </main>
    );
  }

  const productLine = objectValue(data.productLine);
  const savedParameters = arrayValue(objectValue(data.parameters).items);
  const savedColors = arrayValue(data.colors);
  const savedPresets = arrayValue(data.presets);

  const parameterMap = new Map(savedParameters.map((item) => [text(item.key), item]));
  const parameters = manualParameterTemplate.map((item) => {
    const saved = parameterMap.get(item.key);
    return {
      ...item,
      value: text(saved?.value),
      sourceStatus: ["manual", "official", "missing"].includes(text(saved?.sourceStatus))
        ? (text(saved?.sourceStatus) as "manual" | "official" | "missing")
        : "manual",
      sourceNote: text(saved?.sourceNote),
    };
  });

  const colors = savedColors.map((color, index) => ({
    id: text(color.id) || `color-${index + 1}`,
    colorNameZh: text(color.colorNameZh),
    colorNameEn: text(color.colorNameEn),
    officialColorCode: text(color.officialColorCode),
    availability: text(color.availability) || "available",
    image: color.image && typeof color.image === "object" && !Array.isArray(color.image)
      ? {
          id: text((color.image as Record<string, unknown>).id) || `asset-${index + 1}`,
          kind: "image" as const,
          fileName: text((color.image as Record<string, unknown>).fileName) || text((color.image as Record<string, unknown>).objectKey) || "image",
          objectKey: text((color.image as Record<string, unknown>).objectKey),
          url: text((color.image as Record<string, unknown>).url),
          contentType: text((color.image as Record<string, unknown>).contentType) || "image/png",
          size: Number((color.image as Record<string, unknown>).size) || 0,
        }
      : null,
    note: text(color.note),
  }));

  const presets = savedPresets.map((preset, index) => ({
    id: text(preset.id) || `preset-${index + 1}`,
    name: text(preset.name) || text(preset.fileName) || "preset.json",
    fileName: text(preset.fileName) || text(preset.name) || "preset.json",
    objectKey: text(preset.objectKey),
    url: text(preset.url),
    fileType: text(preset.fileType) || text(preset.contentType) || "application/json",
    size: Number(preset.size) || 0,
    note: text(preset.note),
  }));

  return (
    <ManualFilamentForm
      brand={brand}
      parameterTemplate={manualParameterTemplate}
      existingDraft={{
        sourceRunId,
        productLine: {
          productLineName: text(productLine.productLineName) || text(productLine.name) || draft.product_line_name || "",
          material: text(productLine.material) || text(productLine.materialType) || draft.material_type || "",
          variant: text(productLine.variant) || draft.variant || "",
          diameter: text(productLine.diameter) || "1.75",
          netWeight: text(productLine.netWeight) || "1000",
          description: text(productLine.description),
          officialUrl: text(productLine.officialUrl),
          datasheetUrl: text(productLine.datasheetUrl),
          note: text(productLine.note),
        },
        parameters,
        colors,
        presets,
      }}
    />
  );
}
