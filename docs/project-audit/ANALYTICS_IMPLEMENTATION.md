# Analytics Implementation

Date: 2026-06-14

## Summary

The unified pilot uses `lib/analytics/tool-events.ts` to provide typed, privacy-safe browser analytics for 10 representative tools. Events are sent only through optional browser APIs already expected by the site: `window.gtag` and `window.va`.

Analytics failures are silent and must not affect tool results.

## Event Dictionary

| Event | Trigger |
| --- | --- |
| `tool_view` | Tool component enters usable browser state. |
| `tool_start` | User performs the first clear action. |
| `file_selected` | User selects a valid local file. |
| `process_start` | A conversion, validation, calculation, preview, or generation begins. |
| `process_success` | A usable result is produced. |
| `process_error` | Processing fails or cannot start. |
| `result_download` | User starts a successful download action. |
| `result_copy` | User copies a result. |
| `parameter_change` | User changes a meaningful result-affecting parameter. |
| `mode_change` | User changes a primary mode. |
| `language_change` | User changes tool UI language. |
| `share_click` | Reserved for share actions. |
| `upgrade_click` | Reserved for paid, batch, API, or pro entry points. |

## Parameter Dictionary

Required:

- `tool_slug`
- `event_version`

Common optional fields:

- `tool_category`
- `tool_type`
- `locale`
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

All parameters are optional except `tool_slug`. Unknown keys are removed.

## Privacy Blocklist

The implementation does not allow arbitrary event keys. This blocks accidental collection of:

- File names and file paths.
- File, image, text, JSON, CSV, JWT, QR, STL, or OBJ contents.
- User-entered URLs and query strings.
- Cookies, tokens, API keys, emails, phone numbers, addresses, and credentials.
- Raw exception messages or stack traces.

## Bucket Rules

File size buckets:

- `0-100kb`
- `100kb-1mb`
- `1mb-5mb`
- `5mb-20mb`
- `20mb-plus`

File count buckets:

- `1`
- `2-5`
- `6-20`
- `21-plus`

Processing time buckets:

- `0-100ms`
- `100-500ms`
- `500ms-2s`
- `2s-10s`
- `10s-plus`

## Pilot Tool Coverage

| Tool slug | Events |
| --- | --- |
| `pixel-knock-board-generator` | `tool_view`, `tool_start`, `file_selected`, `process_start`, `process_success`, `process_error`, `result_download`, `parameter_change`, `mode_change`, `language_change` |
| `image-compressor` | `tool_view`, `tool_start`, `file_selected`, `process_start`, `process_success`, `process_error`, `result_download`, `parameter_change` |
| `image-resizer` | `tool_view`, `tool_start`, `file_selected`, `process_start`, `process_success`, `process_error`, `result_download` |
| `png-to-webp` | `tool_view`, `tool_start`, `file_selected`, `process_start`, `process_success`, `process_error`, `result_download` |
| `json-formatter` | `tool_view`, `tool_start`, `process_start`, `process_success`, `process_error` |
| `json-validator` | `tool_view`, `tool_start`, `process_start`, `process_success`, `process_error`, `result_copy` |
| `csv-to-json-converter` | `tool_view`, `tool_start`, `process_start`, `process_success`, `process_error`, `result_copy` |
| `qr-code-generator` | `tool_view`, `tool_start`, `process_start`, `process_success`, `process_error`, `result_download` |
| `percentage-calculator` | `tool_view`, `tool_start`, `process_start`, `process_success`, `process_error`, `mode_change` |
| `build-plate-fit-calculator` | `tool_view`, `tool_start`, `process_start`, `process_success`, `process_error`, `parameter_change` |

## Pixel Knock Migration

The old Pixel Knock events were removed from the component:

- `upload_image`
- `generate_preview`
- `download_project_zip`
- `download_stl_grid`
- `download_png_preview`
- `download_color_csv`
- `switch_language`
- `toggle_show_color_numbers`

They are now represented by the unified event vocabulary. The implementation does not intentionally send old and new events in parallel.

## GA4 And Vercel Checks

After deployment, verify GA4:

- Confirm `gtag` is present on production pages.
- Use GA4 DebugView or Realtime reports while triggering each pilot tool.
- Check event names and confirm `tool_slug` appears.
- Confirm no private text, file names, or raw errors appear in event parameters.

Verify Vercel Analytics:

- Confirm `window.va` is present in the browser.
- Trigger pilot actions from production.
- Check Vercel dashboard event visibility after its normal processing delay.

Code calls alone do not prove backend receipt.

## Duplicate Event Review

Look for:

- More than one `tool_view` for a slug/locale in the same page session.
- `tool_start` firing repeatedly without a page refresh.
- Pixel Knock showing both old and unified event names.
- `process_success` firing without a corresponding user action or valid result.
- Downloads firing when validation failed.

## Review Cadence

Day 1:

- Confirm events appear in analytics dashboards.
- Confirm each pilot tool still works.
- Confirm no sensitive parameter values are visible.

Day 7:

- Compare `tool_start / tool_view`.
- Review `process_error` by tool and error code.
- Check whether any event has too many distinct parameter values.

Day 30:

- Compare usage by tool category and source.
- Identify tools with high starts but low success.
- Decide which events are useful enough to expand.

Day 90:

- Use repeat usage, success rate, and download/copy rate to prioritize tool improvements.
- Remove low-value events if they create noise.
- Decide whether batch/pro/API signals justify product work.

## Extending To More Tools

For each new tool:

1. Define `tool_slug`, `tool_category`, `tool_type`, and `locale`.
2. Add `tool_view` in the mounted client component.
3. Add `tool_start` to the first clear user action.
4. Add file, process, copy, download, mode, and parameter events only when they naturally apply.
5. Use buckets, fixed error codes, and result types.
6. Run `npm run validate:analytics`.

## Current Limitations

- Dashboard receipt cannot be proven locally.
- The pilot does not add a public analytics dashboard.
- `share_click` and `upgrade_click` are defined but not used in this pilot.
- Some existing tools still have no analytics until the next migration slice.

## Data Retention And Privacy Notes

Analytics should be used for aggregate product decisions only. Do not join events with user identity, generate device fingerprints, or add cookies for individual tracking as part of this system.
