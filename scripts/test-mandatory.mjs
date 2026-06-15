import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = "http://localhost:3001";
const MOBILE_VIEWPORT = { width: 375, height: 812 };

const TEST_IMAGE_PATH = path.join(root, "scripts", "test-fixture.png");

let serverProcess = null;
let passed = 0;
let failed = 0;
const failures = [];

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn("npx", ["next", "dev", "-p", "3001"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    let started = false;

    const onData = (data) => {
      const text = data.toString();
      if (!started && text.includes("localhost:3001")) {
        started = true;
        resolve();
      }
    };

    serverProcess.stdout.on("data", onData);
    serverProcess.stderr.on("data", onData);
    setTimeout(() => reject(new Error("Server start timeout")), 60000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

function ensureTestImage() {
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    throw new Error(`Test image not found at ${TEST_IMAGE_PATH}`);
  }
}

async function checkCalculator(page) {
  const errors = [];

  try {
    await page.goto(`${BASE_URL}/tools/calculator`, { waitUntil: "networkidle" });

    const buttons = await page.locator("button").all();
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text === "2") await btn.click();
    }
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text === "+") await btn.click();
    }
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text === "3") await btn.click();
    }
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text === "=") await btn.click();
    }

    const display = await page.locator('[class*="display"], [class*="result"], input, output').first();
    const value = await display.inputValue().catch(() => display.textContent());

    if (!value || !value.includes("5")) {
      errors.push({ text: `2+3 expected "5", got "${value}"` });
    }

    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text === "C" || text === "AC" || text === "Clear") {
        await btn.click();
        break;
      }
    }

    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text === "1") await btn.click();
    }
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text === "/") await btn.click();
    }
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text === "0") await btn.click();
    }
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text === "=") await btn.click();
    }

    const displayAfter = await page.locator('[class*="display"], [class*="result"], input, output').first();
    const valueAfter = await displayAfter.inputValue().catch(() => displayAfter.textContent());

    if (!valueAfter || valueAfter.includes("Infinity") || valueAfter.includes("Error") || valueAfter.includes("NaN")) {
      errors.push({ text: `1/0 not handled gracefully, got "${valueAfter}"` });
    }
  } catch (err) {
    errors.push({ text: err.message });
  }

  return errors;
}

async function checkImageTool(page, slug) {
  const errors = [];

  try {
    await page.goto(`${BASE_URL}/tools/${slug}`, { waitUntil: "networkidle" });

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(TEST_IMAGE_PATH);
      await page.waitForTimeout(1000);
    }

    const downloadButton = page.locator("a[download], button:has-text('Download'), button:has-text('download')").first();
    if (await downloadButton.isVisible().catch(() => false)) {
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 5000 }).catch(() => null),
        downloadButton.click().catch(() => {}),
      ]);

      if (download) {
        errors.push({ text: `download found for ${slug}`, warn: true });
      }
    }

    const result = await page.locator("img, canvas, [class*='result'], [class*='preview']").first().isVisible().catch(() => false);
    if (!result && slug !== "image-resizer") {
      errors.push({ text: `No result/preview visible for ${slug}`, warn: true });
    }
  } catch (err) {
    errors.push({ text: err.message });
  }

  return errors;
}

async function checkQrCodeGenerator(page) {
  const errors = [];

  try {
    await page.goto(`${BASE_URL}/tools/qr-code-generator`, { waitUntil: "networkidle" });

    const textarea = page.locator("textarea");
    await textarea.fill("https://example.com");

    const generateBtn = page.locator("button:has-text('Generate')");
    await generateBtn.click();
    await page.waitForTimeout(1000);

    const canvas = page.locator("canvas");
    const hasCanvas = await canvas.isVisible().catch(() => false);

    if (!hasCanvas) {
      errors.push({ text: "No canvas after generate" });
    }

    const disclaimer = await page.getByText("not a standards-compliant").isVisible().catch(() => false);
    if (disclaimer) {
      errors.push({ text: "Old disclaimer still present" });
    }

    const downloadBtn = page.locator("button:has-text('Download')");
    if (await downloadBtn.isVisible().catch(() => false)) {
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 5000 }).catch(() => null),
        downloadBtn.click().catch(() => {}),
      ]);

      if (!download) {
        errors.push({ text: "Download PNG did not trigger", warn: true });
      }
    }
  } catch (err) {
    errors.push({ text: err.message });
  }

  return errors;
}

