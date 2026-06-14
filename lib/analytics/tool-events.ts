"use client";

export const TOOL_EVENT_VERSION = "1";

export const TOOL_EVENT_NAMES = [
  "tool_view",
  "tool_start",
  "file_selected",
  "process_start",
  "process_success",
  "process_error",
  "result_download",
  "result_copy",
  "parameter_change",
  "mode_change",
  "language_change",
  "share_click",
  "upgrade_click",
] as const;

export type ToolEventName = (typeof TOOL_EVENT_NAMES)[number];

export const TOOL_TYPES = [
  "file_conversion",
  "image_processing",
  "text_processing",
  "developer_validation",
  "generator",
  "calculator",
  "professional_workflow",
] as const;

export type ToolType = (typeof TOOL_TYPES)[number];

export const TOOL_ERROR_CODES = [
  "missing_input",
  "invalid_input",
  "parse_error",
  "unsupported_file_type",
  "file_too_large",
  "canvas_error",
  "download_error",
  "clipboard_error",
  "unknown_error",
] as const;

export type ToolErrorCode = (typeof TOOL_ERROR_CODES)[number];

export type ToolLocale = "en" | "zh-cn" | "zh-tw";

export type FileSizeBucket =
  | "0-100kb"
  | "100kb-1mb"
  | "1mb-5mb"
  | "5mb-20mb"
  | "20mb-plus";

export type FileCountBucket = "1" | "2-5" | "6-20" | "21-plus";

export type ProcessingTimeBucket =
  | "0-100ms"
  | "100-500ms"
  | "500ms-2s"
  | "2s-10s"
  | "10s-plus";

export type ToolEventValue = string | number | boolean | null | undefined;

export type ToolEventParams = {
  tool_slug: string;
  tool_category?: string;
  tool_type?: ToolType;
  locale?: ToolLocale;
  event_version?: typeof TOOL_EVENT_VERSION;
  input_type?: string;
  output_type?: string;
  file_size_bucket?: FileSizeBucket;
  file_count_bucket?: FileCountBucket;
  processing_time_bucket?: ProcessingTimeBucket;
  error_code?: ToolErrorCode;
  result_type?: string;
  source_context?: string;
  mode?: string;
  previous_mode?: string;
  parameter_name?: string;
  from_locale?: ToolLocale;
  to_locale?: ToolLocale;
  share_target?: string;
  placement?: string;
  plan?: string;
  available?: boolean;
  success?: boolean;
};

type RawToolEventParams = Record<string, ToolEventValue | object | unknown>;

declare global {
  interface Window {
    gtag?: (
      command: "event",
      eventName: string,
      params?: Record<string, string | number | boolean>,
    ) => void;
    va?: (
      command: "event",
      event: { name: string; data?: Record<string, string | number | boolean> },
    ) => void;
  }
}

const allowedEventNames = new Set<string>(TOOL_EVENT_NAMES);
const allowedToolTypes = new Set<string>(TOOL_TYPES);
const allowedErrorCodes = new Set<string>(TOOL_ERROR_CODES);
const allowedLocales = new Set<string>(["en", "zh-cn", "zh-tw"]);
const allowedFileSizeBuckets = new Set<string>([
  "0-100kb",
  "100kb-1mb",
  "1mb-5mb",
  "5mb-20mb",
  "20mb-plus",
]);
const allowedFileCountBuckets = new Set<string>([
  "1",
  "2-5",
  "6-20",
  "21-plus",
]);
const allowedProcessingTimeBuckets = new Set<string>([
  "0-100ms",
  "100-500ms",
  "500ms-2s",
  "2s-10s",
  "10s-plus",
]);

const allowedParamNames = new Set<keyof ToolEventParams>([
  "tool_slug",
  "tool_category",
  "tool_type",
  "locale",
  "event_version",
  "input_type",
  "output_type",
  "file_size_bucket",
  "file_count_bucket",
  "processing_time_bucket",
  "error_code",
  "result_type",
  "source_context",
  "mode",
  "previous_mode",
  "parameter_name",
  "from_locale",
  "to_locale",
  "share_target",
  "placement",
  "plan",
  "available",
  "success",
]);

const stringParamMaxLength = 96;
const onceKeys = new Set<string>();

function isAllowedStringValue(key: string, value: string) {
  if (key === "event_version") return value === TOOL_EVENT_VERSION;
  if (key === "tool_type") return allowedToolTypes.has(value);
  if (key === "locale" || key === "from_locale" || key === "to_locale") {
    return allowedLocales.has(value);
  }
  if (key === "error_code") return allowedErrorCodes.has(value);
  if (key === "file_size_bucket") return allowedFileSizeBuckets.has(value);
  if (key === "file_count_bucket") return allowedFileCountBuckets.has(value);
  if (key === "processing_time_bucket") {
    return allowedProcessingTimeBuckets.has(value);
  }

  return true;
}

