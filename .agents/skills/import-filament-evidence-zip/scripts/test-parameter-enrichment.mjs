import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { fieldsAcceptedFromCandidates } from "../../../../lib/filaments/parameters/normalized-parameters.ts";
import { parameterSourceEvidence } from "../../../../lib/filaments/imports/kexcelled-fip.ts";
import {
  enrichParameterTables,
  mergeParameterCandidates,
  ParameterEnrichmentError,
} from "./parameter-enrichment.mjs";
import { adaptParameterTablesInput } from "./parameter-tables-adapter.mjs";

function table(rows, overrides = {}) {
  return {
    schemaVersion: "parameter-tables.v1",
    currentProductTitle: "KEXCELLED THE K8 TPU",
    parameterTable: { productTitle: "THE K8 TPU" },
    tableTitle: "THE K8 TPU 建议打印参数",
    sourceImage: "images/0027.jpg",
    columns: ["参数", "近程", "远程"],
    rows,
    productTitleMatch: true,
    warnings: [],
    ...overrides,
  };
}

function row(name, near, far = near) {
  return {
    name,
    cells: [
      { column: "近程", value: near },
      { column: "远程", value: far },
    ],
  };
}

const k8TargetWithK7ParameterTableFixture = {
  targetProduct: "THE K8 TPU 95A",
  parameterTableProduct: "THE K7 TPU 64D",
  parameterTables: {
    tables: [{
      sourceImage: "images/0027.jpg",
      tableType: "printing_parameter",
      productLine: "THE K8 TPU 95A",
      productTitle: "THE K7 TPU 64D",
      materialType: "TPU",
      representativeModel: "THE K7 TPU 64D 建议打印参数",
      rows: [
        { name: "喷嘴温度", canonicalKey: "nozzleTemperature", value: "210-230°C" },
        { name: "底板温度", canonicalKey: "bedTemperature", value: "50-80°C" },
        { name: "打印速度", canonicalKey: "printingSpeed", value: "20-50mm/s" },
      ],
    }],
  },
};

test("a valid structured table creates canonical candidates and evidence", () => {
  const result = enrichParameterTables(table([
    row("喷嘴温度", "220℃"),
    row("打印速度", "40-80 mm/s"),
  ]), { productLineId: "kexcelled-k8-tpu" });

  assert.equal(result.candidates.length, 2);
  assert.equal(result.evidence.length, 2);
  assert.deepEqual(result.candidates.map((item) => item.canonicalKey), [
    "nozzleTemperature",
    "printingSpeed",
  ]);
  assert.deepEqual(fieldsAcceptedFromCandidates(result.candidates), {
    nozzleTemperature: "220 °C",
    printingSpeed: "40-80 mm/s",
  });
  assert.ok(result.candidates.every((item) => (
    item.evidenceId
    && item.extractionMethod === "structured_parameter_table"
    && item.sourceFile === "images/0027.jpg"
    && item.trusted === true
    && item.publicVisible === true
  )));
});

test("empty cells and slash placeholders are skipped", () => {
  const result = enrichParameterTables(table([
    row("腔体温度", "/", "／"),
    row("喷嘴温度", "", " "),
  ]));
  assert.equal(result.candidates.length, 0);
  assert.equal(result.evidence.length, 0);
});

test("unknown rows remain review candidates and never enter fields", () => {
  const result = enrichParameterTables(table([
    row("供应商自定义指标", "10 foo"),
  ]));
  assert.equal(result.candidates[0].canonicalKey, null);
  assert.equal(result.candidates[0].reviewStatus, "candidate");
  assert.equal(result.candidates[0].trusted, false);
  assert.deepEqual(fieldsAcceptedFromCandidates(result.candidates), {});
  assert.equal(result.requiresManualReview, true);
  assert.match(result.warnings.join("\n"), /UNMAPPED_PARAMETER/);
});

test("conflicting table values are retained for review and do not replace an existing value", () => {
  const enrichment = enrichParameterTables(table([
    row("喷嘴温度", "220℃", "240℃"),
  ]));
  assert.equal(enrichment.candidates[0].reviewStatus, "conflict");
  assert.equal(enrichment.candidates[0].trusted, false);

  const existing = [{
    field: "nozzleTemperature",
    canonicalKey: "nozzleTemperature",
    normalizedValue: "210",
    unit: "°C",
    reviewStatus: "official",
    trusted: true,
  }];
  const merged = mergeParameterCandidates(existing, enrichment.candidates);
  assert.equal(merged.candidates.length, 2);
  assert.equal(merged.candidates[0].normalizedValue, "210");
  assert.ok(merged.candidates.every((candidate) => (
    candidate.reviewStatus === "conflict"
    && candidate.trusted === false
    && candidate.publicVisible === false
  )));
  assert.equal(merged.requiresManualReview, true);
  assert.match(merged.warnings.join("\n"), /PARAMETER_CONFLICT/);
  assert.deepEqual(fieldsAcceptedFromCandidates(merged.candidates), {});
});

