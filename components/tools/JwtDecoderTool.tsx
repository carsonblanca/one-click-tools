"use client";

import { useMemo, useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

type DecodedJwt = {
  header: string;
  payload: string;
  error: string;
};

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function formatJwtPart(value: string) {
  return JSON.stringify(JSON.parse(decodeBase64Url(value)), null, 2);
}

export default function JwtDecoderTool() {
  const [token, setToken] = useState("");

  const decoded = useMemo<DecodedJwt>(() => {
    if (!token.trim()) {
      return {
        header: "",
        payload: "",
        error: "",
      };
    }

    const parts = token.trim().split(".");

    if (parts.length < 2) {
      return {
        header: "",
        payload: "",
        error: "JWT must include at least a header and payload.",
      };
    }

    try {
      return {
        header: formatJwtPart(parts[0]),
        payload: formatJwtPart(parts[1]),
        error: "",
      };
    } catch {
      return {
        header: "",
        payload: "",
        error: "Unable to decode this JWT.",
      };
    }
  }, [token]);

  return (
    <ToolPanel>
      <ToolTextarea
        value={token}
        onChange={setToken}
        placeholder="Paste JWT..."
        rows={6}
      />

      <ToolButtonRow>
        <ToolButton onClick={() => setToken("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox>
        This tool decodes JWT headers and payloads, but does not validate
        signatures.
      </ToolResultBox>

      {decoded.error ? (
        <ToolResultBox>{decoded.error}</ToolResultBox>
      ) : (
        <>
          <ToolResultBox muted={!decoded.header}>
            <div className="mb-3 text-sm font-medium">Header</div>
            <pre className="overflow-x-auto whitespace-pre-wrap text-sm">
              {decoded.header || "Decoded header will appear here."}
            </pre>
          </ToolResultBox>

          <ToolResultBox muted={!decoded.payload}>
            <div className="mb-3 text-sm font-medium">Payload</div>
            <pre className="overflow-x-auto whitespace-pre-wrap text-sm">
              {decoded.payload || "Decoded payload will appear here."}
            </pre>
          </ToolResultBox>
        </>
      )}
    </ToolPanel>
  );
}
