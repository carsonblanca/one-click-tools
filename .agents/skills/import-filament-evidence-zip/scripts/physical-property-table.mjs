function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedIdentity(value) {
  return text(value).toUpperCase().replace(/[™®\s]/g, "").replace(/[^A-Z0-9]/g, "");
}

export function productIdentityAliases(productLine) {
  const tokens = text(productLine)
    .toUpperCase()
    .replace(/[™®]/g, " ")
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  const withoutArticle = tokens[0] === "THE" ? tokens.slice(1) : tokens;
  const aliases = new Set([
    normalizedIdentity(productLine),
    withoutArticle.join(""),
  ]);
  if (withoutArticle.length >= 2) {
    aliases.add([
      withoutArticle[1],
      withoutArticle[0],
      ...withoutArticle.slice(2),
    ].join(""));
  }
  return [...aliases].filter((alias) => alias.length >= 5);
}

export function isOfficialPhysicalPropertyTable(tableText, productLine) {
  const normalizedTable = normalizedIdentity(tableText);
  const identityMatches = productIdentityAliases(productLine)
    .some((alias) => normalizedTable.includes(alias));
  if (!identityMatches) return false;
  return /基本物性指标/.test(tableText)
    || (/密度/.test(tableText) && /测试标准/.test(tableText));
}

export function selectOfficialPhysicalPropertyTable(tables, productLine) {
  const matches = tables.filter((table) => (
    isOfficialPhysicalPropertyTable(text(table?.text), productLine)
  ));
  if (matches.length > 1) {
    throw new Error(`Ambiguous official specification tables for ${productLine}: found ${matches.length}`);
  }
  return matches[0] || null;
}

const PHYSICAL_PROPERTIES = [
  ["density", /^密度/, "g/cm³", "密度", /ISO\s*1183/i],
  ["meltFlowIndex", /^熔融指数/, "g/10min", "熔融指数", /ISO\s*1133/i],
  ["heatDeflectionTemperature", /^热变形温度/, "°C", "热变形温度", /ISO\s*75\b/i],
  ["vicatSofteningTemperature", /^维卡软化温度/, "°C", "维卡软化温度", /ISO\s*306\b/i],
  ["tensileStrength", /^拉伸强度/, "MPa", "拉伸强度", /ISO\s*527\b/i],
  ["elongationAtBreak", /^拉伸断裂伸长率/, "%", "拉伸断裂伸长率", /ISO\s*527\b/i],
  ["flexuralStrength", /^弯曲强度/, "MPa", "弯曲强度", /ISO\s*178\b/i],
  ["flexuralModulus", /^弯曲模量/, "MPa", "弯曲模量", /ISO\s*178\b/i],
  ["unnotchedImpactStrength", /^无缺口冲击强度/, "kJ/m²", "无缺口冲击强度", /ISO\s*179\b/i],
  ["notchedImpactStrength", /^缺口冲击强度/, "kJ/m²", "缺口冲击强度", /ISO\s*179\b/i],
];

function normalizedRange(value) {
  return text(value)
    .replace(/[~～—−-]/g, "–")
    .replace(/\s*–\s*/g, "–");
}

function numericValue(sourceText, rawName) {
  const withoutName = sourceText.replace(rawName, "");
  const withoutUnit = withoutName
    .replace(/[（(][^）)]*(?:g\/cm|g\/10|min|°?C|MPa|KJ|kJ|m2|m²|%)[^）)]*[）)]/gi, " ")
    .replace(/\bISO\s*\d+\b/gi, " ");
  const range = withoutUnit.match(/(\d+(?:\.\d+)?)\s*[~～\-–—−]\s*(\d+(?:\.\d+)?)/);
  if (range) return `${range[1]}–${range[2]}`;
  return withoutUnit.match(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$)/)?.[1] || "";
}

function conditionFor(field, lines, standard) {
  const conditions = [];
  if (standard) conditions.push(standard);
  if (field === "meltFlowIndex") {
    const condition = lines.find((line) => /230\s*°?C/.test(line) && /2\.16\s*kg/i.test(line));
    if (condition) conditions.push(condition.replace(/^测试条件[：:]?\s*/, ""));
  }
  if (field === "heatDeflectionTemperature") {
    const condition = lines.find((line) => /0\.45\s*MPa/i.test(line) && /120\s*°?C\s*\/\s*h/i.test(line));
    if (condition) conditions.push(condition.replace(/^测试条件[：:]?\s*/, ""));
  }
  if (field === "vicatSofteningTemperature") {
    const condition = lines.find((line) => /10\s*N/i.test(line) && /120\s*°?C\s*\/\s*h/i.test(line));
    if (condition) conditions.push(condition.replace(/^测试条件[：:]?\s*/, ""));
  }
  return conditions.join("; ") || null;
}

export function parseOfficialPhysicalProperties(tableText) {
  const lines = text(tableText).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const result = [];
  for (const [canonicalKey, pattern, unit, rawName, standardPattern] of PHYSICAL_PROPERTIES) {
    const index = lines.findIndex((line) => pattern.test(line));
    if (index < 0) continue;
    const fragments = [lines[index]];
    let normalizedValue = numericValue(fragments.join(" "), rawName);
    if (!normalizedValue && index + 1 < lines.length && !PHYSICAL_PROPERTIES.some(([, nextPattern]) => nextPattern.test(lines[index + 1]))) {
      fragments.push(lines[index + 1]);
      normalizedValue = numericValue(fragments.join(" "), rawName);
    }
    if (!normalizedValue) continue;
    const standard = lines.map((line) => line.match(standardPattern)?.[0]).find(Boolean) || "";
    const sourceText = [
      fragments.join(" "),
      ...(standard ? [`测试标准 ${standard}`] : []),
    ].join(" | ");
    result.push({
      canonicalKey,
      officialRawName: rawName,
      normalizedValue: normalizedRange(normalizedValue),
      unit,
      sourceText,
      testCondition: conditionFor(canonicalKey, lines, standard),
    });
  }
  return result;
}
