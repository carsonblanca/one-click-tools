"use client";

import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { MATERIAL_CATEGORY_TREE, findNodeById, type CategoryNode } from "@/lib/filaments/catalog/category-trees";
import { getRecordsByMaterial } from "@/lib/filaments/catalog/mock-catalog-ext";

function TreeItem({
  node, depth, isDark, activeId, onSelect, defaultOpen,
}: {
  node: CategoryNode;
  depth: number;
  isDark: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const active = activeId === node.id;
  const count = getRecordsByMaterial(node.id.toUpperCase()).length;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) setOpen(!open);
          onSelect(node.id);
        }}
        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
          active
            ? isDark
              ? "bg-lime-300/20 text-lime-200"
              : "bg-[#2563EB]/10 text-[#2563EB] font-medium"
            : isDark
              ? "text-white/70 hover:bg-white/[0.05]"
              : "text-[#6B665D] hover:bg-[#F5F2EA]"
        }`}
        style={{ paddingLeft: 12 + depth * 16 }}
      >
        <span className="flex items-center gap-2 min-w-0">
          {hasChildren && (
            <span className={`shrink-0 transition ${open ? "rotate-90" : ""}`}>▶</span>
          )}
          <span className="truncate">{node.labelZh}</span>
        </span>
        {count > 0 && (
          <span className={`shrink-0 text-[11px] ${isDark ? "text-white/30" : "text-[#8A8173]"}`}>
            {count}
          </span>
        )}
      </button>
      {hasChildren && open && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              isDark={isDark}
              activeId={activeId}
              onSelect={onSelect}
              defaultOpen={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MaterialCategoryTree({
  activeId, onSelect,
}: {
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const { isDark } = useTheme();

  return (
    <div
      className={`rounded-[20px] border p-3 ${
        isDark ? "border-white/10 bg-black/20" : "border-[#E5DED0] bg-[#FFFDF7]"
      }`}
    >
      <div className={`mb-2 px-3 py-1 text-sm font-medium ${isDark ? "text-white/60" : "text-[#8A8173]"}`}>
        材料分类
      </div>
      {MATERIAL_CATEGORY_TREE.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          depth={0}
          isDark={isDark}
          activeId={activeId}
          onSelect={onSelect}
          defaultOpen
        />
      ))}
    </div>
  );
}

export { findNodeById };
