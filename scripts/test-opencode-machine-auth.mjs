import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { authenticateOpenCodeBearer } from "../lib/admin/machine-auth.ts";
import { hasAdminScope } from "../lib/admin/permissions.ts";

const token = "unit-test-opencode-token";
const tokenHash = createHash("sha256").update(token).digest("hex");
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("machine authentication is disabled without a configured hash", () => {
  assert.deepEqual(authenticateOpenCodeBearer(`Bearer ${token}`, undefined), {
    status: "disabled",
    session: null,
  });
});

test("missing authorization is unauthenticated", () => {
  assert.deepEqual(authenticateOpenCodeBearer(null, tokenHash), {
    status: "missing",
    session: null,
  });
});

test("incorrect bearer token is rejected", () => {
  assert.equal(authenticateOpenCodeBearer("Bearer wrong-token", tokenHash).status, "invalid");
});

test("correct bearer token maps only to the opencode service role", () => {
  const result = authenticateOpenCodeBearer(`Bearer ${token}`, tokenHash);
  assert.equal(result.status, "authenticated");
  assert.equal(result.session.role, "opencode");
  assert.equal(result.session.actorType, "service");
  assert.equal(result.session.actorId, "machine:opencode");
});

test("non-Bearer authorization is rejected", () => {
  assert.equal(authenticateOpenCodeBearer(`Basic ${token}`, tokenHash).status, "invalid");
});

test("authentication result never contains the token or configured hash", () => {
  const serialized = JSON.stringify(authenticateOpenCodeBearer(`Bearer ${token}`, tokenHash));
  assert.equal(serialized.includes(token), false);
  assert.equal(serialized.includes(tokenHash), false);
});

test("token verification uses SHA-256 and timing-safe comparison", () => {
  const source = read("lib/admin/machine-auth.ts");
  assert.match(source, /createHash\("sha256"\)/);
  assert.match(source, /timingSafeEqual\(actual, expected\)/);
  assert.doesNotMatch(source, /token\s*===\s*expected/);
});

test("opencode can read filament imports and drafts", () => {
  assert.equal(hasAdminScope("opencode", "candidate.view"), true);
});

test("opencode can create compliant imports and drafts", () => {
  assert.equal(hasAdminScope("opencode", "candidate.create"), true);
  assert.equal(hasAdminScope("opencode", "display.draft.create"), true);
});

test("opencode can update existing drafts", () => {
  assert.equal(hasAdminScope("opencode", "display.draft.edit"), true);
});

test("opencode cannot publish", () => {
  assert.equal(hasAdminScope("opencode", "publish.execute"), false);
});

test("opencode cannot delete or archive", () => {
  assert.equal(hasAdminScope("opencode", "archive.execute"), false);
});

test("opencode cannot manage accounts, roles, or tokens", () => {
  assert.equal(hasAdminScope("opencode", "account.create"), false);
  assert.equal(hasAdminScope("opencode", "role.manage"), false);
  assert.equal(hasAdminScope("opencode", "token.create"), false);
});

test("filament routes distinguish unauthenticated and forbidden access", () => {
  const routes = [
    read("app/api/admin/filament-import/kexcelled-evidence/route.ts"),
    read("app/api/admin/filament-drafts/[sourceRunId]/route.ts"),
    read("app/api/admin/filament-drafts/batch-publish/route.ts"),
    read("app/api/admin/filament-import/kexcelled-evidence/[sourceRunId]/route.ts"),
  ];
  for (const route of routes) {
    assert.match(route, /readAdminApiSession/);
    assert.match(route, /status:\s*401|UNAUTHORIZED",\s*401/);
    assert.match(route, /status:\s*403|FORBIDDEN/);
  }
});

test("draft PATCH no longer excludes the existing opencode role", () => {
  const route = read("app/api/admin/filament-drafts/[sourceRunId]/route.ts");
  assert.match(route, /hasAdminScope\(session\.role,\s*"display\.draft\.edit"\)/);
  assert.doesNotMatch(route, /session\.role !== "codex"/);
});

test("publish and delete retain their existing restrictive scopes", () => {
  const publishRoute = read("app/api/admin/filament-drafts/batch-publish/route.ts");
  const deleteRoute = read("app/api/admin/filament-import/kexcelled-evidence/[sourceRunId]/route.ts");
  assert.match(publishRoute, /"publish\.execute"/);
  assert.match(publishRoute, /session\.role !== "admin"/);
  assert.match(deleteRoute, /"archive\.execute"/);
});

test("browser session fallback remains in the unified API helper", () => {
  const source = read("lib/admin/auth.ts");
  assert.match(source, /if \(authorization\)/);
  assert.match(source, /return readAdminSession\(\)/);
});

test("machine authentication is not enabled for unrelated admin routes", () => {
  const unrelatedRoute = read("app/api/admin/auth/logout/route.ts");
  assert.doesNotMatch(unrelatedRoute, /readAdminApiSession|authenticateOpenCodeBearer/);
});

test("the import runner reads Keychain credentials in memory and sends Bearer auth", () => {
  const source = read(".agents/skills/import-filament-evidence-zip/scripts/run-import.mjs");
  assert.match(source, /security[\s\S]*find-generic-password[\s\S]*-w/);
  assert.match(source, /Authorization: `Bearer \$\{token\}`/);
  assert.doesNotMatch(source, /writeFileSync\([^)]*token/);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^)]*token/);
});
