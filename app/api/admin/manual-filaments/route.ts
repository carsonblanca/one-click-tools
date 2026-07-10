import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import {
  appendAdminAuditLog,
  createFilamentDrafts,
  createFilamentImport,
} from "@/lib/filaments/imports/supabase-import-repository";
import { getManualBrand, safeManualSegment } from "@/lib/filaments/manual-filament-types";
import type {
  ManualColorInput,
  ManualParameterInput,
  ManualPresetInput,
} from "@/lib/filaments/manual-filament-types";
import { manualParameterTemplateVersion } from "@/lib/filaments/manual-parameter-template";

export const runtime = "nodejs";

type ManualFilamentPayload = {
  brandId: string;
  productLine: {
    productLineId?: string;
    productLineName: string;
    material: string;
    variant?: string;
    diameter?: string;
    netWeight?: string;
    description?: string;
    officialUrl?: string;
    datasheetUrl?: string;
    note?: string;
  };
  parameters: ManualParameterInput[];
  colors: ManualColorInput[];
  presets: ManualPresetInput[];
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validSourceStatus(value: string): "official" | "manual" | "missing" {
  return value === "official" || value === "missing" ? value : "manual";
}

export async function POST(request: NextRequest) {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "display.draft.create")) {
    return NextResponse.json({ error: "无权创建耗材草稿。" }, { status: 403 });
  }

  let payload: ManualFilamentPayload;
  try {
    payload = await request.json() as ManualFilamentPayload;
  } catch {
    return NextResponse.json({ error: "请求格式无效。" }, { status: 400 });
  }

  const brand = getManualBrand(text(payload.brandId));
  if (!brand) return NextResponse.json({ error: "品牌不存在。" }, { status: 400 });
  const productLineName = text(payload.productLine?.productLineName);
  const material = text(payload.productLine?.material);
  if (!productLineName || !material) {
    return NextResponse.json({ error: "产品线名称和材料为必填。" }, { status: 400 });
  }

  const importId = randomUUID();
  const draftId = randomUUID();
  const runId = `manual-${safeManualSegment(brand.brandId, "brand")}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const productLineId = text(payload.productLine.productLineId) || safeManualSegment(productLineName, "manual-product-line");
  const parameters = Array.isArray(payload.parameters)
    ? payload.parameters.map((item) => ({
        key: text(item.key),
        category: text(item.category),
        labelZh: text(item.labelZh),
        labelEn: text(item.labelEn),
        value: text(item.value),
        unit: text(item.unit),
        sourceStatus: validSourceStatus(text(item.sourceStatus)),
        sourceNote: text(item.sourceNote),
      }))
    : [];
  const colors = Array.isArray(payload.colors)
    ? payload.colors.map((item) => ({
        id: text(item.id) || randomUUID(),
        colorNameZh: text(item.colorNameZh),
        colorNameEn: text(item.colorNameEn),
        officialColorCode: text(item.officialColorCode),
        availability: text(item.availability) || "available",
        image: item.image || null,
        note: text(item.note),
      }))
    : [];
  const presets = Array.isArray(payload.presets) ? payload.presets : [];

  const draftData = {
    sourceType: "manual",
    brand,
    productLine: {
      productLineId,
      productLineName,
      name: productLineName,
      material,
      materialType: material,
      variant: text(payload.productLine.variant),
      diameter: text(payload.productLine.diameter),
      diameterMm: Number(text(payload.productLine.diameter)) || null,
      netWeight: text(payload.productLine.netWeight),
      netWeightG: Number(text(payload.productLine.netWeight)) || null,
      description: text(payload.productLine.description),
      officialUrl: text(payload.productLine.officialUrl),
      datasheetUrl: text(payload.productLine.datasheetUrl),
      note: text(payload.productLine.note),
    },
    parameters: {
      templateVersion: manualParameterTemplateVersion,
      items: parameters,
    },
    colors,
    presets,
  };

  try {
    const createdImport = await createFilamentImport({
      id: importId,
      sourceRunId: runId,
      brandId: brand.brandId,
      originalFilename: `${productLineId}.manual`,
      r2Bucket: "none",
      r2ObjectKey: `manual-filaments/${brand.brandId}/${runId}`,
      contentType: "application/json",
      byteSize: JSON.stringify(draftData).length,
      status: "draft",
      manifest: {
        sourceType: "manual",
        productLineId,
        productLineName,
      },
      evidence: null,
      createdBy: session.actorId,
    });
    const drafts = await createFilamentDrafts([{
      id: draftId,
      importId: createdImport.id,
      draftKey: runId,
      sourceRunId: runId,
      productIndex: 0,
      brandId: brand.brandId,
      productLineName,
      materialType: material,
      variant: text(payload.productLine.variant) || null,
      draftData,
      actorId: session.actorId,
    }]);
    await appendAdminAuditLog({
      actorId: session.actorId,
      action: "manual_filament.create",
      entityType: "filament_draft",
      entityId: draftId,
      details: { sourceRunId: runId, brandId: brand.brandId, productLineName },
    });

    return NextResponse.json({
      sourceRunId: runId,
      draftId: drafts[0]?.id || draftId,
      redirectUrl: `/admin/filament-drafts/${encodeURIComponent(runId)}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "manual_filament_create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
