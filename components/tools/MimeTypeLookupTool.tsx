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

type MimeEntry = {
  extension: string;
  mime: string;
  category: string;
  description: string;
};

const MIME_TYPES: MimeEntry[] = [
  { extension: ".png", mime: "image/png", category: "Image", description: "Portable Network Graphics image." },
  { extension: ".jpg, .jpeg", mime: "image/jpeg", category: "Image", description: "JPEG compressed image." },
  { extension: ".gif", mime: "image/gif", category: "Image", description: "GIF image or animation." },
  { extension: ".webp", mime: "image/webp", category: "Image", description: "WebP image format." },
  { extension: ".svg", mime: "image/svg+xml", category: "Image", description: "Scalable Vector Graphics document." },
  { extension: ".avif", mime: "image/avif", category: "Image", description: "AVIF compressed image." },
  { extension: ".pdf", mime: "application/pdf", category: "Document", description: "Portable Document Format file." },
  { extension: ".txt", mime: "text/plain", category: "Document", description: "Plain text file." },
  { extension: ".csv", mime: "text/csv", category: "Document", description: "Comma-separated values data." },
  { extension: ".json", mime: "application/json", category: "Document", description: "JSON structured data." },
  { extension: ".xml", mime: "application/xml", category: "Document", description: "XML structured document." },
  { extension: ".doc", mime: "application/msword", category: "Document", description: "Legacy Microsoft Word document." },
  { extension: ".docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", category: "Document", description: "Microsoft Word Open XML document." },
  { extension: ".xls", mime: "application/vnd.ms-excel", category: "Document", description: "Legacy Microsoft Excel spreadsheet." },
  { extension: ".xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", category: "Document", description: "Microsoft Excel Open XML spreadsheet." },
  { extension: ".ppt", mime: "application/vnd.ms-powerpoint", category: "Document", description: "Legacy Microsoft PowerPoint presentation." },
  { extension: ".pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", category: "Document", description: "Microsoft PowerPoint Open XML presentation." },
  { extension: ".mp3", mime: "audio/mpeg", category: "Audio", description: "MP3 audio file." },
  { extension: ".wav", mime: "audio/wav", category: "Audio", description: "Waveform audio file." },
  { extension: ".ogg", mime: "audio/ogg", category: "Audio", description: "Ogg audio file." },
  { extension: ".m4a", mime: "audio/mp4", category: "Audio", description: "MPEG-4 audio file." },
  { extension: ".mp4", mime: "video/mp4", category: "Video", description: "MPEG-4 video file." },
  { extension: ".webm", mime: "video/webm", category: "Video", description: "WebM video file." },
  { extension: ".mov", mime: "video/quicktime", category: "Video", description: "QuickTime video file." },
  { extension: ".avi", mime: "video/x-msvideo", category: "Video", description: "AVI video file." },
  { extension: ".zip", mime: "application/zip", category: "Archive", description: "ZIP archive." },
  { extension: ".rar", mime: "application/vnd.rar", category: "Archive", description: "RAR archive." },
  { extension: ".7z", mime: "application/x-7z-compressed", category: "Archive", description: "7-Zip archive." },
  { extension: ".tar", mime: "application/x-tar", category: "Archive", description: "Tape archive file." },
  { extension: ".gz", mime: "application/gzip", category: "Archive", description: "Gzip compressed file." },
  { extension: ".html, .htm", mime: "text/html", category: "Web", description: "HTML web document." },
  { extension: ".css", mime: "text/css", category: "Web", description: "Cascading Style Sheets file." },
  { extension: ".js", mime: "text/javascript", category: "Web", description: "JavaScript source file." },
  { extension: ".mjs", mime: "text/javascript", category: "Web", description: "JavaScript module file." },
  { extension: ".wasm", mime: "application/wasm", category: "Web", description: "WebAssembly binary module." },
  { extension: ".woff", mime: "font/woff", category: "Web", description: "WOFF font file." },
  { extension: ".woff2", mime: "font/woff2", category: "Web", description: "WOFF2 font file." },
  { extension: ".ico", mime: "image/x-icon", category: "Web", description: "Icon file commonly used for favicons." },
];

function matchesEntry(entry: MimeEntry, search: string) {
  const keyword = search.trim().toLowerCase().replace(/^\*/, "");

  if (!keyword) return true;

  return (
    entry.extension.toLowerCase().includes(keyword) ||
    entry.mime.toLowerCase().includes(keyword) ||
    entry.category.toLowerCase().includes(keyword) ||
    entry.description.toLowerCase().includes(keyword)
  );
}

export default function MimeTypeLookupTool() {
  const { isDark } = useTheme();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => MIME_TYPES.filter((entry) => matchesEntry(entry, search)),
    [search],
  );

  return (
    <ToolPanel>
      <div>
        <ToolLabel>Search extension or MIME type</ToolLabel>
        <ToolInput
          value={search}
          onChange={setSearch}
          placeholder=".png, application/json, video..."
        />
      </div>

      <ToolButtonRow>
        <ToolButton onClick={() => setSearch("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToolStatCard label="Matching types" value={filtered.length} />
        <ToolStatCard label="Total listed" value={MIME_TYPES.length} />
      </div>

      <ToolResultBox muted={filtered.length === 0}>
        {filtered.length > 0 ? (
          <div className="grid gap-3">
            {filtered.map((entry) => (
              <div
                key={`${entry.extension}-${entry.mime}`}
                className={`rounded-2xl border p-4 ${
                  isDark
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-[#E5DED0] bg-[#FFFDF7]"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-semibold">{entry.extension}</span>
                  <span className={isDark ? "text-white/55" : "text-[#6B665D]"}>
                    {entry.mime}
                  </span>
                </div>

                <div
                  className={
                    isDark
                      ? "mt-2 text-sm text-white/45"
                      : "mt-2 text-sm text-[#8A8173]"
                  }
                >
                  {entry.category} - {entry.description}
                </div>
              </div>
            ))}
          </div>
        ) : (
          "No matching MIME types found."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
