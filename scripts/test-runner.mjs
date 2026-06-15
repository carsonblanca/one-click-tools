import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const toolsPath = path.join(root, "data/tools.json");

const BASE_URL = "http://localhost:3000";
const MOBILE_VIEWPORT = { width: 375, height: 812 };

const REQUIRED_TOOLS = [
  "calculator",
  "qr-code-generator",
  "image-resizer",
  "image-compressor",
  "image-cropper",
  "image-rotate-flip",
  "png-to-webp",
  "png-to-jpg",
  "jpg-to-png",
  "webp-to-png",
  "pixel-knock-board-generator",
  "3d-model-search-aggregator",
];

let serverProcess = null;
let passed = 0;
let failed = 0;
const failures = [];

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn("npx", ["next", "dev", "-p", "3000"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    let started = false;

    serverProcess.stdout.on("data", (data) => {
      const text = data.toString();
      if (!started && text.includes("localhost:3000")) {
        started = true;
        resolve();
      }
    });

    serverProcess.stderr.on("data", (data) => {
      const text = data.toString();
      if (!started && text.includes("localhost:3000")) {
        started = true;
        resolve();
      }
    });

    setTimeout(() => reject(new Error("Server start timeout")), 60000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

async function checkTool(browser, slug) {
  const url = `${BASE_URL}/tools/${slug}`;
  const errors = [];

  try {
    const page = await browser.newPage();

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push({ type: "console", text: msg.text() });
      }
    });

    page.on("pageerror", (err) => {
      errors.push({ type: "page", text: err.message });
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const status = page.url().includes(slug) ? 200 : 404;

    if (status !== 200) {
      errors.push({ type: "http", text: `HTTP ${status}` });
    }

    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForTimeout(500);
    const mobileVisible = await page.evaluate(
      () => document.body.scrollWidth > 0,
    );

    if (!mobileVisible) {
      errors.push({ type: "mobile", text: "Nothing visible on mobile" });
    }

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );

    return { slug, ok: errors.length === 0, errors, url, darkMode: isDark };
  } catch (err) {
    return { slug, ok: false, errors: [{ type: "exception", text: err.message }], url, darkMode: false };
  }
}

function report(results) {
  const now = new Date().toISOString();

  for (const r of results) {
    if (r.ok) {
      passed++;
      console.log(`  ✅ ${r.slug} (dark=${r.darkMode})`);
    } else {
      failed++;
      console.log(`  ❌ ${r.slug}`);
      for (const e of r.errors) {
        console.log(`     ${e.type}: ${e.text}`);
      }
      failures.push(r);
    }
  }

  const reportPath = path.join(root, "test-report.json");
  const summary = {
    date: now,
    total: results.length,
    passed,
    failed,
    failures: failures.map((f) => ({
      slug: f.slug,
      url: f.url,
      errors: f.errors,
    })),
  };
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(`\nReport written to ${reportPath}`);
}

async function main() {
  const tools = JSON.parse(fs.readFileSync(toolsPath, "utf8"));
  const targetSlugs = process.argv[2]
    ? process.argv[2].split(",").map((s) => s.trim())
    : tools.map((t) => t.slug);

  console.log(`Testing ${targetSlugs.length} tools...\n`);

  console.log("Starting dev server...");
  await startServer();

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const slug of targetSlugs) {
      const result = await checkTool(browser, slug);
      results.push(result);
    }
  } finally {
    await browser.close();
    stopServer();
  }

  report(results);

  if (failed > 0) {
    console.error(`\n❌ ${failed} tool(s) failed`);
    process.exit(1);
  }

  console.log(`\n✅ All ${passed} tools passed`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  stopServer();
  process.exit(1);
});
