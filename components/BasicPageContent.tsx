"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTheme } from "./ThemeProvider";

type Section = {
  title: string;
  paragraphs: string[];
};

type BasicPageContentProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Section[];
  children?: ReactNode;
};

export default function BasicPageContent({
  eyebrow,
  title,
  intro,
  sections,
  children,
}: BasicPageContentProps) {
  const { isDark } = useTheme();

  return (
    <section className="relative z-10 mx-auto max-w-4xl px-6 py-16 md:py-20">
      <div
        className={`mb-5 inline-flex rounded-full border px-4 py-2 text-sm ${
          isDark
            ? "border-white/10 bg-white/[0.05] text-white/55"
            : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D]"
        }`}
      >
        {eyebrow}
      </div>

      <h1 className="text-5xl font-semibold tracking-[-0.05em] md:text-6xl">
        {title}
      </h1>

      <p
        className={`mt-6 text-lg leading-8 ${
          isDark ? "text-white/60" : "text-[#6B665D]"
        }`}
      >
        {intro}
      </p>

      <div
        className={`mt-10 rounded-[32px] border p-6 md:p-8 ${
          isDark
            ? "border-white/10 bg-[#101014]/80"
            : "border-[#E5DED0] bg-[#FFFDF7]/90"
        }`}
      >
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-2xl font-semibold">{section.title}</h2>

              <div className="mt-4 space-y-4">
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className={`leading-8 ${
                      isDark ? "text-white/60" : "text-[#6B665D]"
                    }`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          {children ? (
            <div
              className={`rounded-2xl border p-5 ${
                isDark
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-[#E5DED0] bg-[#F5F2EA]"
              }`}
            >
              {children}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-10">
        <Link
          href="/"
          className={`inline-flex rounded-2xl border px-6 py-4 ${
            isDark
              ? "border-white/10 bg-white/[0.04] text-white/70"
              : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D]"
          }`}
        >
          Back to home
        </Link>
      </div>
    </section>
  );
}
