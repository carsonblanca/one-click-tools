#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { strFromU8, unzipSync } from "fflate";

const REQUIRED_FILES = [
  "manifest.json",
  "products.json",
  "colors.json",
  "evidence.json",
  "package-report.json",
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function debug(...args) {
  console.error(...args);
}

function loginCookieJar() {
  const jar = new Map();
  return {
    set(cookieHeader) {
      const parts = cookieHeader.split(";");
      for (const part of parts) {
        const idx = part.indexOf("=");
        if (idx > 0) {
          const key = part.slice(0, idx).trim();
          const value = part.slice(idx + 1).trim();
          jar.set(key, value);
        }
      }
    },
    toHeader() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    has(key) {
      return jar.has(key);
    },
  };
}

async function login(baseUrl, email, password) {
  if (!email || !password) {
    fail("missing ADMIN_EMAIL or ADMIN_PASSWORD environment variable");
  }

  const jar = loginCookieJar();
  const loginUrl = `${baseUrl}/api/admin/auth/login`;
  debug(`[login] POST ${loginUrl}`);

  const response = await fetch(loginUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });

  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    jar.set(setCookie);
  }

  if (!response.ok || !jar.has("oneclick_admin_session")) {
    const body = await response.text().catch(() => "");
    fail(`[login] failed HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  debug(`[login] success`);
  return jar;
}

function machineTokenAuth() {
  const token = process.env.OPENCODE_IMPORT_API_TOKEN?.trim();
  if (!token) return null;
  return { kind: "machine_token", token };
}

function serviceCredentials() {
  const email = process.env.OPENCODE_UPLOAD_EMAIL?.trim();
  const password = process.env.OPENCODE_UPLOAD_PASSWORD;
  return email && password ? { email, password } : null;
}

function authHeaders(auth) {
  return auth.kind === "machine_token"
    ? { authorization: `Bearer ${auth.token}` }
    : { cookie: auth.toHeader() };
}

function validateZip(filePath) {
  debug(`[validate] ${filePath}`);
  let buffer;
  try {
    buffer = readFileSync(filePath);
  } catch {
    return { ok: false, error: "无法读取文件" };
  }

  let files;
  try {
    files = unzipSync(new Uint8Array(buffer));
  } catch {
    return { ok: false, error: "ZIP 解析失败" };
  }

  const missing = REQUIRED_FILES.filter((name) => !files[name]);
  if (missing.length > 0) {
    return { ok: false, error: `不是合法 FIP，缺少 ${missing.join(" / ")}` };
  }

  const readJson = (name, fallback) => {
    try {
      return JSON.parse(strFromU8(files[name]));
    } catch {
      return fallback;
    }
  };
  const report = readJson("package-report.json", null);
  const candidates = readJson("parameter-candidates.json", null);
  const colors = readJson("colors.json", null);
  const images = readJson("images.json", null);
  if (!Array.isArray(candidates)) {
    return { ok: false, error: "FIP 缺少有效 parameter-candidates.json，已阻止上传" };
  }
  if (candidates.length === 0) {
    return { ok: false, error: "FIP 参数候选为 0，已阻止上传；请补齐详情图 OCR 后重新构建" };
  }
  if (!report || typeof report !== "object") {
    return { ok: false, error: "package-report.json 无法读取，已阻止上传" };
  }
  if (Number.isInteger(report.parameterCandidateCount) && report.parameterCandidateCount !== candidates.length) {
    return { ok: false, error: `参数报告数量不一致：report=${report.parameterCandidateCount}, candidates=${candidates.length}` };
  }
  if (Number(report.detailImageCount || 0) > 0 && Number(report.ocrTextCount || 0) === 0) {
    return { ok: false, error: "FIP 含详情图但没有 OCR 文本，已阻止上传" };
  }
  if (String(report.parameterTableStatus || "").toLowerCase() === "missing" || report.parameterTablesRecovered === false) {
    return { ok: false, error: "FIP 详情参数表未恢复，已阻止上传；请重新采集详情图OCR" };
  }
  if (!Array.isArray(colors) || colors.length === 0) {
    return { ok: false, error: "FIP 没有颜色记录，已阻止上传" };
  }
  if (!Array.isArray(images) || images.length < colors.length) {
    return { ok: false, error: `FIP 图片记录不足：images=${Array.isArray(images) ? images.length : 0}, colors=${colors.length}` };
  }
  const imagePaths = new Set(images.flatMap((image) => [image?.sourcePath, image?.packagePath].filter(Boolean)));
  const missingColorImages = colors.filter((color) => (
    color?.imageStatus === "available" && color?.imagePath && !imagePaths.has(color.imagePath)
  ));
  if (missingColorImages.length > 0) {
    return { ok: false, error: `有 ${missingColorImages.length} 个可用颜色无法解析到图片资产，已阻止上传` };
  }
  const incompleteCandidates = candidates.filter((candidate) => (
    !candidate || !candidate.canonicalKey || !candidate.normalizedValue
      || candidate.reviewStatus !== "pending_review"
      || !(candidate.source?.sourceImage || candidate.source?.sourceFile || candidate.source?.ocrTextPath)
  ));
  if (incompleteCandidates.length > 0) {
    return { ok: false, error: `有 ${incompleteCandidates.length} 个参数候选缺少值、审核状态或证据来源，已阻止上传` };
  }

  // Safe-path check
  for (const name of Object.keys(files)) {
    if (
      name.startsWith("/") ||
      name.includes("../") ||
      name.includes("..\\") ||
      name.includes("\\") ||
      name.includes("\0")
    ) {
      return { ok: false, error: `ZIP 内包含不安全路径：${name}` };
    }
  }

  const manifest = readJson("manifest.json", {});
  const products = readJson("products.json", []);
  if (!Array.isArray(products) || products.length !== 1) {
    return { ok: false, error: "一个上传包必须且只能包含一个产品品类" };
  }
  if (!manifest.sourceRunId || typeof manifest.sourceRunId !== "string" || !manifest.sourceRunId.trim()) {
    return { ok: false, error: "manifest.json 缺少 sourceRunId，无法安全读回和去重" };
  }
  if (!products[0]?.productLine || typeof products[0].productLine !== "string" || !products[0].productLine.trim()) {
    return { ok: false, error: "products.json 缺少 productLine，无法安全识别品类和去重" };
  }
  return {
    ok: true,
    meta: {
      originalSourceRunId: typeof manifest.sourceRunId === "string" ? manifest.sourceRunId.trim() : "",
      productLine: typeof products[0]?.productLine === "string" ? products[0].productLine.trim() : "",
      materialType: typeof products[0]?.materialType === "string" ? products[0].materialType.trim() : "",
      colorCount: colors.length,
      imageCount: images.length,
      parameterCandidateCount: candidates.length,
    },
  };
}

async function uploadFile(baseUrl, auth, filePath) {
  const filename = basename(filePath);
  debug(`[upload] ${filename}`);

  const form = new FormData();
  const buffer = readFileSync(filePath);
  form.append("files", new Blob([buffer]), filename);
  form.append("brandId", "kexcelled");

  const url = `${baseUrl}/api/admin/filament-import/kexcelled-evidence`;
  debug(`[upload] POST ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(auth),
    body: form,
    redirect: "manual",
  });

  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    // not json
  }

  if (!response.ok) {
    const error = body?.error || text.slice(0, 300) || `HTTP ${response.status}`;
    throw new Error(error);
  }

  return body;
}

