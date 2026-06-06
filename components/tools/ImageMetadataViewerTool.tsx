"use client";

import { useRef, useState } from "react";
import { useTheme } from "../ThemeProvider";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
} from "../tool-ui/ToolUI";

type ImageMetadata = {
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
  ratio: string;
  url: string;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 2)} ${units[index]}`;
}

function gcd(first: number, second: number): number {
  return second === 0 ? first : gcd(second, first % second);
}

function aspectRatio(width: number, height: number) {
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the selected image."));
    image.src = url;
  });
}

export default function ImageMetadataViewerTool() {
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [error, setError] = useState("");

  const chooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;

    const url = URL.createObjectURL(file);

    try {
      const image = await loadImage(url);

      if (metadata?.url) URL.revokeObjectURL(metadata.url);

      setMetadata({
        name: file.name,
        type: file.type || "Unknown",
        size: file.size,
        width: image.naturalWidth,
        height: image.naturalHeight,
        ratio: aspectRatio(image.naturalWidth, image.naturalHeight),
        url,
      });
      setError("");
    } catch (caught) {
      URL.revokeObjectURL(url);
      setMetadata(null);
      setError(caught instanceof Error ? caught.message : "Invalid image file.");
    }
  };

  const clear = () => {
    if (metadata?.url) URL.revokeObjectURL(metadata.url);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setMetadata(null);
    setError("");
  };

  return (
    <ToolPanel>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0] || null)}
      />

      <ToolButtonRow>
        <ToolButton onClick={chooseFile}>Choose Image</ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      {error ? <ToolResultBox>{error}</ToolResultBox> : null}

      {metadata ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolStatCard label="File name" value={metadata.name} />
            <ToolStatCard label="File type" value={metadata.type} />
            <ToolStatCard label="File size" value={formatBytes(metadata.size)} />
            <ToolStatCard label="Image width" value={`${metadata.width}px`} />
            <ToolStatCard label="Image height" value={`${metadata.height}px`} />
            <ToolStatCard label="Aspect ratio" value={metadata.ratio} />
          </div>

          <ToolResultBox>
            <div className="space-y-4">
              <img
                src={metadata.url}
                alt="Selected image preview"
                className={`max-h-[420px] max-w-full rounded-2xl border object-contain ${
                  isDark ? "border-white/10" : "border-[#E5DED0]"
                }`}
              />

              <p className={isDark ? "text-sm text-white/50" : "text-sm text-[#6B665D]"}>
                Basic browser-readable metadata is shown. Advanced EXIF data may
                not be shown without a dedicated parser.
              </p>
            </div>
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>
          Choose a local image to view basic file and dimension metadata.
        </ToolResultBox>
      )}
    </ToolPanel>
  );
}
