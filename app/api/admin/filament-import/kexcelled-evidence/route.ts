import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import {
  hasMachineImportToken,
  MACHINE_IMPORT_ACTOR_ID,
} from "@/lib/admin/machine-import-auth";
import {
  fipImageEntries,
  GenericFipValidationError,
  parseFilamentFip,
} from "@/lib/filaments/imports/generic-fip";
import {
  appendAdminAuditLog,
  createFilamentDrafts,
  createFilamentImport,
  deleteFilamentImport,
  listRecentFilamentDrafts,
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
  parameterSourceEvidence,
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
  brandId: string;
  product: Record<string, unknown>;
  colors: Record<string, unknown>[];
  parameters: Record<string, unknown>[];
  images: Record<string, unknown>[];
  evidence: unknown;
  assetKeys: Map<string, string>;
}) {
  const product = input.product;
  const colors = mapColors(input.colors, input.images, input.assetKeys);
  const candidates = input.parameters.map(normalizeParameterCandidate);
  const fields = fieldsAcceptedFromCandidates(candidates);
  return {
    source: { zipFilename: input.fileName },
    brand: { name: input.brandId },
    productLine: {
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
      sourceEvidence: parameterSourceEvidence(candidates, input.evidence),
      status: Object.keys(fields).length ? "official_partial" : "missing",
    },
    images: input.images.map((image) => ({
      ...image,
      r2ObjectKey: input.assetKeys.get(stringValue(image.packagePath)) || null,
    })),
    evidence: input.evidence,
  };
}

export async function GET(request: NextRequest) {
  const session = await readAdminSession();
  const machineAuthorized = hasMachineImportToken(request);
  if (!machineAuthorized && (!session || !hasAdminScope(session.role, "candidate.view"))) {
    return jsonError("无权查看导入记录", "FORBIDDEN", 403);
  }
  try {
    const imports = await listRecentFilamentImports();
    const originalSourceRunId = request.nextUrl.searchParams.get("originalSourceRunId")?.trim() || "";
    const matchingImports = originalSourceRunId
      ? imports.filter((item) => {
          const manifest = objectValue(item.manifest);
          return item.sourceRunId === originalSourceRunId
            || stringValue(manifest.originalSourceRunId) === originalSourceRunId;
        })
      : imports;

    if (originalSourceRunId) {
      const drafts = await listRecentFilamentDrafts();
      const importIds = new Set(matchingImports.map((item) => item.id));
      return NextResponse.json({
        results: matchingImports.flatMap((item) => drafts
          .filter((draft) => draft.import_id === item.id)
          .map((draft) => {
            const data = objectValue(draft.draft_data);
            const colors = Array.isArray(data.colors) ? data.colors : [];
            const images = Array.isArray(data.images) ? data.images : [];
            const parameters = objectValue(data.parameters);
            const candidates = Array.isArray(parameters.candidates) ? parameters.candidates : [];
            const fields = objectValue(parameters.fields);
            return {
              importId: item.id,
              sourceRunId: draft.source_run_id,
              originalSourceRunId: stringValue(objectValue(item.manifest).originalSourceRunId),
              productLine: draft.product_line_name || stringValue(objectValue(data.productLine).name),
              materialType: draft.material_type || stringValue(objectValue(data.productLine).materialType),
              createdAt: draft.created_at,
              updatedAt: draft.updated_at,
              status: draft.status,
              reviewStatus: draft.review_status,
              publicationStatus: draft.publication_status,
              colorCount: colors.length,
              imageCount: images.length,
              parameterCandidateCount: candidates.length,
              parameterFieldCount: Object.keys(fields).length,
              complete: colors.length > 0 && images.length >= colors.length && candidates.length > 0,
              draftPath: `/admin/filament-drafts/${encodeURIComponent(draft.source_run_id)}`,
              editPath: `/admin/filament-drafts/${encodeURIComponent(draft.source_run_id)}/edit`,
              deletable: draft.status === "draft"
                && draft.review_status !== "approved"
                && draft.publication_status !== "published",
            };
          })),
        matchedImportCount: importIds.size,
      });
    }

    return NextResponse.json({
      results: matchingImports.map((item) => ({
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
  const machineAuthorized = hasMachineImportToken(request);
  if (!machineAuthorized && (!session || !hasAdminScope(session.role, "candidate.create"))) {
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
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(brandId)) return jsonError("品牌 ID 无效", "INVALID_BRAND", 400);
    if (!file.name.toLowerCase().endsWith(".filament-import.zip")) {
      return jsonError("不是合法 FIP", "INVALID_FIP", 400, "文件扩展名必须为 .filament-import.zip");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = parseFilamentFip(bytes);
    const manifestBrand = stringValue(parsed.manifest.brand).toLowerCase();
    if (!manifestBrand || manifestBrand !== brandId) {
      return jsonError("品牌 ID 与 FIP manifest 不一致", "BRAND_MISMATCH", 400);
    }
    const importId = randomUUID();
    const sourceRunId = `${parsed.sourceRunId}-${importId.slice(0, 8)}`;
    const actorId = machineAuthorized ? MACHINE_IMPORT_ACTOR_ID : session?.actorId;
    if (!actorId) return jsonError("无法识别导入操作者", "FORBIDDEN", 403);
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

    const drafts = await createFilamentDrafts(parsed.products.map((product, productIndex) => {
      // A generic FIP may contain multiple product candidates. Keep each
      // draft's color/image projection limited to its own product boundary.
      const productColors = Array.isArray(product.colors)
        ? product.colors.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value))
        : parsed.colors;
      const productImagePaths = new Set(productColors.map((color) => stringValue(color.packagePath)));
      const productImages = parsed.images.filter((image) => productImagePaths.has(stringValue(image.packagePath)));
      return {
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
          brandId,
          product,
          colors: productColors,
          parameters: parsed.parameters,
          images: productImages,
          evidence: parsed.evidence,
          assetKeys,
        })),
        actorId,
      };
    }));

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
    if (error instanceof GenericFipValidationError) {
      return jsonError(error.message, "INVALID_FIP", 400, error.details);
    }
    const code = error instanceof Error && error.message.startsWith("missing_")
      ? "STORAGE_OR_DATABASE_UNAVAILABLE"
      : "FIP_IMPORT_FAILED";
    return jsonError("FIP 导入失败", code, 500, "服务端未能完成 R2 与 Supabase 写入");
  }
}
