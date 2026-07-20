"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const GOLDEN_SOURCE_RUN_ID = "opencode-20260718081745-d5c1e1ff-d199c528";
const GOLDEN_PRODUCT_LINE_NAME = "THE K5 PETG M";

function isPublishable({
  isAdmin,
  sourceRunId,
  publicationStatus,
  productLineName,
}: {
  isAdmin: boolean;
  sourceRunId: string;
  publicationStatus: string;
  productLineName: string | null;
}) {
  if (!isAdmin) return false;
  if (publicationStatus !== "draft") return false;
  if (sourceRunId !== GOLDEN_SOURCE_RUN_ID) return false;
  if ((productLineName ?? "").trim() !== GOLDEN_PRODUCT_LINE_NAME) return false;
  return true;
}

export default function PublishDraftButton({
  isAdmin,
  sourceRunId,
  publicationStatus,
  productLineName,
}: {
  isAdmin: boolean;
  sourceRunId: string;
  publicationStatus: string;
  productLineName: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const canPublish = isPublishable({
    isAdmin,
    sourceRunId,
    publicationStatus,
    productLineName,
  });

  const handlePublish = useCallback(async () => {
    if (!canPublish || loading) return;

    const confirmed = window.confirm(
      `即将发布 ${GOLDEN_PRODUCT_LINE_NAME}。发布后产品会出现在公开目录、品牌页和详情页。是否继续？`,
    );
    if (!confirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/filament-drafts/batch-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sourceRunIds: [GOLDEN_SOURCE_RUN_ID] }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        issues?: string[];
        published?: string[];
        readback?: { publicationStatus?: string };
      };

      if (!response.ok) {
        const message =
          body.error ||
          (Array.isArray(body.issues) ? body.issues.join("；") : undefined) ||
          `请求失败 HTTP ${response.status}`;
        setResult({ type: "error", message });
        return;
      }

      setResult({
        type: "success",
        message: `发布成功。${body.readback?.publicationStatus === "published" ? "当前草稿已标记为 published。" : ""}`,
      });
      router.refresh();
    } catch (error) {
      setResult({
        type: "error",
        message: error instanceof Error ? error.message : "网络或浏览器请求异常。",
      });
    } finally {
      setLoading(false);
    }
  }, [canPublish, loading, router, sourceRunId]);

  if (publicationStatus === "published") {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="rounded bg-emerald-100 px-2.5 py-1 text-sm font-medium text-emerald-800">
          已发布
        </span>
      </div>
    );
  }

  if (!canPublish) {
    return (
      <div className="text-sm text-slate-500">
        {isAdmin
          ? `当前草稿不满足发布条件（sourceRunId / 产品名称 / publicationStatus 不匹配）。`
          : `需要 admin 权限才能发布。`}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handlePublish}
        disabled={loading}
        className="inline-flex items-center rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "发布中…" : "发布当前草稿"}
      </button>
      {result ? (
        <div
          className={`rounded border px-4 py-3 text-sm ${
            result.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {result.type === "error" ? `发布失败：${result.message}` : result.message}
        </div>
      ) : null}
    </div>
  );
}