test("different nozzle temperatures from spec and print tables retain two candidates and evidence", () => {
  const enrichment = enrichParameterTables([
    table([row("喷嘴温度", "240-260℃")], {
      tableTitle: "ABS 规格表",
      sourceImage: "images/spec-table.jpg",
    }),
    table([row("喷嘴温度", "240-270℃")], {
      tableTitle: "ABS 建议打印参数",
      sourceImage: "images/print-table.jpg",
    }),
  ], { productLineId: "kexcelled-k8-abs" });
  const merged = mergeParameterCandidates([], enrichment.candidates);
  const sourceEvidence = parameterSourceEvidence(merged.candidates, enrichment.evidence);

  assert.equal(merged.candidates.length, 2);
  assert.equal(merged.conflicts.length, 1);
  assert.equal(merged.conflicts[0].field, "nozzleTemperature");
  assert.deepEqual(merged.conflicts[0].values, ["240-260 °C", "240-270 °C"]);
  assert.ok(merged.candidates.every((candidate) => (
    candidate.reviewStatus === "conflict"
    && candidate.trusted === false
    && candidate.publicVisible === false
  )));
  assert.deepEqual(fieldsAcceptedFromCandidates(merged.candidates), {});
  assert.equal(sourceEvidence.length, 2);
  assert.deepEqual(sourceEvidence.map((item) => item.sourceRelativePath).sort(), [
    "images/print-table.jpg",
    "images/spec-table.jpg",
  ]);
});

test("equivalent canonical values from OCR and a structured table merge without label candidates", () => {
  const ocrCandidate = {
    field: "nozzleTemperature",
    canonicalKey: "nozzleTemperature",
    rawValue: "200°C-240°C",
    normalizedValue: "200–240",
    unit: "°C",
    officialRawName: "喷嘴温度°C",
    sourceFile: "images/0073.png",
    sourceText: "喷嘴温度°C 200°C-240°C",
    evidenceId: "ocr-print-table-1",
    reviewStatus: "official",
    trusted: true,
    publicVisible: true,
  };
  const structuredCandidate = {
    field: "nozzleTemperature",
    canonicalKey: "nozzleTemperature",
    rawValue: "200°C-240°C",
    normalizedValue: "200-240",
    unit: "°C",
    officialRawName: "喷嘴温度",
    sourceFile: "images/0073.png",
    sourceText: "喷嘴温度: 值=200°C-240°C",
    evidenceId: "structured-parameter-table-1-1",
    extractionMethod: "structured_parameter_table",
    reviewStatus: "official",
    trusted: true,
    publicVisible: true,
  };

  const merged = mergeParameterCandidates([ocrCandidate], [structuredCandidate]);
  assert.equal(merged.candidates.length, 1);
  assert.equal(merged.conflicts.length, 0);
  assert.equal(merged.candidates[0].canonicalKey, "nozzleTemperature");
  assert.equal(merged.candidates[0].normalizedValue, "200-240");
  assert.equal(merged.candidates[0].unit, "°C");
  assert.deepEqual(merged.candidates[0].officialRawNames.sort(), ["喷嘴温度", "喷嘴温度°C"].sort());
  assert.deepEqual(merged.candidates[0].evidenceIds.sort(), [
    "ocr-print-table-1",
    "structured-parameter-table-1-1",
  ].sort());
  assert.ok(!merged.candidates.some((candidate) => candidate.field === "喷嘴温度"));
});

test("a combined drying row creates temperature and duration candidates with one resolvable evidence record", () => {
  const result = enrichParameterTables(table([
    row("烘干温度", "50°C，6-8小时"),
  ], {
    currentProductTitle: "THE K5 PLA M",
    parameterTable: { productTitle: "THE K5 PLA M" },
    tableTitle: "THE K5 PLA M 建议打印参数",
    sourceImage: "images/0073.png",
  }), { productLineId: "kexcelled-k5-pla-m" });

  assert.equal(result.candidates.length, 2);
  assert.deepEqual(result.candidates.map((candidate) => ({
    key: candidate.canonicalKey,
    value: candidate.normalizedValue,
    unit: candidate.unit,
  })), [
    { key: "dryingTemperature", value: "50", unit: "°C" },
    { key: "dryingTime", value: "6–8", unit: "h" },
  ]);
  assert.equal(result.evidence.length, 1);
  assert.deepEqual(result.evidence[0].fieldBindings, ["dryingTemperature", "dryingTime"]);
  assert.ok(result.candidates.every((candidate) => candidate.evidenceId === result.evidence[0].evidenceId));
});

