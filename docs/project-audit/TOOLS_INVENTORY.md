# Tools Inventory

Date: 2026-06-14

## Inventory Rules

- "Registered" means the slug appears in `app/tools/[slug]/tool-client.tsx`.
- "Can access" means metadata exists, registration exists, and the registered component file exists.
- "Independent metadata" is currently dynamic from `data/tools.json`; individual English tools do not have separate metadata files.
- FAQ is currently generic through `components/ToolSeoContent.tsx`, unless future per-tool FAQ fields are added.
- "Language status" is based on available localized metadata and obvious mixed-language risks, not a full human translation review.
- "No unfinished copy" checks for explicit unfinished-user-facing terms such as `todo`, `coming soon`, `not implemented`, `准备中`, or `待上线`; normal input placeholder attributes are not counted as unfinished content.
- "Recommendation" is a first-pass audit recommendation, not a removal decision.

## Summary

| Metric | Count |
| --- | ---: |
| Tools | 91 |
| Registered | 91 |
| Metadata missing registration | 0 |
| Registration missing metadata | 0 |
| Components in `components/tools/` | 92 |
| Unregistered component-like files | 1 |

## Unregistered Component-Like Files

- `components/tools/tool-client.tsx`

`components/tools/tool-client.tsx` is the only outlier. It should be inspected in a separate cleanup PR before deletion or movement.

## Full Tool Inventory

