"use client";

import { useMemo, useState } from "react";
import { useTheme } from "../ThemeProvider";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
} from "../tool-ui/ToolUI";

type StatusCode = {
  code: number;
  phrase: string;
  group: string;
  meaning: string;
  usage: string;
};

const STATUS_CODES: StatusCode[] = [
  {
    code: 100,
    phrase: "Continue",
    group: "1xx Informational",
    meaning: "The initial request was received and the client can continue.",
    usage: "Used during large request uploads before sending the body.",
  },
  {
    code: 101,
    phrase: "Switching Protocols",
    group: "1xx Informational",
    meaning: "The server is switching to a different protocol.",
    usage: "Common in WebSocket upgrade handshakes.",
  },
  {
    code: 200,
    phrase: "OK",
    group: "2xx Success",
    meaning: "The request succeeded.",
    usage: "Standard response for successful page loads and API reads.",
  },
  {
    code: 201,
    phrase: "Created",
    group: "2xx Success",
    meaning: "The request succeeded and created a new resource.",
    usage: "Returned after successful form submissions or POST requests.",
  },
  {
    code: 202,
    phrase: "Accepted",
    group: "2xx Success",
    meaning: "The request was accepted but processing is not complete.",
    usage: "Useful for queued jobs and async API workflows.",
  },
  {
    code: 204,
    phrase: "No Content",
    group: "2xx Success",
    meaning: "The request succeeded with no response body.",
    usage: "Common for successful deletes or silent updates.",
  },
  {
    code: 301,
    phrase: "Moved Permanently",
    group: "3xx Redirection",
    meaning: "The resource has a permanent new URL.",
    usage: "Use for durable SEO redirects after URL changes.",
  },
  {
    code: 302,
    phrase: "Found",
    group: "3xx Redirection",
    meaning: "The resource is temporarily available at another URL.",
    usage: "Use for short-lived redirects and temporary routing.",
  },
  {
    code: 304,
    phrase: "Not Modified",
    group: "3xx Redirection",
    meaning: "The cached client copy is still valid.",
    usage: "Used with conditional requests and browser caching.",
  },
  {
    code: 307,
    phrase: "Temporary Redirect",
    group: "3xx Redirection",
    meaning: "Temporary redirect that preserves the original method.",
    usage: "Useful when POST or PUT requests must not become GET requests.",
  },
  {
    code: 308,
    phrase: "Permanent Redirect",
    group: "3xx Redirection",
    meaning: "Permanent redirect that preserves the original method.",
    usage: "Use for permanent API or form endpoint moves.",
  },
  {
    code: 400,
    phrase: "Bad Request",
    group: "4xx Client Error",
    meaning: "The server could not understand the request.",
    usage: "Return for malformed input or invalid request syntax.",
  },
  {
    code: 401,
    phrase: "Unauthorized",
    group: "4xx Client Error",
    meaning: "Authentication is required or failed.",
    usage: "Use when a login, token, or credential is missing or invalid.",
  },
  {
    code: 403,
    phrase: "Forbidden",
    group: "4xx Client Error",
    meaning: "The server understood the request but refuses access.",
    usage: "Use when the user is known but lacks permission.",
  },
  {
    code: 404,
    phrase: "Not Found",
    group: "4xx Client Error",
    meaning: "The requested resource could not be found.",
    usage: "Return for missing pages, records, and routes.",
  },
  {
    code: 405,
    phrase: "Method Not Allowed",
    group: "4xx Client Error",
    meaning: "The resource does not support the HTTP method.",
    usage: "Return when POST, PUT, or DELETE is not allowed.",
  },
  {
    code: 409,
    phrase: "Conflict",
    group: "4xx Client Error",
    meaning: "The request conflicts with current resource state.",
    usage: "Use for duplicate records or edit conflicts.",
  },
  {
    code: 410,
    phrase: "Gone",
    group: "4xx Client Error",
    meaning: "The resource used to exist but is intentionally removed.",
    usage: "Useful for SEO when content is permanently retired.",
  },
  {
    code: 418,
    phrase: "I'm a teapot",
    group: "4xx Client Error",
    meaning: "An April Fools status code from RFC 2324.",
    usage: "Mostly used as an easter egg or test response.",
  },
  {
    code: 429,
    phrase: "Too Many Requests",
    group: "4xx Client Error",
    meaning: "The client sent too many requests in a given time.",
    usage: "Use for rate limits and abuse protection.",
  },
  {
    code: 500,
    phrase: "Internal Server Error",
    group: "5xx Server Error",
    meaning: "The server hit an unexpected failure.",
    usage: "Generic fallback for unhandled server errors.",
  },
  {
    code: 502,
    phrase: "Bad Gateway",
    group: "5xx Server Error",
    meaning: "A gateway received an invalid upstream response.",
    usage: "Common with reverse proxies and upstream service failures.",
  },
  {
    code: 503,
    phrase: "Service Unavailable",
    group: "5xx Server Error",
    meaning: "The server is temporarily unable to handle the request.",
    usage: "Use during maintenance, overload, or temporary outages.",
  },
  {
    code: 504,
    phrase: "Gateway Timeout",
    group: "5xx Server Error",
    meaning: "A gateway timed out waiting for an upstream response.",
    usage: "Common when backend services are slow or unavailable.",
  },
];

