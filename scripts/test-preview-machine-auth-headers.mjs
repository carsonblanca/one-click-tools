import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMachineAuthHeaders,
  PREVIEW_BYPASS_KEYCHAIN_SERVICE,
} from "../.agents/skills/import-filament-evidence-zip/scripts/machine-auth-headers.mjs";

test("Preview machine auth sends raw bypass and OpenCode Bearer headers", () => {
  assert.equal(PREVIEW_BYPASS_KEYCHAIN_SERVICE, "one-click-tools-preview-vercel-bypass");
  assert.deepEqual(buildMachineAuthHeaders({
    baseUrl: "https://example-preview.vercel.app",
    token: "opencode-token",
    previewBypassSecret: "raw-bypass-secret",
  }), {
    Authorization: "Bearer opencode-token",
    "x-vercel-protection-bypass": "raw-bypass-secret",
  });
});

test("Preview machine auth rejects a missing bypass secret", () => {
  assert.throws(() => buildMachineAuthHeaders({
    baseUrl: "https://example-preview.vercel.app",
    token: "opencode-token",
  }), /bypass secret is required/);
});

test("non-Preview machine auth sends only the OpenCode Bearer header", () => {
  assert.deepEqual(buildMachineAuthHeaders({
    baseUrl: "https://one-click-tools.com",
    token: "opencode-token",
    previewBypassSecret: "unused-bypass-secret",
  }), {
    Authorization: "Bearer opencode-token",
  });
});
