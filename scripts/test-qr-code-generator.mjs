import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const explicitBaseUrl = process.env.QR_TEST_BASE_URL;
const port = Number(process.env.QR_TEST_PORT || 3002);
const baseUrl = explicitBaseUrl || `http://localhost:${port}`;
const shouldStartServer = !explicitBaseUrl;
const downloadDir = path.join(root, "test-results", "qr-code-generator");
let serverProcess = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function startServer() {
  serverProcess = spawn("npx", ["next", "dev", "-p", String(port)], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  serverProcess.stdout.on("data", (data) => process.stdout.write(data));
  serverProcess.stderr.on("data", (data) => process.stderr.write(data));
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

async function waitForServer() {
  const deadline = Date.now() + 60000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/tools/qr-code-generator`);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Server did not start: ${lastError?.message || "timeout"}`);
}

async function main() {
  fs.mkdirSync(downloadDir, { recursive: true });
  if (shouldStartServer) {
    startServer();
  }
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(`${baseUrl}/tools/qr-code-generator`, {
      waitUntil: "networkidle",
    });

    await page.getByTestId("qr-code-input").fill("123456");
    await page.getByTestId("qr-generate").click();

    const canvas = page.getByTestId("qr-code-canvas");
    await canvas.waitFor({ state: "visible", timeout: 10000 });

    const canvasDataUrl = await canvas.evaluate((node) =>
      node instanceof HTMLCanvasElement ? node.toDataURL("image/png") : "",
    );
    assert(
      canvasDataUrl.startsWith("data:image/png;base64,") && canvasDataUrl.length > 1000,
      "Generated QR canvas is empty or not a PNG data URL.",
    );

    const downloadButton = page.getByTestId("qr-download-png");
    assert(!(await downloadButton.isDisabled()), "Download PNG button is disabled after generation.");

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      downloadButton.click(),
    ]);

    const filename = download.suggestedFilename();
    assert(filename.toLowerCase().endsWith(".png"), `Expected PNG filename, got ${filename}`);

    const savePath = path.join(downloadDir, filename);
    await download.saveAs(savePath);

    const file = fs.readFileSync(savePath);
    assert(file.length > 1000, "Downloaded PNG is empty.");
    assert(
      file[0] === 0x89 && file[1] === 0x50 && file[2] === 0x4e && file[3] === 0x47,
      "Downloaded file is not a PNG.",
    );
    assert(consoleErrors.length === 0, `Console errors: ${consoleErrors.join(" | ")}`);
    assert(pageErrors.length === 0, `Page errors: ${pageErrors.join(" | ")}`);

    console.log("QR专项测试通过：输入、生成、预览和 PNG 下载均有效。");
  } finally {
    await context.close();
    await browser.close();
    stopServer();
  }
}

main().catch((error) => {
  console.error(error);
  stopServer();
  process.exit(1);
});
