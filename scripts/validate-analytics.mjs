import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import {
  TOOL_EVENT_NAMES,
  getFileCountBucket,
  getFileSizeBucket,
  getProcessingTimeBucket,
  sanitizeToolEvent,
  trackToolEvent,
} from "../lib/analytics/tool-events.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const expectedEvents = [
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
];

const pilotTools = {
  "pixel-knock-board-generator": "components/tools/PixelKnockBoardGeneratorTool.tsx",
  "image-compressor": "components/tools/ImageCompressorTool.tsx",
  "image-resizer": "components/tools/ImageResizerTool.tsx",
  "png-to-webp": "components/tools/PngToWebpTool.tsx",
  "json-formatter": "components/tools/JsonFormatterTool.tsx",
  "json-validator": "components/tools/JsonValidatorTool.tsx",
  "csv-to-json-converter": "components/tools/CsvToJsonConverterTool.tsx",
  "qr-code-generator": "components/tools/QrCodeGeneratorTool.tsx",
  "percentage-calculator": "components/tools/PercentageCalculatorTool.tsx",
  "build-plate-fit-calculator": "components/tools/BuildPlateFitCalculatorTool.tsx",
};

const oldPixelKnockEvents = [
  "upload_image",
  "generate_preview",
  "download_project_zip",
  "download_stl_grid",
  "download_png_preview",
  "download_color_csv",
  "switch_language",
  "toggle_show_color_numbers",
];

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertEqualSet(actual, expected, message) {
  assert.deepEqual([...actual].sort(), [...expected].sort(), message);
}

assertEqualSet(TOOL_EVENT_NAMES, expectedEvents, "analytics event dictionary changed unexpectedly");

const cleaned = sanitizeToolEvent("process_start", {
  tool_slug: "json-formatter",
  tool_category: "Developer",
  tool_type: "developer_validation",
  locale: "en",
  input_type: "json",
  file_name: "private.csv",
  filename: "private.csv",
  input_text: "{\"secret\":true}",
  raw_content: "secret",
  unknown_param: "remove me",
});

assert(cleaned, "valid event should sanitize");
assert.equal(cleaned.tool_slug, "json-formatter");
assert.equal(cleaned.event_version, "1");
assert.equal(cleaned.input_type, "json");
assert.equal(cleaned.file_name, undefined);
assert.equal(cleaned.filename, undefined);
assert.equal(cleaned.input_text, undefined);
assert.equal(cleaned.raw_content, undefined);
assert.equal(cleaned.unknown_param, undefined);

const longValue = "x".repeat(200);
const cleanedLong = sanitizeToolEvent("tool_view", {
  tool_slug: "json-formatter",
  source_context: longValue,
});

assert(cleanedLong, "long string event should sanitize");
assert.equal(String(cleanedLong.source_context).length, 96);

assert.equal(getFileSizeBucket(1), "0-100kb");
assert.equal(getFileSizeBucket(250 * 1024), "100kb-1mb");
assert.equal(getFileSizeBucket(2 * 1024 * 1024), "1mb-5mb");
assert.equal(getFileSizeBucket(8 * 1024 * 1024), "5mb-20mb");
assert.equal(getFileSizeBucket(25 * 1024 * 1024), "20mb-plus");

assert.equal(getFileCountBucket(1), "1");
assert.equal(getFileCountBucket(3), "2-5");
assert.equal(getFileCountBucket(12), "6-20");
assert.equal(getFileCountBucket(30), "21-plus");

assert.equal(getProcessingTimeBucket(50), "0-100ms");
assert.equal(getProcessingTimeBucket(250), "100-500ms");
assert.equal(getProcessingTimeBucket(1000), "500ms-2s");
assert.equal(getProcessingTimeBucket(5000), "2s-10s");
assert.equal(getProcessingTimeBucket(15000), "10s-plus");

assert.equal(
  sanitizeToolEvent("tool_view", { tool_category: "Developer" }),
  null,
  "tool_slug is required",
);

assert.equal(
  sanitizeToolEvent("not_allowed", { tool_slug: "json-formatter" }),
  null,
  "unknown event names must be rejected",
);

globalThis.window = {};
assert.doesNotThrow(() => {
  trackToolEvent("tool_view", {
    tool_slug: "json-formatter",
    tool_category: "Developer",
    tool_type: "developer_validation",
    locale: "en",
  });
}, "missing gtag and va must not throw");
delete globalThis.window;

for (const [slug, relativePath] of Object.entries(pilotTools)) {
  const source = readRepoFile(relativePath);

  assert(
    source.includes(slug),
    `${relativePath} should include pilot slug ${slug}`,
  );
  assert(
    source.includes("trackToolView"),
    `${relativePath} should track tool_view through the unified helper`,
  );
}

const pixelKnockSource = readRepoFile(pilotTools["pixel-knock-board-generator"]);

for (const oldEvent of oldPixelKnockEvents) {
  assert(
    !pixelKnockSource.includes(`"${oldEvent}"`) && !pixelKnockSource.includes(`'${oldEvent}'`),
    `Pixel Knock still contains old analytics event: ${oldEvent}`,
  );
}

console.log("Analytics validation passed: event dictionary, sanitizer, buckets, silent fallback, and 10 pilot registrations.");
