import assert from "node:assert/strict";
import test from "node:test";
import {
  isOfficialPhysicalPropertyTable,
  parseOfficialPhysicalProperties,
  selectOfficialPhysicalPropertyTable,
} from "./physical-property-table.mjs";

const productLine = "THE K5 PLA P";
const physicalTableText = `
基本物性指标
Basic Physical Property Index
PLA K5P 打印件 注塑件 测试标准
密度（g/cm3） 1.24 ISO 1183
熔融指数（g/10min）*1 7-15 ISO 1133
热变形温度（°C）*2 57 ISO 75
维卡软化温度（°C）*3 ISO 306
拉伸强度（MPa） 46-48 ISO 527
拉伸断裂伸长率（%） 22-40
弯曲强度（MPa） 72-78 ISO 178
弯曲模量（MPa） 2613-2797
无缺口冲击强度
（KJ/m2） 20-26
缺口冲击强度 ISO 179
（KJ/m2） 2-5
测试条件：温度（T）=230°C；质量（m）=2.16kg
测试条件：弯曲应力=0.45MPa；升温速率=120°C/h
测试条件：负荷=10N；升温速率=120°C/h
`;

test("unprocessed Vision result can be selected as the official physical-property table", () => {
  const selected = selectOfficialPhysicalPropertyTable([
    { sourcePath: "images/table.jpg", text: physicalTableText },
  ], productLine);
  assert.equal(selected.sourcePath, "images/table.jpg");
});

test("product identity must match the physical-property table", () => {
  assert.equal(isOfficialPhysicalPropertyTable(physicalTableText, "THE K8 PC"), false);
});

test("physical-property heading or density plus test standard is required", () => {
  assert.equal(isOfficialPhysicalPropertyTable("PLA K5P 密度 1.24", productLine), false);
  assert.equal(isOfficialPhysicalPropertyTable("PLA K5P 密度 1.24 测试标准 ISO 1183", productLine), true);
});

test("nine evidenced physical properties retain values and units", () => {
  const properties = parseOfficialPhysicalProperties(physicalTableText);
  assert.deepEqual(
    Object.fromEntries(properties.map((item) => [
      item.canonicalKey,
      `${item.normalizedValue} ${item.unit}`,
    ])),
    {
      density: "1.24 g/cm³",
      meltFlowIndex: "7–15 g/10min",
      heatDeflectionTemperature: "57 °C",
      tensileStrength: "46–48 MPa",
      elongationAtBreak: "22–40 %",
      flexuralStrength: "72–78 MPa",
      flexuralModulus: "2613–2797 MPa",
      unnotchedImpactStrength: "20–26 kJ/m²",
      notchedImpactStrength: "2–5 kJ/m²",
    },
  );
});

test("test standards and source evidence are retained for every property", () => {
  const properties = parseOfficialPhysicalProperties(physicalTableText);
  assert.equal(properties.length, 9);
  for (const property of properties) {
    assert.ok(property.sourceText);
    assert.match(property.sourceText, /测试标准 ISO\s*\d+/i);
    assert.match(property.testCondition, /ISO\s*\d+/i);
  }
  assert.match(
    properties.find((item) => item.canonicalKey === "meltFlowIndex").testCondition,
    /230°C.*2\.16kg/,
  );
});

test("multi-SKU image is not mistaken for a physical-property table", () => {
  assert.equal(isOfficialPhysicalPropertyTable(
    "PLA K5P 线径 重量 公差 1.75 mm 1 kg ±0.03 mm",
    productLine,
  ), false);
});

test("marketing speed image is not mistaken for a physical-property table", () => {
  assert.equal(isOfficialPhysicalPropertyTable(
    "PLA K5P 高速打印 100-300 mm/s",
    productLine,
  ), false);
});

test("zero matching table remains missing", () => {
  assert.equal(selectOfficialPhysicalPropertyTable([], productLine), null);
});

test("multiple matching tables are rejected as ambiguous", () => {
  assert.throws(
    () => selectOfficialPhysicalPropertyTable([
      { sourcePath: "images/a.jpg", text: physicalTableText },
      { sourcePath: "images/b.jpg", text: physicalTableText },
    ], productLine),
    /Ambiguous official specification tables/,
  );
});
