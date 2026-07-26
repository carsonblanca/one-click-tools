import assert from "node:assert/strict";
import test from "node:test";
import { parseStructuredParameterTable } from "./structured-parameter-table.mjs";

function table(overrides = {}) {
  return {
    schemaVersion: "parameter-tables.v1",
    currentProductTitle: "KEXCELLED THE K8 TPU",
    tableTitle: "TPU K8 85A 建议打印参数",
    sourceImage: "images/parameter-table.jpg",
    columns: ["参数", "近程", "远程"],
    rows: [
      { name: "腔体温度", cells: [{ column: "近程", value: "/" }, { column: "远程", value: "/" }] },
      { name: "喷嘴温度", cells: [{ column: "近程", value: "220-240℃" }, { column: "远程", value: "230-250℃" }] },
      { name: "喷嘴口径", cells: [{ column: "近程", value: "0.4mm" }, { column: "远程", value: "0.6mm" }] },
      { name: "热床温度", cells: [{ column: "近程", value: "40-60℃" }, { column: "远程", value: "50-70℃" }] },
      { name: "冷却风扇", cells: [{ column: "近程", value: "80%" }, { column: "远程", value: "100%" }] },
      { name: "打印速度", cells: [{ column: "近程", value: "30-60mm/s" }, { column: "远程", value: "40-80mm/s" }] },
      { name: "回抽距离", cells: [{ column: "近程", value: "1mm" }, { column: "远程", value: "2mm" }] },
      { name: "回抽速度", cells: [{ column: "近程", value: "20mm/s" }, { column: "远程", value: "30mm/s" }] },
      { name: "烘干参数", cells: [{ column: "近程", value: "70℃/2h" }, { column: "远程", value: "70℃/2h" }] },
      { name: "打印平台", cells: [{ column: "近程", value: "玻璃平台、PC平台" }, { column: "远程", value: "玻璃平台、PC平台" }] },
    ],
    productTitleMatch: true,
    warnings: [],
    ...overrides,
  };
}

test("structured K8 TPU table retains near/far cell semantics", () => {
  const result = parseStructuredParameterTable(table());
  const nozzle = result.parameters.find((item) => item.canonicalKey === "nozzleTemperature");
  assert.equal(nozzle.normalizedValue, "近程: 220–240; 远程: 230–250");
  assert.equal(nozzle.unit, "°C");
});

test("drying temperature and duration are split and duplicate cells are deduplicated", () => {
  const result = parseStructuredParameterTable(table());
  assert.equal(result.parameters.find((item) => item.canonicalKey === "dryingTemperature").normalizedValue, "70");
  assert.equal(result.parameters.find((item) => item.canonicalKey === "dryingDuration").normalizedValue, "2");
});

test("PC platform maps only to buildPlateSurface", () => {
  const result = parseStructuredParameterTable(table());
  const platform = result.parameters.find((item) => item.canonicalKey === "buildPlateSurface");
  assert.equal(platform.normalizedValue, "玻璃平台、PC平台");
  assert.equal(result.parameters.filter((item) => /Temperature$/.test(item.canonicalKey)).some((item) => /PC平台/.test(item.rawValue)), false);
});

test("slash cells remain missing and unknown navigation or SKU rows are ignored", () => {
  const result = parseStructuredParameterTable(table({
    rows: [
      ...table().rows,
      { name: "首页导航", cells: [{ column: "值", value: "店铺 商品分类" }] },
      { name: "颜色SKU", cells: [{ column: "值", value: "TPU-BLK-1KG" }] },
    ],
  }));
  assert.equal(result.parameters.some((item) => item.canonicalKey === "chamberTemperature"), false);
  assert.equal(result.parameters.some((item) => /店铺|SKU/.test(item.sourceText)), false);
});

test("a real chamber temperature maps to chamberTemperature", () => {
  const result = parseStructuredParameterTable(table({
    rows: [
      { name: "腔体温度", cells: [{ column: "近程", value: "45℃" }] },
      ...table().rows.slice(1),
    ],
  }));
  const chamber = result.parameters.find((item) => item.canonicalKey === "chamberTemperature");
  assert.equal(chamber.normalizedValue, "45");
  assert.equal(chamber.unit, "°C");
});

test("identical OCR cell values are not concatenated", () => {
  const result = parseStructuredParameterTable(table({
    rows: table().rows.map((row) => row.name === "喷嘴温度"
      ? { name: row.name, cells: [{ column: "近程", value: "230℃" }, { column: "远程", value: "230℃" }] }
      : row),
  }));
  const nozzle = result.parameters.find((item) => item.canonicalKey === "nozzleTemperature");
  assert.equal(nozzle.normalizedValue, "230");
  assert.equal(nozzle.rawValue, "230℃");
});

test("product title mismatch is preserved for review", () => {
  const result = parseStructuredParameterTable(table({
    tableTitle: "TPU K7 85A 建议打印参数",
    productTitleMatch: false,
    warnings: ["商品标题与参数表标题不一致，需要人工审核。"],
  }));
  assert.equal(result.productTitleMatch, false);
  assert.match(result.warnings.join(" "), /不一致/);
});

test("the consumer independently rejects a forged title-match flag", () => {
  const result = parseStructuredParameterTable(table({
    currentProductTitle: "KEXCELLED THE K7 TPU",
    tableTitle: "TPU K7 85A 建议打印参数",
    productTitleMatch: true,
  }), { expectedProductTitle: "THE K8 TPU" });
  assert.equal(result.productTitleMatch, false);
  assert.match(result.warnings.join(" "), /identity/);
});

test("unsupported top-level fields are rejected", () => {
  assert.throws(
    () => parseStructuredParameterTable({ ...table(), flatOcrText: "not allowed" }),
    /unsupported top-level fields/,
  );
});
