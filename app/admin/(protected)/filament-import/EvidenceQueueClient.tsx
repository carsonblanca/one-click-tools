"use client";

import { useState } from "react";

type QueuedEvidenceImport = {
  id: string;
  sourceRunId: string;
  brandId: string;
  originalFilename: string;
  status: string;
  createdAt: string;
};

type UploadIntent = {
  uploadUrl: string;
  objectKey: string;
  sourceRunId: string;
  contentType: string;
  intentToken: string;
};

async function readResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: { error?: string } & Partial<T> = {};
  if (text) {
    try {
      payload = JSON.parse(text) as { error?: string } & Partial<T>;
    } catch {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 160)}`);
      }
      throw new Error(`HTTP ${response.status}: 服务器返回了无效响应。`);
    }
  }
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}: 请求失败。`);
  }
  return payload as T;
}

export default function EvidenceQueueClient({
  initialImports,
}: {
  initialImports: QueuedEvidenceImport[];
}) {
  const [brandId, setBrandId] = useState("kexcelled");
  const [imports, setImports] = useState<QueuedEvidenceImport[]>(initialImports);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function loadImports() {
    try {
      const response = await fetch("/api/admin/filament-import/evidence-queue");
      const payload = (await response.json()) as {
        imports?: QueuedEvidenceImport[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "线上解析队列读取失败。");
      setImports(payload.imports ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "线上解析队列读取失败。");
    }
  }

  async function queueFiles(files: FileList | null) {
    if (!files?.length || uploading) return;
    const selected = Array.from(files);
    if (selected.some((file) => !file.name.toLowerCase().endsWith(".zip"))) {
      setMessage("仅接受 ZIP 文件。");
      return;
    }
    if (!brandId) {
      setMessage("请先选择品牌。");
      return;
    }

    setUploading(true);
    setMessage("正在上传到线上解析队列…");
    let queued = 0;
    try {
      for (const file of selected) {
        const contentType = file.type || "application/zip";
        const intentResponse = await fetch(
          "/api/admin/filament-import/evidence-queue/intent",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              brandId,
              originalFilename: file.name,
              size: file.size,
              contentType,
            }),
          },
        );
        const intent = await readResponse<UploadIntent>(intentResponse);
        const uploadResponse = await fetch(intent.uploadUrl, {
          method: "PUT",
          headers: { "content-type": intent.contentType },
          body: file,
        });
        if (!uploadResponse.ok) {
          const detail = (await uploadResponse.text()).slice(0, 160);
          throw new Error(
            `R2 上传失败（HTTP ${uploadResponse.status}）${detail ? `：${detail}` : ""}`,
          );
        }

        const finalizeResponse = await fetch(
          "/api/admin/filament-import/evidence-queue/finalize",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              brandId,
              objectKey: intent.objectKey,
              originalFilename: file.name,
              size: file.size,
              contentType: intent.contentType,
              sourceRunId: intent.sourceRunId,
              intentToken: intent.intentToken,
            }),
          },
        );
        await readResponse<{ import: QueuedEvidenceImport }>(
          finalizeResponse,
        );
        queued += 1;
      }
      setMessage(`已上传 ${queued} 个文件，等待解析。`);
      await loadImports();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传未完成。");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#D9E0E7] bg-white p-5">
      <h1 className="text-xl font-semibold text-[#18202A]">官方 Evidence ZIP 解析队列</h1>
      <p className="mt-1 text-sm text-[#667281]">
        上传后原始 ZIP 将保存到对象存储，并进入线上解析队列。
      </p>
      <label className="mt-4 block text-sm font-medium text-[#18202A]" htmlFor="queue-brand">
        品牌
      </label>
      <select
        id="queue-brand"
        className="mt-2 w-full max-w-sm rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm"
        value={brandId}
        onChange={(event) => setBrandId(event.target.value)}
      >
        <option value="kexcelled">KEXCELLED</option>
      </select>
      <input
        className="mt-4 block w-full rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm"
        type="file"
        accept=".zip,application/zip"
        multiple
        disabled={uploading}
        onChange={(event) => void queueFiles(event.target.files)}
      />
      {message ? (
        <p className="mt-3 rounded-lg bg-[#F4F6F8] px-3 py-2 text-sm text-[#18202A]">
          {message}
        </p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs text-[#667281]">
            <tr>
              <th className="px-2 py-2 font-medium">文件名</th>
              <th className="px-2 py-2 font-medium">上传时间</th>
              <th className="px-2 py-2 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {imports.map((item) => (
              <tr key={item.id} className="border-t border-[#E5E9ED]">
                <td className="px-2 py-2 text-[#18202A]">{item.originalFilename}</td>
                <td className="px-2 py-2 text-[#667281]">
                  {new Date(item.createdAt).toLocaleString()}
                </td>
                <td className="px-2 py-2 text-[#18202A]">
                  {item.status === "queued" ? "等待解析" : item.status}
                </td>
              </tr>
            ))}
            {!imports.length ? (
              <tr>
                <td className="px-2 py-3 text-[#667281]" colSpan={3}>
                  暂无线上解析任务。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
