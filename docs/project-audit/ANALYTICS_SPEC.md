# Analytics Specification

Date: 2026-06-14

## Current Implementation

Unified tool analytics lives in `lib/analytics/tool-events.ts`.

`trackToolEvent()` sends sanitized events to two optional browser-side channels:

- `window.gtag("event", eventName, params)` when Google Analytics / gtag is present.
- `window.va("event", { name, data })` when Vercel Analytics exposes `window.va`.

If neither channel exists, the function returns silently. If either channel throws, the error is caught so analytics never blocks a tool workflow.

The older `components/analytics.ts` helper still exists as a generic wrapper, but the current pilot tools use the unified helper directly.

## Event Names

Allowed event names:

- `tool_view`
- `tool_start`
- `file_selected`
- `process_start`
- `process_success`
- `process_error`
- `result_download`
- `result_copy`
- `parameter_change`
- `mode_change`
- `language_change`
- `share_click`
- `upgrade_click`

Unknown event names are rejected by the sanitizer.

## Event Semantics

- `tool_view`: the tool interaction component first becomes available in the browser.
- `tool_start`: the user takes the first clear action in a tool.
- `file_selected`: the user selects a valid local file.
- `process_start`: processing, validation, conversion, calculation, or generation begins.
- `process_success`: a usable result is produced.
- `process_error`: processing fails or cannot begin.
- `result_download`: the user starts a successful download action.
- `result_copy`: the user copies a result.
- `parameter_change`: the user changes a meaningful result-affecting parameter.
- `mode_change`: the user switches a main processing mode.
- `language_change`: the user changes the tool UI language.
- `share_click`: reserved for share actions.
- `upgrade_click`: reserved for future paid, batch, API, or pro entry points.

Page load is not `tool_start`. Focus alone is not `tool_start`. Parameter initialization must not emit `parameter_change`.

## Parameter Dictionary

Base parameters:

- `tool_slug`: required for every event.
- `tool_category`: category from the tool inventory.
- `tool_type`: one of the centralized tool type values.
- `locale`: `en`, `zh-cn`, or `zh-tw`.
- `event_version`: always `1`.

Optional safe parameters:

- `input_type`
- `output_type`
- `file_size_bucket`
- `file_count_bucket`
- `processing_time_bucket`
- `error_code`
- `result_type`
- `source_context`
- `mode`
- `previous_mode`
- `parameter_name`
- `from_locale`
- `to_locale`
- `share_target`
- `placement`
- `plan`
- `available`
- `success`

Unknown parameters are removed before sending.

## Tool Types

Allowed tool types:

- `file_conversion`
- `image_processing`
- `text_processing`
- `developer_validation`
- `generator`
- `calculator`
- `professional_workflow`

## Error Codes

Allowed error codes:

- `missing_input`
- `invalid_input`
- `parse_error`
- `unsupported_file_type`
- `file_too_large`
- `canvas_error`
- `download_error`
- `clipboard_error`
- `unknown_error`

Do not send raw exception messages, stack traces, file names, or user input.

## Bucket Rules

File size:

- `0-100kb`
- `100kb-1mb`
- `1mb-5mb`
- `5mb-20mb`
- `20mb-plus`

File count:

- `1`
- `2-5`
- `6-20`
- `21-plus`

Processing time:

- `0-100ms`
- `100-500ms`
- `500ms-2s`
- `2s-10s`
- `10s-plus`

## Privacy Boundaries

Never collect:

- File names or paths.
- File contents.
- Image pixels or thumbnails.
- Text input, JSON, CSV, JWT, QR payloads, URLs entered by users, or decoded content.
- STL, OBJ, or other model content.
- Cookies, tokens, credentials, API keys, emails, phone numbers, addresses, or personal identifiers.
- Full URL query strings that may contain private data.

Allowed:

- Tool slug.
- Tool type and category.
- Page locale.
- File MIME type or broad input type.
- File size bucket.
- File count bucket.
- Processing time bucket.
- Fixed error code.
- Output/result type.

## Duplicate Control

`tool_view` and `tool_start` are de-duplicated in browser memory by event name, slug, locale, and source context. Other events are action-based and should be emitted only in direct response to user actions or completed processing.

Pixel Knock has been migrated away from legacy event names. The pilot does not intentionally send both old and new events.

## Validation

Run:

```bash
npm run validate:analytics
```

The validator checks:

- Event names match the allowed dictionary.
- Unknown parameters are removed.
- File names and user-content-like keys are removed.
- Long strings are capped.
- File size, file count, and processing time buckets map correctly.
- Missing `tool_slug` rejects the event.
- Missing `gtag` and `va` does not throw.
- Each pilot tool contains a `tool_view` integration.
- Pixel Knock no longer contains old event names.

## Pilot Scope

The pilot covers:

- `pixel-knock-board-generator`
- `image-compressor`
- `image-resizer`
- `png-to-webp`
- `json-formatter`
- `json-validator`
- `csv-to-json-converter`
- `qr-code-generator`
- `percentage-calculator`
- `build-plate-fit-calculator`

## Production Verification Limits

Code-level validation proves that calls are sanitized and sent to available browser analytics APIs. It does not prove that GA4 or Vercel Analytics received, accepted, processed, or displayed the events in production dashboards. That requires deployment, real browser traffic, and dashboard confirmation.
