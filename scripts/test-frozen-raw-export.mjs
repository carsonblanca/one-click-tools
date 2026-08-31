import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  FROZEN_ABS_SOURCE_RUN_IDS,
  frozenAssetObjectKeys,
  frozenRawExportEnabled,
  mayReadFrozenRawExport,
} = await jiti.import("../lib/filaments/imports/frozen-raw-export.ts");

const allowed = [...FROZEN_ABS_SOURCE_RUN_IDS][0];
const humanAdmin = { actorId: "admin", actorType: "human", role: "admin", sessionId: "test", expiresAt: 9_999_999_999 };

assert.equal(frozenRawExportEnabled({ VERCEL_ENV: "production" }), false);
assert.equal(mayReadFrozenRawExport(null, allowed, { VERCEL_ENV: "preview" }), false);
assert.equal(mayReadFrozenRawExport({ ...humanAdmin, actorType: "service" }, allowed, { VERCEL_ENV: "preview" }), false);
assert.equal(mayReadFrozenRawExport(humanAdmin, "not-allowlisted", { VERCEL_ENV: "preview" }), false);
assert.equal(mayReadFrozenRawExport(humanAdmin, allowed, { VERCEL_ENV: "preview" }), true);
assert.deepEqual(frozenAssetObjectKeys({ a: "filament-imports/kexcelled/id/assets/a.webp", b: ["ignored", { c: "filament-imports/kexcelled/id/assets/a.webp", d: "filament-imports/kexcelled/id/assets/b.webp" }] }), ["filament-imports/kexcelled/id/assets/a.webp", "filament-imports/kexcelled/id/assets/b.webp"]);

console.log("frozen raw export guards: PASS");
