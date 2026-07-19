import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import {
  fipImageEntries,
  FipValidationError,
  parseKexcelledFip,
} from "@/lib/filaments/imports/kexcelled-fip";
import {
  appendAdminAuditLog,
  createFilamentDrafts,
  createFilamentImport,
  deleteFilamentImport,
  listRecentFilamentImports,
  type JsonValue,
} from "@/lib/filaments/imports/supabase-import-repository";
import {
  deleteFipAssetFromR2,
  deleteImportObjectFromR2,
  uploadFipAssetToR2,
  uploadFipPackageToR2,
} from "@/lib/storage/r2";
import {
  fieldsAcceptedFromCandidates,
  normalizeParameterCandidate,
  unmappedFieldsAcceptedFromCandidates,
} from "@/lib/filaments/parameters/normalized-parameters";

export const runtime = "nodejs";

function jsonError(error: string, code: string, status: number, details = "") {
  return NextResponse.json({ error, code, details }, { status });
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function jsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function safeDraftKey(sourceRunId: string, productIndex: number) {
  return `${sourceRunId}::${productIndex}`;
}

function mapColors(
  colors: Record<string, unknown>[],
  images: Record<string, unknown>[],
  assetKeys: Map<string, string>,
) {
  const sourceToPackage = new Map(
    images.map((image) => [
      stringValue(image.sourcePath),
      stringValue(image.packagePath),
    ]),
  );
  return colors.map((color, index) => {
    const localImagePath = stringValue(color.localImagePath);
    const packagePath = sourceToPackage.get(localImagePath) || localImagePath;
    const objectKey = assetKeys.get(packagePath);
    return {
      ...color,
      domIndex: index,
      rawSkuText: stringValue(color.rawSkuText)
        || stringValue(objectValue(Array.isArray(color.skuVariants) ? color.skuVariants[0] : {}).rawSkuText),
      imageCandidateUrl: objectKey
        ? `/api/admin/filament-import/kexcelled-evidence/asset?key=${encodeURIComponent(objectKey)}`
        : stringValue(color.imageCandidateUrl),
      localImagePath: objectKey || localImagePath,
      imageSourceMethod: objectKey ? "r2_fip_asset" : stringValue(color.imageSourceMethod),
      sourceEvidence: Array.isArray(color.sourceEvidence) ? color.sourceEvidence : [],
      notes: Array.isArray(color.notes) ? color.notes : [],
      colorVariants: Array.isArray(color.skuVariants) ? color.skuVariants : [],
      rawSkuCount: Array.isArray(color.skuVariants) ? color.skuVariants.length : 1,
      displayStatus: "pending",
      imageDisplayStatus: objectKey ? "pending" : "no_image",
      reviewedBy: "system",
    };
  });
}

function draftData(input: {
  fileName: string;
  product: Record<string, unknown>;
  colors: Record<string, unknown>[];
  parameters: Record<string, unknown>[];
  images: Record<string, unknown>[];
  evidence: unknown;
  report: Record<string, unknown>;
  manifest: Record<string, unknown>;
  assetKeys: Map<string, string>;
}) {
  const product = input.product;
  const productLineId = stringValue(product.productLineId);
  const productKey = stringValue(product.productKey) || productLineId;
  const colors = mapColors(input.colors, input.images, input.assetKeys);
  const candidates = input.parameters.map(normalizeParameterCandidate);
  const fields = fieldsAcceptedFromCandidates(candidates);
  const unmappedFields = unmappedFieldsAcceptedFromCandidates(candidates);
  return {
    source: { zipFilename: input.fileName },
    productKey,
    brand: { id: "kexcelled", brandId: "kexcelled", name: "KEXCELLED" },
    productLine: {
      productLineId,
      productKey,
      name: stringValue(product.productLine),
      materialType: stringValue(product.materialType),
      variant: stringValue(product.variant),
      diameterMm: numberValue(product.diameterMm),
      netWeightG: numberValue(product.netWeightG),
    },
    colors,
    canonicalColors: colors,
    parameters: {
      fields,
      candidates,
      unmappedFields,
      status: Object.keys(fields).length ? "official_partial" : "missing",
    },
    images: input.images.map((image) => ({
      ...image,
      r2ObjectKey: input.assetKeys.get(stringValue(image.packagePath)) || null,
    })),
    evidence: input.evidence,
    importDecision: objectValue(input.report.importDecision || input.manifest.importDecision),
    importWarnings: Array.isArray(input.report.warnings) ? input.report.warnings : [],
  };
}

export async function GET() {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "candidate.view")) {
    return jsonError("无权查看导入记录", "FORBIDDEN", 403);
  }
  try {
    const imports = await listRecentFilamentImports();
    return NextResponse.json({
      results: imports.map((item) => ({
        fileName: item.originalFilename,
        recognizedBrand: item.brandId.toUpperCase(),
        productLine: stringValue(objectValue(item.manifest).productLine),
        materialType: stringValue(objectValue(item.manifest).materialType),
        colorCount: 0,
        availableSkuCount: 0,
        disabledSkuCount: 0,
        imageCandidateCount: 0,
        sharedImageCandidateCount: 0,
        parameterStatus: "",
        status: item.status === "draft" ? "imported_draft" : item.status,
        adminDraftStatus: "imported_to_admin_draft",
        rawSkuCount: 0,
        canonicalColorCount: 0,
        mergedVariantCount: 0,
        runId: item.sourceRunId,
        draftPath: `/admin/filament-drafts/${encodeURIComponent(item.sourceRunId)}`,
        summaryPath: "",
        error: item.errorMessage || "",
        publicationStatus: "draft",
      })),
    });
  } catch {
    return jsonError("读取导入记录失败", "IMPORT_LIST_FAILED", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "candidate.create")) {
    return jsonError("无权导入耗材包", "FORBIDDEN", 403);
  }

  let storedPackage: { bucket: string; objectKey: string } | null = null;
  let createdImportId: string | null = null;
  const storedAssetKeys: string[] = [];
  try {
    const formData = await request.formData();
    const file = formData.get("files");
    const brandId = stringValue(formData.get("brandId")).toLowerCase();
    if (!(file instanceof File)) return jsonError("请选择 FIP 文件", "FILE_REQUIRED", 400);
    if (brandId !== "kexcelled") return jsonError("当前仅支持 KEXCELLED FIP", "UNSUPPORTED_BRAND", 400);
    if (!file.name.toLowerCase().endsWith(".filament-import.zip")) {
      return jsonError("不是合法 FIP", "INVALID_FIP", 400, "文件扩展名必须为 .filament-import.zip");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = parseKexcelledFip(bytes);
    const importId = randomUUID();
    const sourceRunId = `${parsed.sourceRunId}-${importId.slice(0, 8)}`;
    const actorId = session.actorId;
    const packageUpload = await uploadFipPackageToR2({
      importId,
      brandId,
      bytes,
      originalFilename: file.name,
      contentType: file.type || "application/zip",
    });
    storedPackage = packageUpload;

    const assetKeys = new Map<string, string>();
    for (const [packagePath, asset] of fipImageEntries(parsed)) {
      const upload = await uploadFipAssetToR2({
        importId,
        brandId,
        packagePath,
        bytes: asset.bytes,
        contentType: asset.contentType,
      });
      assetKeys.set(packagePath, upload.objectKey);
      storedAssetKeys.push(upload.objectKey);
    }

    await createFilamentImport({
      id: importId,
      sourceRunId,
      brandId,
      originalFilename: file.name,
      r2Bucket: packageUpload.bucket,
      r2ObjectKey: packageUpload.objectKey,
      contentType: packageUpload.contentType,
      byteSize: packageUpload.size,
      status: "draft",
      manifest: jsonValue({
        ...parsed.manifest,
        originalSourceRunId: parsed.sourceRunId,
        productLine: stringValue(parsed.products[0]?.productLine),
        materialType: stringValue(parsed.products[0]?.materialType),
      }),
      evidence: jsonValue(parsed.evidence),
      createdBy: actorId,
    });
    createdImportId = importId;

    const drafts = await createFilamentDrafts(parsed.products.map((product, productIndex) => ({
      id: randomUUID(),
      importId,
      draftKey: safeDraftKey(sourceRunId, productIndex),
      sourceRunId,
      productIndex,
      brandId,
      productLineName: stringValue(product.productLine) || null,
      materialType: stringValue(product.materialType) || null,
      variant: stringValue(product.variant) || null,
      draftData: jsonValue(draftData({
        fileName: file.name,
        product,
        colors: parsed.colors,
        parameters: parsed.parameters,
        images: parsed.images,
        evidence: parsed.evidence,
        report: parsed.report,
        manifest: parsed.manifest,
        assetKeys,
      })),
      actorId,
    })));

    await appendAdminAuditLog({
      actorId,
      action: "filament_fip_imported",
      entityType: "filament_import",
      entityId: importId,
      details: {
        sourceRunId,
        draftCount: drafts.length,
        assetCount: assetKeys.size,
      },
    });

    return NextResponse.json({
      success: true,
      importId,
      draftIds: drafts.map((draft) => draft.id),
      sourceRunId,
      redirectTo: `/admin/filament-drafts/${encodeURIComponent(sourceRunId)}`,
      summary: {
        productLine: stringValue(parsed.products[0]?.productLine),
        materialType: stringValue(parsed.products[0]?.materialType),
        colorCount: parsed.colors.length,
        parameterCount: parsed.parameters.length,
        assetCount: assetKeys.size,
        importDecision: objectValue(parsed.report.importDecision || parsed.manifest.importDecision),
      },
      r2: {
        packageObjectKey: packageUpload.objectKey,
        assetObjectKeys: Array.from(assetKeys.values()),
      },
    });
  } catch (error) {
    if (createdImportId) {
      try {
        await deleteFilamentImport(createdImportId);
      } catch {
        // Continue best-effort object cleanup.
      }
    }
    await Promise.allSettled(storedAssetKeys.map(deleteFipAssetFromR2));
    if (storedPackage) {
      try {
        await deleteImportObjectFromR2(storedPackage);
      } catch {
        // Preserve the original import failure.
      }
    }
    if (error instanceof FipValidationError) {
      return jsonError(error.message, "INVALID_FIP", 400, error.details);
    }
    const code = error instanceof Error && error.message.startsWith("missing_")
      ? "STORAGE_OR_DATABASE_UNAVAILABLE"
      : "FIP_IMPORT_FAILED";
    return jsonError("FIP 导入失败", code, 500, "服务端未能完成 R2 与 Supabase 写入");
  }
}
