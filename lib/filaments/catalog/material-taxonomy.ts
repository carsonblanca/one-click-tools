import type { CatalogRecord } from "./mock-catalog-ext";
import type { Locale } from "@/lib/i18n";

export type CatalogTaxonomyMetadata = {
  materialId: string;
  subtypeId: string;
  labelZh: string;
  labelEn: string;
  sortOrder: number;
  enabled: boolean;
};

export type MaterialTaxonomyOption = {
  id: string;
  label: string;
  materialType: string;
  count: number;
  sortOrder: number;
  subtypes: Array<{
    id: string;
    label: string;
    count: number;
    sortOrder: number;
  }>;
};

function stableMaterialId(materialType: string) {
  return `material:${materialType.trim().toLocaleLowerCase("en-US")}`;
}

function slug(value: string) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function legacySubtypeDefaults(input: {
  materialType: string;
  productKey: string;
  productLine: string;
  variant: string;
}) {
  const probe = `${input.productKey} ${input.productLine} ${input.variant}`.toLocaleLowerCase("en-US");
  const exactVariant = input.variant.trim().toLocaleLowerCase("en-US");
  const rules = [
    { match: exactVariant === "m" || /(?:^|[-\s])matte(?:$|[-\s])/.test(probe), id: "matte", zh: "哑光", en: "Matte", order: 20 },
    { match: /silk/.test(probe), id: "silk", zh: "丝绸", en: "Silk", order: 30 },
    { match: /(?:cf10|carbon[ -]?fiber|(?:^|[-\s])cf(?:$|[-\s]))/.test(probe), id: "carbon-fiber-reinforced", zh: "碳纤增强", en: "Carbon Fiber Reinforced", order: 40 },
    { match: exactVariant === "p" || /metallic/.test(probe), id: "metallic", zh: "金属质感", en: "Metallic", order: 50 },
    { match: exactVariant === "cc" || /glow/.test(probe), id: "glow", zh: "夜光", en: "Glow", order: 60 },
    { match: /sparkle/.test(probe), id: "sparkle", zh: "闪耀", en: "Sparkle", order: 70 },
    { match: /magic|marble/.test(probe), id: "magic", zh: "魔幻", en: "Magic", order: 80 },
    { match: exactVariant === "" || /standard|basic/.test(probe), id: "standard", zh: "标准", en: "Standard", order: 10 },
  ];
  const matched = rules.find((rule) => rule.match);
  const fallbackId = slug(input.variant) || slug(input.productLine) || slug(input.productKey) || "other";
  return matched || { id: fallbackId, zh: input.variant || input.productLine, en: input.variant || input.productLine, order: 10_000 };
}

function finiteSortOrder(value: unknown, fallback = 10_000) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getCatalogTaxonomy(record: CatalogRecord): CatalogTaxonomyMetadata {
  const source = record.taxonomy;
  const productKey = record.productLineId || record.id.split("?")[0];
  const materialId = source?.materialId || stableMaterialId(record.materialType);
  const legacy = legacySubtypeDefaults({
    materialType: record.materialType,
    productKey,
    productLine: record.productLine,
    variant: record.variant,
  });
  return {
    materialId,
    subtypeId: source?.subtypeId || `subtype:${materialId}:${legacy.id}`,
    labelZh: source?.labelZh || record.variantZh || legacy.zh,
    labelEn: source?.labelEn || record.variant || legacy.en,
    sortOrder: finiteSortOrder(source?.sortOrder, legacy.order),
    enabled: source?.enabled !== false,
  };
}

function localizedLabel(metadata: CatalogTaxonomyMetadata, locale: Locale) {
  return locale === "en" ? metadata.labelEn : metadata.labelZh;
}

/**
 * Build both material and subtype filters from the records emitted by the
 * published catalog mapper. No display label participates in filter identity.
 */
export function buildMaterialTaxonomy(records: CatalogRecord[], locale: Locale): MaterialTaxonomyOption[] {
  const materials = new Map<string, MaterialTaxonomyOption & { subtypeMap: Map<string, MaterialTaxonomyOption["subtypes"][number]> }>();

  records.forEach((record, index) => {
    const metadata = getCatalogTaxonomy(record);
    if (!metadata.enabled) return;
    const existing = materials.get(metadata.materialId);
    const material = existing || {
      id: metadata.materialId,
      label: locale === "en" ? record.materialType : record.materialTypeZh || record.materialType,
      materialType: record.materialType,
      count: 0,
      sortOrder: index,
      subtypes: [],
      subtypeMap: new Map(),
    };
    material.count += 1;

    const subtype = material.subtypeMap.get(metadata.subtypeId) || {
      id: metadata.subtypeId,
      label: localizedLabel(metadata, locale),
      count: 0,
      sortOrder: metadata.sortOrder,
    };
    subtype.count += 1;
    subtype.sortOrder = Math.min(subtype.sortOrder, metadata.sortOrder);
    material.subtypeMap.set(metadata.subtypeId, subtype);
    if (!existing) materials.set(metadata.materialId, material);
  });

  return [...materials.values()]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label, locale))
    .map(({ subtypeMap, ...material }) => ({
      ...material,
      subtypes: [...subtypeMap.values()]
        .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label, locale)),
    }));
}

export function recordMatchesTaxonomy(record: CatalogRecord, materialId: string | null, subtypeId: string | null) {
  const metadata = getCatalogTaxonomy(record);
  if (!metadata.enabled) return false;
  if (materialId && metadata.materialId !== materialId) return false;
  if (subtypeId && metadata.subtypeId !== subtypeId) return false;
  return true;
}
