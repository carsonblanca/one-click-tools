import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const toolsPath = path.join(root, "data/tools.json");
const toolClientPath = path.join(root, "app/tools/[slug]/tool-client.tsx");
const localizedContentPath = path.join(root, "lib/localizedContent.ts");

const requiredFields = [
  "name",
  "slug",
  "tag",
  "category",
  "categorySlug",
  "desc",
  "description",
];

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const cjkPattern = /[\u3400-\u9fff]/;
const pixelKnockSlug = "pixel-knock-board-generator";
const pixelKnockOnlyTerms = [
  /Pixel Knock/i,
  /敲豆豆/,
  /敲敲乐/,
  /拼豆/,
  /像素图板/,
  /像素圖板/,
];

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function addError(errors, message) {
  errors.push(message);
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
}

function collectLocalizedValues(value, values = []) {
  if (!value || typeof value !== "object") {
    return values;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if ((key === "zh" || key === "zh-cn" || key === "zh-tw") && typeof nestedValue === "string") {
      values.push(nestedValue);
    } else if (Array.isArray(nestedValue)) {
      nestedValue.forEach((item) => {
        if (typeof item === "string" && (key === "zh" || key === "zh-cn" || key === "zh-tw")) {
          values.push(item);
        }
      });
    } else if (nestedValue && typeof nestedValue === "object") {
      collectLocalizedValues(nestedValue, values);
    }
  }

  return values;
}

function parseToolClient() {
  const source = readText(toolClientPath);
  const importMap = new Map();
  const imports = source.matchAll(
    /import\s+(\w+)\s+from\s+"\.\.\/\.\.\/\.\.\/components\/tools\/([^"]+)";/g,
  );

  for (const match of imports) {
    importMap.set(match[1], `components/tools/${match[2]}.tsx`);
  }

  const registrations = new Map();
  const registrationMatches = source.matchAll(
    /if\s*\(\s*slug\s*===\s*"([^"]+)"\s*\)\s*return\s*<(\w+)/g,
  );

  for (const match of registrationMatches) {
    registrations.set(match[1], {
      componentName: match[2],
      componentPath: importMap.get(match[2]) || "",
    });
  }

  return { registrations, source };
}

function main() {
  const errors = [];
  const tools = JSON.parse(readText(toolsPath));
  const localizedContent = readText(localizedContentPath);
  const { registrations } = parseToolClient();

  if (!Array.isArray(tools)) {
    throw new Error("data/tools.json must contain an array.");
  }

  const slugCounts = new Map();
  const nameCounts = new Map();
  const descriptionCounts = new Map();
  const urls = new Set();
  const metadataSlugs = new Set();

  for (const tool of tools) {
    const slug = String(tool.slug || "");
    metadataSlugs.add(slug);
    slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
    nameCounts.set(tool.name, (nameCounts.get(tool.name) || 0) + 1);
    descriptionCounts.set(
      tool.description,
      (descriptionCounts.get(tool.description) || 0) + 1,
    );

    for (const field of requiredFields) {
      if (typeof tool[field] !== "string" || tool[field].trim() === "") {
        addError(errors, `${slug || "(missing slug)"} has empty required field: ${field}`);
      }
    }

    if (!slugPattern.test(slug)) {
      addError(errors, `${slug || "(missing slug)"} is not lowercase hyphenated.`);
    }

    for (const field of ["name", "tag", "category", "desc", "description"]) {
      if (typeof tool[field] === "string" && cjkPattern.test(tool[field])) {
        addError(errors, `${slug} has CJK characters in English SEO field: ${field}`);
      }
    }

    const url = `/tools/${slug}`;
    if (urls.has(url)) {
      addError(errors, `${slug} generates a duplicate URL: ${url}`);
    }
    urls.add(url);

    const registration = registrations.get(slug);
    if (!registration) {
      addError(errors, `${slug} is missing a tool-client registration.`);
    } else if (!registration.componentPath) {
      addError(errors, `${slug} registration component import could not be resolved.`);
    } else if (!fs.existsSync(path.join(root, registration.componentPath))) {
      addError(errors, `${slug} registered component file does not exist: ${registration.componentPath}`);
    }

    const serializedTool = JSON.stringify(tool);
    if (slug !== pixelKnockSlug && pixelKnockOnlyTerms.some((term) => term.test(serializedTool))) {
      addError(errors, `${slug} contains Pixel Knock-specific content.`);
    }

    for (const value of collectLocalizedValues(tool)) {
      if (value.trim() === "") {
        addError(errors, `${slug} has an empty localized Chinese value.`);
      }
    }
  }

  for (const [slug, count] of slugCounts) {
    if (count > 1) {
      addError(errors, `${slug} appears ${count} times in data/tools.json.`);
    }
  }

  for (const [name, count] of nameCounts) {
    if (count > 1) {
      addError(errors, `Tool name "${name}" appears ${count} times.`);
    }
  }

  for (const [description, count] of descriptionCounts) {
    if (count > 1) {
      addError(errors, `Tool description "${description}" appears ${count} times.`);
    }
  }

  for (const slug of registrations.keys()) {
    if (!metadataSlugs.has(slug)) {
      addError(errors, `${slug} is registered in tool-client but missing from data/tools.json.`);
    }
  }

  for (const slug of normalizeArray([...localizedContent.matchAll(/slug:\s*"([^"]+)"/g)]).map((match) => match[1])) {
    if (!metadataSlugs.has(slug)) {
      addError(errors, `Localized content references unknown slug: ${slug}`);
    }
  }

  if (errors.length > 0) {
    console.error("Tool validation failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`Tool validation passed: ${tools.length} tools, ${registrations.size} registrations.`);
}

main();
