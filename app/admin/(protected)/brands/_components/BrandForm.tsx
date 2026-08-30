"use client";

import { useCallback, useState } from "react";
import type {
  BrandFormErrors,
  BrandFormMode,
  BrandFormValues,
} from "@/lib/filaments/brand-form-types";
import {
  generateSlugSuggestion,
  validateBrandForm,
} from "@/lib/filaments/brand-form-types";

type BrandFormProps = {
  mode: BrandFormMode;
  initialValues: BrandFormValues;
  onSubmit: (values: BrandFormValues) => void | Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  submitLabel?: string;
};

function inputClassName(error?: string) {
  return `w-full rounded border px-2 py-1.5 text-sm ${
    error
      ? "border-red-300 focus:border-red-500 focus:outline-red-500"
      : "border-slate-300 focus:border-cyan-500 focus:outline-cyan-500"
  }`;
}

function labelClassName(required?: boolean) {
  return `text-sm text-slate-600 ${required ? "font-medium" : ""}`;
}

export default function BrandForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  disabled = false,
  submitLabel = mode === "create" ? "保存品牌" : "保存修改",
}: BrandFormProps) {
  const [values, setValues] = useState<BrandFormValues>(initialValues);
  const [errors, setErrors] = useState<BrandFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = useCallback(
    <K extends keyof BrandFormValues>(field: K, value: BrandFormValues[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [],
  );

  const handleSuggestSlug = useCallback(() => {
    const suggestion = generateSlugSuggestion(values.nameEn || values.name || "");
    if (suggestion) {
      updateField("slug", suggestion);
    }
  }, [values.nameEn, values.name, updateField]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (disabled || submitting) return;

      const trimmed: BrandFormValues = {
        ...values,
        brandId: values.brandId.trim(),
        slug: values.slug.trim(),
        name: values.name.trim(),
        nameZh: values.nameZh.trim(),
        nameEn: values.nameEn.trim(),
        nameZhTw: values.nameZhTw?.trim(),
        aliasesText: values.aliasesText?.trim(),
        logoUrl: values.logoUrl?.trim(),
        websiteUrl: values.websiteUrl?.trim(),
        origin: values.origin?.trim(),
        contactInfo: values.contactInfo?.trim(),
        officialStoreUrl: values.officialStoreUrl?.trim(),
        officialStoreName: values.officialStoreName?.trim(),
        description: values.description?.trim(),
        seoTitle: values.seoTitle?.trim(),
        seoDescription: values.seoDescription?.trim(),
      };

      const validationErrors = validateBrandForm(trimmed);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setErrors({});
      setSubmitting(true);
      try {
        await onSubmit(trimmed);
      } finally {
        setSubmitting(false);
      }
    },
    [disabled, submitting, values, onSubmit],
  );

type FieldConfig = {
  key: keyof BrandFormValues;
  label: string;
  required: boolean;
  placeholder: string;
};

type SectionConfig = {
  title: string;
  fields: FieldConfig[];
};

const sections: SectionConfig[] = [
  {
    title: "基础资料",
    fields: [
      { key: "brandId", label: "品牌 ID", required: true, placeholder: "例如 kexcelled" },
      { key: "slug", label: "slug", required: true, placeholder: "URL 路径标识" },
      { key: "name", label: "默认名称", required: true, placeholder: "品牌默认显示名称" },
      { key: "nameZh", label: "简体中文名", required: true, placeholder: "品牌中文名" },
      { key: "nameEn", label: "英文名", required: true, placeholder: "品牌英文名" },
      { key: "nameZhTw", label: "繁体中文名", required: false, placeholder: "品牌繁体中文名" },
      { key: "aliasesText", label: "别名（逗号分隔）", required: false, placeholder: "例如 拓竹, Bambu" },
    ],
  },
  {
    title: "品牌资产",
    fields: [
      { key: "logoUrl", label: "Logo URL", required: false, placeholder: "https://..." },
      { key: "websiteUrl", label: "官方网站", required: false, placeholder: "https://..." },
      { key: "origin", label: "产地", required: false, placeholder: "例如 中国大陆 / 江苏苏州" },
      { key: "officialStoreName", label: "官方旗舰店名称", required: false, placeholder: "官方旗舰店" },
      { key: "officialStoreUrl", label: "官方旗舰店地址", required: false, placeholder: "https://..." },
      { key: "contactInfo", label: "官方联系方式", required: false, placeholder: "客服入口或公开联系方式" },
    ],
  },
  {
    title: "内容",
    fields: [{ key: "description", label: "品牌描述", required: false, placeholder: "品牌简介" }],
  },
  {
    title: "SEO",
    fields: [
      { key: "seoTitle", label: "SEO 标题", required: false, placeholder: "SEO 标题" },
      { key: "seoDescription", label: "SEO 描述", required: false, placeholder: "SEO 描述" },
    ],
  },
];

  function renderTextInput(
    key: keyof BrandFormValues,
    label: string,
    required: boolean,
    placeholder: string,
    extra?: React.ReactNode,
  ) {
    const value = values[key];
    const error = errors[key];
    const isTextArea = key === "description" || key === "seoDescription";
    const isNumber = key === "sortOrder";

    return (
      <label key={String(key)} className="block">
        <span className={labelClassName(required)}>
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </span>
        <div className="mt-1 flex items-start gap-2">
          {isTextArea ? (
            <textarea
              className={`${inputClassName(error)} min-h-[5rem]`}
              value={typeof value === "string" ? value : ""}
              placeholder={placeholder}
              disabled={disabled || submitting}
              onChange={(event) => updateField(key, event.target.value)}
            />
          ) : (
            <input
              type={isNumber ? "number" : "text"}
              className={inputClassName(error)}
              value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
              placeholder={placeholder}
              disabled={disabled || submitting || (mode === "edit" && key === "brandId")}
              onChange={(event) =>
                updateField(
                  key,
                  isNumber ? Number(event.target.value) : event.target.value,
                )
              }
            />
          )}
          {extra}
        </div>
        {key === "seoTitle" || key === "seoDescription" ? (
          <span className="mt-1 block text-xs text-slate-400">
            {String(values[key] || "").length} 字符
          </span>
        ) : null}
        {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
      </label>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {sections.map((section) => (
        <section key={section.title} className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">{section.title}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {section.fields.map((field) =>
              renderTextInput(
                field.key,
                field.label,
                field.required,
                field.placeholder,
                field.key === "slug" ? (
                  <button
                    type="button"
                    disabled={disabled || submitting || !values.nameEn}
                    onClick={handleSuggestSlug}
                    className="shrink-0 rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    根据英文名生成
                  </button>
                ) : undefined,
              ),
            )}
          </div>
        </section>
      ))}

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">管理</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className={labelClassName(true)}>
              状态
              <span className="text-red-500"> *</span>
            </span>
            <select
              className={inputClassName(errors.status)}
              value={values.status}
              disabled={disabled || submitting}
              onChange={(event) =>
                updateField("status", event.target.value as BrandFormValues["status"])
              }
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="archived">archived</option>
            </select>
            {errors.status ? <span className="mt-1 block text-xs text-red-600">{errors.status}</span> : null}
          </label>

          {renderTextInput("sortOrder", "排序值", true, "0")}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {onCancel ? (
          <button
            type="button"
            disabled={disabled || submitting}
            onClick={onCancel}
            className="rounded border border-slate-300 px-5 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            取消
          </button>
        ) : null}
        <button
          type="submit"
          disabled={disabled || submitting}
          className="rounded bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-50"
        >
          {submitting ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