| Slug | English Name | Chinese Name | Category | Component | Registered | Can Access | SEO Status | Language Status | No Unfinished Copy | Analytics Events | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `base64` | Base64 Encoder | - / - | Developer | `components/tools/Base64Tool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `json-formatter` | JSON Formatter | - / - | Developer | `components/tools/JsonFormatterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | tool_view, tool_start, process_start, process_success, process_error | keep; analytics pilot |
| `json-validator` | JSON Validator | - / - | Developer | `components/tools/JsonValidatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | tool_view, tool_start, process_start, process_success, process_error, result_copy | keep; analytics pilot |
| `json-minifier` | JSON Minifier | - / - | Developer | `components/tools/JsonMinifierTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `calculator` | Calculator | - / - | Utility | `components/tools/CalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `percentage-calculator` | Percentage Calculator | - / - | Calculator | `components/tools/PercentageCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | tool_view, tool_start, process_start, process_success, process_error, mode_change | keep; analytics pilot |
| `loan-calculator` | Loan Calculator | - / - | Calculator | `components/tools/LoanCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `mortgage-calculator` | Mortgage Calculator | - / - | Calculator | `components/tools/MortgageCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `compound-interest-calculator` | Compound Interest Calculator | - / - | Calculator | `components/tools/CompoundInterestCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `roi-calculator` | ROI Calculator | - / - | Calculator | `components/tools/RoiCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `profit-margin-calculator` | Profit Margin Calculator | - / - | Calculator | `components/tools/ProfitMarginCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `discount-calculator` | Discount Calculator | - / - | Calculator | `components/tools/DiscountCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `qr-code-generator` | QR Code Generator | - / - | Utility | `components/tools/QrCodeGeneratorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | tool_view, tool_start, process_start, process_success, process_error, result_download | keep; analytics pilot |
| `file-size-converter` | File Size Converter | - / - | Utility | `components/tools/FileSizeConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `file-name-cleaner` | File Name Cleaner | - / - | Utility | `components/tools/FileNameCleanerTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `unit-converter` | Unit Converter | - / - | Utility | `components/tools/UnitConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `roman-numeral-converter` | Roman Numeral Converter | - / - | Converter | `components/tools/RomanNumeralConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `number-to-words-converter` | Number to Words Converter | - / - | Converter | `components/tools/NumberToWordsConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `word-frequency-counter` | Word Frequency Counter | - / - | Text | `components/tools/WordFrequencyCounterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `reading-time-calculator` | Reading Time Calculator | - / - | Text | `components/tools/ReadingTimeCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `case-style-converter` | Case Style Converter | - / - | Developer | `components/tools/CaseStyleConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `list-randomizer` | List Randomizer | - / - | Utility | `components/tools/ListRandomizerTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `uuid-generator` | UUID Generator | - / - | Developer | `components/tools/UUIDTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `password-generator` | Password Generator | - / - | Security | `components/tools/PasswordGeneratorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `hash-generator` | Hash Generator | - / - | Security | `components/tools/HashGeneratorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `jwt-decoder` | JWT Decoder | - / - | Developer | `components/tools/JwtDecoderTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `color-converter` | Color Converter | - / - | Color | `components/tools/ColorConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `word-counter` | Word Counter | - / - | Text | `components/tools/WordCounterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `case-converter` | Case Converter | - / - | Text | `components/tools/CaseConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `timestamp-converter` | Timestamp Converter | - / - | Date Time | `components/tools/TimestampConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `age-calculator` | Age Calculator | - / - | Date Time | `components/tools/AgeCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `date-difference-calculator` | Date Difference Calculator | - / - | Date Time | `components/tools/DateDifferenceCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `time-zone-converter` | Time Zone Converter | - / - | Date Time | `components/tools/TimeZoneConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `unix-timestamp-batch-converter` | Unix Timestamp Batch Converter | - / - | Date Time | `components/tools/UnixTimestampBatchConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `url-encoder` | URL Encoder Decoder | - / - | Developer | `components/tools/UrlEncoderTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `png-to-webp` | PNG to WEBP | - / - | Image | `components/tools/PngToWebpTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | tool_view, tool_start, file_selected, process_start, process_success, process_error, result_download | keep; analytics pilot |
| `png-to-jpg` | PNG to JPG | - / - | Image | `components/tools/PngToJpgTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `jpg-to-png` | JPG to PNG | - / - | Image | `components/tools/JpgToPngTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `webp-to-png` | WEBP to PNG | - / - | Image | `components/tools/WebpToPngTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `image-resizer` | Image Resizer | - / - | Image | `components/tools/ImageResizerTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | tool_view, tool_start, file_selected, process_start, process_success, process_error, result_download | keep; analytics pilot |
| `image-compressor` | Image Compressor | - / - | Image | `components/tools/ImageCompressorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | tool_view, tool_start, file_selected, process_start, process_success, process_error, result_download, parameter_change | keep; analytics pilot |
| `image-cropper` | Image Cropper | - / - | Image | `components/tools/ImageCropperTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `image-rotate-flip` | Image Rotate Flip | - / - | Image | `components/tools/ImageRotateFlipTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `image-metadata-viewer` | Image Metadata Viewer | - / - | Image | `components/tools/ImageMetadataViewerTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `pixel-knock-board-generator` | Pixel Knock Grid Generator | 敲豆豆像素图板生成器 / 敲豆豆像素圖板產生器 | 3D Printing | `components/tools/PixelKnockBoardGeneratorTool.tsx` | Yes | Yes | dynamic metadata; custom copy; generic FAQ | localized | Yes | tool_view, tool_start, file_selected, process_start, process_success, process_error, result_download, parameter_change, mode_change, language_change | keep; analytics pilot |
| `markdown-previewer` | Markdown Previewer | - / - | Developer | `components/tools/MarkdownPreviewerTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `html-formatter` | HTML Formatter | - / - | Developer | `components/tools/HtmlFormatterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `css-formatter` | CSS Formatter | - / - | Developer | `components/tools/CssFormatterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `xml-formatter` | XML Formatter | - / - | Developer | `components/tools/XmlFormatterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `xml-to-json-converter` | XML to JSON Converter | - / - | Developer | `components/tools/XmlToJsonConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `html-minifier` | HTML Minifier | - / - | Developer | `components/tools/HtmlMinifierTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `css-minifier` | CSS Minifier | - / - | Developer | `components/tools/CssMinifierTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `javascript-formatter` | JavaScript Formatter | - / - | Developer | `components/tools/JavascriptFormatterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `regex-tester` | Regex Tester | - / - | Developer | `components/tools/RegexTesterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `lorem-ipsum-generator` | Lorem Ipsum Generator | - / - | Text | `components/tools/LoremIpsumGeneratorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `url-parser` | URL Parser | - / - | Developer | `components/tools/UrlParserTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `query-string-parser` | Query String Parser | - / - | Developer | `components/tools/QueryStringParserTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `meta-tag-generator` | Meta Tag Generator | - / - | SEO | `components/tools/MetaTagGeneratorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `open-graph-tag-generator` | Open Graph Tag Generator | - / - | SEO | `components/tools/OpenGraphTagGeneratorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `robots-txt-generator` | Robots.txt Generator | - / - | SEO | `components/tools/RobotsTxtGeneratorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `utm-url-builder` | UTM URL Builder | - / - | Marketing | `components/tools/UtmUrlBuilderTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `canonical-url-checker` | Canonical URL Checker | - / - | SEO | `components/tools/CanonicalUrlCheckerTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `http-status-code-reference` | HTTP Status Code Reference | - / - | Developer | `components/tools/HttpStatusCodeReferenceTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `mime-type-lookup` | MIME Type Lookup | - / - | Developer | `components/tools/MimeTypeLookupTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `csv-to-json-converter` | CSV to JSON Converter | - / - | Developer | `components/tools/CsvToJsonConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | tool_view, tool_start, process_start, process_success, process_error, result_copy | keep; analytics pilot |
| `json-to-csv-converter` | JSON to CSV Converter | - / - | Developer | `components/tools/JsonToCsvConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `yaml-to-json-converter` | YAML to JSON Converter | - / - | Developer | `components/tools/YamlToJsonConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `json-to-yaml-converter` | JSON to YAML Converter | - / - | Developer | `components/tools/JsonToYamlConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `number-base-converter` | Number Base Converter | - / - | Developer | `components/tools/NumberBaseConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `html-entity-encoder-decoder` | HTML Entity Encoder Decoder | - / - | Developer | `components/tools/HtmlEntityEncoderDecoderTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `random-string-generator` | Random String Generator | - / - | Security | `components/tools/RandomStringGeneratorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `text-to-binary-converter` | Text to Binary Converter | - / - | Developer | `components/tools/TextToBinaryConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `binary-to-text-converter` | Binary to Text Converter | - / - | Developer | `components/tools/BinaryToTextConverterTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `slug-generator` | Slug Generator | - / - | Text | `components/tools/SlugGeneratorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `remove-duplicate-lines` | Remove Duplicate Lines | - / - | Text | `components/tools/RemoveDuplicateLinesTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `sort-lines` | Sort Lines | - / - | Text | `components/tools/SortLinesTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `text-reverser` | Text Reverser | - / - | Text | `components/tools/TextReverserTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `whitespace-cleaner` | Whitespace Cleaner | - / - | Text | `components/tools/WhitespaceCleanerTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `text-diff-checker` | Text Diff Checker | - / - | Text | `components/tools/TextDiffCheckerTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | English only | Yes | None | keep; add analytics when prioritized |
| `filament-cost-calculator` | Filament Cost Calculator | 耗材成本计算器 / 線材成本計算器 | 3D Printing | `components/tools/FilamentCostCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | localized | Yes | None | keep; add analytics when prioritized |
| `print-time-cost-calculator` | Print Time Cost Calculator | 打印时长成本计算器 / 列印時間成本計算器 | 3D Printing | `components/tools/PrintTimeCostCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | localized | Yes | None | keep; add analytics when prioritized |
| `filament-length-calculator` | Filament Length Calculator | 耗材长度计算器 / 線材長度計算器 | 3D Printing | `components/tools/FilamentLengthCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | localized | Yes | None | keep; add analytics when prioritized |
| `3d-print-weight-calculator` | 3D Print Weight Calculator | 3D 打印重量计算器 / 3D 列印重量計算器 | 3D Printing | `components/tools/ThreeDPrintWeightCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | localized | Yes | None | keep; add analytics when prioritized |
| `scale-percentage-calculator` | Scale Percentage Calculator | 缩放比例计算器 / 縮放比例計算器 | 3D Printing | `components/tools/ScalePercentageCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | localized | Yes | None | keep; add analytics when prioritized |
| `nozzle-flow-rate-calculator` | Nozzle Flow Rate Calculator | 喷嘴体积流量计算器 / 噴嘴體積流量計算器 | 3D Printing | `components/tools/NozzleFlowRateCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | localized | Yes | None | keep; add analytics when prioritized |
| `filament-price-comparison-calculator` | Filament Price Comparison Calculator | 耗材价格对比计算器 / 線材價格比較計算器 | 3D Printing | `components/tools/FilamentPriceComparisonCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | localized | Yes | None | keep; add analytics when prioritized |
| `3d-model-search-aggregator` | 3D Model Search Aggregator | 3D 模型搜索入口 / 3D 模型搜尋入口 | 3D Printing | `components/tools/ThreeDModelSearchAggregatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | localized | Yes | None | keep; add analytics when prioritized |
| `3d-print-time-filament-estimator` | 3D Print Time and Filament Estimator | 打印时长和耗材估算器 / 列印時間和線材估算器 | 3D Printing | `components/tools/ThreeDPrintTimeFilamentEstimatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | localized | Yes | None | keep; add analytics when prioritized |
| `support-material-cost-calculator` | Support Material Cost Calculator | 支撑材料成本计算器 / 支撐材料成本計算器 | 3D Printing | `components/tools/SupportMaterialCostCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | localized | Yes | None | keep; add analytics when prioritized |
| `filament-spool-remaining-calculator` | Filament Spool Remaining Calculator | 剩余耗材计算器 / 剩餘線材計算器 | 3D Printing | `components/tools/FilamentSpoolRemainingCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | localized | Yes | None | keep; add analytics when prioritized |
| `build-plate-fit-calculator` | Build Plate Fit Calculator | 打印平台适配计算器 / 列印平台適配計算器 | 3D Printing | `components/tools/BuildPlateFitCalculatorTool.tsx` | Yes | Yes | dynamic metadata; generic copy; generic FAQ | localized | Yes | tool_view, tool_start, process_start, process_success, process_error, parameter_change | keep; analytics pilot |

## Observations

- All 91 metadata slugs are registered and point to an existing component.
- The English tool page metadata is generated uniformly from `data/tools.json`.
- Most tools rely on generic SEO content and generic FAQ.
- Most tools do not emit analytics events.
- Localized metadata exists for the 13 3D Printing tools only; other tools intentionally fall back to English names/descriptions on Chinese home pages.
- No duplicate slugs, duplicate names, duplicate descriptions, or explicit unfinished user-facing placeholder pages were detected in `data/tools.json`.
