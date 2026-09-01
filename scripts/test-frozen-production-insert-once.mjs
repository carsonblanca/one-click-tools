import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  FROZEN_ABS_EXECUTABLE_PAYLOAD_SHA256,
  FROZEN_ABS_EXECUTE_HEADER_VALUE,
  mayExecuteFrozenProductionInsert,
} = await jiti.import("../lib/filaments/imports/frozen-production-insert-once.ts");
const { frozenAbsExecutablePayloadRaw } = await jiti.import("../lib/filaments/imports/frozen-production-executable-payload.ts");

const humanAdmin = { actorId: "admin", actorType: "human", role: "admin", sessionId: "test", expiresAt: 9_999_999_999 };

assert.equal(FROZEN_ABS_EXECUTABLE_PAYLOAD_SHA256, "6c84f89bec83e38bbf40387185f1d112a4d9c14fad62ce55d9faf2e1d2444d97");
assert.equal(FROZEN_ABS_EXECUTE_HEADER_VALUE, "confirm-frozen-abs-insert-only");
assert.equal(mayExecuteFrozenProductionInsert(null), false);
assert.equal(mayExecuteFrozenProductionInsert({ ...humanAdmin, actorType: "service" }), false);
assert.equal(mayExecuteFrozenProductionInsert({ ...humanAdmin, role: "codex" }), false);
assert.equal(mayExecuteFrozenProductionInsert(humanAdmin), true);
assert.equal(frozenAbsExecutablePayloadRaw().length > 0, true);

console.log("frozen production insert-once guards: PASS");
