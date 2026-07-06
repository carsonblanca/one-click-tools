import { unzipSync } from "fflate";

export const REQUIRED_FIP_FILES = [
  "manifest.json",
  "products.json",
  "evidence.json",
  "package-report.json",
] as const;

export async function validateUploadFipStructure(file: Pick<File, "arrayBuffer">) {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error("ZIP 解析失败，无法检查 FIP 包结构。");
  }
  const missing = REQUIRED_FIP_FILES.filter((name) => !files[name]);
  if (missing.length) {
    throw new Error(`不是合法 FIP，缺少 ${missing.join(" / ")}`);
  }
}

function responseExcerpt(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 300);
}

export async function readJsonApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "unknown";
  const text = await response.text();
  let payload: { error?: string; code?: string; details?: string } | T | null = null;
  if (contentType.toLowerCase().includes("application/json")) {
    try {
      payload = JSON.parse(text) as { error?: string; code?: string; details?: string } | T;
    } catch {
      throw new Error(
        `HTTP ${response.status} · ${contentType} · 服务器返回了无效 JSON：${responseExcerpt(text) || "空响应"}`,
      );
    }
  }
  if (!response.ok) {
    const errorPayload = payload as { error?: string; code?: string; details?: string } | null;
    const reason = errorPayload?.error
      || (response.status === 413 ? "上传包超过托管平台请求体限制。" : responseExcerpt(text))
      || response.statusText
      || "请求失败";
    const metadata = [errorPayload?.code, errorPayload?.details].filter(Boolean).join(" · ");
    throw new Error(
      `HTTP ${response.status} · ${contentType} · ${reason}${metadata ? ` · ${metadata}` : ""}`,
    );
  }
  if (!payload) {
    throw new Error(
      `HTTP ${response.status} · ${contentType} · 服务器未返回 JSON：${responseExcerpt(text) || "空响应"}`,
    );
  }
  return payload as T;
}