const GROUPS = [
  "1xx Informational",
  "2xx Success",
  "3xx Redirection",
  "4xx Client Error",
  "5xx Server Error",
];

function matchesSearch(status: StatusCode, search: string) {
  const keyword = search.trim().toLowerCase();

  if (!keyword) return true;

  return (
    String(status.code).includes(keyword) ||
    status.phrase.toLowerCase().includes(keyword) ||
    status.group.toLowerCase().includes(keyword) ||
    status.meaning.toLowerCase().includes(keyword) ||
    status.usage.toLowerCase().includes(keyword)
  );
}

export default function HttpStatusCodeReferenceTool() {
  const { isDark } = useTheme();
  const [search, setSearch] = useState("");

  const filteredCodes = useMemo(
    () => STATUS_CODES.filter((status) => matchesSearch(status, search)),
    [search],
  );

  const clear = () => {
    setSearch("");
  };

  return (
    <ToolPanel>
      <div>
        <ToolLabel>Search status code or phrase</ToolLabel>
        <ToolInput value={search} onChange={setSearch} placeholder="404, redirect, cache..." />
      </div>

      <ToolButtonRow>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToolStatCard label="Matching codes" value={filteredCodes.length} />
        <ToolStatCard label="Total listed" value={STATUS_CODES.length} />
      </div>

      {GROUPS.map((group) => {
        const codes = filteredCodes.filter((status) => status.group === group);

        if (codes.length === 0) return null;

        return (
          <ToolResultBox key={group}>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{group}</h3>

              <div className="space-y-3">
                {codes.map((status) => (
                  <div
                    key={status.code}
                    className={`rounded-2xl border p-4 ${
                      isDark
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-[#E5DED0] bg-[#FFFDF7]"
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xl font-semibold">
                        {status.code}
                      </span>
                      <span className="font-medium">{status.phrase}</span>
                    </div>

                    <p
                      className={
                        isDark
                          ? "mt-2 text-sm text-white/55"
                          : "mt-2 text-sm text-[#6B665D]"
                      }
                    >
                      {status.meaning}
                    </p>

                    <p
                      className={
                        isDark
                          ? "mt-2 text-sm text-white/45"
                          : "mt-2 text-sm text-[#8A8173]"
                      }
                    >
                      Typical usage: {status.usage}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </ToolResultBox>
        );
      })}

      {filteredCodes.length === 0 ? (
        <ToolResultBox muted>No matching status codes found.</ToolResultBox>
      ) : null}
    </ToolPanel>
  );
}
