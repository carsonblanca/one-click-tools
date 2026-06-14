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
  tool_slug: "png-to-webp",
  tool_category: "Image",
  tool_type: "file_conversion",
  locale: "en",
} satisfies ToolEventParams;

export default function PngToWebpTool() {
  const [preview, setPreview] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string>("");

  useEffect(() => {
    trackToolView(analyticsBase);
  }, []);

  const convertImage = (file: File) => {
    const startedAt = performance.now();
    trackProcessStart({
      ...analyticsBase,
      input_type: getFileInputType(file),
      output_type: "image/webp",
      source_context: "convert",
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
          source_context: "convert",
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
              source_context: "convert",
              processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
            });
            return;
          }

          const url = URL.createObjectURL(blob);
          setPreview(url);
          setDownloadUrl(url);
          trackProcessSuccess({
            ...analyticsBase,
            output_type: "image/webp",
            result_type: "converted_image",
            processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
          });
        },
        "image/webp",
        0.85
      );
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="mt-8">
      <input
        type="file"
        accept="image/png"
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
            convertImage(file);
          }
        }}
        className="block w-full rounded-xl border border-white/10 bg-black/30 p-4"
      />

      {preview && (
        <div className="mt-8">
          <img
            src={preview}
            alt="Converted preview"
            className="max-w-full rounded-2xl border border-white/10"
          />

          <a
            href={downloadUrl}
            download="converted.webp"
            onClick={() =>
              trackResultDownload({
                ...analyticsBase,
                output_type: "image/webp",
                result_type: "converted_image",
              })
            }
            className="mt-6 inline-block rounded-xl bg-purple-600 px-5 py-3"
          >
            Download WEBP
          </a>
        </div>
      )}
    </div>
  );
}
