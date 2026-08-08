"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

function isPublishable({
  isAdmin,
  publicationStatus,
  reviewStatus,
}: {
  isAdmin: boolean;
  publicationStatus: string;
  reviewStatus: string;
}) {
  if (!isAdmin) return false;
  if (publicationStatus !== "draft") return false;
  if (!["pending_review", "approved"].includes(reviewStatus)) return false;
  return true;
}

export default function PublishDraftButton({
  isAdmin,
  sourceRunId,
  publicationStatus,
  reviewStatus,
  productKey,
  productLineName,
}: {
  isAdmin: boolean;
  sourceRunId: string;
  publicationStatus: string;
  reviewStatus: string;
  productKey?: string;
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
    publicationStatus,
    reviewStatus,
  });

  const handlePublish = useCallback(async () => {
    if (!canPublish || loading) return;

    const confirmed = window.confirm(
      "即将把当前耗材草稿标记为已发布，发布后会在 Preview 前台耗材页面显示。是否继续？",
    );
    if (!confirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/filament-drafts/batch-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sourceRunIds: [sourceRunId] }),
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
        message: `已发布到 Preview。${body.readback?.publicationStatus === "published" ? "当前草稿已标记为 published。" : ""}`,
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
          已发布到 Preview
        </span>
        <Link
          href={productKey ? `/zh-cn/filaments/${productKey}` : "/zh-cn/filaments"}
          className="text-sm font-medium text-emerald-700 underline hover:text-emerald-900"
        >
          查看前台
        </Link>
      </div>
    );
  }

  if (!canPublish) {
    return (
      <div className="text-sm text-slate-500">
        {isAdmin
          ? `当前草稿不满足发布条件（需为 admin、publicationStatus=draft、reviewStatus=pending_review/approved）。`
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
        {loading ? "发布中…" : "发布到 Preview"}
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
          {result.type === "success" ? (
            <Link
              href={productKey ? `/zh-cn/filaments/${productKey}` : "/zh-cn/filaments"}
              className="ml-3 inline-flex items-center font-medium text-emerald-700 underline hover:text-emerald-900"
            >
              查看前台
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
