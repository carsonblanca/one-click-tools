"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "../ThemeProvider";
import {
  ToolButton,
  ToolButtonRow,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

const MATRIX_SIZE = 33;
const CANVAS_SIZE = 264;

function mix(value: number) {
  let next = value >>> 0;
  next ^= next >>> 16;
  next = Math.imul(next, 0x7feb352d);
  next ^= next >>> 15;
  next = Math.imul(next, 0x846ca68b);
  next ^= next >>> 16;
  return next >>> 0;
}

function hashText(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function createEmptyMatrix() {
  return Array.from({ length: MATRIX_SIZE }, () =>
    Array.from({ length: MATRIX_SIZE }, () => false),
  );
}

function createReservedMatrix() {
  return Array.from({ length: MATRIX_SIZE }, () =>
    Array.from({ length: MATRIX_SIZE }, () => false),
  );
}

function markReserved(
  reserved: boolean[][],
  startRow: number,
  startCol: number,
  size: number,
) {
  for (let row = startRow; row < startRow + size; row += 1) {
    for (let col = startCol; col < startCol + size; col += 1) {
      if (reserved[row]?.[col] !== undefined) {
        reserved[row][col] = true;
      }
    }
  }
}

function addFinderPattern(
  matrix: boolean[][],
  reserved: boolean[][],
  startRow: number,
  startCol: number,
) {
  markReserved(reserved, startRow - 1, startCol - 1, 9);

  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const isBorder = row === 0 || row === 6 || col === 0 || col === 6;
      const isCenter = row >= 2 && row <= 4 && col >= 2 && col <= 4;
      matrix[startRow + row][startCol + col] = isBorder || isCenter;
    }
  }
}

function buildVisualCode(value: string) {
  const matrix = createEmptyMatrix();
  const reserved = createReservedMatrix();
  const seed = hashText(value);

  addFinderPattern(matrix, reserved, 0, 0);
  addFinderPattern(matrix, reserved, 0, MATRIX_SIZE - 7);
  addFinderPattern(matrix, reserved, MATRIX_SIZE - 7, 0);

  for (let index = 8; index < MATRIX_SIZE - 8; index += 1) {
    matrix[8][index] = index % 2 === 0;
    matrix[index][8] = index % 2 === 0;
    reserved[8][index] = true;
    reserved[index][8] = true;
  }

  let dataIndex = 0;

  for (let row = 0; row < MATRIX_SIZE; row += 1) {
    for (let col = 0; col < MATRIX_SIZE; col += 1) {
      if (reserved[row][col]) continue;

      const mixed = mix(
        seed +
          row * 374761393 +
          col * 668265263 +
          dataIndex * 2246822519,
      );
      matrix[row][col] = mixed % 8 < 3;
      dataIndex += 1;
    }
  }

  return matrix;
}

function drawMatrix(canvas: HTMLCanvasElement, matrix: boolean[][]) {
  const context = canvas.getContext("2d");

  if (!context) return;

  const ratio = window.devicePixelRatio || 1;
  const cellSize = CANVAS_SIZE / MATRIX_SIZE;

  canvas.width = CANVAS_SIZE * ratio;
  canvas.height = CANVAS_SIZE * ratio;
  canvas.style.width = `${CANVAS_SIZE}px`;
  canvas.style.height = `${CANVAS_SIZE}px`;

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  context.fillStyle = "#111827";

  matrix.forEach((row, rowIndex) => {
    row.forEach((isFilled, colIndex) => {
      if (!isFilled) return;

      context.fillRect(
        Math.round(colIndex * cellSize),
        Math.round(rowIndex * cellSize),
        Math.ceil(cellSize),
        Math.ceil(cellSize),
      );
    });
  });
}

export default function QrCodeGeneratorTool() {
  const { isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [input, setInput] = useState("");
  const [matrix, setMatrix] = useState<boolean[][] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!matrix || !canvasRef.current) return;
    drawMatrix(canvasRef.current, matrix);
  }, [matrix]);

  const generate = () => {
    const trimmed = input.trim();

    if (!trimmed) {
      setError("Enter text or a URL first.");
      setMatrix(null);
      return;
    }

    setMatrix(buildVisualCode(trimmed));
    setError("");
  };

  const downloadPng = () => {
    if (!canvasRef.current || !matrix) {
      setError("Generate a visual code before downloading.");
      return;
    }

    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = "qr-like-code.png";
    link.click();
  };

  const clear = () => {
    setInput("");
    setMatrix(null);
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

      <ToolResultBox muted={!matrix && !error}>
        {error || matrix ? (
          <div className="space-y-4">
            {error ? (
              <div>{error}</div>
            ) : (
              <>
                <div
                  className={
                    isDark ? "text-sm text-white/55" : "text-sm text-[#6B665D]"
                  }
                >
                  Simple visual code only. This preview is not a
                  standards-compliant QR code.
                </div>
                <div className="inline-flex max-w-full overflow-auto rounded-2xl border border-[#E5DED0] bg-white p-4">
                  <canvas ref={canvasRef} aria-label="Generated visual code" />
                </div>
              </>
            )}
          </div>
        ) : (
          "Generated visual code will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
