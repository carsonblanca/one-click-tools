"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolPanel,
  ToolResultBox,
} from "../tool-ui/ToolUI";

export default function CalculatorTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");

  const calculate = () => {
    try {
      const safePattern = /^[0-9+\-*/().\s%]+$/;

      if (!safePattern.test(input)) {
        alert("Only basic math expressions are allowed.");
        return;
      }

      const value = Function(`"use strict"; return (${input})`)();
      setResult(String(value));
    } catch {
      alert("Invalid calculation.");
    }
  };

  return (
    <ToolPanel>
      <ToolInput
        value={input}
        onChange={setInput}
        placeholder="Enter calculation, e.g. 24 * 8 + 10"
      />

      <ToolButtonRow>
        <ToolButton onClick={calculate}>Calculate</ToolButton>
        <ToolButton
          onClick={() => {
            setInput("");
            setResult("");
          }}
          variant="danger"
        >
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!result}>
        {result || "Result will appear here."}
      </ToolResultBox>
    </ToolPanel>
  );
}
