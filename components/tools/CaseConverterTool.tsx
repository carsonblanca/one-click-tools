"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolTextarea,
} from "../tool-ui/ToolUI";

export default function CaseConverterTool() {
  const [text, setText] = useState("");

  const toTitleCase = (value: string) => {
    return value.replace(/\w\S*/g, (word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={text}
        onChange={setText}
        placeholder="Enter text..."
        rows={10}
      />

      <ToolButtonRow>
        <ToolButton onClick={() => setText(text.toUpperCase())}>
          UPPERCASE
        </ToolButton>

        <ToolButton onClick={() => setText(text.toLowerCase())} variant="secondary">
          lowercase
        </ToolButton>

        <ToolButton onClick={() => setText(toTitleCase(text))} variant="secondary">
          Title Case
        </ToolButton>

        <ToolButton onClick={() => setText("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>
    </ToolPanel>
  );
}