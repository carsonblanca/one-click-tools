import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./vision-ocr.swift", import.meta.url));
const fixtureZip = process.env.VISION_TEST_ZIP;
const workdir = mkdtempSync(join(tmpdir(), "vision-ocr-test-"));
const ocrBinary = join(workdir, "vision-ocr");
const imageGeneratorSource = join(workdir, "image-generator.swift");
const imageGeneratorBinary = join(workdir, "image-generator");
const englishImage = join(workdir, "english.png");
const bilingualImage = join(workdir, "bilingual.png");
const physicalTableImage = join(workdir, "physical-table.jpg");
let englishResult;
let bilingualResult;
let physicalTableResult;

const imageGenerator = String.raw`
import AppKit
import Foundation

let output = CommandLine.arguments[1]
let mode = CommandLine.arguments[2]
let size = NSSize(width: 1600, height: 700)
let image = NSImage(size: size)
image.lockFocus()
NSColor.white.setFill()
NSRect(origin: .zero, size: size).fill()
let attributes: [NSAttributedString.Key: Any] = [
  .font: NSFont.systemFont(ofSize: 72),
  .foregroundColor: NSColor.black,
]
let lines = mode == "english"
  ? ["THE K5 PLA P", "Density 1.24 g/cm3", "Tensile strength 46-48 MPa"]
  : ["THE K5 PLA P", "密度 1.24 g/cm³", "拉伸强度 46-48 MPa"]
for (index, line) in lines.enumerated() {
  (line as NSString).draw(
    at: NSPoint(x: 80, y: 520 - (index * 190)),
    withAttributes: attributes
  )
}
image.unlockFocus()
let representation = NSBitmapImageRep(data: image.tiffRepresentation!)!
let data = representation.representation(using: .png, properties: [:])!
try data.write(to: URL(fileURLWithPath: output))
`;

function runOCR(path) {
  const result = spawnSync(ocrBinary, [path], {
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(result.signal, null, `OCR terminated by ${result.signal}`);
  assert.equal(result.status, 0, result.stderr || "OCR exited unsuccessfully");
  assert.doesNotThrow(() => JSON.parse(result.stdout), "stdout must contain only JSON");
  const payload = JSON.parse(result.stdout);
  assert.equal(Array.isArray(payload), true);
  assert.equal(payload.length, 1);
  return { item: payload[0], stderr: result.stderr };
}

before(() => {
  writeFileSync(imageGeneratorSource, imageGenerator);
  execFileSync("swiftc", [scriptPath, "-o", ocrBinary], { stdio: "pipe" });
  execFileSync("swiftc", [imageGeneratorSource, "-o", imageGeneratorBinary], { stdio: "pipe" });
  execFileSync(imageGeneratorBinary, [englishImage, "english"]);
  execFileSync(imageGeneratorBinary, [bilingualImage, "bilingual"]);
  if (fixtureZip) {
    writeFileSync(
      physicalTableImage,
      execFileSync("unzip", ["-p", fixtureZip, "images/0016.jpg"], {
        maxBuffer: 4 * 1024 * 1024,
      })
    );
  }
  englishResult = runOCR(englishImage);
  bilingualResult = runOCR(bilingualImage);
  if (fixtureZip) physicalTableResult = runOCR(physicalTableImage);
});

after(() => {
  rmSync(workdir, { recursive: true, force: true });
});

test("missing file returns structured JSON", () => {
  const { item } = runOCR(join(workdir, "missing.jpg"));
  assert.equal(item.ok, false);
  assert.equal(item.stage, "file_validation");
  assert.equal(typeof item.errorDomain, "string");
  assert.equal(typeof item.errorCode, "number");
  assert.equal(typeof item.errorMessage, "string");
});

test("non-image file returns structured JSON", () => {
  const invalidPath = join(workdir, "not-an-image.txt");
  writeFileSync(invalidPath, "not image data");
  const { item } = runOCR(invalidPath);
  assert.equal(item.ok, false);
  assert.ok(["image_decode", "cgimage_conversion"].includes(item.stage));
});

test("simple English image is recognized", () => {
  const { item } = englishResult;
  assert.equal(item.ok, true);
  assert.ok(item.observationCount > 0);
  assert.match(item.observations.map(({ text }) => text).join("\n"), /THE K5 PLA P/);
});

test("simple Chinese and English image is recognized", () => {
  const { item } = bilingualResult;
  assert.equal(item.ok, true);
  assert.ok(item.observationCount > 0);
  const recognized = item.observations.map(({ text }) => text).join("\n");
  assert.match(recognized, /THE K5 PLA P/);
  assert.match(recognized, /密度|拉伸强度/);
});

test("large physical-property image always returns JSON observations", {
  skip: !fixtureZip && "Set VISION_TEST_ZIP to the Evidence ZIP",
}, () => {
  const { item } = physicalTableResult;
  assert.equal(item.ok, true);
  assert.ok(item.observationCount > 0);
});

test("physical-property image recognizes at least two table keywords", {
  skip: !fixtureZip && "Set VISION_TEST_ZIP to the Evidence ZIP",
}, () => {
  const { item } = physicalTableResult;
  const recognized = item.observations.map(({ text }) => text).join("\n");
  const keywords = ["基本物性指标", "密度", "测试标准", "拉伸强度", "弯曲强度", "冲击强度"];
  assert.ok(keywords.filter((keyword) => recognized.includes(keyword)).length >= 2);
});

test("successful stdout contains JSON only", () => {
  const { item, stderr } = englishResult;
  assert.equal(item.stage, "completed");
  assert.equal(stderr, "");
});
