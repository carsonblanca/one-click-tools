import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CatalogRecord } from "./mock-catalog-ext";
import {
  getCatalogColorCards,
  getCatalogOfficialColorCount,
  getCatalogProductLineCount,
  splitPublishedParameters,
  PRINT_PARAMETER_KEYS,
} from "./catalog-view-model";
import { getParameterDefinition } from "../parameters/normalized-parameters";

function createColor(): CatalogRecord["color"] {
  return {
    colorNameZh: "颜色",
    colorNameEn: "Color",
    colorFamily: "gray",
    hex: "#808080",
    rgb: { r: 128, g: 128, b: 128 },
    finish: "matte",
    transparency: "opaque",
    hasDigitalSwatch: true,
    hasPhysicalSwatch: false,
    physicalSwatchCount: 0,
    digitalSwatch: {
      hex: "#808080",
      rgb: { r: 128, g: 128, b: 128 },
      officialColorCode: "CODE",
      sourceType: "manufacturer",
      lastVerifiedAt: "2026-07-11",
    },
    physicalSwatches: [],
  };
}

function createMockRecord(
  id: string,
  productLineId: string,
  colorNameZh: string,
  officialColorCode: string,
  overrides?: Partial<CatalogRecord>,
): CatalogRecord {
  return {
    id,
    brand: "Kexcelled",
    brandZh: "Kexcelled",
    materialType: "PETG",
    materialTypeZh: "PETG",
    variant: "Matte",
    variantZh: "哑光",
    productLine: productLineId,
    productLineId,
    parameterStatus: "complete",
    color: {
      ...createColor(),
      colorNameZh,
      digitalSwatch: { ...createColor().digitalSwatch!, officialColorCode },
    },
    spool: {
      netFilamentWeight: 1000,
      emptySpoolWeight: null,
      fullSpoolWeight: null,
      spoolOuterDiameter: null,
      spoolWidth: null,
      hubDiameter: null,
      spoolMaterial: null,
      refillable: false,
      cardboardSpool: false,
      amsFit: "yes",
      adapterRequired: false,
      spoolImagePlaceholder: null,
    },
    rating: 0,
    reviewCount: 0,
    createdAt: "2026-07-11",
    ...overrides,
  };
}

function createPublishedColor(
  id: string,
  nameZh: string,
  officialColorCode: string,
  imageUrl: string | null,
): NonNullable<CatalogRecord["published"]>["colors"][number] {
  return {
    id,
    nameZh,
    nameEn: "",
    officialColorCode,
    imageUrl,
    color: createColor(),
  };
}

describe("getCatalogProductLineCount", () => {
  it("counts unique productLineIds", () => {
    const records = [
      createMockRecord("a", "line-a", "红", "RED"),
      createMockRecord("b", "line-a", "蓝", "BLU"),
      createMockRecord("c", "line-b", "黑", "BLK"),
    ];
    assert.equal(getCatalogProductLineCount(records), 2);
  });

  it("falls back to record.id when productLineId is missing", () => {
    const records = [
      createMockRecord("a", "", "红", "RED"),
      createMockRecord("b", "", "蓝", "BLU"),
    ];
    assert.equal(getCatalogProductLineCount(records), 2);
  });
});

describe("getCatalogOfficialColorCount", () => {
  it("sums published colors across records", () => {
    const records: CatalogRecord[] = [
      {
        ...createMockRecord("a", "line-a", "红", "RED"),
        published: {
          sourceRunId: "r1",
          publicationStatus: "published",
          parameters: [],
          colors: [
            createPublishedColor("c1", "红", "RED", null),
            createPublishedColor("c2", "蓝", "BLU", null),
          ],
          images: [],
        },
      },
      {
        ...createMockRecord("b", "line-b", "黑", "BLK"),
        published: {
          sourceRunId: "r1",
          publicationStatus: "published",
          parameters: [],
          colors: [createPublishedColor("c3", "黑", "BLK", null)],
          images: [],
        },
      },
    ];
    assert.equal(getCatalogOfficialColorCount(records), 3);
  });

  it("counts fallback primary color when published colors are missing", () => {
    const records = [
      createMockRecord("a", "line-a", "红", "RED"),
      createMockRecord("b", "line-a", "蓝", "BLU"),
    ];
    assert.equal(getCatalogOfficialColorCount(records), 2);
  });
});

