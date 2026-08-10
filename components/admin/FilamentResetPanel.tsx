"use client";

import { useState } from "react";

type ResetCounts = {
  imports: number;
  draftRowsTotal: number;
  drafts: number;
  published: number;
  otherPublicationStates: number;
  products: number;
  colors: number;
  images: number;
  colorImageRelations: number;
  uniqueImageReferences: number;
  parameterFields: number;
  parameterCandidates: number;
  parameterEvidence: number;
  topLevelEvidence: number;
  importPackageReferences: number;
  records: Array<{ id: string; sourceRunId: string; productKey: string; productName: string; publicationStatus: string }>;
};

type DryRun = {
  environment: string;
  snapshotDigest: string;
  counts: ResetCounts;
  confirmationPhrase: string;
  deletionScope: { databaseTables: string[]; preserves: string[] };
};

type Backup = {
  backupKey: string;
  backupSha256: string;
  snapshotDigest: string;
  counts: ResetCounts;
  readbackVerified: boolean;
};

export function FilamentResetPanel() {
  const [dryRun, setDryRun] = useState<DryRun | null>(null);
  const [backup, setBackup] = useState<Backup | null>(null);
  const [phrase, setPhrase] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadDryRun() {
    setBusy(true); setMessage(""); setBackup(null); setPhrase(""); setAcknowledged(false);
    try {
      const response = await fetch("/api/admin/filaments/reset", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "DRY RUN 失败");
      setDryRun(payload);
      setMessage("只读盘点完成，尚未创建备份，也未删除数据。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "DRY RUN 失败"); }
    finally { setBusy(false); }
  }

  async function createBackup() {
    if (!dryRun) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/filaments/reset", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "backup" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "备份失败");
      setBackup(payload);
      setMessage(payload.readbackVerified ? "备份已写入并完成回读校验；尚未删除数据。" : "备份未通过回读校验");
    } catch (error) { setMessage(error instanceof Error ? error.message : "备份失败"); }
    finally { setBusy(false); }
  }

  async function clearData() {
    if (!dryRun || !backup || phrase !== dryRun.confirmationPhrase || !acknowledged) return;
    if (!window.confirm(`最后确认：将只删除 ${dryRun.environment} 的 filament_imports 与 filament_drafts 精确快照记录，继续吗？`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/filaments/reset", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
          action: "clear",
          backupKey: backup.backupKey,
          backupSha256: backup.backupSha256,
          confirmationPhrase: phrase,
          expectedSnapshotDigest: backup.snapshotDigest,
          expectedCounts: backup.counts,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "清空失败");
      setMessage(`清空完成：删除 import ${payload.deleted?.imports ?? 0}、draft ${payload.deleted?.drafts ?? 0}；剩余 import ${payload.remaining?.imports ?? "?"}、draft ${payload.remaining?.drafts ?? "?"}。`);
      setDryRun(null); setBackup(null); setPhrase(""); setAcknowledged(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "清空失败"); }
    finally { setBusy(false); }
  }

  const counts = dryRun?.counts;
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#F0C36D] bg-[#FFF9EB] p-5">
        <h2 className="font-semibold text-[#6B4A00]">安全边界</h2>
        <p className="mt-2 text-sm text-[#6B4A00]">只处理 filament_imports 与 filament_drafts。管理员、权限、审计日志、表结构、Storage bucket、R2 图片/导入包与备份均保留。清空前必须完成带哈希的备份回读校验。</p>
      </section>
      <div className="flex flex-wrap gap-3">
        <button onClick={loadDryRun} disabled={busy} className="rounded-lg bg-[#1F5FAF] px-4 py-2 text-sm text-white disabled:opacity-50">运行只读 DRY RUN</button>
        <button onClick={createBackup} disabled={busy || !dryRun} className="rounded-lg border border-[#1F5FAF] px-4 py-2 text-sm text-[#1F5FAF] disabled:opacity-50">创建并校验备份</button>
      </div>
      {counts ? <section className="space-y-4 rounded-xl border border-[#D9E0E7] bg-white p-5">
        <div><h2 className="font-semibold text-[#18202A]">预计删除统计</h2><p className="mt-1 text-xs text-[#667281]">环境：{dryRun.environment} · 快照摘要：{dryRun.snapshotDigest.slice(0, 12)}…</p></div>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Import", counts.imports], ["Draft", counts.drafts], ["Published", counts.published], ["其他发布状态", counts.otherPublicationStates], ["产品", counts.products],
            ["颜色", counts.colors], ["图片记录", counts.images], ["图片引用", counts.uniqueImageReferences], ["颜色图片关系", counts.colorImageRelations],
            ["参数字段", counts.parameterFields], ["参数候选", counts.parameterCandidates], ["参数证据", counts.parameterEvidence], ["顶层证据", counts.topLevelEvidence],
          ].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-[#F4F6F8] p-3"><dt className="text-xs text-[#667281]">{label}</dt><dd className="mt-1 text-xl font-semibold text-[#18202A]">{value}</dd></div>)}
        </dl>
        <details><summary className="cursor-pointer text-sm text-[#1F5FAF]">查看 {counts.records.length} 条记录</summary><div className="mt-3 max-h-72 overflow-auto rounded-lg border border-[#E5E9ED]"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-[#F4F6F8]"><tr><th className="p-2">产品</th><th className="p-2">productKey</th><th className="p-2">sourceRunId</th><th className="p-2">状态</th></tr></thead><tbody>{counts.records.map((row) => <tr key={row.id} className="border-t border-[#E5E9ED]"><td className="p-2">{row.productName || "—"}</td><td className="p-2">{row.productKey}</td><td className="p-2 font-mono">{row.sourceRunId}</td><td className="p-2">{row.publicationStatus}</td></tr>)}</tbody></table></div></details>
      </section> : null}
      {backup ? <section className="space-y-4 rounded-xl border border-[#D16B6B] bg-white p-5">
        <div><h2 className="font-semibold text-[#8C1D18]">危险操作：清空耗材业务数据</h2><p className="mt-1 text-sm text-[#667281]">备份已回读校验。若数据在备份后发生变化，服务端会以 409 拒绝清空。</p></div>
        <label className="block text-sm text-[#667281]">输入确认短语：<code className="select-all rounded bg-[#F4F6F8] px-1 text-[#18202A]">{dryRun?.confirmationPhrase}</code><input value={phrase} onChange={(event) => setPhrase(event.target.value)} className="mt-2 w-full rounded-lg border border-[#D16B6B] px-3 py-2 text-[#18202A]" /></label>
        <label className="flex items-start gap-2 text-sm text-[#44505E]"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1" /><span>我确认只清空当前显示环境的耗材业务记录，并已确认备份回读成功。</span></label>
        <button onClick={clearData} disabled={busy || phrase !== dryRun?.confirmationPhrase || !acknowledged} className="rounded-lg bg-[#A62A24] px-4 py-2 text-sm text-white disabled:opacity-40">执行精确清空</button>
      </section> : null}
      {message ? <p className="rounded-lg bg-[#F4F6F8] p-3 text-sm text-[#44505E]">{message}</p> : null}
    </div>
  );
}
