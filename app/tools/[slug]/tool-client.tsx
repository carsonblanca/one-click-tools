"use client";

import { useState } from "react";
import Link from "next/link";

export default function ToolClient({
  tool,
}: {
  tool: any;
}) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const [file, setFile] =
    useState<File | null>(null);

  const [imageOutput, setImageOutput] =
    useState<string | null>(null);

  const runTool = () => {
    if (tool.slug === "base64") {
      try {
        setOutput(btoa(input));
      } catch {
        setOutput("Encoding Error");
      }
    }

    if (tool.slug === "json-formatter") {
      try {
        const parsed = JSON.parse(input);

        setOutput(
          JSON.stringify(parsed, null, 2)
        );
      } catch {
        setOutput("Invalid JSON");
      }
    }

    if (tool.slug === "calculator") {
      try {
        setOutput(eval(input).toString());
      } catch {
        setOutput("Calculation Error");
      }
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    const img = document.createElement("img");

    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);

    img.onload = () => {
      const canvas =
        document.createElement("canvas");

      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      const webp = canvas.toDataURL(
        "image/webp",
        0.8
      );

      setImageOutput(webp);
    };
  };

  return (
    <main className="min-h-screen bg-black text-white">
      {/* HEADER */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-xl font-semibold"
          >
            OneClick Tools
          </Link>

          <Link
            href="/"
            className="text-sm text-white/60 hover:text-white"
          >
            ← Back Home
          </Link>
        </div>
      </header>

      {/* CONTENT */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10">
          <div className="mb-4 inline-block rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
            {tool.tag}
          </div>

          <h1 className="text-5xl font-bold tracking-tight">
            {tool.name}
          </h1>

          <p className="mt-6 text-lg text-white/60">
            {tool.desc}
          </p>
        </div>

        {/* PNG TOOL */}
        {tool.slug === "png-to-webp" && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) =>
                setFile(
                  e.target.files?.[0] || null
                )
              }
            />

            <button
              onClick={handleConvert}
              className="mt-6 rounded-xl bg-purple-600 px-6 py-3"
            >
              Convert
            </button>

            {imageOutput && (
              <div className="mt-8">
                <img
                  src={imageOutput}
                  className="max-w-md rounded-xl border border-white/10"
                />

                <a
                  href={imageOutput}
                  download="converted.webp"
                  className="mt-4 block text-purple-300"
                >
                  Download WEBP
                </a>
              </div>
            )}
          </div>
        )}

        {/* OTHER TOOLS */}
        {tool.slug !== "png-to-webp" && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <textarea
              className="w-full rounded-2xl bg-white/10 p-4 outline-none"
              rows={10}
              placeholder="Enter content..."
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
            />

            <button
              onClick={runTool}
              className="mt-6 rounded-xl bg-purple-600 px-6 py-3"
            >
              Run Tool
            </button>

            <pre className="mt-8 whitespace-pre-wrap rounded-2xl bg-white/10 p-4 text-white/80">
              {output}
            </pre>
          </div>
        )}
      </section>
    </main>
  );
}