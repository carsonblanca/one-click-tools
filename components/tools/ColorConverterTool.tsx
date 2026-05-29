"use client";

import { useMemo, useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
} from "../tool-ui/ToolUI";

type ConvertedColor = {
  hex: string;
  rgb: string;
  hsl: string;
  error: string;
};

function parseHexColor(value: string) {
  const trimmed = value.trim().replace(/^#/, "");

  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return null;
  }

  const normalized =
    trimmed.length === 3
      ? trimmed
          .split("")
          .map((character) => character + character)
          .join("")
      : trimmed;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return {
    hex: `#${normalized.toUpperCase()}`,
    red,
    green,
    blue,
  };
}

function rgbToHsl(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (max === min) {
    return {
      hue: 0,
      saturation: 0,
      lightness: Math.round(lightness * 100),
    };
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  if (max === r) {
    hue = (g - b) / delta + (g < b ? 6 : 0);
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  return {
    hue: Math.round(hue * 60),
    saturation: Math.round(saturation * 100),
    lightness: Math.round(lightness * 100),
  };
}

export default function ColorConverterTool() {
  const [input, setInput] = useState("#2563EB");

  const converted = useMemo<ConvertedColor>(() => {
    if (!input.trim()) {
      return {
        hex: "",
        rgb: "",
        hsl: "",
        error: "",
      };
    }

    const color = parseHexColor(input);

    if (!color) {
      return {
        hex: "",
        rgb: "",
        hsl: "",
        error: "Enter a valid 3 or 6 digit HEX color.",
      };
    }

    const hsl = rgbToHsl(color.red, color.green, color.blue);

    return {
      hex: color.hex,
      rgb: `rgb(${color.red}, ${color.green}, ${color.blue})`,
      hsl: `hsl(${hsl.hue}, ${hsl.saturation}%, ${hsl.lightness}%)`,
      error: "",
    };
  }, [input]);

  const copyValue = async (value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
  };

  return (
    <ToolPanel>
      <div>
        <ToolLabel>HEX color</ToolLabel>
        <ToolInput
          value={input}
          onChange={setInput}
          placeholder="#2563EB"
        />
      </div>

      <div
        className="mt-5 h-28 rounded-2xl border border-white/10"
        style={{ backgroundColor: converted.hex || "transparent" }}
      />

      {converted.error ? (
        <ToolResultBox>{converted.error}</ToolResultBox>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ToolResultBox muted={!converted.hex}>
            <div className="text-sm font-medium">HEX</div>
            <div className="mt-2">{converted.hex || "-"}</div>
            <ToolButtonRow>
              <ToolButton
                onClick={() => copyValue(converted.hex)}
                variant="secondary"
              >
                Copy HEX
              </ToolButton>
            </ToolButtonRow>
          </ToolResultBox>

          <ToolResultBox muted={!converted.rgb}>
            <div className="text-sm font-medium">RGB</div>
            <div className="mt-2">{converted.rgb || "-"}</div>
            <ToolButtonRow>
              <ToolButton
                onClick={() => copyValue(converted.rgb)}
                variant="secondary"
              >
                Copy RGB
              </ToolButton>
            </ToolButtonRow>
          </ToolResultBox>

          <ToolResultBox muted={!converted.hsl}>
            <div className="text-sm font-medium">HSL</div>
            <div className="mt-2">{converted.hsl || "-"}</div>
            <ToolButtonRow>
              <ToolButton
                onClick={() => copyValue(converted.hsl)}
                variant="secondary"
              >
                Copy HSL
              </ToolButton>
            </ToolButtonRow>
          </ToolResultBox>
        </div>
      )}

      <ToolButtonRow>
        <ToolButton onClick={() => setInput("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>
    </ToolPanel>
  );
}