test("a title mismatch blocks trusted fields but preserves review evidence", () => {
  const result = enrichParameterTables(table([
    row("喷嘴温度", "220℃"),
  ], {
    tableTitle: "TPU K7 建议打印参数",
    productTitleMatch: false,
    warnings: ["商品标题与参数表标题不一致"],
  }));
  assert.equal(result.candidates[0].reviewStatus, "candidate");
  assert.equal(result.candidates[0].trusted, false);
  assert.deepEqual(fieldsAcceptedFromCandidates(result.candidates), {});
  assert.equal(result.evidence.length, 1);
  assert.equal(result.requiresManualReview, true);
});

test("K8 TPU target retains K7 table evidence without trusting or silently overriding it", () => {
  const adapted = adaptParameterTablesInput(k8TargetWithK7ParameterTableFixture.parameterTables);
  assert.equal(adapted[0].currentProductTitle, k8TargetWithK7ParameterTableFixture.targetProduct);
  assert.match(adapted[0].tableTitle, /K7 TPU 64D/);
  assert.equal(adapted[0].productTitleMatch, false);

  const result = enrichParameterTables(adapted, { productLineId: "kexcelled-k8-tpu" });
  assert.equal(result.candidates.length, 3);
  assert.equal(result.evidence.length, 3);
  assert.ok(result.candidates.every((candidate) => (
    candidate.trusted === false
    && candidate.publicVisible === false
    && candidate.reviewStatus === "candidate"
  )));
  assert.ok(result.evidence.every((evidence) => (
    evidence.productTitleMatch === false
    && evidence.sourceRelativePath === "images/0027.jpg"
  )));
  assert.deepEqual(fieldsAcceptedFromCandidates(result.candidates), {});

  const existing = [{
    field: "nozzleTemperature",
    canonicalKey: "nozzleTemperature",
    normalizedValue: "205",
    unit: "°C",
    reviewStatus: "official",
    trusted: true,
  }];
  const merged = mergeParameterCandidates(existing, result.candidates);
  assert.equal(merged.candidates.length, 4);
  assert.equal(merged.candidates[0].normalizedValue, "205");
  assert.equal(merged.candidates[0].reviewStatus, "conflict");
  assert.ok(merged.candidates.every((candidate) => candidate.trusted === false));
  assert.equal(merged.requiresManualReview, true);
  assert.match(merged.warnings.join("\n"), /PARAMETER_CONFLICT:nozzleTemperature/);
  assert.deepEqual(fieldsAcceptedFromCandidates(merged.candidates), {});
});

test("standard input cannot forge productTitleMatch when product titles disagree", () => {
  const adapted = adaptParameterTablesInput([table([
    row("喷嘴温度", "220℃"),
  ], {
    currentProductTitle: "THE K8 TPU 95A",
    parameterTable: { productTitle: "THE K7 TPU 64D" },
    productTitleMatch: true,
    warnings: [],
  })]);

  assert.equal(adapted[0].productTitleMatch, false);
  assert.match(adapted[0].warnings.join("\n"), /不一致或无法确认/);

  const result = enrichParameterTables(adapted, { productLineId: "kexcelled-k8-tpu" });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.evidence.length, 1);
  assert.equal(result.candidates[0].trusted, false);
  assert.equal(result.candidates[0].publicVisible, false);
  assert.equal(result.candidates[0].reviewStatus, "candidate");
  assert.deepEqual(fieldsAcceptedFromCandidates(result.candidates), {});
  assert.equal(result.requiresManualReview, true);
});

test("printer representative model does not block a matching filament material identity", () => {
  const adapted = adaptParameterTablesInput({
    tables: [{
      sourceImage: "images/printing-table.jpg",
      tableType: "printing_parameter",
      productLine: "THE K8 TPU",
      productTitle: "TPU",
      materialType: "TPU",
      representativeModel: "Raise 3D E2",
      rows: [
        { name: "喷嘴温度", value: "220℃" },
      ],
    }],
  }, { currentProductTitle: "THE K8 TPU", materialType: "TPU" });

  assert.equal(adapted[0].productTitleMatch, true);
  const result = enrichParameterTables(adapted, { productLineId: "kexcelled-k8-tpu" });
  assert.deepEqual(fieldsAcceptedFromCandidates(result.candidates), {
    nozzleTemperature: "220 °C",
  });
  assert.equal(result.evidence[0].representativeModel, "Raise 3D E2");
});