function cleanStringValue(value: string) {
  return value.trim().slice(0, stringParamMaxLength);
}

function sanitizeValue(key: string, value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const cleaned = cleanStringValue(value);

    if (!cleaned || !isAllowedStringValue(key, cleaned)) {
      return undefined;
    }

    return cleaned;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return undefined;
}

export function getFileSizeBucket(bytes: number): FileSizeBucket {
  if (bytes < 100 * 1024) return "0-100kb";
  if (bytes < 1024 * 1024) return "100kb-1mb";
  if (bytes < 5 * 1024 * 1024) return "1mb-5mb";
  if (bytes < 20 * 1024 * 1024) return "5mb-20mb";
  return "20mb-plus";
}

export function getFileCountBucket(count: number): FileCountBucket {
  if (count <= 1) return "1";
  if (count <= 5) return "2-5";
  if (count <= 20) return "6-20";
  return "21-plus";
}

export function getProcessingTimeBucket(ms: number): ProcessingTimeBucket {
  if (ms < 100) return "0-100ms";
  if (ms < 500) return "100-500ms";
  if (ms < 2000) return "500ms-2s";
  if (ms < 10000) return "2s-10s";
  return "10s-plus";
}

export function getFileInputType(file: File) {
  if (file.type) {
    return file.type.slice(0, stringParamMaxLength);
  }

  return "unknown_file";
}

export function sanitizeToolEvent(
  eventName: string,
  params: RawToolEventParams = {},
) {
  if (!allowedEventNames.has(eventName)) {
    return null;
  }

  const toolSlug = sanitizeValue("tool_slug", params.tool_slug);

  if (typeof toolSlug !== "string") {
    return null;
  }

  const safeParams: Record<string, string | number | boolean> = {
    tool_slug: toolSlug,
    event_version: TOOL_EVENT_VERSION,
  };

  for (const [key, value] of Object.entries(params)) {
    if (!allowedParamNames.has(key as keyof ToolEventParams)) {
      continue;
    }

    const safeValue = sanitizeValue(key, value);

    if (safeValue !== undefined) {
      safeParams[key] = safeValue;
    }
  }

  safeParams.event_version = TOOL_EVENT_VERSION;

  return safeParams;
}

export function trackToolEvent(
  eventName: ToolEventName,
  params: ToolEventParams,
) {
  const safeParams = sanitizeToolEvent(eventName, params);

  if (!safeParams || typeof window === "undefined") {
    return;
  }

  try {
    window.gtag?.("event", eventName, safeParams);
  } catch {
    // Tool analytics must never interrupt the user workflow.
  }

  try {
    window.va?.("event", { name: eventName, data: safeParams });
  } catch {
    // Vercel Analytics is optional.
  }

  if (process.env.NODE_ENV === "development") {
    try {
      if (window.localStorage?.getItem("oneclick-debug-analytics") === "1") {
        console.debug("[tool analytics]", eventName, safeParams);
      }
    } catch {
      // Debug logging must remain optional.
    }
  }
}

function getOnceKey(eventName: ToolEventName, params: ToolEventParams) {
  return [
    eventName,
    params.tool_slug,
    params.locale || "en",
    params.source_context || "",
  ].join(":");
}

function trackOnce(eventName: ToolEventName, params: ToolEventParams) {
  const key = getOnceKey(eventName, params);

  if (onceKeys.has(key)) {
    return;
  }

  onceKeys.add(key);
  trackToolEvent(eventName, params);
}

export function trackToolView(params: ToolEventParams) {
  trackOnce("tool_view", params);
}

export function trackToolStart(params: ToolEventParams) {
  trackOnce("tool_start", params);
}

export function trackFileSelected(params: ToolEventParams) {
  trackToolEvent("file_selected", params);
}

export function trackProcessStart(params: ToolEventParams) {
  trackToolEvent("process_start", params);
}

export function trackProcessSuccess(params: ToolEventParams) {
  trackToolEvent("process_success", params);
}

export function trackProcessError(params: ToolEventParams) {
  trackToolEvent("process_error", params);
}

export function trackResultDownload(params: ToolEventParams) {
  trackToolEvent("result_download", params);
}

export function trackResultCopy(params: ToolEventParams) {
  trackToolEvent("result_copy", params);
}

export function trackParameterChange(params: ToolEventParams) {
  trackToolEvent("parameter_change", params);
}

export function trackModeChange(params: ToolEventParams) {
  trackToolEvent("mode_change", params);
}

export function trackLanguageChange(params: ToolEventParams) {
  trackToolEvent("language_change", params);
}
