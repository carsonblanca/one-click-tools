import {
  normalizeParameterFields,
  normalizeStoredParameters,
} from "@/lib/filaments/parameters/normalized-parameters";
import {
  productLineScopeMatches,
  recordsForProductLine,
} from "@/lib/filaments/identity/product-scope";

export type CaptureParameterPatch = {
  fields?: Record<string, unknown>;
  unmappedFields?: Record<string, unknown>;
  candidates?: Array<Record<string, unknown>>;
  sourceEvidence?: Array<Record<string, unknown>>;
  status?: "missing" | "official" | "official_partial" | "inherited_unverified";
  reviewNote?: string;
};

export type CaptureDraftPatch = {
  identityScope?: {
    brandId: string;
    productLineId: string;
    productKey: string;
  };
  productDefaults?: {
    diameterMm?: number;
    netWeightG?: number;
  };
  parameters?: CaptureParameterPatch;
  colors?: Array<{
    domIndex: number;
    displayStatus?: "pending" | "approved" | "hidden";
    imageDisplayStatus?: "pending" | "approved" | "hidden" | "no_image";
    imageReviewNote?: string;
  }>;
};

export class CaptureDraftPatchError extends Error {}

const PARAMETER_STATUSES = new Set(["missing", "official", "official_partial", "inherited_unverified"]);
const COLOR_STATUSES = new Set(["pending", "approved", "hidden"]);
const IMAGE_STATUSES = new Set(["pending", "approved", "hidden", "no_image"]);

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function scopeRecords(value: unknown, identityScope: NonNullable<CaptureDraftPatch["identityScope"]>) {
  if (!Array.isArray(value)) return value;
  return recordsForProductLine(value, identityScope.productLineId).map((item) => {
    const record = objectValue(item);
    return {
      ...record,
      brandId: identityScope.brandId,
      productLineId: identityScope.productLineId,
      productKey: identityScope.productKey,
    };
  });
}

export function isCaptureDraftData(value: unknown): boolean {
  const data = objectValue(value);
  const explicitSourceType = text(data.sourceType);
  if (explicitSourceType) return explicitSourceType === "capture";

  const source = objectValue(data.source);
  return Boolean(text(source.zipFilename))
    && (Array.isArray(data.canonicalColors) || Array.isArray(data.images) || Array.isArray(data.evidence));
}

function mergeColorReview(
  colors: unknown,
  patches: NonNullable<CaptureDraftPatch["colors"]>,
) {
  if (!Array.isArray(colors)) return colors;
  const patchMap = new Map(patches.map((patch) => [patch.domIndex, patch]));
  return colors.map((value) => {
    const color = objectValue(value);
    const domIndex = typeof color.domIndex === "number" ? color.domIndex : Number(color.domIndex);
    const patch = Number.isFinite(domIndex) ? patchMap.get(domIndex) : undefined;
    if (!patch) return value;

    return {
      ...color,
      ...(patch.displayStatus !== undefined ? { displayStatus: patch.displayStatus } : {}),
      ...(patch.imageDisplayStatus !== undefined ? { imageDisplayStatus: patch.imageDisplayStatus } : {}),
      ...(patch.imageReviewNote !== undefined ? { imageReviewNote: patch.imageReviewNote } : {}),
    };
  });
}