async function readback(baseUrl, auth, originalSourceRunId) {
  const url = `${baseUrl}/api/admin/filament-import/kexcelled-evidence?originalSourceRunId=${encodeURIComponent(originalSourceRunId)}`;
  const response = await fetch(url, { headers: authHeaders(auth) });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* handled below */ }
  if (!response.ok) throw new Error(body?.error || text.slice(0, 300) || `HTTP ${response.status}`);
  return body;
}

async function deleteDraft(baseUrl, auth, sourceRunId) {
  const response = await fetch(`${baseUrl}/api/admin/filament-import/kexcelled-evidence/${encodeURIComponent(sourceRunId)}`, {
    method: "DELETE",
    headers: authHeaders(auth),
  });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* handled below */ }
  if (!response.ok) throw new Error(body?.error || text.slice(0, 300) || `HTTP ${response.status}`);
  return body;
}

function sameCategory(item, meta) {
  return item.productLine === meta.productLine
    && item.materialType === meta.materialType
    && item.deletable === true;
}

async function main() {
  const args = process.argv.slice(2);

  let baseUrl = process.env.BASE_URL || "https://one-click-tools.com";
  let validateOnly = false;
  let allowLocal = false;
  const files = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--base-url") {
      baseUrl = args[++i];
      if (!baseUrl) fail("--base-url requires a value");
    } else if (args[i] === "--validate-only") {
      validateOnly = true;
    } else if (args[i] === "--allow-local") {
      allowLocal = true;
    } else {
      files.push(args[i]);
    }
  }

  if (files.length === 0) {
    fail("usage: node upload-fip.mjs [--base-url URL] file1.filament-import.zip [...]");
  }

  baseUrl = baseUrl.replace(/\/$/, "");
  if (!validateOnly && !allowLocal && !baseUrl.startsWith("https://")) {
    fail("上传目标必须是线上 HTTPS 地址；本地测试必须显式加 --allow-local");
  }

  debug(`[config] baseUrl=${baseUrl}`);
  debug(`[config] files=${files.length}`);

  // Step 1: validate all files first
  const toUpload = [];
  const results = [];
  for (const file of files) {
    const filename = basename(file);
    if (!filename.endsWith(".filament-import.zip")) {
      results.push({ filename, error: "文件名必须以 .filament-import.zip 结尾", step: "validate" });
      continue;
    }
    const validation = validateZip(file);
    if (!validation.ok) {
      results.push({ filename, error: validation.error, step: "validate" });
      continue;
    }
    toUpload.push({ file, meta: validation.meta });
  }

  // Atomic preflight: one invalid package blocks the whole batch.
  if (results.length > 0) {
    results.push({ batchStatus: "blocked", reason: "批量预检未全部通过，未上传任何文件", repairAction: "重新生成 FIP 或进入后台人工补填后再运行" });
    console.log(JSON.stringify(results, null, 2));
    process.exit(1);
  }

  if (toUpload.length === 0) fail("no files to upload");

  if (validateOnly) {
    console.log(JSON.stringify(toUpload.map(({ file, meta }) => ({ filename: basename(file), status: "preflight_pass", ...meta })), null, 2));
    process.exit(0);
  }

  // Step 2: login
  let auth;
  const credentials = serviceCredentials() || {
    email: process.env.ADMIN_EMAIL?.trim(),
    password: process.env.ADMIN_PASSWORD,
  };
  if (credentials.email && credentials.password) {
    try {
      auth = await login(baseUrl, credentials.email, credentials.password);
    } catch (err) {
      for (const item of toUpload) {
        results.push({ filename: basename(item.file), error: err.message, step: "login" });
      }
      console.log(JSON.stringify(results, null, 2));
      process.exit(1);
    }
  } else if (machineTokenAuth()) {
    auth = machineTokenAuth();
    debug("[auth] legacy machine import token selected");
  } else {
    fail("missing OPENCODE_UPLOAD_EMAIL/OPENCODE_UPLOAD_PASSWORD or ADMIN_EMAIL/ADMIN_PASSWORD");
  }

  // Step 3: upload each file
  for (const item of toUpload) {
    const file = item.file;
    const filename = basename(file);
    try {
      const body = await uploadFile(baseUrl, auth, file);
      const sourceRunId = body.sourceRunId || "";
      const draftIds = body.draftIds || [];
      const audit = await readback(baseUrl, auth, item.meta.originalSourceRunId);
      const created = (audit?.results || []).find((draft) => draft.sourceRunId === sourceRunId);
      if (!created) throw new Error("上传响应成功，但读回未找到新草稿");
      const readbackPass = created.productLine === item.meta.productLine
        && created.materialType === item.meta.materialType
        && created.colorCount === item.meta.colorCount
        && created.imageCount >= item.meta.imageCount
        && created.parameterCandidateCount === item.meta.parameterCandidateCount
        && created.status === "draft"
        && created.publicationStatus !== "published";
      if (!readbackPass) throw new Error(`读回不完整：${JSON.stringify(created)}`);

      const stale = (audit?.results || []).filter((draft) => draft.sourceRunId !== sourceRunId && sameCategory(draft, item.meta));
      const deleted = [];
      if (auth.kind !== "machine_token") {
        for (const oldDraft of stale) {
          await deleteDraft(baseUrl, auth, oldDraft.sourceRunId);
          deleted.push(oldDraft.sourceRunId);
        }
      }
      results.push({
        filename,
        importId: body.importId || "",
        draftId: Array.isArray(draftIds) ? draftIds.join(", ") : String(draftIds),
        status: auth.kind === "machine_token" ? "uploaded_needs_manual_dedup" : "uploaded_and_deduplicated",
        sourceRunId,
        deletedDuplicateSourceRunIds: deleted,
        productLine: created.productLine,
        colors: created.colorCount,
        images: created.imageCount,
        parameters: created.parameterCandidateCount,
        draftStatus: created.status,
        published: false,
        requiresHumanReview: true,
        reviewUrl: `${baseUrl}${created.editPath || created.draftPath}`,
      });
    } catch (err) {
      const errorText = err.message || String(err);
      results.push({ filename, error: errorText, step: "upload_or_readback", repairAction: "停止并由 code 重新识别图片/补参数，或人工编辑后重试；未自动重试" });
      break;
    }
  }

  results.push({ batchStatus: results.some((r) => r.error) ? "partial_failure" : "ready_for_human_review", published: 0, autoApproval: false, autoRetry: false });
  const hasError = results.some((r) => r.error);
  console.log(JSON.stringify(results, null, 2));
  process.exit(hasError ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
