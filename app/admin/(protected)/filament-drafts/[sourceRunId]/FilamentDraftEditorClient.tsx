"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminFilamentDraft,
  ColorDisplayStatus,
  ImageDisplayStatus,
  ParameterEvidenceCandidate,
  ParameterReviewStatus,
  ParameterSourceEvidence,
  ReviewedDraftColor,
} from "@/lib/filaments/drafts/admin-drafts";

const COLOR_STATUSES: ColorDisplayStatus[] = ["pending", "approved", "hidden"];
const IMAGE_STATUSES: ImageDisplayStatus[] = ["pending", "approved", "hidden", "no_image"];
const PARAM_STATUSES: ParameterReviewStatus[] = ["missing", "official", "official_partial", "inherited_unverified"];
const PARAM_FIELD_LABELS: Record<string, string> = {
  nozzleTemperature: "喷嘴温度",
  bedTemperature: "热床温度",
  speed: "打印速度",
  drying: "干燥建议",
  nozzleRestriction: "喷嘴限制",
  density: "材料密度",
  diameterMm: "线材直径",
  netWeightG: "净重",
  materialWarning: "材料提醒",
  additionalSpecifications: "其他材料规格",
};
const PARAM_FIELD_ORDER = [
  "nozzleTemperature",
  "bedTemperature",
  "speed",
  "drying",
  "nozzleRestriction",
  "density",
  "diameterMm",
  "netWeightG",
  "materialWarning",
  "additionalSpecifications",
] as const;
const CORE_PARAMETER_FIELDS: readonly string[] = PARAM_FIELD_ORDER.slice(0, 5);
type SpeedSemantic = "recommended_speed" | "max_speed" | "first_layer_speed" | "travel_speed" | "unclassified";
type EvidenceDetail = {
  candidateId: string;
  field: string;
  value: string;
  unit: string;
  rawText: string;
  ocrText: string;
  sourceKind: string;
  evidencePath: string;
  originalImagePath: string;
  originalImageDataUrl: string;
  imageSourceUrl: string;
  pageContext: string;
  pageContextExpanded: string;
  confidence: string;
  conflict: boolean;
  speedSemantic: SpeedSemantic;
};
const SPEED_SEMANTIC_LABELS: Record<SpeedSemantic, string> = {
  recommended_speed: "推荐速度",
  max_speed: "最大速度",
  first_layer_speed: "首层速度",
  travel_speed: "移动速度",
  unclassified: "未分类",
};
const ADAPTER_PARAMETER_LABELS: Record<string, string> = {
  nozzle_temperature: "喷嘴温度",
  nozzle_diameter_requirement: "喷嘴直径要求",
  bed_temperature: "热床温度",
  cooling_fan: "冷却风扇",
  print_speed: "打印速度",
  retraction_distance: "回抽距离",
  retraction_speed: "回抽速度",
  drying_temperature_and_duration: "干燥温度与时长",
  build_plate_compatibility: "打印板兼容性",
  filament_diameter: "线材直径",
  diameter_tolerance: "直径公差",
  net_weight: "净重",
  density: "材料密度",
  melt_flow_index: "熔融指数",
  heat_deflection_temperature: "热变形温度",
  vicat_softening_temperature: "维卡软化温度",
  tensile_strength: "拉伸强度",
  tensile_elongation_at_break: "断裂伸长率",
  flexural_strength: "弯曲强度",
  flexural_modulus: "弯曲模量",
  unnotched_impact_strength: "无缺口冲击强度",
  notched_impact_strength: "缺口冲击强度",
  test_standard: "测试标准",
  test_conditions: "测试条件",
  material_care_note: "材料提醒",
};
const ADAPTER_SOURCE_LABELS: Record<string, string> = {
  official_color_reference_sheet: "官方颜色参考图",
  official_color_reference_card: "官方裁切色卡",
  purchase_option_evidence: "商品购买颜色选项",
  print_parameter_sheet: "官方商品详情图 · 建议打印参数",
  material_property_sheet: "官方商品详情图 · 材料物性",
  official_detail_image: "官方商品详情图",
  generic_detail_image: "官方商品详情图",
  page_text: "官方商品页面文本",
};

function classifySpeedSemantic(value: string): SpeedSemantic {
  if (/(推荐打印速度|建议打印速度|建议速度)/u.test(value)) return "recommended_speed";
  if (/(最大打印速度|最高打印速度|最大速度)/u.test(value)) return "max_speed";
  if (/(首层速度|第一层速度)/u.test(value)) return "first_layer_speed";
  if (/(移动速度|空驶速度)/u.test(value)) return "travel_speed";
  return "unclassified";
}

function HighlightedText({ text, value }: { text: string; value: string }) {
  if (!text) return <span>—</span>;
  const terms = [value, "打印速度", "喷嘴温度", "热床温度", "干燥", "喷嘴限制"].filter(Boolean);
  const pattern = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {text.split(pattern).map((part, index) =>
        terms.some((term) => term.toLowerCase() === part.toLowerCase())
          ? <mark key={`${part}-${index}`} className="bg-[#FFF2B8] text-inherit">{part}</mark>
          : <span key={`${part}-${index}`}>{part}</span>
      )}
    </>
  );
}

