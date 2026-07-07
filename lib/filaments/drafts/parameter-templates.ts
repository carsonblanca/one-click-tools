import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  readAdminFilamentDraft,
  readAdminFilamentDrafts,
  writeAdminFilamentDrafts,
  type AdminFilamentDraft,
  type ParameterReviewStatus,
  type ReviewedParameters,
} from "./admin-drafts";

export type TemplateParameterStatus = Exclude<ParameterReviewStatus, "missing">;

export type FilamentParameterTemplate = {
  templateId: string;
  brandId: string;
  productLineName: string;
  materialType: string;
  variant: string;
  parameters: {
    status: TemplateParameterStatus;
    sourceType: TemplateParameterStatus;
    nozzleTemperature: string;
    bedTemperature: string;
    speed: string;
    drying: string;
    nozzleRestriction: string;
    sourceLabel: string;
    sourceUrl: string;
    evidencePath: string;
    reviewNote: string;
  };
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

const TEMPLATE_PATH = "data/filaments/parameter-templates.json";
const VALID_TEMPLATE_STATUSES = new Set<ParameterReviewStatus>(["official", "official_partial", "inherited_unverified"]);

function templatePath() {
  return path.join(process.cwd(), TEMPLATE_PATH);
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

export function getDraftTemplateKey(draft: Pick<AdminFilamentDraft, "brand" | "productLine">) {
  const brandId = normalizeKey(draft.brand.name || draft.brand.nameZh || "");
  const productLineName = draft.productLine.name || "";
  const materialType = draft.productLine.materialType || "";
  const variant = draft.productLine.variant || "";
  const templateId = [brandId, productLineName, materialType, variant].map(normalizeKey).join("__");
  return { brandId, productLineName, materialType, variant, templateId };
}

export function isTemplateCompatibleWithDraft(template: FilamentParameterTemplate, draft: AdminFilamentDraft) {
  const key = getDraftTemplateKey(draft);
  return template.brandId === key.brandId
    && template.productLineName === key.productLineName
    && template.materialType === key.materialType
    && template.variant === key.variant;
}

export async function readParameterTemplates(): Promise<FilamentParameterTemplate[]> {
  try {
    const raw = await readFile(templatePath(), "utf8");
    const parsed = JSON.parse(raw) as FilamentParameterTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeParameterTemplates(templates: FilamentParameterTemplate[]) {
  const file = templatePath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(templates, null, 2) + "\n", "utf8");
}

function validateTemplateParameters(parameters: ReviewedParameters) {
  if (!VALID_TEMPLATE_STATUSES.has(parameters.status) || !VALID_TEMPLATE_STATUSES.has(parameters.sourceType)) {
    return "missing 参数不能保存为模板。";
  }
  const evidence = parameters.sourceEvidence[0];
  if (!evidence?.sourceLabel?.trim()) {
    return "保存模板需要填写来源名称。";
  }
  if (!evidence.sourceUrl?.trim() && !evidence.evidencePath?.trim()) {
    return "保存模板需要填写来源链接或证据路径。";
  }
  return "";
}

export async function saveParameterTemplateFromDraft(sourceRunId: string, actorId: string) {
  const draft = await readAdminFilamentDraft(sourceRunId);
  if (!draft) throw new Error("草稿不存在。");
  const validationError = validateTemplateParameters(draft.parameters);
  if (validationError) throw new Error(validationError);

  const key = getDraftTemplateKey(draft);
  const now = new Date().toISOString();
  const existingTemplates = await readParameterTemplates();
  const existing = existingTemplates.find((template) => template.templateId === key.templateId);
  const sourceEvidence = draft.parameters.sourceEvidence[0];
  const template: FilamentParameterTemplate = {
    templateId: key.templateId,
    brandId: key.brandId,
    productLineName: key.productLineName,
    materialType: key.materialType,
    variant: key.variant,
    parameters: {
      status: draft.parameters.status as TemplateParameterStatus,
      sourceType: draft.parameters.sourceType as TemplateParameterStatus,
      nozzleTemperature: String(draft.parameters.fields.nozzleTemperature || ""),
      bedTemperature: String(draft.parameters.fields.bedTemperature || ""),
      speed: String(draft.parameters.fields.speed || ""),
      drying: String(draft.parameters.fields.drying || ""),
      nozzleRestriction: String(draft.parameters.fields.nozzleRestriction || ""),
      sourceLabel: sourceEvidence.sourceLabel,
      sourceUrl: sourceEvidence.sourceUrl,
      evidencePath: sourceEvidence.evidencePath,
      reviewNote: draft.parameters.reviewNote || sourceEvidence.note || "",
    },
    createdAt: existing?.createdAt || now,
    createdBy: existing?.createdBy || actorId,
    updatedAt: now,
    updatedBy: actorId,
  };

  const nextTemplates = existing
    ? existingTemplates.map((item) => item.templateId === template.templateId ? template : item)
    : [...existingTemplates, template];
  await writeParameterTemplates(nextTemplates);
  return template;
}

function parametersFromTemplate(template: FilamentParameterTemplate, current: ReviewedParameters, actorId: string): ReviewedParameters {
  const now = new Date().toISOString();
  return {
    ...current,
    status: template.parameters.status,
    sourceType: template.parameters.sourceType,
    fields: {
      ...current.fields,
      nozzleTemperature: template.parameters.nozzleTemperature,
      bedTemperature: template.parameters.bedTemperature,
      speed: template.parameters.speed,
      drying: template.parameters.drying,
      nozzleRestriction: template.parameters.nozzleRestriction,
    },
    sourceEvidence: [{
      sourceLabel: template.parameters.sourceLabel,
      sourceUrl: template.parameters.sourceUrl,
      evidencePath: template.parameters.evidencePath,
      note: template.parameters.reviewNote,
    }],
    reviewNote: template.parameters.reviewNote,
    parameterTemplateId: template.templateId,
    parameterAppliedAt: now,
    parameterAppliedBy: actorId,
    parameterLocked: false,
    reviewedAt: now,
    reviewedBy: actorId,
  };
}

export async function applyParameterTemplateToDrafts(templateId: string, sourceRunIds: string[], actorId: string) {
  const templates = await readParameterTemplates();
  const template = templates.find((item) => item.templateId === templateId);
  if (!template) throw new Error("参数模板不存在。");

  const drafts = await readAdminFilamentDrafts();
  const selected = new Set(sourceRunIds.slice(0, 20));
  const appliedItems: Array<{ sourceRunId: string; templateId: string }> = [];
  const skippedItems: Array<{ sourceRunId: string; reason: string }> = [];
  const failedItems: Array<{ sourceRunId: string; errorCode: string; message: string }> = [];
  const allowedStatuses = new Set(["draft", "pending_review", "directory_preview"]);

  const nextDrafts = drafts.map((draft) => {
    if (!selected.has(draft.sourceRunId)) return draft;
    try {
      if (!allowedStatuses.has(draft.publicationStatus)) {
        skippedItems.push({ sourceRunId: draft.sourceRunId, reason: "publication_status_not_allowed" });
        return draft;
      }
      if (draft.parameters.parameterLocked) {
        skippedItems.push({ sourceRunId: draft.sourceRunId, reason: "parameter_locked" });
        return draft;
      }
      if (!isTemplateCompatibleWithDraft(template, draft)) {
        skippedItems.push({ sourceRunId: draft.sourceRunId, reason: "template_not_compatible" });
        return draft;
      }
      appliedItems.push({ sourceRunId: draft.sourceRunId, templateId });
      return {
        ...draft,
        parameters: parametersFromTemplate(template, draft.parameters, actorId),
        parameterStatus: template.parameters.status,
        updatedAt: new Date().toISOString(),
        updatedBy: actorId,
      };
    } catch (error) {
      failedItems.push({
        sourceRunId: draft.sourceRunId,
        errorCode: "apply_failed",
        message: error instanceof Error ? error.message : "应用失败。",
      });
      return draft;
    }
  });

  await writeAdminFilamentDrafts(nextDrafts);
  for (const sourceRunId of selected) {
    if (!drafts.some((draft) => draft.sourceRunId === sourceRunId)) {
      failedItems.push({ sourceRunId, errorCode: "not_found", message: "草稿不存在。" });
    }
  }
  return { appliedItems, skippedItems, failedItems };
}
