"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolCheckbox,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

type CleanOptions = {
  lowercase: boolean;
  replaceSpaces: boolean;
  removeSpecial: boolean;
  trim: boolean;
};

function splitExtension(fileName: string, preserveExtension: boolean) {
  if (!preserveExtension) {
    return { base: fileName, extension: "" };
  }

  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return { base: fileName, extension: "" };
  }

  return {
    base: fileName.slice(0, dotIndex),
    extension: fileName.slice(dotIndex),
  };
}

function cleanSegment(segment: string, options: CleanOptions) {
  let result = segment;

  if (options.trim) {
    result = result.trim();
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  if (options.removeSpecial) {
    result = result.replace(/[^a-zA-Z0-9._\-\s]/g, "");
  }

  if (options.replaceSpaces) {
    result = result.replace(/\s+/g, "-").replace(/-+/g, "-");
  }

  if (options.trim) {
    result = result.replace(/^[-_.\s]+|[-_.\s]+$/g, "");
  }

  return result || "untitled";
}

function cleanFileName(
  fileName: string,
  options: CleanOptions & { preserveExtension: boolean },
) {
  const { base, extension } = splitExtension(fileName, options.preserveExtension);
  const cleanedBase = cleanSegment(base, options);
  const cleanedExtension = options.preserveExtension
    ? extension
    : "";

  return `${cleanedBase}${cleanedExtension}`;
}

export default function FileNameCleanerTool() {
  const [input, setInput] = useState("");
  const [lowercase, setLowercase] = useState(true);
  const [replaceSpaces, setReplaceSpaces] = useState(true);
  const [removeSpecial, setRemoveSpecial] = useState(true);
  const [trim, setTrim] = useState(true);
  const [preserveExtension, setPreserveExtension] = useState(true);
  const [output, setOutput] = useState("");

  const clean = () => {
    const lines = input.split(/\r?\n/).filter((line) => line.length > 0);
    const cleaned = lines.map((line) =>
      cleanFileName(line, {
        lowercase,
        replaceSpaces,
        removeSpecial,
        trim,
        preserveExtension,
      }),
    );

    setOutput(cleaned.join("\n"));
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
  };

  const clear = () => {
    setInput("");
    setOutput("");
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={input}
        onChange={setInput}
        placeholder={"My File Name (Final).PNG\nAnother document copy.pdf"}
        rows={7}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToolCheckbox checked={lowercase} onChange={setLowercase}>
          Lowercase
        </ToolCheckbox>
        <ToolCheckbox checked={replaceSpaces} onChange={setReplaceSpaces}>
          Replace spaces with hyphens
        </ToolCheckbox>
        <ToolCheckbox checked={removeSpecial} onChange={setRemoveSpecial}>
          Remove special characters
        </ToolCheckbox>
        <ToolCheckbox checked={trim} onChange={setTrim}>
          Trim
        </ToolCheckbox>
        <ToolCheckbox checked={preserveExtension} onChange={setPreserveExtension}>
          Preserve extension
        </ToolCheckbox>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={clean}>Clean</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!output}>
        {output ? (
          <pre className="overflow-x-auto whitespace-pre-wrap">{output}</pre>
        ) : (
          "Cleaned file names will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
