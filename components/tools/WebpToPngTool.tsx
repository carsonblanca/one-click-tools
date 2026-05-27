"use client";

import { useState } from "react";

export default function WebpToPngTool() {
  const [preview, setPreview] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string>("");

  const convertImage = (file: File) => {
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

      canvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        setPreview(url);
        setDownloadUrl(url);
      }, "image/png");
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="mt-8">
      <input
        type="file"
        accept="image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) convertImage(file);
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
            download="converted.png"
            className="mt-6 inline-block rounded-xl bg-purple-600 px-5 py-3"
          >
            Download PNG
          </a>
        </div>
      )}
    </div>
  );
}