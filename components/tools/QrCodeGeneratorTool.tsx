"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  getProcessingTimeBucket,
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
  ToolButtonRow,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

const CANVAS_SIZE = 264;

const analyticsBase = {
  tool_slug: "qr-code-generator",
  tool_category: "Utility",
  tool_type: "generator",
  locale: "en",
} satisfies ToolEventParams;

export default function QrCodeGeneratorTool() {
  const { isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [input, setInput] = useState("");
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    trackToolView(analyticsBase);
  }, []);

  const generate = useCallback(() => {
    const startedAt = performance.now();
    trackToolStart(analyticsBase);

    const trimmed = input.trim();

    if (!trimmed) {
      setError("Enter text or a URL first.");
      setGenerated(false);
      trackProcessError({
        ...analyticsBase,
        error_code: "missing_input",
        source_context: "generate",
      });
      return;
    }

    if (!canvasRef.current) return;

    trackProcessStart({
      ...analyticsBase,
      input_type: "text",
      output_type: "png",
      source_context: "generate",
    });

    const darkColor = isDark ? "#FFFFFF" : "#111827";
    const lightColor = isDark ? "#111827" : "#FFFFFF";

    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * ratio;
    canvas.height = CANVAS_SIZE * ratio;
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;

    QRCode.toCanvas(canvas, trimmed, {
      width: CANVAS_SIZE,
      margin: 2,
      color: { dark: darkColor, light: lightColor },
      errorCorrectionLevel: "M",
    })
        .then(() => {
          setGenerated(true);
          setError("");
          trackProcessSuccess({
            ...analyticsBase,
            input_type: "text",
            output_type: "png",
            result_type: "qr_code",
            source_context: "generate",
            processing_time_bucket: getProcessingTimeBucket(
              performance.now() - startedAt,
            ),
          });
        })
        .catch(() => {
          setError("Failed to generate QR code.");
          setGenerated(false);
          trackProcessError({
            ...analyticsBase,
            error_code: "unknown_error",
            source_context: "generate",
          });
        });
  }, [input, isDark]);

  const downloadPng = () => {
    trackToolStart(analyticsBase);

    if (!canvasRef.current || !generated) {
      setError("Generate a QR code before downloading.");
      trackProcessError({
        ...analyticsBase,
        error_code: "missing_input",
        source_context: "download_png",
      });
      return;
    }

    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = "qr-code.png";
    link.click();
    trackResultDownload({
      ...analyticsBase,
      output_type: "image/png",
      result_type: "qr_code",
    });
  };

  const clear = () => {
    setInput("");
    setGenerated(false);
    setError("");
  };

  return (
    <ToolPanel>
      <div>
        <ToolLabel>Text or URL</ToolLabel>
        <ToolTextarea
          value={input}
          onChange={setInput}
          placeholder="https://example.com"
          rows={5}
        />
      </div>

      <ToolButtonRow>
        <ToolButton onClick={generate}>Generate</ToolButton>
        <ToolButton onClick={downloadPng} variant="secondary">
          Download PNG
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!generated && !error}>
        {error || generated ? (
          <div className="space-y-4">
            {error ? (
              <div>{error}</div>
            ) : (
              <div className="inline-flex max-w-full overflow-auto rounded-2xl border border-[#E5DED0] bg-white p-4">
                <canvas ref={canvasRef} aria-label="Generated QR code" />
              </div>
            )}
          </div>
        ) : (
          "Generated QR code will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