function displayEvidenceReference(value: string) {
  if (!value) return "本地证据包";
  const relative = value.includes("::") ? value.split("::").pop() || "" : value;
  if (relative.startsWith("/") || /^[A-Za-z]:[\\/]/.test(relative)) {
    return "KEXCELLED / 当前导入批次";
  }
  return `本地证据包 / ${relative.replace(/^\.?\//, "")}`;
}

function formatTs(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 19).replace("T", " ") || iso;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch { return iso; }
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex border-b border-[#EEF2F6] py-2 text-sm last:border-0">
      <span className="w-36 shrink-0 text-[#667281]">{label}</span>
      <span className="min-w-0 break-words text-[#18202A]">{value || "—"}</span>
    </div>
  );
}

function IssueList({ title, issues }: { title: string; issues: string[] }) {
  return (
    <div className="rounded-lg border border-[#D9E0E7] bg-[#F7F9FB] p-3">
      <p className="text-xs font-medium text-[#18202A]">{title}</p>
      {issues.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[#8A4B0A]">
          {issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-green-700">已满足</p>
      )}
    </div>
  );
}

export default function FilamentDraftEditorClient({
  draft,
  role,
  directoryIssues: _directoryIssues,
  completeIssues: _completeIssues,
}: {
  draft: AdminFilamentDraft;
  role: string;
  directoryIssues: string[];
  completeIssues: string[];
}) {
  const router = useRouter();
  const canEdit = role === "admin" || role === "codex";
  const canPublish = role === "admin" || role === "codex";
  const [colors, setColors] = useState<ReviewedDraftColor[]>(draft.colors);
  const [parameters, setParameters] = useState(draft.parameters);
  const [parameterCandidates, setParameterCandidates] = useState<ParameterEvidenceCandidate[]>(draft.parameterEvidenceCandidates || []);
  const [parameterSummary, setParameterSummary] = useState(draft.parameterExtractionSummary);
  const [publicationStatus, setPublicationStatus] = useState(draft.publicationStatus);
  const [message, setMessage] = useState("");
  const [expandedVariantKeys, setExpandedVariantKeys] = useState<Set<string>>(new Set());
  const [evidenceDialog, setEvidenceDialog] = useState<{ field: string; loading: boolean; details: EvidenceDetail[] } | null>(null);
  const [imageAvailability, setImageAvailability] = useState<Record<string, "available" | "unavailable">>({});
  const initialEditableState = useMemo(() => JSON.stringify({ colors: draft.colors, parameters: draft.parameters }), [draft.colors, draft.parameters]);
  const hasUnsavedChanges = JSON.stringify({ colors, parameters }) !== initialEditableState;

  const currentDirectoryIssues = (() => {
    const issues: string[] = [];
    if (!draft.brand?.name) issues.push("缺少品牌");
    if (!draft.productLine?.name) issues.push("缺少产品线");
    if (!draft.productLine?.materialType) issues.push("缺少材料类型");
    if (!colors.length) issues.push("缺少颜色记录");
    if (!colors.some((color) => color.displayStatus === "approved")) issues.push("至少需要 1 条已批准展示的颜色");
    return issues;
  })();

  const pendingColorCount = colors.filter((color) => color.displayStatus === "pending").length;
  const disabledHideableCount = colors.filter((color) => color.availability === "disabled" && color.displayStatus !== "approved" && color.displayStatus !== "hidden").length;
  const approvedColorCount = colors.filter((color) => color.displayStatus === "approved").length;
  const approvedImageCount = colors.filter((color) => color.imageDisplayStatus === "approved").length;
  const pendingImageCount = colors.filter((color) => color.imageDisplayStatus === "pending").length;
  const spoolPrimaryImageCount = colors.filter((color) => color.imageSelectionReason === "official_spool_sku_image").length;
  const refillFallbackImageCount = colors.filter((color) => color.imageSelectionReason === "official_refill_fallback").length;
  const colorReviewRequiredCount = colors.filter((color) => color.reviewStatus === "review_required" || !color.primaryImage).length;
  const availableEvidenceImageCount = colors.filter((color) =>
    imageAvailability[`${color.domIndex}-${color.rawSkuText}`] === "available"
  ).length;
  const unavailableEvidenceImageCount = colors.filter((color) =>
    !color.localImagePath || imageAvailability[`${color.domIndex}-${color.rawSkuText}`] === "unavailable"
  ).length;
  const adapterParameterSections = draft.kexcelledParameterGroups ? [
    { title: "建议打印参数", items: draft.kexcelledParameterGroups.recommendedPrintParameters },
    { title: "线材基础规格", items: draft.kexcelledParameterGroups.filamentSpecifications },
    { title: "材料物性", items: draft.kexcelledParameterGroups.materialProperties },
    { title: "测试与提醒", items: draft.kexcelledParameterGroups.testsAndWarnings },
  ] : [];
  const hasAdapterParameters = adapterParameterSections.some((section) => section.items.length > 0);
  const productLineParameterSuggestions = useMemo(() => {
    return CORE_PARAMETER_FIELDS.map((field) => {
      const candidates = parameterCandidates.filter((candidate) =>
        candidate.field === field
        && candidate.reviewStatus !== "rejected"
        && candidate.confidence !== "ambiguous"
        && candidate.normalizedValue.trim()
        && candidate.evidencePath.trim()
      ).sort((left, right) => {
        const priority = (candidate: ParameterEvidenceCandidate) => {
          if (candidate.sourceKind === "ocr_text" && candidate.evidencePath.includes(".filament-import.zip::")) return 3;
          if (candidate.sourceKind === "ocr_text") return 2;
          if (candidate.sourceKind === "page_txt" || candidate.sourceKind === "page_html") return 1;
          return 0;
        };
        return priority(right) - priority(left);
      });
      if (!candidates.length) return null;
      const values = new Map<string, ParameterEvidenceCandidate[]>();
      for (const candidate of candidates) {
        const semantic = field === "speed" ? classifySpeedSemantic(candidate.rawText) : "unclassified";
        const key = `${semantic}\u001f${candidate.normalizedValue}\u001f${candidate.unit}`;
        values.set(key, [...(values.get(key) || []), candidate]);
      }
      const bySemantic = new Map<SpeedSemantic, ParameterEvidenceCandidate[][]>();
      for (const [key, group] of values) {
        const semantic = key.split("\u001f")[0] as SpeedSemantic;
        bySemantic.set(semantic, [...(bySemantic.get(semantic) || []), group]);
      }
      return [...bySemantic.entries()].map(([speedSemantic, semanticGroups]) => {
        const semanticCandidates = semanticGroups.flat();
        const representative = semanticCandidates[0];
        const hasConflict = semanticGroups.length > 1;
        return {
          field,
          value: hasConflict ? "" : representative.normalizedValue,
          unit: hasConflict ? "" : representative.unit,
          confidence: representative.confidence,
          hasConflict,
          evidenceCount: semanticCandidates.reduce((sum, candidate) => sum + Math.max(1, candidate.evidenceOccurrences || 1), 0),
          representativeRawText: representative.rawText,
          representativeEvidencePath: representative.evidencePath,
          sourceLabel: semanticCandidates.some((candidate) => candidate.sourceKind === "ocr_text")
            ? "KEXCELLED Evidence Pack 本地 OCR"
            : "KEXCELLED Evidence Pack 页面文本",
          speedSemantic,
          candidates: semanticCandidates,
        };
      });
    }).flatMap((suggestions) => suggestions || []);
  }, [parameterCandidates]);
  const nonCoreParameterCandidates = useMemo(
    () => parameterCandidates.filter((candidate) => !CORE_PARAMETER_FIELDS.includes(candidate.field)),
    [parameterCandidates],
  );

  function updateColor(index: number, patch: Partial<ReviewedDraftColor>) {
    setColors((current) => current.map((color, colorIndex) => colorIndex === index ? { ...color, ...patch } : color));
  }

  function updateParameterField(key: string, value: string) {
    setParameters((current) => ({ ...current, fields: { ...current.fields, [key]: value } }));
  }

  function updateSourceEvidence(patch: Partial<ParameterSourceEvidence>) {
    const current = parameters.sourceEvidence[0] || { sourceLabel: "", sourceUrl: "", evidencePath: "", note: "" };
    setParameters((params) => ({ ...params, sourceEvidence: [{ ...current, ...patch }] }));
  }

  async function persistDraft(nextColors: ReviewedDraftColor[], nextParameters = parameters, successMessage = "耗材资料已保存。") {
    setMessage("正在保存耗材资料。");
    const response = await fetch(`/api/admin/filament-drafts/${encodeURIComponent(draft.sourceRunId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        colors: nextColors.map((color) => ({
          domIndex: color.domIndex,
          displayStatus: color.displayStatus,
          imageDisplayStatus: color.imageDisplayStatus,
          imageReviewNote: color.imageReviewNote,
        })),
        parameters: nextParameters,
      }),
    });
    const payload = (await response.json()) as { error?: string; draft?: AdminFilamentDraft };
    if (!response.ok) {
      setMessage(payload.error || "保存失败。");
      return false;
    }
    setColors(nextColors);
    setParameters(nextParameters);
    setMessage(successMessage);
    return true;
  }

  async function extractParameterEvidence() {
    if (!canEdit) return;
    setMessage("正在读取现有 Evidence Pack 参数证据。");
    const response = await fetch(`/api/admin/filament-drafts/${encodeURIComponent(draft.sourceRunId)}/parameter-evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extract" }),
    });
    const payload = (await response.json()) as {
      error?: string;
      candidates?: ParameterEvidenceCandidate[];
      summary?: typeof parameterSummary;
      mergeStats?: {
        addedCandidateCount: number;
        mergedCandidateCount: number;
        preservedFipCandidateCount: number;
      };
    };
    if (!response.ok) {
      setMessage(payload.error || "参数证据读取失败。");
      return;
    }
    setParameterCandidates(payload.candidates || []);
    if (payload.summary) setParameterSummary(payload.summary);
    setMessage(
      `新增 ${payload.mergeStats?.addedCandidateCount || 0} 条，`
      + `合并 ${payload.mergeStats?.mergedCandidateCount || 0} 条，`
      + `保留已有 FIP 候选 ${payload.mergeStats?.preservedFipCandidateCount || 0} 条。`
      + "未覆盖任何已有候选。",
    );
  }

  async function reviewParameterCandidate(candidate: ParameterEvidenceCandidate, action: "reject") {
    if (!canEdit) return;
    setMessage("正在忽略参数候选。");
    const response = await fetch(`/api/admin/filament-drafts/${encodeURIComponent(draft.sourceRunId)}/parameter-evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, candidateId: candidate.candidateId }),
    });
    const payload = (await response.json()) as { error?: string; draft?: AdminFilamentDraft };
    if (!response.ok || !payload.draft) {
      setMessage(payload.error || "参数候选审核失败。");
      return;
    }
    setParameterCandidates(payload.draft.parameterEvidenceCandidates || []);
    setParameterSummary(payload.draft.parameterExtractionSummary);
    setParameters(payload.draft.parameters);
    setMessage("已忽略该候选。");
  }

  async function openEvidenceDialog(field: string) {
    setEvidenceDialog({ field, loading: true, details: [] });
    const response = await fetch(`/api/admin/filament-drafts/${encodeURIComponent(draft.sourceRunId)}/parameter-evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "evidence_details", field }),
    });
    const payload = (await response.json()) as { error?: string; details?: EvidenceDetail[] };
    if (!response.ok) {
      setMessage(payload.error || "读取参数证据详情失败。");
      setEvidenceDialog(null);
      return;
    }
    setEvidenceDialog({ field, loading: false, details: payload.details || [] });
  }

  async function acceptParameterSuggestion(field: string, speedSemantic: SpeedSemantic) {
    if (!canEdit) return;
    setMessage(`正在采用${PARAM_FIELD_LABELS[field] || field}建议。`);
    const response = await fetch(`/api/admin/filament-drafts/${encodeURIComponent(draft.sourceRunId)}/parameter-evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept_suggestion", field, speedSemantic }),
    });
    const payload = (await response.json()) as { error?: string; draft?: AdminFilamentDraft };
    if (!response.ok || !payload.draft) {
      setMessage(payload.error || "采用产品线参数建议失败。");
      return;
    }
    setParameterCandidates(payload.draft.parameterEvidenceCandidates || []);
    setParameterSummary(payload.draft.parameterExtractionSummary);
    setParameters(payload.draft.parameters);
    setMessage(`已将${PARAM_FIELD_LABELS[field] || field}写入产品线参数。参数状态未自动变更。`);
  }

  async function approveAllColorNames() {
    if (!canEdit || pendingColorCount === 0) return;
    const confirmed = window.confirm("确认批准所有当前待审核颜色名称？\n\n这只会将 pending 颜色名称改为 approved。\n不会批准任何图片。\n不会发布产品线。\n不会补充参数。");
    if (!confirmed) return;
    const nextColors = colors.map((color) => color.displayStatus === "pending" ? { ...color, displayStatus: "approved" as ColorDisplayStatus } : color);
    await persistDraft(nextColors, parameters, `已批准 ${pendingColorCount} 条颜色名称。图片状态保持不变。`);
  }

  async function hideDisabledColors() {
    if (!canEdit || disabledHideableCount === 0) return;
    const confirmed = window.confirm("确认隐藏全部未批准的禁用颜色？\n\n只会处理 availability=disabled 且未 approved 的颜色。\n不会修改任何图片状态。\n已 approved 的禁用颜色会保留。");
    if (!confirmed) return;
    const nextColors = colors.map((color) => color.availability === "disabled" && color.displayStatus !== "approved" ? { ...color, displayStatus: "hidden" as ColorDisplayStatus } : color);
    await persistDraft(nextColors, parameters, `已隐藏 ${disabledHideableCount} 条禁用颜色。图片状态保持不变。`);
  }

  function toggleVariants(key: string) {
    setExpandedVariantKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function publish() {
    if (!await persistDraft(colors, parameters, "资料已保存，正在发布。")) return;
    setMessage("正在发布。");
    const response = await fetch(`/api/admin/filament-drafts/${encodeURIComponent(draft.sourceRunId)}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", level: "directory_preview" }),
    });
    const payload = (await response.json()) as { error?: string; draft?: AdminFilamentDraft };
    if (!response.ok) {
      setMessage(payload.error || "发布失败。");
      return;
    }
    setPublicationStatus("directory_preview");
    setMessage("耗材已发布。");
    router.push("/admin/filaments");
    router.refresh();
  }

  function cancelEditing() {
    if (hasUnsavedChanges && !window.confirm("当前存在未保存修改，取消后修改将失效。是否继续？")) return;
    router.push("/admin/filaments");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#667281]">编辑耗材</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#18202A]">{draft.brand.name} · {draft.productLine.name}</h1>
          <p className="mt-1 text-sm text-[#667281]">编辑耗材文字资料与参数后直接发布；色块可稍后通过证据采集补充。</p>
        </div>
        <Link href="/admin/filament-import" className="rounded-lg border border-[#CBD3DC] px-3 py-2 text-sm text-[#18202A]">返回耗材包上传</Link>
      </div>

      <div className="rounded-xl border border-[#D9E0E7] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#18202A]">基础资料</h2>
        <div className="mt-3 grid gap-5 lg:grid-cols-2">
          <div>
            <Row label="品牌" value={draft.brand.name} />
            <Row label="产品线" value={draft.productLine.name} />
            <Row label="材料" value={draft.productLine.materialType} />
            <Row label="variant" value={draft.productLine.variant || ""} />
            <Row label="canonical 颜色" value={draft.canonicalColorCount || draft.colors.length} />
            <Row label="原始 SKU" value={draft.rawSkuCount || draft.colors.length} />
            <Row label="合并包装 SKU" value={draft.mergedVariantCount || 0} />
          </div>
          <div>
            <Row label="原始 ZIP" value={draft.sourceZipName} />
            <Row label="sourceRunId" value={draft.sourceRunId} />
            <Row label="创建时间" value={formatTs(draft.createdAt || draft.importedAt)} />
            <Row label="完成时间" value={formatTs(draft.completedAt || draft.importedAt)} />
            <Row label="最后更新" value={formatTs(draft.updatedAt)} />
            <Row label="证据引用" value="KEXCELLED / 当前导入批次" />
            <Row label="原始证据状态" value={draft.sourceEvidenceStatus === "missing" ? "原始证据缺失" : "原始证据可用"} />
            {draft.sourceEvidenceStatus === "missing" ? <Row label="缺失原因" value={draft.sourceEvidenceMissingReason || "原始 Evidence Pack 不存在，无法提取参数证据"} /> : null}
            <Row label="发布状态" value={publicationStatus} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#D9E0E7] bg-white p-5">
        <div>
          <h2 className="text-sm font-semibold text-[#18202A]">商品页产品线参数</h2>
          <p className="mt-1 text-xs text-[#667281]">
            参数来自商品详情图 OCR，尚未作为正式参数发布。适用于 {draft.brand.name} · {draft.productLine.name} · {draft.productLine.materialType} · {draft.productLine.variant || "标准"} 的全部颜色与包装 SKU。
          </p>
        </div>
        {hasAdapterParameters ? (
          <div className="mt-4 space-y-4">
            {adapterParameterSections.map((section) => (
              <section key={section.title}>
                <h3 className="text-sm font-semibold text-[#344050]">{section.title}</h3>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  {section.items.map((parameter) => (
                    <div key={parameter.field} className="rounded-lg border border-[#D9E0E7] p-3">
                      <h4 className="text-sm font-medium text-[#18202A]">
                        {ADAPTER_PARAMETER_LABELS[parameter.field] || parameter.field}
                      </h4>
                      <p className="mt-2 text-sm text-[#18202A]">{parameter.value}{parameter.unit ? ` ${parameter.unit}` : ""}</p>
                      <p className="mt-1 text-xs text-[#667281]">
                        来源：{ADAPTER_SOURCE_LABELS[parameter.sourceType] || parameter.sourceType} · 状态：{parameter.reviewStatus}
                      </p>
                      <p className="mt-1 text-xs text-[#667281]">
                        证据资产：{parameter.sourceAssetId} · {displayEvidenceReference(parameter.evidenceRef)}
                      </p>
                      {parameter.alternatives.length ? (
                        <details className="mt-2 text-xs text-[#667281]">
                          <summary className="cursor-pointer">其他页面标注值（{parameter.alternatives.length}）</summary>
                          <ul className="mt-2 space-y-1">
                            {parameter.alternatives.map((alternative, index) => (
                              <li key={`${alternative.value}-${alternative.unit}-${index}`}>
                                {alternative.value}{alternative.unit ? ` ${alternative.unit}` : ""} · {displayEvidenceReference(alternative.evidenceRef)}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {PARAM_FIELD_ORDER.map((field) => {
              const parameter = draft.productLineParameters.find((item) => item.field === field);
              return (
                <div key={field} className="rounded-lg border border-[#D9E0E7] p-3">
                  <h3 className="text-sm font-medium text-[#18202A]">{PARAM_FIELD_LABELS[field]}</h3>
                  <p className="mt-2 text-sm text-[#18202A]">
                    {parameter?.pageProvided
                      ? `${parameter.hasMultipleValues ? "页面标注：" : ""}${parameter.displayValue}`
                      : "页面未提供"}
                  </p>
                  {parameter?.pageProvided ? (
                    <p className="mt-1 text-xs text-[#667281]">
                      来源：{parameter.sourceLabel || "商品页面"}{parameter.hasMultipleValues ? " · 页面存在多个标注值" : ""}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        <details className="mt-4 rounded-lg border border-[#D9E0E7] bg-[#F7F9FB] p-3">
          <summary className="cursor-pointer text-sm font-medium text-[#18202A]">
            内部候选与原始证据（{parameterCandidates.length} 条）
          </summary>
          <p className="mt-2 text-xs text-[#667281]">该区域仅用于追溯，不再要求逐条采纳；商品页产品线参数以顶部汇总展示为准。</p>
          <div className="mt-3 space-y-2">
            {parameterCandidates.map((candidate) => (
              <div key={candidate.candidateId} className="rounded border border-[#E2E7EC] bg-white p-2 text-xs">
                <span className="font-medium text-[#18202A]">{PARAM_FIELD_LABELS[candidate.field]}：{candidate.normalizedValue} {candidate.unit}</span>
                <p className="mt-1 text-[#667281]">{candidate.rawText}</p>
                <p className="mt-1 break-words text-[#8A949F]">{displayEvidenceReference(candidate.evidencePath)}</p>
              </div>
            ))}
          </div>
        </details>
      </div>

      <div className="rounded-xl border border-[#D9E0E7] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#18202A]">颜色审核</h2>
            <p className="mt-1 text-xs text-[#667281]">
              已批准颜色 {approvedColorCount} / {colors.length}；可用证据图片 {availableEvidenceImageCount} / {colors.length}；明确缺图 {unavailableEvidenceImageCount}；待审核图片 {pendingImageCount}。
            </p>
            <p className="mt-1 text-xs text-[#667281]">
              颜色实体 {colors.length}；SKU 变体 {colors.reduce((sum, color) => sum + (color.colorVariants?.length || 0), 0)}；有盘主图 {spoolPrimaryImageCount}；无盘降级主图 {refillFallbackImageCount}；待人工确认 {colorReviewRequiredCount}。
            </p>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pendingColorCount === 0}
                onClick={() => void approveAllColorNames()}
                className="rounded-lg bg-[#1F5FAF] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                批准全部颜色名称（图片保持待审核）
              </button>
              <button
                type="button"
                disabled={disabledHideableCount === 0}
                onClick={() => void hideDisabledColors()}
                className="rounded-lg border border-[#CBD3DC] px-3 py-2 text-xs font-medium text-[#18202A] disabled:opacity-50"
              >
                隐藏全部禁用颜色
              </button>
            </div>
          ) : null}
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-[#D9E0E7] text-[#667281]">
              <tr>
                <th className="py-2 pr-3 font-medium">色号</th>
                <th className="py-2 pr-3 font-medium">中文名</th>
                <th className="py-2 pr-3 font-medium">英文名</th>
                <th className="py-2 pr-3 font-medium">可售</th>
                <th className="py-2 pr-3 font-medium">图片候选</th>
                <th className="py-2 pr-3 font-medium">图片角色</th>
                <th className="py-2 pr-3 font-medium">共享</th>
                <th className="py-2 pr-3 font-medium">需审核</th>
                <th className="py-2 pr-3 font-medium">原始 SKU 变体</th>
                <th className="py-2 pr-3 font-medium">颜色状态</th>
                <th className="py-2 pr-3 font-medium">图片状态</th>
                <th className="py-2 pr-3 font-medium">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F6]">
              {colors.map((color, index) => {
                const variantKey = `${color.domIndex}-${color.rawSkuText}`;
                const officialCropPath = color.cropRelativePath || "";
                const localEvidencePath = officialCropPath || color.localImagePath || "";
                const isLocalEvidencePath = Boolean(localEvidencePath)
                  && (
                    localEvidencePath.startsWith("assets/")
                    || localEvidencePath.startsWith("official-color-cards/")
                    || localEvidencePath.startsWith("images/variant/")
                  );
                const evidenceImageUrl = isLocalEvidencePath
                  ? `/api/admin/filament-drafts/${encodeURIComponent(draft.sourceRunId)}/evidence-image?path=${encodeURIComponent(localEvidencePath)}`
                  : "";
                const imageUrl = color.imageCandidateUrl
                  || evidenceImageUrl
                  || color.representativeImageCandidateUrl
                  || "";
                const variantsExpanded = expandedVariantKeys.has(variantKey);
                const localImageStatus = imageAvailability[variantKey];
                return (
                <tr key={variantKey} className="align-top">
                  <td className="py-2 pr-3">{color.officialColorCode || "暂无官方色号"}</td>
                  <td className="py-2 pr-3">{color.nameZh || "—"}</td>
                  <td className="py-2 pr-3">{color.nameEn || "—"}</td>
                  <td className="py-2 pr-3">{color.availability}</td>
                  <td className="py-2 pr-3 text-[#667281]">
                    {imageUrl && localImageStatus !== "unavailable" ? (
                      <img
                        src={imageUrl}
                        alt={`${color.nameZh || color.officialColorCode || "颜色"}色块候选`}
                        className="mb-2 h-11 w-11 rounded border border-[#D9E0E7] object-contain"
                        ref={(image) => {
                          if (image?.complete && image.naturalWidth > 0 && imageAvailability[variantKey] !== "available") {
                            queueMicrotask(() => setImageAvailability((current) =>
                              current[variantKey] === "available"
                                ? current
                                : { ...current, [variantKey]: "available" }
                            ));
                          }
                        }}
                        onLoad={() => setImageAvailability((current) => ({ ...current, [variantKey]: "available" }))}
                        onError={() => setImageAvailability((current) => ({ ...current, [variantKey]: "unavailable" }))}
                      />
                    ) : (
                      <div className="mb-2 flex h-11 w-28 items-center justify-center rounded border border-dashed border-[#CBD3DC] bg-[#F7F9FB] px-2 text-center text-[11px] text-[#667281]">
                        暂无可用颜色图片
                      </div>
                    )}
                    <div>{localImageStatus === "available" ? (officialCropPath ? "官方裁切色卡 · 待审核" : "证据图片可用") : imageUrl ? "有图片候选，证据不可用" : "官方色卡待审核"}</div>
                    {color.imageSelectionReason ? (
                      <div className="mt-1 text-[11px] text-[#667281]">
                        {color.imageSelectionReason === "official_spool_sku_image" ? "有盘官方 SKU 主图"
                          : color.imageSelectionReason === "official_refill_fallback" ? "无盘图片降级"
                            : color.imageSelectionReason === "official_variant_detail_image" ? "官方变体详情图"
                              : "人工确认图"}
                      </div>
                    ) : null}
                    {localImageStatus === "available" && imageUrl ? (
                      <a href={imageUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-[#1F5FAF] hover:underline">
                        查看来源
                      </a>
                    ) : <span className="mt-1 inline-flex text-[#9AA3AD]">证据图片不可用</span>}
                  </td>
                  <td className="py-2 pr-3">{color.imageQualityRole}</td>
                  <td className="py-2 pr-3">{color.isSharedImageCandidate ? "是" : "否"}</td>
                  <td className="py-2 pr-3">{color.requiresManualReview ? "是" : "否"}</td>
                  <td className="max-w-[260px] py-2 pr-3 text-[#667281]">
                    {(color.colorVariants || []).length ? (
                      <div className="space-y-1">
                        <button type="button" className="text-[#1F5FAF] hover:underline" onClick={() => toggleVariants(variantKey)}>
                          {variantsExpanded ? "收起" : `${(color.colorVariants || []).length} 个 SKU 变体`}
                        </button>
                        {variantsExpanded ? (color.colorVariants || []).map((variant, variantIndex) => (
                          <div key={`${variant.rawSkuText}-${variantIndex}`} className="rounded border border-[#EEF2F6] bg-[#FAFBFC] px-2 py-1">
                            <div className="text-[#18202A]">{variant.rawSkuText || "—"}</div>
                            <div>{variant.packageVariant} · {variant.availability}</div>
                          </div>
                        )) : null}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <select disabled={!canEdit} className="rounded border border-[#CBD3DC] px-2 py-1" value={color.displayStatus} onChange={(event) => updateColor(index, { displayStatus: event.target.value as ColorDisplayStatus })}>
                      {COLOR_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <select disabled={!canEdit} className="rounded border border-[#CBD3DC] px-2 py-1" value={color.imageDisplayStatus} onChange={(event) => updateColor(index, { imageDisplayStatus: event.target.value as ImageDisplayStatus })}>
                      {IMAGE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input disabled={!canEdit} className="min-w-[160px] rounded border border-[#CBD3DC] px-2 py-1" value={color.imageReviewNote} onChange={(event) => updateColor(index, { imageReviewNote: event.target.value })} />
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <details className="rounded-xl border border-[#D9E0E7] bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold text-[#18202A]">
          内部参数状态与模板
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-xs text-[#667281]">参数状态
            <select disabled={!canEdit} className="mt-1 w-full rounded border border-[#CBD3DC] px-2 py-2" value={parameters.status} onChange={(event) => setParameters((current) => ({ ...current, status: event.target.value as ParameterReviewStatus }))}>
              {PARAM_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="text-xs text-[#667281]">来源类型
            <select disabled={!canEdit} className="mt-1 w-full rounded border border-[#CBD3DC] px-2 py-2" value={parameters.sourceType} onChange={(event) => setParameters((current) => ({ ...current, sourceType: event.target.value as ParameterReviewStatus }))}>
              {PARAM_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          {["nozzleTemperature", "bedTemperature", "speed", "drying", "nozzleRestriction"].map((key) => (
            <label key={key} className="text-xs text-[#667281]">{PARAM_FIELD_LABELS[key] || key}
              <input disabled={!canEdit} className="mt-1 w-full rounded border border-[#CBD3DC] px-2 py-2" value={String(parameters.fields[key] || "")} onChange={(event) => updateParameterField(key, event.target.value)} />
            </label>
          ))}
          <label className="text-xs text-[#667281]">来源名称
            <input disabled={!canEdit} className="mt-1 w-full rounded border border-[#CBD3DC] px-2 py-2" value={parameters.sourceEvidence[0]?.sourceLabel || ""} onChange={(event) => updateSourceEvidence({ sourceLabel: event.target.value })} />
          </label>
          <label className="text-xs text-[#667281]">来源链接
            <input disabled={!canEdit} className="mt-1 w-full rounded border border-[#CBD3DC] px-2 py-2" value={parameters.sourceEvidence[0]?.sourceUrl || ""} onChange={(event) => updateSourceEvidence({ sourceUrl: event.target.value })} />
          </label>
          <label className="text-xs text-[#667281]">证据路径
            <input disabled={!canEdit} className="mt-1 w-full rounded border border-[#CBD3DC] px-2 py-2" value={parameters.sourceEvidence[0]?.evidencePath || ""} onChange={(event) => updateSourceEvidence({ evidencePath: event.target.value })} />
          </label>
          <label className="text-xs text-[#667281] md:col-span-3">审核备注
            <textarea disabled={!canEdit} className="mt-1 w-full rounded border border-[#CBD3DC] px-2 py-2" value={parameters.reviewNote} onChange={(event) => setParameters((current) => ({ ...current, reviewNote: event.target.value }))} />
          </label>
          <label className="flex items-center gap-2 text-xs text-[#667281] md:col-span-3">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={parameters.parameterLocked}
              onChange={(event) => setParameters((current) => ({ ...current, parameterLocked: event.target.checked }))}
            />
            锁定当前参数，禁止批量模板覆盖
          </label>
        </div>
      </details>

      <div className="rounded-xl border border-[#D9E0E7] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#18202A]">发布区</h2>
        <div className="mt-3"><IssueList title="发布条件" issues={currentDirectoryIssues} /></div>
        <div className="mt-3 space-y-2 rounded-lg border border-[#D9E0E7] bg-[#F7F9FB] p-3 text-xs text-[#667281]">
          {parameters.status === "missing" ? (
            <p>可发布颜色目录预览版；暂无官方打印参数，暂不提供预设下载。</p>
          ) : null}
          {approvedImageCount === 0 && pendingImageCount > 0 ? (
            <p>颜色名称可发布；颜色图片仍待审核，前台将不显示候选图片。</p>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={cancelEditing} className="rounded-lg border border-[#CBD3DC] px-4 py-2 text-sm text-[#18202A]">取消</button>
          <button disabled={!canPublish || currentDirectoryIssues.length > 0} onClick={() => void publish()} className="rounded-lg bg-[#16A34A] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">发布</button>
        </div>
        {message ? <p className="mt-3 rounded-lg bg-[#F4F6F8] px-3 py-2 text-sm text-[#18202A]">{message}</p> : null}
      </div>

      {evidenceDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-[#D9E0E7] bg-white px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#18202A]">
                  {PARAM_FIELD_LABELS[evidenceDialog.field] || evidenceDialog.field}证据
                </h2>
                <p className="mt-1 text-xs text-[#667281]">直接读取已落盘 FIP 与原始 Evidence Pack，不重新 OCR。</p>
              </div>
              <button type="button" onClick={() => setEvidenceDialog(null)} className="rounded border border-[#CBD3DC] px-3 py-1.5 text-sm">关闭</button>
            </div>
            <div className="space-y-4 p-5">
              {evidenceDialog.loading ? <p className="text-sm text-[#667281]">正在读取证据。</p> : null}
              {!evidenceDialog.loading && !evidenceDialog.details.length ? (
                <p className="rounded bg-[#F7F9FB] p-3 text-sm text-[#667281]">未找到可展示的证据详情。</p>
              ) : null}
              {evidenceDialog.details.map((detail) => (
                <article key={detail.candidateId} className="rounded-lg border border-[#D9E0E7] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-[#18202A]">{PARAM_FIELD_LABELS[detail.field] || detail.field}：{detail.value} {detail.unit}</h3>
                      <p className="mt-1 text-xs text-[#667281]">
                        {detail.sourceKind} · {detail.confidence} · {detail.conflict ? "存在冲突" : "无冲突"}
                      </p>
                    </div>
                    {detail.field === "speed" ? (
                      <span className="rounded bg-[#EEF3F8] px-2 py-1 text-xs text-[#344050]">
                        {SPEED_SEMANTIC_LABELS[detail.speedSemantic]}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
                    <div>
                      {detail.originalImageDataUrl ? (
                        <a href={detail.originalImageDataUrl} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={detail.originalImageDataUrl} alt="参数证据原图" className="max-h-[420px] w-full rounded border border-[#D9E0E7] object-contain" />
                        </a>
                      ) : (
                        <div className="rounded border border-dashed border-[#CBD3DC] p-6 text-center text-sm text-[#667281]">未找到对应原始图片</div>
                      )}
                      <p className="mt-2 break-words text-xs text-[#667281]">原始图片路径：{detail.originalImagePath || "—"}</p>
                      {detail.imageSourceUrl ? (
                        <a href={detail.imageSourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-xs text-[#1F5FAF] hover:underline">打开图片原始 URL</a>
                      ) : null}
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="font-medium text-[#18202A]">候选原始文本</p>
                        <p className="mt-1 rounded bg-[#F7F9FB] p-2 text-[#344050]"><HighlightedText text={detail.rawText} value={detail.value} /></p>
                      </div>
                      <div>
                        <p className="font-medium text-[#18202A]">OCR 文本文件内容</p>
                        <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-[#F7F9FB] p-2 text-[#344050]">
                          <HighlightedText text={detail.ocrText} value={detail.value} />
                        </p>
                      </div>
                      {detail.pageContext ? (
                        <div>
                          <p className="font-medium text-[#18202A]">页面文本上下文</p>
                          <p className="mt-1 rounded bg-[#F7F9FB] p-2 text-[#344050]"><HighlightedText text={detail.pageContext} value={detail.value} /></p>
                          {detail.pageContextExpanded && detail.pageContextExpanded !== detail.pageContext ? (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-[#1F5FAF]">展开更多上下文</summary>
                              <p className="mt-2 rounded bg-[#F7F9FB] p-2 text-[#344050]"><HighlightedText text={detail.pageContextExpanded} value={detail.value} /></p>
                            </details>
                          ) : null}
                        </div>
                      ) : null}
                      <p className="break-words text-[#667281]">证据引用：{displayEvidenceReference(detail.evidencePath)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
