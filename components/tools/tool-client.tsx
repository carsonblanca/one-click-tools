"use client";

import Base64Tool from "@/components/tools/Base64Tool";
import JsonFormatterTool from "@/components/tools/JsonFormatterTool";
import CalculatorTool from "@/components/tools/CalculatorTool";
import UUIDTool from "@/components/tools/UUIDTool";

export default function ToolClient({
  slug,
}: {
  slug: string;
}) {
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

  return (
    <div className="mt-10 text-red-400">
      Tool not found.
    </div>
  );
}