import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { strToU8, zipSync } from "fflate";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
    const base = join(root, specifier.slice(2));
    const resolved = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]
      .find((candidate) => existsSync(candidate));
    return resolved
      ? { url: pathToFileURL(resolved).href, shortCircuit: true }
      : nextResolve(specifier, context);
  },
});

const parameters = await import("../lib/filaments/parameters/normalized-parameters.ts");
const fip = await import("../lib/filaments/imports/kexcelled-fip.ts");

const officialRoomTemperature = {
  canonicalKey: "chamberTemperature",
  field: "chamberTemperature",
  rawValue: "室温",
  normalizedValue: "室温",
  unit: "",
  reviewStatus: "official",
  trusted: true,
};

assert.equal(parameters.resolveParameterCandidate({
  rawLabel: "腔室温度",
  rawValue: "室温",
  spatialRelation: "clear",
  productContextMatched: true,
}).canonicalKey, "chamberTemperature");
assert.equal(parameters.resolveParameterCandidate({
  rawLabel: "",
  rawValue: "220 °C",
  spatialRelation: "clear",
  productContextMatched: true,
}).canonicalKey, null, "temperature units alone must not select a field");
assert.equal(parameters.resolveParameterCandidate({
  rawLabel: "底板温度",
  rawValue: "30–60",
  spatialRelation: "clear",
  productContextMatched: true,
}).canonicalKey, "bedTemperature");
assert.equal(parameters.validateCanonicalParameterValue("printingSpeed", "40–100").valid, true);
assert.deepEqual(
  fip.projectKexcelledFipParameters([officialRoomTemperature], { chamberTemperature: "室温" }).fields,
  { chamberTemperature: "室温" },
);
assert.throws(
  () => fip.projectKexcelledFipParameters([officialRoomTemperature], { chamberTemperature: "50 °C" }),
  (error) => error instanceof fip.FipValidationError && error.details.includes("changed=chamberTemperature"),
);

function packageBytes({
  version = parameters.FILAMENT_PARAMETER_SCHEMA_VERSION,
  schemaKeys = parameters.FILAMENT_CANONICAL_PARAMETER_KEYS,
  candidates = [officialRoomTemperature],
  fields = { chamberTemperature: "室温" },
} = {}) {
  const definitions = schemaKeys.map((canonicalKey) => ({ canonicalKey }));
  const files = {
    "manifest.json": { brand: "KEXCELLED", sourceRunId: "test-run", parameterSchemaVersion: version },
    "products.json": [{ productLine: "THE K5™ PLA", productKey: "kexcelled-k5-pla" }],
    "evidence.json": [],
    "package-report.json": {},
    "parameter-candidates.json": candidates,
    "parameter-schema.json": { schemaVersion: version, definitions },
    "parameter-coverage.json": { schemaVersion: version, fields: [] },
    "draft-patch.json": { parameters: { parameterSchemaVersion: version, fields } },
  };
  return zipSync(Object.fromEntries(Object.entries(files).map(([name, value]) => [
    name,
    strToU8(JSON.stringify(value)),
  ])));
}

const parsed = fip.parseKexcelledFip(packageBytes());
assert.equal(parsed.manifest.parameterSchemaVersion, parameters.FILAMENT_PARAMETER_SCHEMA_VERSION);
assert.deepEqual(parsed.expectedParameterFields, { chamberTemperature: "室温" });
assert.throws(
  () => fip.parseKexcelledFip(packageBytes({ version: "oneclick.filament-parameters.v0" })),
  (error) => error instanceof fip.FipValidationError && error.message.includes("版本不兼容"),
);
assert.throws(
  () => fip.parseKexcelledFip(packageBytes({
    candidates: [{ ...officialRoomTemperature, canonicalKey: "futureUnknownField" }],
    fields: { futureUnknownField: "1" },
  })),
  (error) => error instanceof fip.FipValidationError && error.details.includes("futureUnknownField"),
);

for (const packagePath of process.argv.slice(2)) {
  const productionParsed = fip.parseKexcelledFip(new Uint8Array(readFileSync(packagePath)));
  fip.projectKexcelledFipParameters(
    productionParsed.parameters,
    productionParsed.expectedParameterFields,
  );
}

console.log("filament parameter pipeline v1 tests passed");
