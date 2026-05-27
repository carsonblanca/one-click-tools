"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolPanel,
  ToolResultBox,
} from "../tool-ui/ToolUI";

export default function TimestampConverterTool() {
  const [timestamp, setTimestamp] = useState("");

  const numberValue = Number(timestamp);
  const isValid = timestamp.trim() !== "" && !Number.isNaN(numberValue);

  const date = isValid
    ? new Date(
        numberValue.toString().length === 10 ? numberValue * 1000 : numberValue
      )
    : null;

  const useCurrentTimestamp = () => {
    setTimestamp(String(Math.floor(Date.now() / 1000)));
  };

  return (
    <ToolPanel>
      <ToolInput
        value={timestamp}
        onChange={setTimestamp}
        placeholder="Enter Unix timestamp, e.g. 1710000000"
      />

      <ToolButtonRow>
        <ToolButton onClick={useCurrentTimestamp}>Use Current Timestamp</ToolButton>
        <ToolButton onClick={() => setTimestamp("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!date}>
        {date ? (
          <div className="space-y-3">
            <div>
              <span className="opacity-60">Local Time: </span>
              {date.toString()}
            </div>

            <div>
              <span className="opacity-60">UTC: </span>
              {date.toUTCString()}
            </div>

            <div>
              <span className="opacity-60">ISO: </span>
              {date.toISOString()}
            </div>
          </div>
        ) : (
          "Enter a valid timestamp."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}