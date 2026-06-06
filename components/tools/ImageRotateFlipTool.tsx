"use client";

import { useRef, useState } from "react";
import { useTheme } from "../ThemeProvider";
import {
  ToolButton,
  ToolButtonRow,
  ToolCheckbox,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
} from "../tool-ui/ToolUI";

type Rotation = 0 | 90 | 180 | 270;

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

export default function ImageRotateFlipTool() {
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<ImageDetails | null>(null);
  const [rotation, setRotation] = useState<Rotation>(90);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
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
      setResultUrl("");
      setError("");
    } catch (caught) {
      URL.revokeObjectURL(url);
      setError(caught instanceof Error ? caught.message : "Invalid image file.");
    }
  };

  const apply = async () => {
    if (!image) {
      setError("Choose an image first.");
      return;
    }

    try {
      const loadedImage = await loadImage(image.url);
      const canvas = document.createElement("canvas");
      const isQuarterTurn = rotation === 90 || rotation === 270;
      canvas.width = isQuarterTurn ? loadedImage.height : loadedImage.width;
      canvas.height = isQuarterTurn ? loadedImage.width : loadedImage.height;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available in this browser.");

      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((rotation * Math.PI) / 180);
      context.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
      context.drawImage(
        loadedImage,
        -loadedImage.width / 2,
        -loadedImage.height / 2,
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          setError("Could not create the transformed image.");
          return;
        }

        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(URL.createObjectURL(blob));
        setError("");
      }, "image/png");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not transform image.",
      );
    }
  };

  const download = () => {
    if (!resultUrl) {
      setError("Apply a transform before downloading.");
      return;
    }

    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = "rotated-flipped.png";
    link.click();
  };

  const clear = () => {
    if (image?.url) URL.revokeObjectURL(image.url);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setImage(null);
    setRotation(90);
    setFlipHorizontal(false);
    setFlipVertical(false);
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
        <ToolButton onClick={apply}>Apply</ToolButton>
        <ToolButton onClick={download} variant="secondary">
          Download
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <div className="mt-5">
        <ToolButtonRow>
          {[90, 180, 270].map((value) => (
            <ToolButton
              key={value}
              onClick={() => setRotation(value as Rotation)}
              variant={rotation === value ? "primary" : "secondary"}
            >
              Rotate {value} deg
            </ToolButton>
          ))}
        </ToolButtonRow>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToolCheckbox checked={flipHorizontal} onChange={setFlipHorizontal}>
          Flip horizontal
        </ToolCheckbox>
        <ToolCheckbox checked={flipVertical} onChange={setFlipVertical}>
          Flip vertical
        </ToolCheckbox>
      </div>

      {image ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ToolStatCard label="File" value={image.name} />
            <ToolStatCard label="Width" value={`${image.width}px`} />
            <ToolStatCard label="Height" value={`${image.height}px`} />
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
                    <div className="mb-3 font-medium">Transformed preview</div>
                    <img
                      src={resultUrl}
                      alt="Transformed preview"
                      className={`max-h-[420px] max-w-full rounded-2xl border object-contain ${
                        isDark ? "border-white/10" : "border-[#E5DED0]"
                      }`}
                    />
                  </>
                )
              ) : (
                "Transformed image will appear here."
              )}
            </ToolResultBox>
          </div>
        </>
      ) : (
        <ToolResultBox muted>
          Choose a local image to rotate or flip it in your browser.
        </ToolResultBox>
      )}
    </ToolPanel>
  );
}
