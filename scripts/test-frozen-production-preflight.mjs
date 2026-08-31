import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS,
  frozenProductionParentStrategy,
  mayReadFrozenProductionPreflight,
} = await jiti.import("../lib/filaments/imports/frozen-production-preflight.ts");

const humanAdmin = { actorId: "admin", actorType: "human", role: "admin", sessionId: "test", expiresAt: 9_999_999_999 };

assert.equal(FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS.length, 4);
assert.equal(new Set(FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS.map((target) => target.sourceRunId)).size, 4);
assert.equal(new Set(FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS.map((target) => target.draftKey)).size, 4);
assert.equal(new Set(FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS.map((target) => target.parentImportId)).size, 4);
assert.equal(mayReadFrozenProductionPreflight(null), false);
assert.equal(mayReadFrozenProductionPreflight({ ...humanAdmin, actorType: "service" }), false);
assert.equal(mayReadFrozenProductionPreflight({ ...humanAdmin, role: "codex" }), false);
assert.equal(mayReadFrozenProductionPreflight(humanAdmin), true);
assert.equal(frozenProductionParentStrategy({ sourceRunCollisionCount: 0, parentIdCollisionCount: 0 }), "insert_new_parent_per_source");
assert.equal(frozenProductionParentStrategy({ sourceRunCollisionCount: 1, parentIdCollisionCount: 0 }), "blocked_existing_parent_collision");
assert.equal(frozenProductionParentStrategy({ sourceRunCollisionCount: 0, parentIdCollisionCount: 1 }), "blocked_existing_parent_collision");

console.log("frozen production preflight guards: PASS");
