# Language QA Plan

Date: 2026-06-14

## Audit Findings

| Severity | Location | Finding | Suggested Fix |
| --- | --- | --- | --- |
| High | `app/layout.tsx` | All routes render `<html lang="en">`, including `/zh-cn` and `/zh-tw`. | Make document language route-aware. |
| High | `components/ToolSeoContent.tsx` + `data/tools.json` | Localized `whatIsThis` and `howTo` blocks can render both English and Chinese on English tool pages. | Make SEO content locale-aware and render only the active language. |
| Medium | `components/SiteHeader.tsx` | Chinese pages show English nav labels: Tools, Site Map, Dark. | Localize shared header labels and paths. |
| Medium | `components/SiteFooter.tsx` | Chinese pages show English footer labels: About, Privacy, Terms, Contact, Site Map, XML Sitemap. | Localize shared footer labels and localized paths. |
| Medium | `LocalizedToolPageContent.tsx` | 3D tool localization uses DOM text replacement for many labels. | Move toward explicit copy dictionaries or locale props per shared field. |
| Low | 3D tool components | Several components accept `locale` but do not use it directly. | Either use locale directly or remove unused props after localization is centralized. |

No remaining instances of the historical bad terms `细胞`, `活性细胞`, `模特尺寸`, `像素敲击`, or `排泄塔` were found in `app`, `components`, `data`, or `lib`.

## Zero-Tolerance Language Gate

Block release when any of these are true:

1. A `/zh-cn` page emits `<html lang="en">` or uses primarily Traditional Chinese.
2. A `/zh-tw` page emits `<html lang="en">` or uses primarily Simplified Chinese.
3. English pages show Chinese user-facing text outside intentional bilingual tools.
4. Chinese pages contain visible placeholder messages such as "coming soon", "preparing", "正在准备中", "待上线", or "占位".
5. Tool names, H1, title, and description describe a different function than the component actually provides.
6. Sensitive or private user input is included in analytics events.
7. Known forbidden terms reappear: `细胞`, `活性细胞`, `模特尺寸`, `像素敲击`, `排泄塔`.

## Automated Checks

Add a read-only validation script that checks:

- `data/tools.json` slug uniqueness and required fields.
- Localized slugs exist in both zh-cn and zh-tw maps.
- Chinese route HTML language is correct after build.
- English pages do not include CJK text unless the tool is explicitly bilingual.
- Chinese pages do not include obvious English chrome labels when localized replacements exist.
- Forbidden glossary terms are absent.
- Buttons such as Calculate/Clear/Copy/Download have localized equivalents on localized pages.
- Tool metadata title/description/H1 match the same slug and tool name.
- All localized static pages have `metadata.title`, `metadata.description`, canonical, and alternates.

## Manual Review Rules

For each localized page, review:

- H1, title, description, primary CTA, empty states, errors, result labels, copy/download labels.
- Whether terminology follows the glossary and natural local usage.
- Whether the result explanation matches actual calculations.
- Whether tool-specific notes avoid legal or safety overpromising.
- Whether English fallback is acceptable for the current release scope.

## Suggested Glossary Additions

| English | Simplified Chinese | Traditional Chinese |
| --- | --- | --- |
| build plate | 打印平台 | 列印平台 |
| slicer | 切片软件 | 切片軟體 |
| filament | 耗材 | 線材 / 耗材 |
| nozzle | 喷嘴 | 噴嘴 |
| layer height | 层高 | 層高 |
| line width | 线宽 | 線寬 |
| wall loops | 墙层数 | 牆層數 |
| infill | 填充率 | 填充率 |
| support material | 支撑材料 | 支撐材料 |
| volumetric flow | 体积流量 | 體積流量 |
| download | 下载 | 下載 |
| copy result | 复制结果 | 複製結果 |
| clear | 清空 | 清除 |

## Rollout Strategy

1. Fix shared page chrome first: `lang`, header, footer, sitemap labels.
2. Stop rendering inactive-language SEO blocks.
3. Add automatic language linting for forbidden terms and placeholders.
4. Localize top 20 tools by traffic or business value with explicit copy dictionaries.
5. Require a language QA checklist for every new localized tool.
