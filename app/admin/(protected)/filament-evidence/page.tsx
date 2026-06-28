import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { requireAdminScope } from "@/lib/admin/auth";
import { listFilamentEvidenceDrafts } from "@/lib/filaments/evidence/evidence-draft-store";
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

export default async function FilamentEvidencePage() {
  const session = await requireAdminScope("candidate.view");
  const [brands, drafts] = await Promise.all([readTargets(), listFilamentEvidenceDrafts()]);
  return <FilamentEvidenceWorkbench brands={brands} initialDrafts={drafts} actorId={session.actorId} />;
}

