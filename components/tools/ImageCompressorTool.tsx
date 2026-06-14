"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  type ToolErrorCode,
  type ToolEventParams,
} from "@/lib/analytics/tool-events";
import {
  formatImageCompressorFileSize,
  formatImageDimensions,
  getCompressionRateLabel,
  getCompressionRatePercent,
  getQualityPercent,
  getQualityPresetId,
  getSavedBytes,
  imageCompressorDebounceMs,
  imageCompressorQualityPresets,
  isLatestCompressionRequest,
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
type QualityChangeSource = "quality_slider" | "quality_preset";

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
  const [qualityChangeNonce, setQualityChangeNonce] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stats, setStats] = useState<CompressionStats | null>(null);
  const [preview, setPreview] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const selectedFileRef = useRef<File | null>(null);
  const latestRequestIdRef = useRef(0);
  const skipNextDebouncedCompressionRef = useRef(false);
  const pendingParameterSourceRef = useRef<QualityChangeSource | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const downloadUrlRef = useRef("");
  const qualityPercent = getQualityPercent(quality);
  const activePresetId = getQualityPresetId(quality);
  const compressionRate = stats
    ? getCompressionRatePercent(stats.originalBytes, stats.outputBytes)
    : null;
  const outputSmaller = stats
    ? isOutputSmaller(stats.originalBytes, stats.outputBytes)
    : false;
  const resolutionUnchanged = stats ? isResolutionUnchanged(stats) : false;
  const statusMessage = isProcessing
    ? "Recompressing…"
    : errorMessage ||
      (stats
        ? outputSmaller
          ? `File size reduced by ${compressionRate ?? 0}%, ${
              resolutionUnchanged ? "resolution unchanged" : "resolution changed"
            }.`
          : "The output file is not smaller. Try a lower quality setting."
        : "Choose an image to adjust compression quality.");

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const revokeCurrentDownloadUrl = useCallback(() => {
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = "";
    }
  }, []);

  const compressImage = useCallback(
    (
      file: File,
      qualityValue: string,
      options: {
        clearPreviousResult: boolean;
        trackParameter: boolean;
        parameterSourceContext?: QualityChangeSource;
      },
    ) => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      const startedAt = performance.now();

      setIsProcessing(true);
      setErrorMessage("");

      if (options.clearPreviousResult) {
        revokeCurrentDownloadUrl();
        setStats(null);
        setPreview("");
        setDownloadUrl("");
      }

      if (options.trackParameter) {
        trackParameterChange({
          ...analyticsBase,
          parameter_name: "quality",
          source_context: options.parameterSourceContext || "quality_slider",
        });
      }

      trackProcessStart({
        ...analyticsBase,
        input_type: getFileInputType(file),
        output_type: "image/jpeg",
        source_context: "compress",
      });

      const failLatestRequest = (errorCode: ToolErrorCode) => {
        if (!isLatestCompressionRequest(requestId, latestRequestIdRef.current)) {
          return;
        }

        setIsProcessing(false);
        setErrorMessage("Recompression failed. Please try again.");
        trackProcessError({
          ...analyticsBase,
          error_code: errorCode,
          source_context: "compress",
          processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
        });
      };

      const img = new Image();
      const reader = new FileReader();

      reader.onload = () => {
        if (!isLatestCompressionRequest(requestId, latestRequestIdRef.current)) {
          return;
        }

        img.src = reader.result as string;
      };
      reader.onerror = () => failLatestRequest("invalid_input");

      img.onload = () => {
        if (!isLatestCompressionRequest(requestId, latestRequestIdRef.current)) {
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          failLatestRequest("canvas_error");
          return;
        }

        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (!isLatestCompressionRequest(requestId, latestRequestIdRef.current)) {
              return;
            }

            if (!blob) {
              failLatestRequest("canvas_error");
              return;
            }

            const url = URL.createObjectURL(blob);

            if (!isLatestCompressionRequest(requestId, latestRequestIdRef.current)) {
              URL.revokeObjectURL(url);
              return;
            }

            revokeCurrentDownloadUrl();
            downloadUrlRef.current = url;
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
            setErrorMessage("");
            setIsProcessing(false);
            trackProcessSuccess({
              ...analyticsBase,
              output_type: "image/jpeg",
              result_type: "compressed_image",
              processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
            });
          },
          "image/jpeg",
          Number(qualityValue),
        );
      };
      img.onerror = () => failLatestRequest("invalid_input");

      reader.readAsDataURL(file);
    },
    [revokeCurrentDownloadUrl],
  );

  useEffect(() => {
    trackToolView(analyticsBase);
  }, []);

  useEffect(() => {
    return () => {
      latestRequestIdRef.current += 1;
      clearDebounceTimer();
      revokeCurrentDownloadUrl();
    };
  }, [clearDebounceTimer, revokeCurrentDownloadUrl]);

  useEffect(() => {
    if (!selectedFile) return;

    if (skipNextDebouncedCompressionRef.current) {
      skipNextDebouncedCompressionRef.current = false;
      return;
    }

    const parameterSourceContext = pendingParameterSourceRef.current || "quality_slider";
    const timer = window.setTimeout(() => {
      if (!selectedFileRef.current) return;

      debounceTimerRef.current = null;
      pendingParameterSourceRef.current = null;
      compressImage(selectedFileRef.current, quality, {
        clearPreviousResult: false,
        trackParameter: true,
        parameterSourceContext,
      });
    }, imageCompressorDebounceMs);

    debounceTimerRef.current = timer;

    return () => {
      window.clearTimeout(timer);
      if (debounceTimerRef.current === timer) {
        debounceTimerRef.current = null;
      }
    };
  }, [compressImage, quality, qualityChangeNonce, selectedFile]);

  const handleQualityChange = (
    nextQuality: string,
    sourceContext: QualityChangeSource,
  ) => {
    setQuality(nextQuality);
    setQualityChangeNonce((current) => current + 1);
    trackToolStart(analyticsBase);
    pendingParameterSourceRef.current = sourceContext;
    setErrorMessage("");

    if (selectedFileRef.current) {
      latestRequestIdRef.current += 1;
      setIsProcessing(true);
    }
  };

  const handleFile = (file: File | null) => {
    if (!file) return;

    clearDebounceTimer();
    pendingParameterSourceRef.current = null;
    skipNextDebouncedCompressionRef.current = true;
    selectedFileRef.current = file;
    setSelectedFile(file);
    trackToolStart(analyticsBase);
    trackFileSelected({
      ...analyticsBase,
      input_type: getFileInputType(file),
      file_size_bucket: getFileSizeBucket(file.size),
      file_count_bucket: "1",
    });
    compressImage(file, quality, {
      clearPreviousResult: true,
      trackParameter: false,
    });
  };

  const downloadCurrentResult = () => {
    if (isProcessing || !downloadUrl) return;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "compressed.jpg";
    link.click();
    trackResultDownload({
      ...analyticsBase,
      output_type: "image/jpeg",
      result_type: "compressed_image",
    });
  };

  return (
    <div className="mt-8">
      <div className="mb-5">
        <div className="mb-3 flex items-end justify-between gap-4">
          <label
            className={isDark ? "block text-sm text-white/60" : "block text-sm text-[#6B665D]"}
            htmlFor="image-compressor-quality"
          >
            Compression quality
          </label>
          <div className="text-3xl font-semibold tabular-nums">{qualityPercent}%</div>
        </div>

        <input
          id="image-compressor-quality"
          type="range"
          min="0.1"
          max="1"
          step="0.01"
          value={quality}
          aria-valuemin={10}
          aria-valuemax={100}
          aria-valuenow={qualityPercent}
          aria-valuetext={`${qualityPercent}%`}
          onChange={(e) => handleQualityChange(e.target.value, "quality_slider")}
          className="w-full"
        />

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {imageCompressorQualityPresets.map((preset) => {
            const isActive = activePresetId === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleQualityChange(preset.quality, "quality_preset")}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? isDark
                      ? "border-lime-300/50 bg-lime-300/15 text-lime-100"
                      : "border-[#2563EB]/40 bg-[#2563EB]/10 text-[#1D4ED8]"
                    : isDark
                      ? "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.07]"
                      : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D] hover:border-[#2563EB]/30"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
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
        } ${
          errorMessage || (stats && !outputSmaller)
            ? isDark
              ? "text-amber-100"
              : "text-amber-700"
            : ""
        }`}
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
              label="Resolution status"
              value={resolutionUnchanged ? "Resolution unchanged" : "Resolution changed"}
              isDark={isDark}
              tone={resolutionUnchanged ? "success" : "warning"}
            />
          </div>
        </div>
      )}

      {preview && (
        <div className="mt-8">
          {isProcessing && (
            <div className={isDark ? "mb-3 text-sm text-white/50" : "mb-3 text-sm text-[#6B665D]"}>
              Recompressing…
            </div>
          )}

          <img
            src={preview}
            alt="Compressed preview"
            className={`max-w-full rounded-2xl border object-contain transition ${
              isDark ? "border-white/10" : "border-[#E5DED0]"
            } ${isProcessing ? "opacity-60" : "opacity-100"}`}
          />

          <button
            type="button"
            onClick={downloadCurrentResult}
            disabled={isProcessing || !downloadUrl}
            className={`mt-6 inline-block rounded-xl px-5 py-3 transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isDark
                ? "bg-purple-600 text-white hover:bg-purple-500"
                : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
            }`}
          >
            Download Compressed Image
          </button>
        </div>
      )}
    </div>
  );
}
