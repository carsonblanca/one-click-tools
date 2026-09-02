#!/usr/bin/env node

import assert from "node:assert/strict";
import { sourceRunIdForProduct } from "../lib/filaments/imports/generic-fip.ts";

const base = "capture-r3d-sample-abc123";
const ids = [0, 1, 2, 3, 4].map((index) => sourceRunIdForProduct(base, index));

assert.equal(new Set(ids).size, 5);
assert.deepEqual(ids, [
  "capture-r3d-sample-abc123::product-0",
  "capture-r3d-sample-abc123::product-1",
  "capture-r3d-sample-abc123::product-2",
  "capture-r3d-sample-abc123::product-3",
  "capture-r3d-sample-abc123::product-4",
]);
assert.ok(ids.every((id) => id.startsWith(`${base}::product-`)));
console.log("generic multi-product draft identity tests passed");
