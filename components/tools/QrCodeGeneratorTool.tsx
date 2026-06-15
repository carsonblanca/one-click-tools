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
import { ToolPanel, ToolResultBox } from "../tool-ui/ToolUI";

const CANVAS_SIZE = 264;
const QR_INPUT_ID = "qr-code-input";

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
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");

  const generated = Boolean(qrDataUrl);

  useEffect(() => {
    trackToolView(analyticsBase);
  }, []);

  useEffect(() => {
    if (!qrDataUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Failed to prepare the QR preview.");
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * ratio;
    canvas.height = CANVAS_SIZE * ratio;
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;

    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.onerror = () => {
      console.error("Failed to draw generated QR data URL.");
      setError("Failed to render the QR preview.");
    };
    image.src = qrDataUrl;
  }, [qrDataUrl]);

  const generate = useCallback(async () => {
    const startedAt = performance.now();
    trackToolStart(analyticsBase);

    const trimmed = input.trim();

    if (!trimmed) {
      setError("Enter text or a URL first.");
      setQrDataUrl("");
      trackProcessError({
        ...analyticsBase,
        error_code: "missing_input",
        source_context: "generate",
      });
      return;
    }

    setError("");
    setQrDataUrl("");

    trackProcessStart({
      ...analyticsBase,
      input_type: "text",
      output_type: "png",
      source_context: "generate",
    });

    const darkColor = isDark ? "#FFFFFF" : "#111827";
    const lightColor = isDark ? "#111827" : "#FFFFFF";

    try {
      const dataUrl = await QRCode.toDataURL(trimmed, {
        width: CANVAS_SIZE,
        margin: 2,
        type: "image/png",
        color: { dark: darkColor, light: lightColor },
        errorCorrectionLevel: "M",
      });

      if (!dataUrl.startsWith("data:image/png;base64,")) {
        throw new Error("QR library returned an unexpected image format.");
      }

      setQrDataUrl(dataUrl);
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
    } catch (err) {
      console.error("Failed to generate QR code.", err);
      setError("Failed to generate QR code. Please check your input and try again.");
      setQrDataUrl("");
      trackProcessError({
        ...analyticsBase,
        error_code: "unknown_error",
        source_context: "generate",
      });
    }
  }, [input, isDark]);

  const downloadPng = () => {
    trackToolStart(analyticsBase);

    if (!qrDataUrl) {
      setError("Generate a QR code before downloading.");
      trackProcessError({
        ...analyticsBase,
        error_code: "missing_input",
        source_context: "download_png",
      });
      return;
    }

    const link = document.createElement("a");
    link.href = qrDataUrl;
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
    setQrDataUrl("");
    setError("");
  };

  const labelClass = `mb-2 block text-sm ${
    isDark ? "text-white/50" : "text-[#6B665D]"
  }`;
  const textareaClass = `w-full resize-y rounded-2xl border px-4 py-4 outline-none transition ${
    isDark
      ? "border-white/10 bg-white/[0.04] text-white placeholder:text-white/30 focus:border-lime-300/40"
      : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B] placeholder:text-[#8A8173] focus:border-[#2563EB]/40"
  }`;
  const primaryButtonClass = isDark
    ? "bg-lime-300 text-black hover:bg-lime-200"
    : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]";
  const secondaryButtonClass = isDark
    ? "border border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-white/[0.05]"
    : "border border-[#E5DED0] bg-white text-[#6B665D] hover:border-[#2563EB]/30 hover:text-[#18181B] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[#E5DED0] disabled:hover:text-[#6B665D]";
  const dangerButtonClass = isDark
    ? "border border-red-400/20 bg-red-400/10 text-red-200 hover:bg-red-400/15"
    : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100";
  const baseButtonClass = "rounded-2xl px-5 py-3 text-sm font-medium transition";

  return (
    <ToolPanel>
      <div>
        <label htmlFor={QR_INPUT_ID} className={labelClass}>
          Text or URL
        </label>
        <textarea
          id={QR_INPUT_ID}
          name="qr-code-content"
          data-testid="qr-code-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="https://example.com"
          rows={5}
          className={textareaClass}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="qr-generate"
          onClick={generate}
          className={`${baseButtonClass} ${primaryButtonClass}`}
        >
          Generate
        </button>
        <button
          type="button"
          data-testid="qr-download-png"
          onClick={downloadPng}
          disabled={!generated}
          className={`${baseButtonClass} ${secondaryButtonClass}`}
        >
          Download PNG
        </button>
        <button
          type="button"
          onClick={clear}
          className={`${baseButtonClass} ${dangerButtonClass}`}
        >
          Clear
        </button>
      </div>

      <ToolResultBox muted={!generated && !error}>
        {error ? (
          <div role="alert" data-testid="qr-error">
            {error}
          </div>
        ) : generated ? (
          <div className="inline-flex max-w-full overflow-auto rounded-2xl border border-[#E5DED0] bg-white p-4">
            <canvas
              ref={canvasRef}
              data-testid="qr-code-canvas"
              aria-label="Generated QR code"
            />
          </div>
        ) : (
          "Generated QR code will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
