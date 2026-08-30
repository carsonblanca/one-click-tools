import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { requireAdminScope } from "@/lib/admin/auth";
import { listFilamentEvidenceDrafts } from "@/lib/filaments/evidence/evidence-draft-store";
import { listRecentFilamentDrafts } from "@/lib/filaments/imports/supabase-import-repository";
import FilamentEvidenceWorkbench from "./FilamentEvidenceWorkbench";

type ProductLineFile = {
  brandId?: string;
  brandName?: string;
  brandNameZh?: string | null;
  productLines?: Array<{
    id?: string;
    productLine?: string;
    displayName?: string;
    materialType?: string;
  }>;
};

async function readTargets() {
  const root = path.join(process.cwd(), "data/filaments/product-lines");
  const names = (await readdir(root)).filter((name) => name.endsWith(".json"));
  const files = await Promise.all(names.map(async (name) =>
    JSON.parse(await readFile(path.join(root, name), "utf8")) as ProductLineFile
  ));
  return files
    .filter((file) => file.brandId)
    .map((file) => ({
      id: file.brandId!,
      label: file.brandNameZh || file.brandName || file.brandId!,
      productLines: (file.productLines || []).map((line) => ({
        id: line.id || "",
        label: line.displayName || line.productLine || line.id || "",
        materialType: line.materialType || "",
      })).filter((line) => line.id),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function readImportedEvidenceAudit() {
  const drafts = await listRecentFilamentDrafts(100);
  return drafts
    .filter((draft) => draft.brand_id.toLowerCase() === "kexcelled")
    .map((draft) => {
      const data = objectValue(draft.draft_data);
      const parameters = objectValue(data.parameters);
      const colors = arrayValue(data.canonicalColors).length ? arrayValue(data.canonicalColors) : arrayValue(data.colors);
      const images = arrayValue(data.images);
      const candidates = arrayValue(parameters.candidates);
      const fields = objectValue(parameters.fields);
      const evidence = arrayValue(data.evidence);
      const complete = colors.length > 0 && images.length >= colors.length && candidates.length > 0 && evidence.length > 0;
      return {
        sourceRunId: draft.source_run_id,
        productLine: draft.product_line_name || String(objectValue(data.productLine).name || "未命名耗材"),
        materialType: draft.material_type || String(objectValue(data.productLine).materialType || "待补充"),
        status: draft.status,
        reviewStatus: draft.review_status,
        publicationStatus: draft.publication_status,
        colorCount: colors.length,
        imageCount: images.length,
        parameterCandidateCount: candidates.length,
        parameterFieldCount: Object.keys(fields).length,
        evidenceCount: evidence.length,
        complete,
      };
    });
}

export default async function FilamentEvidencePage() {
  const session = await requireAdminScope("candidate.view");
  const [brands, drafts, importedEvidenceAudit] = await Promise.all([
    readTargets(),
    listFilamentEvidenceDrafts(),
    readImportedEvidenceAudit(),
  ]);
  return <FilamentEvidenceWorkbench brands={brands} initialDrafts={drafts} importedEvidenceAudit={importedEvidenceAudit} actorId={session.actorId} />;
}
