"use client";

import { useState } from "react";

export default function ImageCompressorTool() {
  const [quality, setQuality] = useState("0.7");
  const [originalSize, setOriginalSize] = useState("");
  const [compressedSize, setCompressedSize] = useState("");
  const [preview, setPreview] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const compressImage = (file: File) => {
    setOriginalSize((file.size / 1024).toFixed(2) + " KB");

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
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          setCompressedSize((blob.size / 1024).toFixed(2) + " KB");

          const url = URL.createObjectURL(blob);
          setPreview(url);
          setDownloadUrl(url);
        },
        "image/jpeg",
        Number(quality)
      );
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="mt-8">
      <div className="mb-4">
        <label className="mb-2 block text-sm text-white/60">
          Quality: {quality}
        </label>

        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          className="w-full"
        />
      </div>

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) compressImage(file);
        }}
        className="block w-full rounded-xl border border-white/10 bg-black/30 p-4"
      />

      {(originalSize || compressedSize) && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white/5 p-4">
            <div className="text-sm text-white/50">Original Size</div>
            <div className="mt-2 text-2xl font-bold">{originalSize}</div>
          </div>

          <div className="rounded-xl bg-white/5 p-4">
            <div className="text-sm text-white/50">Compressed Size</div>
            <div className="mt-2 text-2xl font-bold">{compressedSize}</div>
          </div>
        </div>
      )}

      {preview && (
        <div className="mt-8">
          <img
            src={preview}
            alt="Compressed preview"
            className="max-w-full rounded-2xl border border-white/10"
          />

          <a
            href={downloadUrl}
            download="compressed.jpg"
            className="mt-6 inline-block rounded-xl bg-purple-600 px-5 py-3"
          >
            Download Compressed Image
          </a>
        </div>
      )}
    </div>
  );
}