describe("getCatalogColorCards", () => {
  it("expands one product line into one card per official color", () => {
    const records: CatalogRecord[] = [
      {
        ...createMockRecord("a", "kexcelled-k5-petg-m", "哑光黑色", "BLK"),
        productLine: "THE K5 PETG M",
        brand: "Kexcelled",
        materialType: "PETG",
        variant: "Matte",
        published: {
          sourceRunId: "r1",
          publicationStatus: "published",
          parameters: [],
          colors: Array.from({ length: 22 }, (_, index) =>
            createPublishedColor(
              `c${index}`,
              `颜色 ${index + 1}`,
              `CODE${index + 1}`,
              `https://example.com/spool-${index + 1}.png`,
            ),
          ),
          images: [],
        },
      },
    ];
    const cards = getCatalogColorCards(records);
    assert.equal(cards.length, 22);
    assert.equal(getCatalogProductLineCount(records), 1);
    assert.equal(getCatalogOfficialColorCount(records), 22);
    for (const card of cards) {
      assert.equal(card.productLineName, "THE K5 PETG M");
      assert.ok(card.detailUrl.startsWith("/filaments/kexcelled-k5-petg-m?color="));
      assert.ok(card.detailUrl.includes(encodeURIComponent(card.officialColorCode)));
      assert.notEqual(card.colorNameZh, card.officialColorCode);
    }
  });

  it("keeps cards without images instead of hiding them", () => {
    const records: CatalogRecord[] = [
      {
        ...createMockRecord("a", "line-a", "红", "RED"),
        published: {
          sourceRunId: "r1",
          publicationStatus: "published",
          parameters: [],
          colors: [createPublishedColor("c1", "红", "RED", null)],
          images: [],
        },
      },
    ];
    const cards = getCatalogColorCards(records);
    assert.equal(cards.length, 1);
    assert.equal(cards[0].imageUrl, null);
  });

  it("generates stable unique keys from officialColorCode or id", () => {
    const records: CatalogRecord[] = [
      {
        ...createMockRecord("a", "line-a", "红", "RED"),
        published: {
          sourceRunId: "r1",
          publicationStatus: "published",
          parameters: [],
          colors: [
            createPublishedColor("", "红", "RED", null),
            createPublishedColor("c2", "蓝", "", null),
          ],
          images: [],
        },
      },
    ];
    const cards = getCatalogColorCards(records);
    assert.equal(cards.length, 2);
    const keys = new Set(cards.map((card) => card.id));
    assert.equal(keys.size, 2);
  });
});

describe("splitPublishedParameters", () => {
  it("places exactly 10 print parameters in the recommended-print group", () => {
    const allKeys = [
      "materialType",
      "filamentDiameter",
      "netWeight",
      "density",
      "diameterTolerance",
      "meltFlowIndex",
      "nozzleTemperature",
      "nozzleDiameter",
      "bedTemperature",
      "coolingFan",
      "printingSpeed",
      "retractionDistance",
      "retractionSpeed",
      "buildPlateSurface",
      "tensileStrength",
      "elongationAtBreak",
      "impactStrength",
      "unnotchedImpactStrength",
      "notchedImpactStrength",
      "flexuralStrength",
      "flexuralModulus",
      "heatDeflectionTemperature",
      "vicatSofteningTemperature",
      "dryingTemperature",
      "dryingTime",
    ];
    const parameters = allKeys.map((key) => ({
      canonicalKey: key,
      labelZh: getParameterDefinition(key)?.zhCNLabel || key,
      value: "1",
    }));
    const { product, print } = splitPublishedParameters(parameters);
    assert.equal(product.length + print.length, allKeys.length);
    assert.equal(print.length, PRINT_PARAMETER_KEYS.size);
    for (const parameter of print) {
      assert.ok(PRINT_PARAMETER_KEYS.has(parameter.canonicalKey));
    }
    const productKeys = new Set(product.map((parameter) => parameter.canonicalKey));
    const printKeys = new Set(print.map((parameter) => parameter.canonicalKey));
    const intersection = [...productKeys].filter((key) => printKeys.has(key));
    assert.equal(intersection.length, 0);
  });

  it("groups the 24 core parameters into product and print without overlap", () => {
    const coreKeys = [
      "materialType", "filamentDiameter", "netWeight", "density", "diameterTolerance",
      "meltFlowIndex", "nozzleTemperature", "nozzleDiameter", "bedTemperature", "coolingFan",
      "printingSpeed", "retractionDistance", "retractionSpeed", "buildPlateSurface",
      "tensileStrength", "elongationAtBreak", "impactStrength", "unnotchedImpactStrength",
      "notchedImpactStrength", "flexuralStrength", "flexuralModulus", "heatDeflectionTemperature",
      "vicatSofteningTemperature", "dryingTemperature", "dryingTime",
    ];
    const parameters = coreKeys.map((key) => ({
      canonicalKey: key,
      labelZh: getParameterDefinition(key)?.zhCNLabel || key,
      value: "sample",
    }));
    const { product, print } = splitPublishedParameters(parameters);
    assert.equal(product.length + print.length, coreKeys.length);
    assert.equal(
      new Set([...product, ...print].map((parameter) => parameter.canonicalKey)).size,
      coreKeys.length,
    );
    assert.equal(print.length, 10);
    assert.equal(product.length, coreKeys.length - 10);
  });
});