export function mergeCaptureDraftData(
  currentValue: unknown,
  patch: CaptureDraftPatch,
): Record<string, unknown> {
  const current = objectValue(currentValue);
  if (!isCaptureDraftData(current)) {
    throw new CaptureDraftPatchError("仅 capture 草稿可以使用此安全编辑入口。");
  }
  if (!patch.parameters && !patch.colors && !patch.identityScope && !patch.productDefaults) {
    throw new CaptureDraftPatchError("无有效更新字段。");
  }
  const allowedPatchKeys = new Set(["parameters", "colors", "identityScope", "productDefaults"]);
  if (Object.keys(patch).some((key) => !allowedPatchKeys.has(key))) {
    throw new CaptureDraftPatchError("请求包含不允许更新的字段。");
  }
  if (patch.colors?.length === 0) {
    throw new CaptureDraftPatchError("不允许使用空数组清空颜色。");
  }
  if (patch.colors && (!Array.isArray(patch.colors) || patch.colors.some((color) => (
    !color
    || typeof color !== "object"
    || !Number.isInteger(color.domIndex)
    || (color.displayStatus !== undefined && !COLOR_STATUSES.has(color.displayStatus))
    || (color.imageDisplayStatus !== undefined && !IMAGE_STATUSES.has(color.imageDisplayStatus))
  )))) {
    throw new CaptureDraftPatchError("颜色更新格式无效。");
  }
  if (patch.identityScope) {
    const { brandId, productLineId, productKey } = patch.identityScope;
    if (!/^[a-z0-9-]+$/.test(brandId)
      || !/^[a-z0-9-]+$/.test(productLineId)
      || productKey !== productLineId
      || !productLineId.startsWith(`${brandId}-`)) {
      throw new CaptureDraftPatchError("产品身份作用域格式无效。");
    }
    if (!productLineScopeMatches(objectValue(current.productLine), productLineId)) {
      throw new CaptureDraftPatchError("请求产品与当前草稿 productLineId 不一致。");
    }
  }
  if (patch.productDefaults && (
    typeof patch.productDefaults !== "object"
    || Array.isArray(patch.productDefaults)
    || Object.keys(patch.productDefaults).some((key) => !["diameterMm", "netWeightG"].includes(key))
    || Object.values(patch.productDefaults).some((value) => typeof value !== "number" || !Number.isFinite(value) || value <= 0)
  )) {
    throw new CaptureDraftPatchError("产品默认规格格式无效。");
  }

  let next = current;
  if (patch.parameters) {
    if (typeof patch.parameters !== "object" || Array.isArray(patch.parameters)) {
      throw new CaptureDraftPatchError("参数更新格式无效。");
    }
    const parameters = objectValue(current.parameters);
    const normalizedCurrent = normalizeStoredParameters(parameters);
    const parameterPatch = patch.parameters;
    if (parameterPatch.candidates?.length === 0 || parameterPatch.sourceEvidence?.length === 0) {
      throw new CaptureDraftPatchError("不允许使用空数组清空参数证据。");
    }
    const allowedKeys = new Set(["fields", "unmappedFields", "candidates", "sourceEvidence", "status", "reviewNote"]);
    if (Object.keys(parameterPatch).some((key) => !allowedKeys.has(key))) {
      throw new CaptureDraftPatchError("参数请求包含不允许更新的字段。");
    }
    if (parameterPatch.fields && (typeof parameterPatch.fields !== "object" || Array.isArray(parameterPatch.fields))) {
      throw new CaptureDraftPatchError("参数字段格式无效。");
    }
    if (parameterPatch.unmappedFields && (typeof parameterPatch.unmappedFields !== "object" || Array.isArray(parameterPatch.unmappedFields))) {
      throw new CaptureDraftPatchError("其他官方参数格式无效。");
    }
    const normalizedPatchFields = normalizeParameterFields(parameterPatch.fields);
    if (Object.keys(normalizedPatchFields.unmappedFields).length) {
      throw new CaptureDraftPatchError("新增参数必须使用参数字典中的 canonical key。");
    }
    if (parameterPatch.candidates && !parameterPatch.candidates.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
      throw new CaptureDraftPatchError("参数候选格式无效。");
    }
    if (parameterPatch.sourceEvidence && !parameterPatch.sourceEvidence.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
      throw new CaptureDraftPatchError("参数证据格式无效。");
    }
    if (parameterPatch.status !== undefined && !PARAMETER_STATUSES.has(parameterPatch.status)) {
      throw new CaptureDraftPatchError("参数状态无效。");
    }

    next = {
      ...next,
      parameters: {
        ...parameters,
        fields: normalizedCurrent.fields,
        unmappedFields: normalizedCurrent.unmappedFields,
        ...(parameterPatch.fields
          ? { fields: { ...normalizedCurrent.fields, ...normalizedPatchFields.fields } }
          : {}),
        ...(parameterPatch.unmappedFields
          ? { unmappedFields: { ...normalizedCurrent.unmappedFields, ...normalizeParameterFields(parameterPatch.unmappedFields).unmappedFields } }
          : {}),
        ...(parameterPatch.candidates
          ? { candidates: parameterPatch.candidates }
          : {}),
        ...(parameterPatch.sourceEvidence ? { sourceEvidence: parameterPatch.sourceEvidence } : {}),
        ...(parameterPatch.status !== undefined ? { status: parameterPatch.status } : {}),
        ...(parameterPatch.reviewNote !== undefined ? { reviewNote: parameterPatch.reviewNote } : {}),
      },
    };
  }

  if (patch.colors) {
    next = {
      ...next,
      colors: mergeColorReview(current.colors, patch.colors),
      canonicalColors: mergeColorReview(current.canonicalColors, patch.colors),
    };
  }

  if (patch.productDefaults) {
    next = {
      ...next,
      productLine: {
        ...objectValue(next.productLine),
        ...patch.productDefaults,
      },
    };
  }

  if (patch.identityScope) {
    const identityScope = patch.identityScope;
    const parameters = objectValue(next.parameters);
    next = {
      ...next,
      productKey: identityScope.productKey,
      brand: {
        ...objectValue(next.brand),
        id: identityScope.brandId,
        brandId: identityScope.brandId,
      },
      productLine: {
        ...objectValue(next.productLine),
        productLineId: identityScope.productLineId,
        productKey: identityScope.productKey,
      },
      colors: scopeRecords(next.colors, identityScope),
      canonicalColors: scopeRecords(next.canonicalColors, identityScope),
      images: scopeRecords(next.images, identityScope),
      evidence: scopeRecords(next.evidence, identityScope),
      parameters: {
        ...parameters,
        candidates: scopeRecords(parameters.candidates, identityScope),
        sourceEvidence: scopeRecords(parameters.sourceEvidence, identityScope),
      },
    };
  }

  return next;
}
