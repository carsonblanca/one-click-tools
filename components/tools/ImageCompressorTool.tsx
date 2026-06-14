"use client";

import { useEffect, useState } from "react";
import {
  getFileInputType,
  getFileSizeBucket,
  getProcessingTimeBucket,
  trackFileSelected,
  trackParameterChange,
  trackProcessError,
  trackProcessStart,
  trackProcessSuccess,
  trackResultDownload,
  trackToolStart,
  trackToolView,
  type ToolEventParams,
} from "@/lib/analytics/tool-events";
import {
  formatImageCompressorFileSize,
  formatImageDimensions,
  getCompressionRateLabel,
  getCompressionRatePercent,
  getQualityPercent,
  getSavedBytes,
  isOutputSmaller,
  isResolutionUnchanged,
} from "@/lib/image-compressor-stats";
import { useTheme } from "../ThemeProvider";

type CompressionStats = {
  originalBytes: number;
  outputBytes: number;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
};

type StatTone = "default" | "success" | "warning";

const analyticsBase = {
  tool_slug: "image-compressor",
  tool_category: "Image",
  tool_type: "image_processing",
  locale: "en",
} satisfies ToolEventParams;

function CompressionStatCard({
  label,
  value,
  isDark,
  tone = "default",
}: {
  label: string;
  value: string;
  isDark: boolean;
  tone?: StatTone;
}) {
  const toneClass =
    tone === "success"
      ? isDark
        ? "text-lime-200"
        : "text-emerald-700"
      : tone === "warning"
        ? isDark
          ? "text-amber-200"
          : "text-amber-700"
        : "";

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDark
          ? "border-white/10 bg-white/[0.04]"
          : "border-[#E5DED0] bg-[#F5F2EA]"
      }`}
    >
      <div className={isDark ? "text-sm text-white/45" : "text-sm text-[#8A8173]"}>
        {label}
      </div>
      <div className={`mt-2 break-words text-2xl font-semibold ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

export default function ImageCompressorTool() {
  const { isDark } = useTheme();
  const [quality, setQuality] = useState("0.7");
  const [stats, setStats] = useState<CompressionStats | null>(null);
  const [preview, setPreview] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const qualityPercent = getQualityPercent(quality);
  const compressionRate = stats
    ? getCompressionRatePercent(stats.originalBytes, stats.outputBytes)
    : null;
  const outputSmaller = stats
    ? isOutputSmaller(stats.originalBytes, stats.outputBytes)
    : false;
  const resolutionUnchanged = stats ? isResolutionUnchanged(stats) : false;
  const statusMessage = stats
    ? outputSmaller
      ? `File size reduced by ${compressionRate ?? 0}%, ${
          resolutionUnchanged ? "resolution unchanged" : "resolution changed"
        }`
      : "The output file is not smaller. Try a lower quality setting."
    : "Adjust quality to generate a result and see actual compression.";

  useEffect(() => {
    trackToolView(analyticsBase);
  }, []);

  const compressImage = (file: File) => {
    const startedAt = performance.now();

    setStats(null);
    setPreview("");
    setDownloadUrl("");
    trackProcessStart({
      ...analyticsBase,
      input_type: getFileInputType(file),
      output_type: "image/jpeg",
      source_context: "compress",
    });

    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.src = reader.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        trackProcessError({
          ...analyticsBase,
          error_code: "canvas_error",
          source_context: "compress",
          processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
        });
        return;
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            trackProcessError({
              ...analyticsBase,
              error_code: "canvas_error",
              source_context: "compress",
              processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
            });
            return;
          }

          const url = URL.createObjectURL(blob);
          setPreview(url);
          setDownloadUrl(url);
          setStats({
            originalBytes: file.size,
            outputBytes: blob.size,
            originalWidth: img.width,
            originalHeight: img.height,
            outputWidth: canvas.width,
            outputHeight: canvas.height,
          });
          trackProcessSuccess({
            ...analyticsBase,
            output_type: "image/jpeg",
            result_type: "compressed_image",
            processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
          });
        },
        "image/jpeg",
        Number(quality)
      );
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="mt-8">
      <div className="mb-5">
        <div className="mb-3 flex items-end justify-between gap-4">
          <label className={isDark ? "block text-sm text-white/60" : "block text-sm text-[#6B665D]"}>
            Compression quality
          </label>
          <div className="text-3xl font-semibold tabular-nums">{qualityPercent}%</div>
        </div>

        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={quality}
          onChange={(e) => {
            setQuality(e.target.value);
            trackToolStart(analyticsBase);
            trackParameterChange({
              ...analyticsBase,
              parameter_name: "quality",
              source_context: "quality_slider",
            });
          }}
          className="w-full"
        />
      </div>

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            trackToolStart(analyticsBase);
            trackFileSelected({
              ...analyticsBase,
              input_type: getFileInputType(file),
              file_size_bucket: getFileSizeBucket(file.size),
              file_count_bucket: "1",
            });
            compressImage(file);
          }
        }}
        className={`block w-full rounded-xl border p-4 ${
          isDark
            ? "border-white/10 bg-black/30 text-white"
            : "border-[#E5DED0] bg-[#FFFDF7] text-[#18181B]"
        }`}
      />

      <div
        className={`mt-6 rounded-2xl border p-4 text-sm ${
          isDark
            ? "border-white/10 bg-white/[0.04] text-white/60"
            : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D]"
        } ${stats && !outputSmaller ? (isDark ? "text-amber-100" : "text-amber-700") : ""}`}
      >
        {statusMessage}
      </div>

      {stats && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CompressionStatCard
              label="Original size"
              value={formatImageCompressorFileSize(stats.originalBytes)}
              isDark={isDark}
            />
            <CompressionStatCard
              label="Output size"
              value={formatImageCompressorFileSize(stats.outputBytes)}
              isDark={isDark}
              tone={outputSmaller ? "success" : "warning"}
            />
            <CompressionStatCard
              label="Actual compression"
              value={getCompressionRateLabel(stats.originalBytes, stats.outputBytes)}
              isDark={isDark}
              tone={outputSmaller ? "success" : "warning"}
            />
            <CompressionStatCard
              label="Size reduced"
              value={formatImageCompressorFileSize(
                getSavedBytes(stats.originalBytes, stats.outputBytes),
              )}
              isDark={isDark}
              tone={outputSmaller ? "success" : "warning"}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CompressionStatCard
              label="Original dimensions"
              value={formatImageDimensions(stats.originalWidth, stats.originalHeight)}
              isDark={isDark}
            />
            <CompressionStatCard
              label="Output dimensions"
              value={formatImageDimensions(stats.outputWidth, stats.outputHeight)}
              isDark={isDark}
            />
            <CompressionStatCard
              label="Resolution"
              value={resolutionUnchanged ? "Resolution unchanged" : "Resolution changed"}
              isDark={isDark}
              tone={resolutionUnchanged ? "success" : "warning"}
            />
          </div>
        </div>
      )}

      {preview && (
        <div className="mt-8">
          <img
            src={preview}
            alt="Compressed preview"
            className="max-w-full rounded-2xl border border-white/10"
          />

          <a
            href={downloadUrl}
            download="compressed.jpg"
            onClick={() =>
              trackResultDownload({
                ...analyticsBase,
                output_type: "image/jpeg",
                result_type: "compressed_image",
              })
            }
            className="mt-6 inline-block rounded-xl bg-purple-600 px-5 py-3"
          >
            Download Compressed Image
          </a>
        </div>
      )}
    </div>
  );
}
