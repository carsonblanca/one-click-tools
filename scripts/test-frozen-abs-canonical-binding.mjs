import assert from "node:assert/strict";
import { selectCanonicalPublishedKexcelledRows } from "../lib/filaments/catalog/frozen-abs-canonical-binding.ts";

const rows = [
  { source_run_id: "capture-20260824112444-35b30a75d3c1-1cb32773", product_line_name: "THE K5 ABS P", material_type: "ABS", variant: "P" },
  { source_run_id: "capture-20260817024719-a9870e0684e1-4b966ba9", product_line_name: "THE K5 ABS P", material_type: "ABS", variant: "P" },
  { source_run_id: "capture-20260824112412-1b922918eb3b-1a2cf768", product_line_name: "THE K5™ ABS T", material_type: "ABS", variant: "Transparent" },
  { source_run_id: "capture-20260817024438-9acb75e7a1e3-d9ed9669", product_line_name: "THE K5™ ABS T", material_type: "ABS", variant: "Transparent" },
  { source_run_id: "other", product_line_name: "THE K5™ PLA", material_type: "PLA", variant: "Basic" },
];

assert.deepEqual(selectCanonicalPublishedKexcelledRows(rows).map((row) => row.source_run_id), [
  "capture-20260817024719-a9870e0684e1-4b966ba9",
  "capture-20260817024438-9acb75e7a1e3-d9ed9669",
  "other",
]);
console.log("frozen ABS canonical binding: PASS");