test("a different filament product remains candidate-only even with a printer model", () => {
  const adapted = adaptParameterTablesInput({
    tables: [{
      sourceImage: "images/printing-table.jpg",
      tableType: "printing_parameter",
      productLine: "THE K7 TPU",
      productTitle: "THE K7 TPU",
      materialType: "TPU",
      representativeModel: "Raise 3D E2",
      rows: [
        { name: "喷嘴温度", value: "220℃" },
      ],
    }],
  }, { currentProductTitle: "THE K8 TPU", materialType: "TPU" });

  const result = enrichParameterTables(adapted, { productLineId: "kexcelled-k8-tpu" });
  assert.equal(adapted[0].productTitleMatch, false);
  assert.equal(result.candidates[0].trusted, false);
  assert.equal(result.candidates[0].publicVisible, false);
  assert.deepEqual(fieldsAcceptedFromCandidates(result.candidates), {});
});

test("Vision-generated K8 target with a K7 parameter table remains candidate-only", () => {
  const adapted = adaptParameterTablesInput({
    tables: [{
      sourceImage: "images/0027.jpg",
      tableType: "printing_parameter",
      productLine: "THE K8 TPU",
      productTitle: "THE K7 TPU",
      materialType: "TPU",
      representativeModel: "Raise 3D E2",
      rows: [
        { name: "喷嘴温度", value: "220℃" },
        { name: "打印速度", value: "20-50mm/s" },
      ],
    }],
  }, { currentProductTitle: "THE K8 TPU", materialType: "TPU" });

  const result = enrichParameterTables(adapted, { productLineId: "kexcelled-k8-tpu" });
  assert.equal(adapted[0].productTitleMatch, false);
  assert.equal(result.candidates.length, 2);
  assert.ok(result.candidates.every((candidate) => (
    candidate.trusted === false
    && candidate.publicVisible === false
    && candidate.reviewStatus === "candidate"
  )));
  assert.deepEqual(fieldsAcceptedFromCandidates(result.candidates), {});
  assert.equal(result.requiresManualReview, true);
  assert.equal(result.evidence[0].representativeModel, "Raise 3D E2");
});

test("a printer model without filament identity remains candidate-only for manual review", () => {
  const adapted = adaptParameterTablesInput({
    tables: [{
      sourceImage: "images/printing-table.jpg",
      tableType: "printing_parameter",
      representativeModel: "Raise 3D E2",
      rows: [
        { name: "喷嘴温度", value: "220℃" },
      ],
    }],
  }, { currentProductTitle: "THE K8 TPU", materialType: "TPU" });

  const result = enrichParameterTables(adapted, { productLineId: "kexcelled-k8-tpu" });
  assert.equal(adapted[0].productTitleMatch, false);
  assert.equal(result.candidates[0].reviewStatus, "candidate");
  assert.equal(result.requiresManualReview, true);
  assert.deepEqual(fieldsAcceptedFromCandidates(result.candidates), {});
  assert.equal(result.evidence[0].representativeModel, "Raise 3D E2");
});

test("legacy Evidence ZIPs without parameter-tables.json keep an empty enrichment", () => {
  assert.deepEqual(enrichParameterTables(null), {
    candidates: [],
    evidence: [],
    warnings: [],
    requiresManualReview: false,
  });
});

test("malformed structured input is rejected before candidate generation", () => {
  assert.throws(
    () => enrichParameterTables({ schemaVersion: "parameter-tables.v1", rows: [] }),
    ParameterEnrichmentError,
  );
});

