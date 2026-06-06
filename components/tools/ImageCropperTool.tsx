"use client";

import { useRef, useState } from "react";
import { useTheme } from "../ThemeProvider";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
} from "../tool-ui/ToolUI";

type ImageDetails = {
  name: string;
  width: number;
  height: number;
  url: string;
};

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the selected image."));
    image.src = url;
  });
}

function toPositiveNumber(value: string, label: string) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }

  return Math.round(numberValue);
}

function toNonNegativeNumber(value: string, label: string) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`${label} must be zero or greater.`);
  }

  return Math.round(numberValue);
}

export default function ImageCropperTool() {
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<ImageDetails | null>(null);
  const [cropX, setCropX] = useState("0");
  const [cropY, setCropY] = useState("0");
  const [cropWidth, setCropWidth] = useState("");
  const [cropHeight, setCropHeight] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [error, setError] = useState("");

  const chooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;

    const url = URL.createObjectURL(file);

    try {
      const loadedImage = await loadImage(url);

      if (image?.url) URL.revokeObjectURL(image.url);
      if (resultUrl) URL.revokeObjectURL(resultUrl);

      setImage({
        name: file.name,
        width: loadedImage.naturalWidth,
        height: loadedImage.naturalHeight,
        url,
      });
      setCropX("0");
      setCropY("0");
      setCropWidth(String(loadedImage.naturalWidth));
      setCropHeight(String(loadedImage.naturalHeight));
      setResultUrl("");
      setError("");
    } catch (caught) {
      URL.revokeObjectURL(url);
      setError(caught instanceof Error ? caught.message : "Invalid image file.");
    }
  };

  const crop = async () => {
    if (!image) {
      setError("Choose an image first.");
      return;
    }

    try {
      const x = toNonNegativeNumber(cropX, "X");
      const y = toNonNegativeNumber(cropY, "Y");
      const width = toPositiveNumber(cropWidth, "Width");
      const height = toPositiveNumber(cropHeight, "Height");

      if (x >= image.width || y >= image.height) {
        throw new Error("Crop origin must be inside the image.");
      }

      if (x + width > image.width || y + height > image.height) {
        throw new Error("Crop area must fit inside the image bounds.");
      }

      const loadedImage = await loadImage(image.url);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available in this browser.");

      context.drawImage(loadedImage, x, y, width, height, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) {
          setError("Could not create the cropped image.");
          return;
        }

        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(URL.createObjectURL(blob));
        setError("");
      }, "image/png");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not crop image.");
    }
  };

  const download = () => {
    if (!resultUrl) {
      setError("Crop an image before downloading.");
      return;
    }

    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = "cropped.png";
    link.click();
  };

  const clear = () => {
    if (image?.url) URL.revokeObjectURL(image.url);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setImage(null);
    setCropX("0");
    setCropY("0");
    setCropWidth("");
    setCropHeight("");
    setResultUrl("");
    setError("");
  };

  return (
    <ToolPanel>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0] || null)}
      />

      <ToolButtonRow>
        <ToolButton onClick={chooseFile}>Choose Image</ToolButton>
        <ToolButton onClick={crop}>Crop</ToolButton>
        <ToolButton onClick={download} variant="secondary">
          Download
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      {image ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ToolStatCard label="File" value={image.name} />
            <ToolStatCard label="Width" value={`${image.width}px`} />
            <ToolStatCard label="Height" value={`${image.height}px`} />
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-4">
            <div>
              <ToolLabel>X</ToolLabel>
              <ToolInput value={cropX} onChange={setCropX} type="number" />
            </div>

            <div>
              <ToolLabel>Y</ToolLabel>
              <ToolInput value={cropY} onChange={setCropY} type="number" />
            </div>

            <div>
              <ToolLabel>Width</ToolLabel>
              <ToolInput
                value={cropWidth}
                onChange={setCropWidth}
                type="number"
              />
            </div>

            <div>
              <ToolLabel>Height</ToolLabel>
              <ToolInput
                value={cropHeight}
                onChange={setCropHeight}
                type="number"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <ToolResultBox>
              <div className="mb-3 font-medium">Original preview</div>
              <img
                src={image.url}
                alt="Original preview"
                className={`max-h-[420px] max-w-full rounded-2xl border object-contain ${
                  isDark ? "border-white/10" : "border-[#E5DED0]"
                }`}
              />
            </ToolResultBox>

            <ToolResultBox muted={!resultUrl && !error}>
              {error || resultUrl ? (
                error || (
                  <>
                    <div className="mb-3 font-medium">Cropped preview</div>
                    <img
                      src={resultUrl}
                      alt="Cropped preview"
                      className={`max-h-[420px] max-w-full rounded-2xl border object-contain ${
                        isDark ? "border-white/10" : "border-[#E5DED0]"
                      }`}
                    />
                  </>
                )
              ) : (
                "Cropped image will appear here."
              )}
            </ToolResultBox>
          </div>
        </>
      ) : (
        <ToolResultBox muted>
          Choose a local image to crop it in your browser.
        </ToolResultBox>
      )}
    </ToolPanel>
  );
}