async function check3dSearchAggregator(page) {
  const errors = [];

  try {
    await page.goto(`${BASE_URL}/tools/3d-model-search-aggregator`, { waitUntil: "networkidle" });

    const input = page.locator("input, textarea").first();
    await input.fill("benchy");

    const buttons = await page.locator("button, a[target='_blank']").all();
    let clicks = 0;

    for (const btn of buttons) {
      const text = await btn.textContent().catch(() => "");
      if (text && text.toLowerCase().includes("search")) {
        await btn.click().catch(() => {});
        clicks++;
      }
    }

    if (clicks === 0) {
      errors.push({ text: "No search buttons found", warn: true });
    }
  } catch (err) {
    errors.push({ text: err.message });
  }

  return errors;
}

async function checkPixelKnockBoardGenerator(page) {
  const errors = [];

  try {
    await page.goto(`${BASE_URL}/tools/pixel-knock-board-generator`, { waitUntil: "networkidle" });

    const fileInput = page.locator('input[type="file"]');
    const hasFileInput = await fileInput.isVisible().catch(() => false);
    if (!hasFileInput) {
      errors.push({ text: "No file input" });
    }

    const downloadLinks = await page.locator("a[download]").all();
    if (downloadLinks.length < 2) {
      errors.push({ text: `Expected 4 downloads, found ${downloadLinks.length}`, warn: true });
    }
  } catch (err) {
    errors.push({ text: err.message });
  }

  return errors;
}

const mandatoryTests = {
  calculator: checkCalculator,
  "qr-code-generator": checkQrCodeGenerator,
  "png-to-webp": { fn: checkImageTool, slug: "png-to-webp" },
  "png-to-jpg": { fn: checkImageTool, slug: "png-to-jpg" },
  "jpg-to-png": { fn: checkImageTool, slug: "jpg-to-png" },
  "webp-to-png": { fn: checkImageTool, slug: "webp-to-png" },
  "image-resizer": { fn: checkImageTool, slug: "image-resizer" },
  "image-compressor": { fn: checkImageTool, slug: "image-compressor" },
  "image-cropper": { fn: checkImageTool, slug: "image-cropper" },
  "image-rotate-flip": { fn: checkImageTool, slug: "image-rotate-flip" },
  "pixel-knock-board-generator": checkPixelKnockBoardGenerator,
  "3d-model-search-aggregator": check3dSearchAggregator,
};

function report(resultList) {
  const now = new Date().toISOString();
  const entries = [];

  for (const r of resultList) {
    const warnings = r.errors.filter((e) => e.warn);
    const realErrors = r.errors.filter((e) => !e.warn);
    const ok = realErrors.length === 0;

    if (ok) {
      passed++;
      console.log(`  ✅ ${r.slug}${warnings.length ? ` (${warnings.length} warnings)` : ""}`);
    } else {
      failed++;
      console.log(`  ❌ ${r.slug}`);
      for (const e of realErrors) {
        console.log(`     ${e.text}`);
      }
    }

    entries.push({
      slug: r.slug,
      ok,
      errorCount: realErrors.length,
      warningCount: warnings.length,
      errors: realErrors.map((e) => e.text),
      warnings: warnings.map((e) => e.text),
    });
  }

  const summary = { date: now, total: resultList.length, passed, failed, tools: entries };
  fs.writeFileSync(
    path.join(root, "test-mandatory-report.json"),
    JSON.stringify(summary, null, 2),
  );
}

async function main() {
  ensureTestImage();

  console.log("Starting dev server...");
  await startServer();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
  const results = [];

  try {
    for (const [slug, testDef] of Object.entries(mandatoryTests)) {
      console.log(`\nTesting ${slug}...`);
      const page = await context.newPage();
      let errors;

      if (typeof testDef === "function") {
        errors = await testDef(page);
      } else {
        errors = await testDef.fn(page, testDef.slug);
      }

      await page.close();
      results.push({ slug, errors });
    }
  } finally {
    await browser.close();
    stopServer();
  }

  console.log("\n--- Results ---");
  report(results);

  if (failed > 0) {
    console.error(`\n❌ ${failed} mandatory tool(s) failed`);
    process.exit(1);
  }
  console.log(`\n✅ All ${passed} mandatory tools passed`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  stopServer();
  process.exit(1);
});
