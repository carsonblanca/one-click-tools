"use client";

import Base64Tool from "../../../components/tools/Base64Tool";
import JsonFormatterTool from "../../../components/tools/JsonFormatterTool";
import CalculatorTool from "../../../components/tools/CalculatorTool";
import UUIDTool from "../../../components/tools/UUIDTool";

import PasswordGeneratorTool from "../../../components/tools/PasswordGeneratorTool";
import HashGeneratorTool from "../../../components/tools/HashGeneratorTool";
import JwtDecoderTool from "../../../components/tools/JwtDecoderTool";
import ColorConverterTool from "../../../components/tools/ColorConverterTool";

import WordCounterTool from "../../../components/tools/WordCounterTool";
import CaseConverterTool from "../../../components/tools/CaseConverterTool";
import TimestampConverterTool from "../../../components/tools/TimestampConverterTool";
import UrlEncoderTool from "../../../components/tools/UrlEncoderTool";

import PngToWebpTool from "../../../components/tools/PngToWebpTool";
import PngToJpgTool from "../../../components/tools/PngToJpgTool";
import JpgToPngTool from "../../../components/tools/JpgToPngTool";
import WebpToPngTool from "../../../components/tools/WebpToPngTool";
import ImageResizerTool from "../../../components/tools/ImageResizerTool";
import ImageCompressorTool from "../../../components/tools/ImageCompressorTool";

import MarkdownPreviewerTool from "../../../components/tools/MarkdownPreviewerTool";
import HtmlFormatterTool from "../../../components/tools/HtmlFormatterTool";
import CssFormatterTool from "../../../components/tools/CssFormatterTool";
import JavascriptFormatterTool from "../../../components/tools/JavascriptFormatterTool";
import RegexTesterTool from "../../../components/tools/RegexTesterTool";
import LoremIpsumGeneratorTool from "../../../components/tools/LoremIpsumGeneratorTool";
import UrlParserTool from "../../../components/tools/UrlParserTool";
import QueryStringParserTool from "../../../components/tools/QueryStringParserTool";
import HtmlEntityEncoderDecoderTool from "../../../components/tools/HtmlEntityEncoderDecoderTool";
import RandomStringGeneratorTool from "../../../components/tools/RandomStringGeneratorTool";
import TextToBinaryConverterTool from "../../../components/tools/TextToBinaryConverterTool";
import BinaryToTextConverterTool from "../../../components/tools/BinaryToTextConverterTool";
import CsvToJsonConverterTool from "../../../components/tools/CsvToJsonConverterTool";
import JsonToCsvConverterTool from "../../../components/tools/JsonToCsvConverterTool";
import YamlToJsonConverterTool from "../../../components/tools/YamlToJsonConverterTool";
import JsonToYamlConverterTool from "../../../components/tools/JsonToYamlConverterTool";
import NumberBaseConverterTool from "../../../components/tools/NumberBaseConverterTool";
import SlugGeneratorTool from "../../../components/tools/SlugGeneratorTool";
import RemoveDuplicateLinesTool from "../../../components/tools/RemoveDuplicateLinesTool";
import SortLinesTool from "../../../components/tools/SortLinesTool";
import TextReverserTool from "../../../components/tools/TextReverserTool";
import WhitespaceCleanerTool from "../../../components/tools/WhitespaceCleanerTool";
import TextDiffCheckerTool from "../../../components/tools/TextDiffCheckerTool";
import QrCodeGeneratorTool from "../../../components/tools/QrCodeGeneratorTool";

export default function ToolClient({ slug }: { slug: string }) {
  if (slug === "base64") return <Base64Tool />;
  if (slug === "json-formatter") return <JsonFormatterTool />;
  if (slug === "calculator") return <CalculatorTool />;
  if (slug === "uuid-generator") return <UUIDTool />;
  if (slug === "qr-code-generator") return <QrCodeGeneratorTool />;

  if (slug === "password-generator") return <PasswordGeneratorTool />;
  if (slug === "hash-generator") return <HashGeneratorTool />;
  if (slug === "jwt-decoder") return <JwtDecoderTool />;
  if (slug === "color-converter") return <ColorConverterTool />;

  if (slug === "word-counter") return <WordCounterTool />;
  if (slug === "case-converter") return <CaseConverterTool />;
  if (slug === "timestamp-converter") return <TimestampConverterTool />;
  if (slug === "url-encoder") return <UrlEncoderTool />;

  if (slug === "png-to-webp") return <PngToWebpTool />;
  if (slug === "png-to-jpg") return <PngToJpgTool />;
  if (slug === "jpg-to-png") return <JpgToPngTool />;
  if (slug === "webp-to-png") return <WebpToPngTool />;
  if (slug === "image-resizer") return <ImageResizerTool />;
  if (slug === "image-compressor") return <ImageCompressorTool />;

  if (slug === "markdown-previewer") return <MarkdownPreviewerTool />;
  if (slug === "html-formatter") return <HtmlFormatterTool />;
  if (slug === "css-formatter") return <CssFormatterTool />;
  if (slug === "javascript-formatter") return <JavascriptFormatterTool />;
  if (slug === "regex-tester") return <RegexTesterTool />;
  if (slug === "lorem-ipsum-generator") return <LoremIpsumGeneratorTool />;

  if (slug === "url-parser") return <UrlParserTool />;

  if (slug === "query-string-parser") return <QueryStringParserTool />;

  if (slug === "html-entity-encoder-decoder") return <HtmlEntityEncoderDecoderTool />;

  if (slug === "random-string-generator") return <RandomStringGeneratorTool />;

  if (slug === "text-to-binary-converter") return <TextToBinaryConverterTool />;

  if (slug === "binary-to-text-converter") return <BinaryToTextConverterTool />;

  if (slug === "csv-to-json-converter") return <CsvToJsonConverterTool />;

  if (slug === "json-to-csv-converter") return <JsonToCsvConverterTool />;

  if (slug === "yaml-to-json-converter") return <YamlToJsonConverterTool />;

  if (slug === "json-to-yaml-converter") return <JsonToYamlConverterTool />;

  if (slug === "number-base-converter") return <NumberBaseConverterTool />;

  if (slug === "slug-generator") return <SlugGeneratorTool />;

  if (slug === "remove-duplicate-lines") return <RemoveDuplicateLinesTool />;

  if (slug === "sort-lines") return <SortLinesTool />;

  if (slug === "text-reverser") return <TextReverserTool />;

  if (slug === "whitespace-cleaner") return <WhitespaceCleanerTool />;

  if (slug === "text-diff-checker") return <TextDiffCheckerTool />;

  return (
    <div className="mt-10 rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
      Tool not found.
    </div>
  );
}
