"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
} from "../tool-ui/ToolUI";

export default function UUIDTool() {
  const [uuid, setUuid] = useState("");

  const generate = () => {
    setUuid(crypto.randomUUID());
  };

  const copy = async () => {
    if (!uuid) return;
    await navigator.clipboard.writeText(uuid);
  };

  return (
    <ToolPanel>
      <ToolResultBox muted={!uuid}>
        {uuid || "Click generate to create a UUID."}
      </ToolResultBox>

      <ToolButtonRow>
        <ToolButton onClick={generate}>Generate UUID</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={() => setUuid("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>
    </ToolPanel>
  );
}