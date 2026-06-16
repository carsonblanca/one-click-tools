"use client";

import { useTheme } from "./ThemeProvider";

type HomeSeoTextProps = {
  locale?: "en" | "zh-cn" | "zh-tw";
};

const SEO = {
  en: {
    title: "About OneClick Tools",
    paragraphs: [
      "OneClick Tools is a collection of lightweight browser-based utilities for everyday web work. Each tool runs entirely in your browser — nothing is uploaded, installed, or processed on a remote server.",
      "The 3D Printing Filament Library helps makers browse filaments by material, brand, or color, compare specifications, and generate Bambu Studio preset files. All filament data is sourced from official brand websites and technical data sheets.",
    ],
  },
  "zh-cn": {
    title: "关于 OneClick Tools",
    paragraphs: [
      "OneClick Tools 是一个轻量级在线工具合集，所有工具均在浏览器中运行，无需安装、无需上传数据到服务器。",
      "3D 打印耗材库帮助用户按材料、品牌或颜色浏览耗材，对比规格，并生成 Bambu Studio 预设文件。所有耗材数据来源于官方品牌网站和技术资料。",
    ],
  },
  "zh-tw": {
    title: "關於 OneClick Tools",
    paragraphs: [
      "OneClick Tools 是一個輕量級線上工具合集，所有工具均在瀏覽器中執行，無需安裝、無需上傳資料到伺服器。",
      "3D 列印耗材庫協助使用者依材料、品牌或色系瀏覽線材，比較規格，並產生 Bambu Studio 預設檔案。所有線材資料來源於官方品牌網站和技術資料。",
    ],
  },
};

export default function HomeSeoText({ locale = "en" }: HomeSeoTextProps) {
  const { isDark } = useTheme();
  const content = SEO[locale] || SEO.en;

  return (
    <section
      className={`mx-auto max-w-4xl px-4 pb-12 pt-6 sm:px-6 md:pb-20 md:pt-10 ${
        isDark ? "text-white/45" : "text-[#8A8173]"
      }`}
    >
      <h2
        className={`mb-4 text-sm font-semibold uppercase tracking-wider ${
          isDark ? "text-white/30" : "text-[#8A8173]"
        }`}
      >
        {content.title}
      </h2>
      {content.paragraphs.map((p, i) => (
        <p
          key={i}
          className={`mb-3 text-sm leading-relaxed ${
            isDark ? "text-white/40" : "text-[#8A8173]"
          }`}
        >
          {p}
        </p>
      ))}
    </section>
  );
}
