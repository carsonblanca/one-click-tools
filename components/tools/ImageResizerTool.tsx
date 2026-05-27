"use client";

import { useState } from "react";

export default function ImageResizerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [preview, setPreview] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const resizeImage = () => {
    if (!file) return;

    const newWidth = Number(width);
    const newHeight = Number(height);

    if (!newWidth || !newHeight) {
      alert("Please enter valid width and height.");
      return;
    }

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
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          const url = URL.createObjectURL(blob);
          setPreview(url);
          setDownloadUrl(url);
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
            className="mt-6 inline-block rounded-xl bg-purple-600 px-5 py-3"
          >
            Download Image
          </a>
        </div>
      )}
    </div>
  );
}