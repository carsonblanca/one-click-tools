"use client";

import { useState } from "react";
import { useTheme } from "../ThemeProvider";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
} from "../tool-ui/ToolUI";

const searchPlatforms = [
  { name: "MakerWorld", buildUrl: (query: string) => `https://makerworld.com/en/search/models?keyword=${query}` },
  { name: "Printables", buildUrl: (query: string) => `https://www.printables.com/search/models?q=${query}` },
  { name: "Thingiverse", buildUrl: (query: string) => `https://www.thingiverse.com/search?q=${query}&type=things` },
  { name: "Cults3D", buildUrl: (query: string) => `https://cults3d.com/en/search?q=${query}` },
  { name: "MyMiniFactory", buildUrl: (query: string) => `https://www.myminifactory.com/search/?query=${query}` },
  { name: "Thangs", buildUrl: (query: string) => `https://thangs.com/search/${query}` },
  { name: "Yeggi", buildUrl: (query: string) => `https://www.yeggi.com/q/${query}/` },
  { name: "STLFinder", buildUrl: (query: string) => `https://www.stlfinder.com/3dmodels/${query}/` },
  { name: "CGTrader", buildUrl: (query: string) => `https://www.cgtrader.com/3d-models?keywords=${query}` },
  { name: "Sketchfab", buildUrl: (query: string) => `https://sketchfab.com/search?q=${query}&type=models` },
];

export default function ThreeDModelSearchAggregatorTool() {
  const { isDark } = useTheme();
  const [keyword, setKeyword] = useState("");
  const encodedKeyword = encodeURIComponent(keyword.trim());
  const hasKeyword = encodedKeyword.length > 0;

  const clear = () => {
    setKeyword("");
  };

  const linkClass = `rounded-2xl border p-4 transition ${
    isDark
      ? "border-white/10 bg-white/[0.04] text-white hover:border-lime-300/40"
      : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B] hover:border-[#2563EB]/40"
  }`;

  return (
    <ToolPanel>
      <div>
        <ToolLabel>Search keyword</ToolLabel>
        <ToolInput value={keyword} onChange={setKeyword} placeholder="benchy, vase, phone stand..." />
      </div>

      <ToolButtonRow>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      {hasKeyword ? (
        <ToolResultBox>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {searchPlatforms.map((platform) => (
              <a
                key={platform.name}
                href={platform.buildUrl(encodedKeyword)}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                <span className="font-semibold">{platform.name}</span>
                <span className="mt-2 block text-sm opacity-70">Open search results</span>
              </a>
            ))}
          </div>
        </ToolResultBox>
      ) : (
        <ToolResultBox muted>Enter a keyword to generate outbound model search links.</ToolResultBox>
      )}

      <ToolResultBox muted>
        OneClick Tools does not host, scrape, iframe, or index these models. Links open each platform&apos;s own search results in a new tab.
      </ToolResultBox>
    </ToolPanel>
  );
}
