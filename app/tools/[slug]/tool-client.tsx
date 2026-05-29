"use client";

import Base64Tool from "../../../components/tools/Base64Tool";
import JsonFormatterTool from "../../../components/tools/JsonFormatterTool";
import CalculatorTool from "../../../components/tools/CalculatorTool";
import UUIDTool from "../../../components/tools/UUIDTool";
import PasswordGeneratorTool from "../../../components/tools/PasswordGeneratorTool";
import MarkdownPreviewerTool from "../../../components/tools/MarkdownPreviewerTool";
import HtmlFormatterTool from "../../../components/tools/HtmlFormatterTool";
import CssFormatterTool from "../../../components/tools/CssFormatterTool";
import JavascriptFormatterTool from "../../../components/tools/JavascriptFormatterTool";
import RegexTesterTool from "../../../components/tools/RegexTesterTool";
import WordCounterTool from "../../../components/tools/WordCounterTool";
import LoremIpsumGeneratorTool from "../../../components/tools/LoremIpsumGeneratorTool";
import CaseConverterTool from "../../../components/tools/CaseConverterTool";
import TimestampConverterTool from "../../../components/tools/TimestampConverterTool";
import UrlEncoderTool from "../../../components/tools/UrlEncoderTool";

import PngToWebpTool from "../../../components/tools/PngToWebpTool";
import PngToJpgTool from "../../../components/tools/PngToJpgTool";
import JpgToPngTool from "../../../components/tools/JpgToPngTool";
import WebpToPngTool from "../../../components/tools/WebpToPngTool";
import ImageResizerTool from "../../../components/tools/ImageResizerTool";
import ImageCompressorTool from "../../../components/tools/ImageCompressorTool";

export default function ToolClient({ slug }: { slug: string }) {
  if (slug === "base64") {
    return <Base64Tool />;
  }

  if (slug === "json-formatter") {
    return <JsonFormatterTool />;
  }

  if (slug === "calculator") {
    return <CalculatorTool />;
  }

  if (slug === "uuid-generator") {
    return <UUIDTool />;
  }

  if (slug === "password-generator") {
    return <PasswordGeneratorTool />;
  }

  if (slug === "markdown-previewer") {
    return <MarkdownPreviewerTool />;
  }

  if (slug === "html-formatter") {
    return <HtmlFormatterTool />;
  }

  if (slug === "css-formatter") {
    return <CssFormatterTool />;
  }

  if (slug === "javascript-formatter") {
    return <JavascriptFormatterTool />;
  }

  if (slug === "regex-tester") {
    return <RegexTesterTool />;
  }

  if (slug === "word-counter") {
    return <WordCounterTool />;
  }

  if (slug === "lorem-ipsum-generator") {
    return <LoremIpsumGeneratorTool />;
  }

  if (slug === "case-converter") {
    return <CaseConverterTool />;
  }

  if (slug === "timestamp-converter") {
    return <TimestampConverterTool />;
  }

  if (slug === "url-encoder") {
    return <UrlEncoderTool />;
  }

  if (slug === "png-to-webp") {
    return <PngToWebpTool />;
  }

  if (slug === "png-to-jpg") {
    return <PngToJpgTool />;
  }

  if (slug === "jpg-to-png") {
    return <JpgToPngTool />;
  }

  if (slug === "webp-to-png") {
    return <WebpToPngTool />;
  }

  if (slug === "image-resizer") {
    return <ImageResizerTool />;
  }

  if (slug === "image-compressor") {
    return <ImageCompressorTool />;
  }

  return (
    <div className="mt-10 rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
      Tool not found.
    </div>
  );
}