test("OCR wrapper format converts to the standard schema and enriches safely", () => {
  const adapted = adaptParameterTablesInput({
    tables: [{
      sourceImage: "images/0027.jpg",
      tableType: "printing_parameter",
      productLine: "THE K8 TPU",
      representativeModel: "Raise 3D E2 / TPU K7 85A",
      productTitle: "THE K7 TPU 85A",
      materialType: "TPU",
      rows: [
        { name: "喷嘴温度", canonicalKey: "nozzleTemperature", value: "210-230°C" },
        { name: "底板温度", canonicalKey: "bedTemperature", value: "50-80°C" },
        { name: "打印速度", canonicalKey: "printingSpeed", value: "20-50mm/s" },
        { name: "冷却风扇", canonicalKey: "fanSpeed", value: "100%" },
        { name: "烘干温度", canonicalKey: "dryingTemperature", value: "70°C/2h" },
        { name: "喷嘴口径", canonicalKey: "nozzleDiameter", value: "0.4mm及以上" },
        { name: "回抽距离", canonicalKey: "retractionDistance", value: "0.4-2mm" },
        { name: "回抽速度", canonicalKey: "retractionSpeed", value: "30-70mm/s" },
        { name: "底板材质", canonicalKey: "bedSurface", value: "玻璃平台 / PC平台" },
      ],
    }],
  });

  assert.equal(adapted[0].schemaVersion, "parameter-tables.v1");
  assert.equal(adapted[0].sourceImage, "images/0027.jpg");
  assert.deepEqual(adapted[0].rows[0].cells, [{ column: "值", value: "210-230°C" }]);
  assert.equal(adapted[0].productTitleMatch, false);

  const result = enrichParameterTables(adapted, { productLineId: "kexcelled-k8-tpu" });
  assert.equal(result.candidates.length, 10);
  assert.equal(result.evidence.length, 9);
  assert.deepEqual(result.candidates.map((item) => item.canonicalKey), [
    "nozzleTemperature",
    "bedTemperature",
    "printingSpeed",
    "coolingFan",
    "dryingTemperature",
    "dryingTime",
    "nozzleDiameter",
    "retractionDistance",
    "retractionSpeed",
    "buildPlateSurface",
  ]);
  assert.deepEqual(fieldsAcceptedFromCandidates(result.candidates), {});
  assert.equal(result.requiresManualReview, true);
});

test("build-fip keeps legacy ZIP compatibility and optionally merges a structured table", () => {
  const root = mkdtempSync(join(tmpdir(), "parameter-enrichment-test-"));
  try {
    const catalogRoot = join(root, "catalog");
    mkdirSync(catalogRoot);
    const commonFiles = {
      "capture.json": strToU8(JSON.stringify({
        productIdentity: { brand: "KEXCELLED", productLine: "THE K8 PLA", material: "PLA" },
      })),
      "page.meta.json": strToU8(JSON.stringify({
        savedAt: "2026-07-29T00:00:00.000Z",
        url: "https://example.test/product",
        userProvidedProductName: "KEXCELLED THE K8 PLA",
        ocrImagesCompleted: 0,
      })),
      "parameter-evidence.json": strToU8("[]"),
      "color-mappings.json": strToU8(JSON.stringify([{
        skuId: "BLK",
        officialColorCode: "BLK",
        colorName: "黑色",
        sourceText: "THE K8 PLA-1.75-BLK-1KG",
        imagePath: "images/color.jpg",
        imageStatus: "available",
        confidence: "high",
      }])),
      "images.json": strToU8(JSON.stringify([{
        id: "color",
        localPath: "images/color.jpg",
        pageSection: "sku_option",
        discoveredFrom: ["color_mapping"],
        sizeBytes: 3,
      }])),
      "images/color.jpg": new Uint8Array([1, 2, 3]),
    };

    const build = (name, parameterTables = null) => {
      const input = join(root, `${name}.zip`);
      const output = join(root, `${name}.filament-import.zip`);
      const files = parameterTables
        ? { ...commonFiles, "parameter-tables.json": strToU8(JSON.stringify(parameterTables)) }
        : commonFiles;
      writeFileSync(input, zipSync(files));
      const run = spawnSync(process.execPath, [
        fileURLToPath(new URL("./build-fip.mjs", import.meta.url)),
        "--input", input,
        "--output", output,
        "--catalog-root", catalogRoot,
      ], { encoding: "utf8" });
      assert.equal(run.status, 0, run.stderr || run.stdout);
      const fip = unzipSync(new Uint8Array(readFileSync(output)));
      return JSON.parse(strFromU8(fip["parameter-candidates.json"]));
    };

    const legacy = build("legacy");
    assert.deepEqual(legacy.map((item) => item.canonicalKey).sort(), [
      "filamentDiameter",
      "materialType",
      "netWeight",
    ]);

    const enriched = build("enriched", table([row("喷嘴温度", "220℃")]));
    assert.deepEqual(enriched.map((item) => item.canonicalKey).sort(), [
      "filamentDiameter",
      "materialType",
      "netWeight",
      "nozzleTemperature",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
