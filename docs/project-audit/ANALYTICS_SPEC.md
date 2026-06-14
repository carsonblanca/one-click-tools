# Analytics Specification Draft

Date: 2026-06-14

## Current Implementation

`components/analytics.ts` provides a safe `trackEvent(eventName, params)` wrapper for optional `window.gtag` and optional Vercel Analytics `window.va`. It strips `null` and `undefined` values and catches analytics failures.

Current explicit event usage exists only in `components/tools/PixelKnockBoardGeneratorTool.tsx`:

- `upload_image`
- `generate_preview`
- `download_project_zip`
- `download_stl_grid`
- `download_png_preview`
- `download_color_csv`
- `switch_language`
- `toggle_show_color_numbers`

## Privacy Boundaries

Never collect:

- User uploaded file content.
- File names or paths.
- Image pixels, thumbnails, text input, pasted content, URLs entered by users, tokens, or decoded payloads.
- Cookies, credentials, API keys, auth headers, or localStorage contents other than a coarse language preference state.
- Email address entered in feedback forms.
- Any value that can reasonably identify a person.

Allowed non-sensitive parameters:

- `tool_slug`
- `category`
- `locale`
- `mode`
- `success`
- `error_code`
- `duration_ms`
- `file_type` as MIME family or extension only, not name.
- `file_size_bucket` such as `<100KB`, `100KB-1MB`, `1-5MB`, `5-20MB`, `>20MB`.
- Output type such as `png`, `stl`, `csv`, `json`.
- Numeric configuration values only when they are not user content, for example grid width or selected unit.

## Standard Events

| Event | When | Required Params | Optional Params |
| --- | --- | --- | --- |
| `tool_view` | Tool page becomes visible. | `tool_slug`, `category`, `locale` | `source`, `referrer_type` |
| `tool_start` | User first interacts with a tool. | `tool_slug`, `category`, `locale` | `mode` |
| `file_selected` | User selects a local file. | `tool_slug`, `category`, `locale`, `file_type`, `file_size_bucket` | `file_count` |
| `process_start` | User starts conversion/calculation/preview. | `tool_slug`, `category`, `locale`, `mode` | `input_unit`, `output_unit` |
| `process_success` | Tool completes successfully. | `tool_slug`, `category`, `locale`, `mode`, `duration_ms` | `output_type`, `result_count`, `color_count` |
| `process_error` | Tool fails validation or processing. | `tool_slug`, `category`, `locale`, `mode`, `error_code` | `duration_ms`, `step` |
| `result_download` | User downloads a generated result. | `tool_slug`, `category`, `locale`, `output_type` | `result_count`, `duration_ms` |
| `result_copy` | User copies a result. | `tool_slug`, `category`, `locale`, `output_type` | `result_count` |
| `language_change` | User changes language. | `from_locale`, `to_locale`, `path_type` | `tool_slug`, `available` |
| `mode_change` | User changes a tool mode or option set. | `tool_slug`, `category`, `locale`, `mode` | `previous_mode` |
| `share_click` | User clicks a share action. | `tool_slug`, `category`, `locale`, `share_target` | none |
| `upgrade_click` | User clicks future upgrade/paywall CTA. | `tool_slug`, `category`, `locale`, `placement` | `plan` |

## Naming Rules

- Use snake_case for event names and params.
- Use `tool_slug`, not `tool`, for consistency.
- Use `locale` values: `en`, `zh-cn`, `zh-tw`.
- Use stable `error_code` values, not raw exception messages.
- Avoid event names tied to one tool unless the action is truly tool-specific.
- Do not fire both old and new event names after migration; alias only in reporting if needed.

## Suggested Error Codes

| Code | Meaning |
| --- | --- |
| `missing_input` | User attempted to run with no input. |
| `invalid_input` | Input failed validation. |
| `parse_error` | JSON/XML/YAML/CSV parsing failed. |
| `unsupported_file_type` | File MIME/extension is unsupported. |
| `file_too_large` | File exceeds configured local limit. |
| `canvas_error` | Browser canvas operation failed. |
| `download_error` | Blob or download creation failed. |
| `unknown_error` | Fallback for unexpected failures. |

## Weekly Metrics

- Tool views by category and locale.
- Tool start rate: `tool_start / tool_view`.
- Completion rate: `process_success / process_start`.
- Error rate by tool and error code.
- Download/copy conversion by tool.
- Language switching demand and unsupported-localized-tool attempts.
- Top tools with high starts but low success.

## 30-Day Review

- Identify top 10 tools by views and by successful completions.
- Identify tools with the highest error rate.
- Compare English vs Chinese engagement for localized tools.
- Decide which tools deserve custom SEO copy and language QA next.
- Check if any event emits too many distinct parameter values.

## 90-Day Review

- Retire or redesign tools with persistent low usage and high errors.
- Prioritize localization based on real demand.
- Add funnel tracking for future monetization only after privacy review.
- Revisit file-size buckets and duration buckets for usefulness.
- Audit analytics implementation for duplicate events.

## First Migration Slice

1. Keep existing Pixel Knock events but map them into the standard model in reporting.
2. Add shared helpers: `trackToolView`, `trackProcessStart`, `trackProcessSuccess`, `trackProcessError`, `trackDownload`, `trackCopy`.
3. Wire five priority tools: Pixel Knock, JSON Formatter, Image Compressor, CSV to JSON, Build Plate Fit Calculator.
4. Add tests for the sanitizer to prove private fields are not accepted.
