export type BrandStatus = "active" | "inactive" | "archived";

export type BrandFormValues = {
  brandId: string;
  slug: string;
  name: string;
  nameZh: string;
  nameEn: string;
  nameZhTw?: string;
  aliasesText?: string;
  logoUrl?: string;
  websiteUrl?: string;
  origin?: string;
  contactInfo?: string;
  officialStoreUrl?: string;
  officialStoreName?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  status: BrandStatus;
  sortOrder: number;
};

export type BrandFormMode = "create" | "edit";

export type BrandFormErrors = Partial<Record<keyof BrandFormValues, string>>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function createEmptyBrandFormValues(): BrandFormValues {
  return {
    brandId: "",
    slug: "",
    name: "",
    nameZh: "",
    nameEn: "",
    nameZhTw: "",
    logoUrl: "",
    websiteUrl: "",
    origin: "",
    contactInfo: "",
    officialStoreUrl: "",
    officialStoreName: "",
    description: "",
    seoTitle: "",
    seoDescription: "",
    status: "active",
    sortOrder: 0,
  };
}

export function generateSlugSuggestion(nameEn: string): string {
  return nameEn
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function validateBrandForm(values: BrandFormValues): BrandFormErrors {
  const errors: BrandFormErrors = {};

  const brandId = values.brandId?.trim() || "";
  if (!brandId) {
    errors.brandId = "品牌 ID 为必填项。";
  } else if (!SLUG_PATTERN.test(brandId)) {
    errors.brandId = "品牌 ID 只能包含小写英文字母、数字和连字符。";
  }

  const slug = values.slug?.trim() || "";
  if (!slug) {
    errors.slug = "slug 为必填项。";
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug = "slug 只能包含小写英文字母、数字和连字符。";
  }

  if (!values.name?.trim()) {
    errors.name = "默认名称为必填项。";
  }

  if (!values.nameZh?.trim()) {
    errors.nameZh = "简体中文名为必填项。";
  }

  if (!values.nameEn?.trim()) {
    errors.nameEn = "英文名为必填项。";
  }

  const logoUrl = values.logoUrl?.trim();
  if (logoUrl && !isValidHttpUrl(logoUrl)) {
    errors.logoUrl = "请输入合法的 http:// 或 https:// URL。";
  }

  const websiteUrl = values.websiteUrl?.trim();
  if (websiteUrl && !isValidHttpUrl(websiteUrl)) {
    errors.websiteUrl = "请输入合法的 http:// 或 https:// URL。";
  }

  const officialStoreUrl = values.officialStoreUrl?.trim();
  if (officialStoreUrl && !isValidHttpUrl(officialStoreUrl)) {
    errors.officialStoreUrl = "请输入合法的 http:// 或 https:// URL。";
  }

  if (values.sortOrder === undefined || values.sortOrder === null) {
    errors.sortOrder = "排序值为必填项。";
  } else if (!Number.isInteger(values.sortOrder)) {
    errors.sortOrder = "排序值必须是整数。";
  }

  return errors;
}
