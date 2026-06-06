"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
} from "../tool-ui/ToolUI";

type NormalizedUrl = {
  protocol: string;
  hostname: string;
  pathname: string;
  query: string;
  normalized: string;
};

type CheckResult = {
  matches: boolean;
  current: NormalizedUrl;
  canonical: NormalizedUrl;
  differences: string[];
};

function removeTrailingSlash(pathname: string) {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function normalizeQuery(searchParams: URLSearchParams) {
  return Array.from(searchParams.entries())
    .sort(([firstKey, firstValue], [secondKey, secondValue]) =>
      `${firstKey}=${firstValue}`.localeCompare(`${secondKey}=${secondValue}`),
    )
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function normalizeUrl(value: string): NormalizedUrl {
  if (!value.trim()) {
    throw new Error("Enter both URLs before checking.");
  }

  const url = new URL(value.trim());
  const protocol = url.protocol.toLowerCase();
  const hostname = url.hostname.toLowerCase();
  const port =
    (protocol === "https:" && url.port === "443") ||
    (protocol === "http:" && url.port === "80")
      ? ""
      : url.port;
  const host = port ? `${hostname}:${port}` : hostname;
  const pathname = removeTrailingSlash(url.pathname || "/");
  const query = normalizeQuery(url.searchParams);
  const normalized = `${protocol}//${host}${pathname}${query ? `?${query}` : ""}`;

  return {
    protocol,
    hostname: host,
    pathname,
    query,
    normalized,
  };
}

function checkCanonicalUrl(currentUrl: string, canonicalUrl: string): CheckResult {
  const current = normalizeUrl(currentUrl);
  const canonical = normalizeUrl(canonicalUrl);
  const differences: string[] = [];

  if (current.protocol !== canonical.protocol) {
    differences.push("Protocol differs.");
  }

  if (current.hostname !== canonical.hostname) {
    differences.push("Hostname differs.");
  }

  if (current.pathname !== canonical.pathname) {
    differences.push("Pathname differs after trailing slash normalization.");
  }

  if (current.query !== canonical.query) {
    differences.push("Query string differs after sorting parameters.");
  }

  return {
    matches: differences.length === 0,
    current,
    canonical,
    differences,
  };
}

export default function CanonicalUrlCheckerTool() {
  const [currentUrl, setCurrentUrl] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState("");

  const check = () => {
    try {
      setResult(checkCanonicalUrl(currentUrl, canonicalUrl));
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Invalid URL.");
    }
  };

  const clear = () => {
    setCurrentUrl("");
    setCanonicalUrl("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <ToolLabel>Current URL</ToolLabel>
          <ToolInput
            value={currentUrl}
            onChange={setCurrentUrl}
            placeholder="https://example.com/page/?b=2&a=1"
          />
        </div>

        <div>
          <ToolLabel>Canonical URL</ToolLabel>
          <ToolInput
            value={canonicalUrl}
            onChange={setCanonicalUrl}
            placeholder="https://example.com/page?a=1&b=2"
          />
        </div>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={check}>Check</ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      {error ? (
        <ToolResultBox>{error}</ToolResultBox>
      ) : result ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ToolStatCard
              label="Match"
              value={result.matches ? "Yes" : "No"}
            />
            <ToolStatCard
              label="Differences"
              value={result.differences.length}
            />
          </div>

          <ToolResultBox>
            <div className="space-y-4">
              <div>
                <div className="font-medium">Current normalized URL</div>
                <div className="mt-1 break-all">{result.current.normalized}</div>
              </div>

              <div>
                <div className="font-medium">Canonical normalized URL</div>
                <div className="mt-1 break-all">
                  {result.canonical.normalized}
                </div>
              </div>

              <div>
                <div className="font-medium">Result</div>
                <div className="mt-1">
                  {result.matches
                    ? "The URLs match after normalization."
                    : result.differences.join(" ")}
                </div>
              </div>
            </div>
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>
          Canonical comparison results will appear here. This helper does not
          fetch external URLs.
        </ToolResultBox>
      )}
    </ToolPanel>
  );
}
