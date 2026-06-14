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

const analyticsBase = {
  tool_slug: "image-resizer",
  tool_category: "Image",
  tool_type: "image_processing",
  locale: "en",
} satisfies ToolEventParams;

export default function ImageResizerTool() {
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
    <div className="mt-8">
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
        className="block w-full rounded-xl border border-white/10 bg-black/30 p-4"
      />

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <input
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          placeholder="Width, e.g. 800"
          className="rounded-xl border border-white/10 bg-black/30 p-4"
        />

        <input
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          placeholder="Height, e.g. 600"
          className="rounded-xl border border-white/10 bg-black/30 p-4"
        />
      </div>

      <button
        onClick={resizeImage}
        className="mt-4 rounded-xl bg-purple-600 px-5 py-3"
      >
        Resize Image
      </button>

      {preview && (
        <div className="mt-8">
          <img
            src={preview}
            alt="Resized preview"
            className="max-w-full rounded-2xl border border-white/10"
          />

          <a
            href={downloadUrl}
            download="resized.png"
            onClick={() =>
              trackResultDownload({
                ...analyticsBase,
                output_type: "image/png",
                result_type: "resized_image",
              })
            }
            className="mt-6 inline-block rounded-xl bg-purple-600 px-5 py-3"
          >
            Download Image
          </a>
        </div>
      )}
    </div>
  );
}
