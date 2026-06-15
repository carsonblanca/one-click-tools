"use client";

import { useEffect, useState } from "react";
import {
  getFileInputType,
  getFileSizeBucket,
  getProcessingTimeBucket,
  trackFileSelected,
  trackProcessError,
  trackProcessStart,
  trackProcessSuccess,
  trackResultDownload,
  trackToolStart,
  trackToolView,
  type ToolEventParams,
} from "@/lib/analytics/tool-events";
import { useTheme } from "../ThemeProvider";
import {
  ToolButton,
  ToolInput,
  ToolPanel,
  ToolResultBox,
} from "../tool-ui/ToolUI";

const analyticsBase = {
  tool_slug: "image-resizer",
  tool_category: "Image",
  tool_type: "image_processing",
  locale: "en",
} satisfies ToolEventParams;

export default function ImageResizerTool() {
  const { isDark } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [preview, setPreview] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  useEffect(() => {
    trackToolView(analyticsBase);
  }, []);

  const resizeImage = () => {
    trackToolStart(analyticsBase);

    if (!file) {
      trackProcessError({
        ...analyticsBase,
        error_code: "missing_input",
        source_context: "resize",
      });
      return;
    }

    const newWidth = Number(width);
    const newHeight = Number(height);

    if (!newWidth || !newHeight) {
      trackProcessError({
        ...analyticsBase,
        error_code: "invalid_input",
        source_context: "resize",
      });
      alert("Please enter valid width and height.");
      return;
    }

    const startedAt = performance.now();
    trackProcessStart({
      ...analyticsBase,
      input_type: getFileInputType(file),
      output_type: "image/png",
      source_context: "resize",
    });

    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.src = reader.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        trackProcessError({
          ...analyticsBase,
          error_code: "canvas_error",
          source_context: "resize",
          processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
        });
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            trackProcessError({
              ...analyticsBase,
              error_code: "canvas_error",
              source_context: "resize",
              processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
            });
            return;
          }

          const url = URL.createObjectURL(blob);
          setPreview(url);
          setDownloadUrl(url);
          trackProcessSuccess({
            ...analyticsBase,
            output_type: "image/png",
            result_type: "resized_image",
            processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
          });
        },
        "image/png"
      );
    };

    reader.readAsDataURL(file);
  };

  return (
    <ToolPanel>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const selectedFile = e.target.files?.[0] || null;
          setFile(selectedFile);
          if (selectedFile) {
            trackToolStart(analyticsBase);
            trackFileSelected({
              ...analyticsBase,
              input_type: getFileInputType(selectedFile),
              file_size_bucket: getFileSizeBucket(selectedFile.size),
              file_count_bucket: "1",
            });
          }
        }}
        className={`block w-full rounded-2xl border px-4 py-4 outline-none transition file:mr-3 file:rounded-xl file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-medium ${
          isDark
            ? "border-white/10 bg-black/30 text-white file:bg-lime-300 file:text-black"
            : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B] file:bg-[#2563EB] file:text-white"
        }`}
      />

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ToolInput
          value={width}
          onChange={setWidth}
          placeholder="Width, e.g. 800"
        />
        <ToolInput
          value={height}
          onChange={setHeight}
          placeholder="Height, e.g. 600"
        />
      </div>

      <div className="mt-4">
        <ToolButton onClick={resizeImage}>Resize Image</ToolButton>
      </div>

      {preview && (
        <ToolResultBox>
          <img
            src={preview}
            alt="Resized preview"
            className="max-w-full rounded-2xl"
          />

          <div className="mt-6">
            <ToolButton
              onClick={() => {
                const link = document.createElement("a");
                link.href = downloadUrl;
                link.download = "resized.png";
                link.click();
                trackResultDownload({
                  ...analyticsBase,
                  output_type: "image/png",
                  result_type: "resized_image",
                });
              }}
            >
              Download Image
            </ToolButton>
          </div>
        </ToolResultBox>
      )}
    </ToolPanel>
  );
}
