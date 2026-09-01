import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  hasAdminSessionCookie,
  isHumanAdminSession,
  isSessionDiagnosticEnvironment,
  sessionDiagnosticPayload,
} = await jiti.import("../lib/admin/session-diagnostic.ts");

const humanAdmin = {
  actorId: "bootstrap-admin:test",
  actorType: "human",
  role: "admin",
  sessionId: "session-test",
  expiresAt: 9_999_999_999,
};

assert.equal(isSessionDiagnosticEnvironment("preview"), true);
assert.equal(isSessionDiagnosticEnvironment("production"), true);
assert.equal(isSessionDiagnosticEnvironment("development"), false);
assert.equal(hasAdminSessionCookie("foo=bar; oneclick_admin_session=redacted"), true);
assert.equal(hasAdminSessionCookie("foo=bar"), false);
assert.equal(hasAdminSessionCookie(null), false);
assert.equal(isHumanAdminSession(null), false);
assert.equal(isHumanAdminSession({ ...humanAdmin, actorType: "service" }), false);
assert.equal(isHumanAdminSession(humanAdmin), true);
assert.deepEqual(sessionDiagnosticPayload(true, null), {
  cookieNamePresent: true,
  sessionValid: false,
});
assert.deepEqual(sessionDiagnosticPayload(true, humanAdmin), {
  cookieNamePresent: true,
  sessionValid: true,
  actorType: "human",
  role: "admin",
  actorIdPresent: true,
});

console.log("session diagnostic guards: PASS");
