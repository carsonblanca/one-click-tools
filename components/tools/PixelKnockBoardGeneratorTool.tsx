"use client";

import { strToU8, zipSync } from "fflate";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../../lib/i18n";
import { trackEvent } from "../analytics";
import { useTheme } from "../ThemeProvider";
import {
  ToolButton,
  ToolCheckbox,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
} from "../tool-ui/ToolUI";

type PixelCell = {
  empty: boolean;
  color: string | null;
};

type ColorSummary = {
  color: string;
  count: number;
};

type Language = "en" | "zh";

type PixelKnockBoardGeneratorToolProps = {
  locale?: Locale;
};

type CropMode = "tight" | "center" | "original";

type PreviewMode = "compare" | "original" | "pixel";

type ColorSimplification = "strong" | "standard" | "detailed";

type PrinterModel = {
  id: string;
  name: string;
  nameZh: string;
  width: number;
  depth: number;
  pending?: boolean;
  note?: string;
  noteZh?: string;
};

type PrinterPreset = {
  brand: string;
  brandZh: string;
  models: PrinterModel[];
};

type PixelGrid = {
  width: number;
  height: number;
  cells: PixelCell[][];
  activeCells: number;
  colors: ColorSummary[];
};

type WallRect = {
  x: number;
  y: number;
  width: number;
  depth: number;
};

type GridEdge = {
  x: number;
  y: number;
};

type WeightedColor = {
  red: number;
  green: number;
  blue: number;
  count: number;
};

type ColorBlockArea = {
  index: number;
  color: string;
  count: number;
  width: number;
  depth: number;
  area: number;
};

type BedFitSummary = {
  bedWidth: number;
  bedDepth: number;
  frameWidth: number;
  frameDepth: number;
  fitsAsPlaced: boolean;
  fitsRotated: boolean;
};

type PrinterReadmeInfo = {
  brandName: string;
  brandNameZh: string;
  modelName: string;
  modelNameZh: string;
  modelPending: boolean;
  modelNote: string;
  modelNoteZh: string;
  bedWidth: number;
  bedDepth: number;
  bedFit: BedFitSummary | null;
  colorBlockPlates: number;
  totalPlates: number;
};

type Params = {
  gridWidth: number;
  maxColors: number;
  colorSimplification: ColorSimplification;
  mergeSimilarColors: number;
  cellSizeMm: number;
  wallThicknessMm: number;
  wallHeightMm: number;
  blockHeightMm: number;
  blockClearanceMm: number;
  alphaThreshold: number;
  whiteThreshold: number;
  removeWhiteBackground: boolean;
};

const defaultParams: Params = {
  gridWidth: 24,
  maxColors: 6,
  colorSimplification: "standard",
  mergeSimilarColors: 35,
  cellSizeMm: 10,
  wallThicknessMm: 1,
  wallHeightMm: 3,
  blockHeightMm: 3,
  blockClearanceMm: 0.4,
  alphaThreshold: 32,
  whiteThreshold: 245,
  removeWhiteBackground: true,
};

const unconfirmedPresetNote =
  "Size not confirmed in this preset. Please adjust bed width and depth according to your slicer.";
const unconfirmedPresetNoteZh =
  "该预设尺寸暂未确认，请根据切片软件实际显示手动调整热床宽度和深度。";

const printerPresets: PrinterPreset[] = [
  {
    brand: "Bambu Lab",
    brandZh: "拓竹 Bambu Lab",
    models: [
      { id: "bambu-h2d-single", name: "H2D single nozzle", nameZh: "H2D 单喷嘴", width: 325, depth: 320 },
      { id: "bambu-h2d-dual", name: "H2D dual nozzle", nameZh: "H2D 双喷嘴", width: 300, depth: 320 },
      { id: "bambu-h2d-max", name: "H2D max area", nameZh: "H2D 最大区域", width: 350, depth: 320 },
      {
        id: "bambu-h2s",
        name: "H2S",
        nameZh: "H2S",
        width: 340,
        depth: 320,
        note: "Build volume reference: 340 x 320 mm. Check your slicer for the actual usable area.",
        noteZh: "构建尺寸参考：340 x 320 mm，实际可用区域请以切片软件为准。",
      },
      {
        id: "bambu-h2c",
        name: "H2C",
        nameZh: "H2C",
        width: 350,
        depth: 320,
        pending: true,
        note: unconfirmedPresetNote,
        noteZh: unconfirmedPresetNoteZh,
      },
      {
        id: "bambu-x2d",
        name: "X2D",
        nameZh: "X2D",
        width: 325,
        depth: 320,
        pending: true,
        note: unconfirmedPresetNote,
        noteZh: unconfirmedPresetNoteZh,
      },
      { id: "bambu-x1-p1-a1", name: "X1 / P1 / A1 series", nameZh: "X1 / P1 / A1 系列", width: 256, depth: 256 },
      {
        id: "bambu-a2l",
        name: "A2L",
        nameZh: "A2L",
        width: 256,
        depth: 256,
        pending: true,
        note: unconfirmedPresetNote,
        noteZh: unconfirmedPresetNoteZh,
      },
      { id: "bambu-a1-mini", name: "A1 mini", nameZh: "A1 mini", width: 180, depth: 180 },
    ],
  },
  {
    brand: "Snapmaker",
    brandZh: "快造 Snapmaker",
    models: [
      {
        id: "snapmaker-u1",
        name: "U1",
        nameZh: "U1 / 快造 U1",
        width: 270,
        depth: 270,
        note: "Build volume reference: 270 x 270 mm. Check your slicer for the actual usable area.",
        noteZh: "构建尺寸参考：270 x 270 mm，实际可用区域请以切片软件为准。",
      },
    ],
  },
  {
    brand: "Flashforge",
    brandZh: "闪铸 Flashforge",
    models: [
      {
        id: "flashforge-creator-5",
        name: "Creator 5 / C5",
        nameZh: "Creator 5 / C5",
        width: 256,
        depth: 256,
        note: "Build volume reference: 256 x 256 mm. Check your slicer for the actual usable area.",
        noteZh: "构建尺寸参考：256 x 256 mm，实际可用区域请以切片软件为准。",
      },
    ],
  },
  {
    brand: "Creality",
    brandZh: "创想三维 Creality",
    models: [
      { id: "creality-k1", name: "K1 / K1C", nameZh: "K1 / K1C", width: 220, depth: 220 },
      { id: "creality-k1-max", name: "K1 Max", nameZh: "K1 Max", width: 300, depth: 300 },
      { id: "creality-ender3", name: "Ender-3 series", nameZh: "Ender-3 系列常见尺寸", width: 220, depth: 220 },
      { id: "creality-ender3-max", name: "Ender-3 Max / large bed", nameZh: "Ender-3 Max / 大尺寸平台", width: 300, depth: 300 },
    ],
  },
  {
    brand: "Prusa",
    brandZh: "Prusa",
    models: [
      { id: "prusa-mk4", name: "Original Prusa MK4 / MK4S", nameZh: "Original Prusa MK4 / MK4S", width: 250, depth: 210 },
      { id: "prusa-core-one", name: "Prusa CORE One", nameZh: "Prusa CORE One", width: 250, depth: 220 },
      { id: "prusa-xl", name: "Prusa XL", nameZh: "Prusa XL", width: 360, depth: 360 },
    ],
  },
  {
    brand: "Custom",
    brandZh: "自定义",
    models: [
      { id: "custom", name: "Custom size", nameZh: "自定义尺寸", width: 300, depth: 300 },
    ],
  },
];

const copy = {
  en: {
    language: "Language",
    english: "English",
    chinese: "中文",
    title: "Pixel Knock Grid Generator",
    subtitle:
      "Turn an image into a 3D printable pixel grid STL. No base plate, just 1mm walls around each active pixel.",
    description:
      "This tool generates a no-base pixel grid STL. Each active pixel is enclosed by printable walls, making it suitable for colorful craft blocks and hands-on pixel art projects.",
    uploadLabel: "Upload PNG / JPG / WEBP",
    localProcessingNote: "Images are processed locally in your browser.",
    uploadTip:
      "Tip: Use a solid-color or transparent background. Complex backgrounds, shadows, gradients, or noisy images may cause extra grids or incorrect color groups.",
    chooseFile: "Choose file",
    noFile: "No file selected",
    loadedLocally: "Loaded locally",
    gridWidth: "Grid width",
    maxColors: "Max colors",
    maxColorsHelp:
      "For real printing, 4-8 colors are recommended. Increase this if you want more detail.",
    colorSimplification: "Color simplification",
    simplificationStrong: "Strong",
    simplificationStandard: "Standard",
    simplificationDetailed: "Detailed",
    simplificationStrongHelp: "Fewer colors, best for real printing.",
    simplificationStandardHelp: "Balanced color reduction, recommended.",
    simplificationDetailedHelp: "Closer to the original image, may create more color groups.",
    mergeSimilarColors: "Merge similar colors",
    mergeSimilarColorsHelp:
      "Merges close colors to reduce gradients and similar shades. Higher values create fewer, more printable colors.",
    colorReductionNote:
      "Similar colors are merged to reduce extra groups caused by shadows, gradients, and highlights. For real-world making, 4-8 colors are recommended.",
    lowColorWarning:
      "The current color count is low, so the pattern will be simplified. Increase max colors or choose Detailed if details are lost.",
    cellSize: "Cell size (mm)",
    wallThickness: "Wall thickness (mm)",
    wallHeight: "Wall height (mm)",
    blockHeight: "Block height (mm)",
    blockClearance: "Block fit clearance (mm)",
    blockClearanceHelp:
      "Controls the fit between blocks and the grid. Larger values make blocks looser, smaller values make them tighter.",
    blockClearanceRecommend:
      "Recommended: 0.4mm. If blocks are too tight, increase to 0.5-0.6mm. If they are too loose, decrease to 0.2-0.3mm.",
    clearanceTight: "Tight 0.2",
    clearanceStandard: "Standard 0.4",
    clearanceLoose: "Loose 0.6",
    alphaThreshold: "Alpha threshold",
    whiteThreshold: "White threshold",
    removeWhiteBackground: "Remove near-white background",
    cropMode: "Crop mode",
    cropModeTight: "Tight crop",
    cropModeCenter: "Center on canvas",
    cropModeOriginal: "Keep original framing",
    paddingCells: "Padding cells",
    paddingCellsHelp:
      "Adds empty space around the subject for a more centered and finished layout.",
    printerBrand: "Printer brand",
    printerModel: "Printer model",
    bedWidth: "Bed width (mm)",
    bedDepth: "Bed depth (mm)",
    bedFit: "Bed fit",
    frameSize: "Frame size",
    selectedBed: "Selected bed",
    fitsAsPlaced: "Fits as placed",
    fitsIfRotated: "Fits if rotated",
    bedFits: "Fits",
    bedFitsRotated: "Fits if rotated",
    bedDoesNotFit: "Does not fit",
    yes: "Yes",
    no: "No",
    bedSuggestionFits: "Suggestion: The grid frame fits the selected bed as placed.",
    bedSuggestionRotate:
      "Suggestion: Rotate the grid before printing, or reduce grid count / cell size.",
    bedSuggestionReduce:
      "Suggestion: Reduce grid count / cell size, or choose a printer with a larger bed.",
    presetPendingWarning:
      "This preset size is not confirmed. Please check the actual bed size in your slicer and adjust bed width and depth manually.",
    bedUsableAreaNote:
      "The usable area may be smaller because of slicer limits, nozzle mode, purge/wipe towers, or protected zones. Always check the final layout in your slicer.",
    colorBlockAreas: "Color block areas",
    estimatedArea: "Estimated area",
    estimatedPlates: "Estimated plates",
    gridFramePlate: "Grid frame",
    colorBlocksPlate: "Color blocks",
    plateCountDetail: "Grid frame: 1 plate, color blocks: about {count} plates.",
    plateEstimateNote:
      "This is a browser-side estimate. Final arrangement may differ in Bambu Studio, Cura, or your slicer.",
    previewModeCompare: "Compare",
    previewModeOriginal: "Original",
    previewModePixel: "Pixel preview",
    originalImage: "Original image",
    pixelPreview: "Pixel preview",
    previewCompareNote:
      "The original image is shown next to the processed pixel preview. If extra grids or colors appear, use a solid background or adjust the white threshold, crop mode, and max colors.",
    showColorNumbers: "Show color numbers",
    generatePreview: "Generate preview",
    downloadPng: "Download PNG preview",
    downloadStl: "Download STL grid",
    downloadCsv: "Download color list CSV",
    downloadZip: "Download project ZIP",
    clear: "Clear",
    zipIncludesNote:
      "The project ZIP includes the printable STL grid, OBJ + MTL color preview, separated color block OBJ + MTL, PNG preview, CSV color list, and README.",
    objColorNote:
      "The color preview OBJ shows the assembled result. The separated color blocks OBJ places blocks by color group for easier printing or preparation.",
    gridSize: "Grid size",
    totalCells: "Total cells",
    activeCells: "Active cells",
    emptyCells: "Empty cells",
    modelSize: "Model size",
    colorList: "Color groups",
    hex: "HEX",
    rgb: "RGB",
    cellCount: "Cells",
    percentage: "Percentage",
    cells: "cells",
    emptyState:
      "Upload an image and click “Generate preview” to compare the original image with the pixel preview.",
    errors: {
      uploadFirst: "Upload a PNG, JPG, or WEBP image first.",
      noVisiblePixels:
        "No visible pixels were detected. Lower the thresholds or disable white background removal.",
      couldNotProcess: "Could not process the image.",
      invalidFile: "Upload a PNG, JPG, or WEBP image.",
      couldNotLoad: "Could not load the selected image.",
      previewFirst: "Generate a preview before downloading PNG.",
      couldNotCreatePng: "Could not create PNG preview.",
      stlFirst: "Generate a non-empty pixel grid before downloading STL.",
      blockSizeInvalid:
        "Block size must be greater than 0. Reduce wall thickness or block clearance.",
      bedSizeInvalid: "Bed width and depth must be greater than 0.",
      couldNotCreateZip: "Could not create the project ZIP.",
    },
  },
  zh: {
    language: "语言",
    english: "English",
    chinese: "中文",
    title: "敲敲乐网格生成器",
    subtitle:
      "上传图片，一键生成适合 3D 打印的敲敲乐网格 STL 文件，并自动统计所需颗粒颜色和数量。所有图片处理都在浏览器本地完成，不会上传服务器。",
    description:
      "该工具会根据图片生成无底板敲敲乐网格。每个需要填充的格子都会由 1mm 墙体围合，适合搭配彩色颗粒进行手工拼搭。",
    uploadLabel: "上传 PNG / JPG / WEBP",
    localProcessingNote: "图片仅在浏览器本地处理，不会上传服务器。",
    uploadTip:
      "建议上传纯色背景或透明背景图片。复杂背景、阴影、渐变和杂色可能导致识别错误，生成多余网格或颜色颗粒。",
    chooseFile: "选择文件",
    noFile: "未选择文件",
    loadedLocally: "已在浏览器本地读取",
    gridWidth: "网格宽度",
    maxColors: "最大颜色数",
    maxColorsHelp: "实际打印时建议 4-8 色；如果想更接近原图，可以手动调高。",
    colorSimplification: "颜色简化",
    simplificationStrong: "强",
    simplificationStandard: "标准",
    simplificationDetailed: "细致",
    simplificationStrongHelp: "颜色更少，最适合实际打印和准备颗粒。",
    simplificationStandardHelp: "平衡还原和颜色数量，推荐使用。",
    simplificationDetailedHelp: "更接近原图，但可能产生更多颜色组。",
    mergeSimilarColors: "合并相似颜色",
    mergeSimilarColorsHelp:
      "用于合并接近的颜色，减少渐变和相似色。数值越大，颜色越少，更适合实际打印。",
    colorReductionNote:
      "颜色会自动合并相近色，减少阴影、渐变和高光造成的过多颜色分组。实际制作时建议控制在 4-8 色。",
    lowColorWarning:
      "当前颜色数较少，图案会更简化。如果细节丢失，可以提高最大颜色数或选择“细致”模式。",
    cellSize: "单格尺寸（毫米）",
    wallThickness: "墙厚（毫米）",
    wallHeight: "墙高（毫米）",
    blockHeight: "方块高度（毫米）",
    blockClearance: "方块松紧公差（毫米）",
    blockClearanceHelp:
      "用于控制方块和网格之间的松紧。数值越大越容易放入，数值越小越紧。",
    blockClearanceRecommend:
      "推荐值：0.4mm。若方块塞不进去，请增大到 0.5-0.6mm；若太松，请减小到 0.2-0.3mm。",
    clearanceTight: "紧配 0.2",
    clearanceStandard: "标准 0.4",
    clearanceLoose: "宽松 0.6",
    alphaThreshold: "透明度阈值",
    whiteThreshold: "白底阈值",
    removeWhiteBackground: "去除近乎白色背景",
    cropMode: "裁剪模式",
    cropModeTight: "紧贴主体",
    cropModeCenter: "居中画布",
    cropModeOriginal: "保持原图构图",
    paddingCells: "边距格数",
    paddingCellsHelp:
      "在主体周围保留空白边距，让图案更居中、更适合制作成品。",
    printerBrand: "打印机品牌",
    printerModel: "打印机型号",
    bedWidth: "热床宽度（毫米）",
    bedDepth: "热床深度（毫米）",
    bedFit: "热床占用",
    frameSize: "外框尺寸",
    selectedBed: "当前热床",
    fitsAsPlaced: "当前方向",
    fitsIfRotated: "旋转 90°",
    bedFits: "可以放下",
    bedFitsRotated: "旋转后可放下",
    bedDoesNotFit: "放不下",
    yes: "可以放下",
    no: "放不下",
    bedSuggestionFits: "建议：当前方向可以放下，请在切片软件中再次确认。",
    bedSuggestionRotate: "建议：打印时旋转模型，或减少网格数 / 单格尺寸。",
    bedSuggestionReduce: "建议：减少网格数 / 单格尺寸，或选择更大热床的打印机。",
    presetPendingWarning:
      "该型号尺寸暂未确认，请以切片软件实际热床显示为准，并手动调整热床宽度和深度。",
    bedUsableAreaNote:
      "不同切片软件、喷头模式、擦料塔和边界保护可能会减少实际可用区域，请以切片软件最终显示为准。",
    colorBlockAreas: "分色方块占用",
    estimatedArea: "预计面积",
    estimatedPlates: "预计打印盘数",
    gridFramePlate: "网格外框",
    colorBlocksPlate: "分色方块",
    plateCountDetail: "其中网格外框 1 盘，分色方块约 {count} 盘。",
    plateEstimateNote:
      "该结果为网页估算，实际排盘以 Bambu Studio / Cura 等切片软件为准。",
    previewModeCompare: "对比预览",
    previewModeOriginal: "原图",
    previewModePixel: "像素预览",
    originalImage: "原图",
    pixelPreview: "像素预览",
    previewCompareNote:
      "左侧为上传原图，右侧为处理后的敲敲乐像素预览。若出现多余网格或颜色，请优先使用纯色背景图片，或调整白底阈值、裁剪模式和最大颜色数。",
    showColorNumbers: "显示颗粒编号",
    generatePreview: "生成预览",
    downloadPng: "下载 PNG 预览",
    downloadStl: "下载网格 STL",
    downloadCsv: "下载颜色清单 CSV",
    downloadZip: "下载完整项目 ZIP",
    clear: "清空",
    zipIncludesNote:
      "完整项目 ZIP 包含用于打印的网格 STL、用于查看成品效果的彩色预览 OBJ + MTL、按颜色分组的分色方块 OBJ + MTL、PNG 预览图、颜色清单 CSV 和 README 说明。",
    objColorNote:
      "彩色预览 OBJ 用于查看效果；分色方块 OBJ 会把不同颜色的方块分开放置，方便按颜色打印或准备颗粒。",
    gridSize: "网格数",
    totalCells: "总格数",
    activeCells: "所需颗粒数",
    emptyCells: "空白格数",
    modelSize: "外框总尺寸",
    colorList: "颜色分组",
    hex: "HEX",
    rgb: "RGB",
    cellCount: "颗粒数",
    percentage: "占比",
    cells: "颗粒",
    emptyState: "上传图片并点击“生成预览”后，这里会显示原图和像素预览对比。",
    errors: {
      uploadFirst: "请先上传 PNG、JPG 或 WEBP 图片。",
      noVisiblePixels: "没有检测到有效像素。请降低阈值，或关闭去除白色背景。",
      couldNotProcess: "无法处理该图片。",
      invalidFile: "请上传 PNG、JPG 或 WEBP 图片。",
      couldNotLoad: "无法读取所选图片。",
      previewFirst: "请先生成预览，再下载 PNG。",
      couldNotCreatePng: "无法创建 PNG 预览。",
      stlFirst: "请先生成非空像素格栅，再下载 STL。",
      blockSizeInvalid: "方块尺寸必须大于 0。请减小墙厚或方块松紧公差。",
      bedSizeInvalid: "热床宽度和深度必须大于 0。",
      couldNotCreateZip: "无法创建完整项目 ZIP。",
    },
  },
} satisfies Record<Language, Record<string, unknown>>;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseNumber(value: string, fallback: number, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clamp(parsed, min, max);
}

function toHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function parseHex(hex: string) {
  return {
    red: Number.parseInt(hex.slice(1, 3), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    blue: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function formatPercentage(value: number) {
  return `${value.toFixed(2)}%`;
}

function getReadableTextColor(hex: string) {
  const { red, green, blue } = parseHex(hex);
  const luminance = red * 0.299 + green * 0.587 + blue * 0.114;

  return luminance > 150 ? "#18181B" : "#FFFFFF";
}

function getColorIndexMap(grid: PixelGrid) {
  return new Map(grid.colors.map((item, index) => [item.color, index + 1]));
}

function colorDistance(first: { red: number; green: number; blue: number }, second: { red: number; green: number; blue: number }) {
  return Math.sqrt(
    (first.red - second.red) ** 2 +
      (first.green - second.green) ** 2 +
      (first.blue - second.blue) ** 2,
  );
}

function colorBrightness(color: { red: number; green: number; blue: number }) {
  return color.red * 0.299 + color.green * 0.587 + color.blue * 0.114;
}

function colorHue(color: { red: number; green: number; blue: number }) {
  const red = color.red / 255;
  const green = color.green / 255;
  const blue = color.blue / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (delta === 0) {
    return 0;
  }

  if (max === red) {
    return ((green - blue) / delta + (green < blue ? 6 : 0)) * 60;
  }

  if (max === green) {
    return ((blue - red) / delta + 2) * 60;
  }

  return ((red - green) / delta + 4) * 60;
}

function compareWeightedColors(first: WeightedColor, second: WeightedColor) {
  const countDifference = second.count - first.count;

  if (countDifference !== 0) {
    return countDifference;
  }

  return colorHue(first) - colorHue(second) || colorBrightness(first) - colorBrightness(second);
}

function compareColorSummaries(first: ColorSummary, second: ColorSummary) {
  const countDifference = second.count - first.count;

  if (countDifference !== 0) {
    return countDifference;
  }

  const firstColor = parseHex(first.color);
  const secondColor = parseHex(second.color);

  return colorHue(firstColor) - colorHue(secondColor) || colorBrightness(firstColor) - colorBrightness(secondColor);
}

function getSimplificationBaseThreshold(mode: ColorSimplification) {
  if (mode === "strong") return 55;
  if (mode === "detailed") return 20;
  return 35;
}

function getSimplificationBucketSize(mode: ColorSimplification) {
  if (mode === "strong") return 48;
  if (mode === "detailed") return 24;
  return 32;
}

function getMergeThreshold(params: Params) {
  return getSimplificationBaseThreshold(params.colorSimplification) + params.mergeSimilarColors * 0.5;
}

function isKeyColor(color: WeightedColor) {
  const brightness = colorBrightness(color);
  const redDominant = color.red > 120 && color.red > color.green * 1.45 && color.red > color.blue * 1.45;
  const veryDark = brightness < 45;
  const veryLight = brightness > 235;

  return veryDark || veryLight || redDominant;
}

function mergeWeightedColor(target: WeightedColor, source: WeightedColor) {
  const totalCount = target.count + source.count;

  return {
    red: (target.red * target.count + source.red * source.count) / totalCount,
    green: (target.green * target.count + source.green * source.count) / totalCount,
    blue: (target.blue * target.count + source.blue * source.count) / totalCount,
    count: totalCount,
  };
}

function buildColorCandidates(
  samples: Array<{ red: number; green: number; blue: number }>,
  params: Params,
) {
  const bucketSize = getSimplificationBucketSize(params.colorSimplification);
  const buckets = new Map<string, WeightedColor>();

  samples.forEach((sample) => {
    const key = [
      Math.round(sample.red / bucketSize) * bucketSize,
      Math.round(sample.green / bucketSize) * bucketSize,
      Math.round(sample.blue / bucketSize) * bucketSize,
    ]
      .map((value) => clamp(value, 0, 255))
      .join(",");
    const current = buckets.get(key) || { red: 0, green: 0, blue: 0, count: 0 };

    current.red += sample.red;
    current.green += sample.green;
    current.blue += sample.blue;
    current.count += 1;
    buckets.set(key, current);
  });

  return Array.from(buckets.values())
    .map((bucket) => ({
      red: bucket.red / bucket.count,
      green: bucket.green / bucket.count,
      blue: bucket.blue / bucket.count,
      count: bucket.count,
    }))
    .sort(compareWeightedColors);
}

function mergeSimilarColorCandidates(candidates: WeightedColor[], params: Params) {
  const threshold = getMergeThreshold(params);
  const groups: WeightedColor[] = [];

  candidates.forEach((candidate) => {
    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;

    groups.forEach((group, index) => {
      const distance = colorDistance(candidate, group);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const protectedCandidate = candidate.count >= 3 && isKeyColor(candidate);
    const protectedTarget =
      nearestIndex >= 0 && groups[nearestIndex].count >= 3 && isKeyColor(groups[nearestIndex]);
    const mergeLimit = protectedCandidate || protectedTarget ? threshold * 0.7 : threshold;

    if (nearestIndex >= 0 && nearestDistance <= mergeLimit) {
      groups[nearestIndex] = mergeWeightedColor(groups[nearestIndex], candidate);
      return;
    }

    groups.push(candidate);
  });

  return groups;
}

function mergeClosestColorPair(groups: WeightedColor[]) {
  if (groups.length <= 1) {
    return groups;
  }

  let firstIndex = 0;
  let secondIndex = 1;
  let nearestDistance = colorDistance(groups[0], groups[1]);

  for (let first = 0; first < groups.length; first += 1) {
    for (let second = first + 1; second < groups.length; second += 1) {
      const distance = colorDistance(groups[first], groups[second]);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        firstIndex = first;
        secondIndex = second;
      }
    }
  }

  const merged = mergeWeightedColor(groups[firstIndex], groups[secondIndex]);

  return groups
    .filter((_, index) => index !== firstIndex && index !== secondIndex)
    .concat(merged);
}

function buildPalette(
  samples: Array<{ red: number; green: number; blue: number }>,
  params: Params,
) {
  let groups = mergeSimilarColorCandidates(buildColorCandidates(samples, params), params);

  while (groups.length > params.maxColors) {
    groups = mergeClosestColorPair(groups);
  }

  return groups
    .sort(compareWeightedColors)
    .map((group) => toHex(group.red, group.green, group.blue));
}

function nearestColor(red: number, green: number, blue: number, palette: string[]) {
  let bestColor = palette[0] || "#000000";
  let bestDistance = Number.POSITIVE_INFINITY;

  palette.forEach((color) => {
    const current = parseHex(color);
    const distance = colorDistance({ red, green, blue }, current);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestColor = color;
    }
  });

  return bestColor;
}

function isBlankPixel(
  red: number,
  green: number,
  blue: number,
  alpha: number,
  params: Params,
) {
  if (alpha < params.alphaThreshold) {
    return true;
  }

  return (
    params.removeWhiteBackground &&
    red >= params.whiteThreshold &&
    green >= params.whiteThreshold &&
    blue >= params.whiteThreshold
  );
}

function processImageToGrid(image: HTMLImageElement, params: Params): PixelGrid {
  const width = params.gridWidth;
  const height = clamp(Math.round((image.naturalHeight / image.naturalWidth) * width), 1, 128);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Could not read the image with canvas.");
  }

  canvas.width = width;
  canvas.height = height;
  context.imageSmoothingEnabled = true;
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const rawCells: Array<{ empty: boolean; red: number; green: number; blue: number }> = [];
  const samples: Array<{ red: number; green: number; blue: number }> = [];

  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index];
    const green = imageData.data[index + 1];
    const blue = imageData.data[index + 2];
    const alpha = imageData.data[index + 3];
    const empty = isBlankPixel(red, green, blue, alpha, params);

    rawCells.push({ empty, red, green, blue });

    if (!empty) {
      samples.push({ red, green, blue });
    }
  }

  const palette = buildPalette(samples, params);
  const colorCounts = new Map<string, number>();
  const cells: PixelCell[][] = [];

  for (let row = 0; row < height; row += 1) {
    const rowCells: PixelCell[] = [];

    for (let col = 0; col < width; col += 1) {
      const rawCell = rawCells[row * width + col];

      if (rawCell.empty || palette.length === 0) {
        rowCells.push({ empty: true, color: null });
        continue;
      }

      const color = nearestColor(rawCell.red, rawCell.green, rawCell.blue, palette);
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      rowCells.push({ empty: false, color });
    }

    cells.push(rowCells);
  }

  const colors = Array.from(colorCounts.entries())
    .map(([color, count]) => ({ color, count }))
    .sort(compareColorSummaries);

  return {
    width,
    height,
    cells,
    activeCells: colors.reduce((total, item) => total + item.count, 0),
    colors,
  };
}

function summarizeCells(cells: PixelCell[][]) {
  const colorCounts = new Map<string, number>();
  let activeCells = 0;

  cells.forEach((row) => {
    row.forEach((cell) => {
      if (cell.empty) return;

      activeCells += 1;

      if (cell.color) {
        colorCounts.set(cell.color, (colorCounts.get(cell.color) || 0) + 1);
      }
    });
  });

  const colors = Array.from(colorCounts.entries())
    .map(([color, count]) => ({ color, count }))
    .sort(compareColorSummaries);

  return {
    activeCells,
    colors,
  };
}

function buildGridFromCells(cells: PixelCell[][]): PixelGrid {
  const summary = summarizeCells(cells);

  return {
    width: cells[0]?.length || 0,
    height: cells.length,
    cells,
    activeCells: summary.activeCells,
    colors: summary.colors,
  };
}

function createEmptyCell(): PixelCell {
  return {
    empty: true,
    color: null,
  };
}

function createEmptyRow(width: number) {
  return Array.from({ length: width }, createEmptyCell);
}

function findContentBounds(grid: PixelGrid) {
  let minX = grid.width;
  let maxX = -1;
  let minY = grid.height;
  let maxY = -1;

  grid.cells.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell.empty) return;

      minX = Math.min(minX, colIndex);
      maxX = Math.max(maxX, colIndex);
      minY = Math.min(minY, rowIndex);
      maxY = Math.max(maxY, rowIndex);
    });
  });

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
  };
}

function cropCellsToBounds(
  grid: PixelGrid,
  bounds: NonNullable<ReturnType<typeof findContentBounds>>,
) {
  return grid.cells
    .slice(bounds.minY, bounds.maxY + 1)
    .map((row) => row.slice(bounds.minX, bounds.maxX + 1));
}

function addPaddingToCells(cells: PixelCell[][], padding: number) {
  const sourceWidth = cells[0]?.length || 0;

  if (padding <= 0 || sourceWidth === 0) {
    return cells;
  }

  const finalWidth = sourceWidth + padding * 2;
  const horizontalPadding = Array.from({ length: padding }, createEmptyCell);
  const paddedRows = cells.map((row) => [
    ...horizontalPadding.map(() => createEmptyCell()),
    ...row,
    ...horizontalPadding.map(() => createEmptyCell()),
  ]);

  return [
    ...Array.from({ length: padding }, () => createEmptyRow(finalWidth)),
    ...paddedRows,
    ...Array.from({ length: padding }, () => createEmptyRow(finalWidth)),
  ];
}

function centerCellsInCanvas(cells: PixelCell[][], width: number, height: number) {
  const sourceWidth = cells[0]?.length || 0;
  const sourceHeight = cells.length;
  const finalWidth = Math.max(width, sourceWidth);
  const finalHeight = Math.max(height, sourceHeight);
  const offsetX = Math.floor((finalWidth - sourceWidth) / 2);
  const offsetY = Math.floor((finalHeight - sourceHeight) / 2);
  const finalCells = Array.from({ length: finalHeight }, () => createEmptyRow(finalWidth));

  cells.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      finalCells[rowIndex + offsetY][colIndex + offsetX] = cell;
    });
  });

  return finalCells;
}

function prepareGridForOutput(grid: PixelGrid, cropMode: CropMode, paddingCells: number) {
  if (grid.activeCells === 0) {
    return null;
  }

  if (cropMode === "original") {
    return grid;
  }

  const bounds = findContentBounds(grid);

  if (!bounds) {
    return null;
  }

  const croppedCells = cropCellsToBounds(grid, bounds);
  const paddedCells = addPaddingToCells(croppedCells, paddingCells);

  if (cropMode === "tight") {
    return buildGridFromCells(paddedCells);
  }

  return buildGridFromCells(centerCellsInCanvas(paddedCells, grid.width, grid.height));
}

function drawPreview(
  canvas: HTMLCanvasElement,
  grid: PixelGrid,
  isDark: boolean,
  showColorNumbers: boolean,
) {
  const context = canvas.getContext("2d");

  if (!context) return;

  const previewCellSize = clamp(Math.floor(640 / Math.max(grid.width, grid.height)), 10, 20);
  const ratio = window.devicePixelRatio || 1;
  const width = grid.width * previewCellSize;
  const height = grid.height * previewCellSize;
  const colorIndexes = getColorIndexMap(grid);

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = "auto";
  canvas.style.maxWidth = "100%";
  canvas.style.aspectRatio = `${grid.width} / ${grid.height}`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = isDark ? "#101014" : "#FFFDF7";
  context.fillRect(0, 0, width, height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `600 ${Math.max(9, previewCellSize * 0.45)}px ui-sans-serif, system-ui, sans-serif`;

  grid.cells.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell.empty && cell.color) {
        context.fillStyle = cell.color;
        context.fillRect(
          colIndex * previewCellSize,
          rowIndex * previewCellSize,
          previewCellSize,
          previewCellSize,
        );

        if (showColorNumbers && previewCellSize >= 14) {
          const colorIndex = colorIndexes.get(cell.color);

          if (colorIndex) {
            context.fillStyle = getReadableTextColor(cell.color);
            context.fillText(
              String(colorIndex),
              colIndex * previewCellSize + previewCellSize / 2,
              rowIndex * previewCellSize + previewCellSize / 2,
            );
          }
        }
      }

      context.strokeStyle = isDark ? "rgba(255,255,255,0.10)" : "rgba(24,24,27,0.12)";
      context.lineWidth = 1;
      context.strokeRect(
        colIndex * previewCellSize,
        rowIndex * previewCellSize,
        previewCellSize,
        previewCellSize,
      );
    });
  });
}

function wallOffset(lineIndex: number, maxLineIndex: number, cellSize: number, thickness: number) {
  if (lineIndex === 0) {
    return 0;
  }

  if (lineIndex === maxLineIndex) {
    return lineIndex * cellSize - thickness;
  }

  return lineIndex * cellSize - thickness / 2;
}

function addEdge(map: Map<string, GridEdge>, key: string, edge: GridEdge) {
  if (!map.has(key)) {
    map.set(key, edge);
  }
}

function collectGridEdges(grid: PixelGrid) {
  const horizontalEdges = new Map<string, GridEdge>();
  const verticalEdges = new Map<string, GridEdge>();

  grid.cells.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      if (cell.empty) return;

      addEdge(horizontalEdges, `H-${row}-${col}`, { x: col, y: row });
      addEdge(horizontalEdges, `H-${row + 1}-${col}`, { x: col, y: row + 1 });
      addEdge(verticalEdges, `V-${col}-${row}`, { x: col, y: row });
      addEdge(verticalEdges, `V-${col + 1}-${row}`, { x: col + 1, y: row });
    });
  });

  return {
    horizontalEdges: Array.from(horizontalEdges.values()),
    verticalEdges: Array.from(verticalEdges.values()),
  };
}

function mergeHorizontalEdges(edges: GridEdge[], grid: PixelGrid, cellSize: number, thickness: number) {
  const walls: WallRect[] = [];
  const byY = new Map<number, GridEdge[]>();

  edges.forEach((edge) => {
    byY.set(edge.y, [...(byY.get(edge.y) || []), edge]);
  });

  byY.forEach((lineEdges, y) => {
    const sorted = [...lineEdges].sort((first, second) => first.x - second.x);
    let start = sorted[0]?.x;
    let previous = sorted[0]?.x;

    for (let index = 1; index <= sorted.length; index += 1) {
      const current = sorted[index]?.x;

      if (current === previous + 1) {
        previous = current;
        continue;
      }

      if (start !== undefined && previous !== undefined) {
        walls.push({
          x: start * cellSize,
          y: wallOffset(y, grid.height, cellSize, thickness),
          width: (previous - start + 1) * cellSize,
          depth: thickness,
        });
      }

      start = current;
      previous = current;
    }
  });

  return walls;
}

function mergeVerticalEdges(edges: GridEdge[], grid: PixelGrid, cellSize: number, thickness: number) {
  const walls: WallRect[] = [];
  const byX = new Map<number, GridEdge[]>();

  edges.forEach((edge) => {
    byX.set(edge.x, [...(byX.get(edge.x) || []), edge]);
  });

  byX.forEach((lineEdges, x) => {
    const sorted = [...lineEdges].sort((first, second) => first.y - second.y);
    let start = sorted[0]?.y;
    let previous = sorted[0]?.y;

    for (let index = 1; index <= sorted.length; index += 1) {
      const current = sorted[index]?.y;

      if (current === previous + 1) {
        previous = current;
        continue;
      }

      if (start !== undefined && previous !== undefined) {
        walls.push({
          x: wallOffset(x, grid.width, cellSize, thickness),
          y: start * cellSize,
          width: thickness,
          depth: (previous - start + 1) * cellSize,
        });
      }

      start = current;
      previous = current;
    }
  });

  return walls;
}

function buildWallRects(grid: PixelGrid, cellSize: number, thickness: number) {
  const { horizontalEdges, verticalEdges } = collectGridEdges(grid);

  return [
    ...mergeHorizontalEdges(horizontalEdges, grid, cellSize, thickness),
    ...mergeVerticalEdges(verticalEdges, grid, cellSize, thickness),
  ];
}

function vertex(point: [number, number, number]) {
  return `      vertex ${point[0].toFixed(4)} ${point[1].toFixed(4)} ${point[2].toFixed(4)}`;
}

function facet(normal: [number, number, number], points: [[number, number, number], [number, number, number], [number, number, number]]) {
  return [
    `  facet normal ${normal[0]} ${normal[1]} ${normal[2]}`,
    "    outer loop",
    vertex(points[0]),
    vertex(points[1]),
    vertex(points[2]),
    "    endloop",
    "  endfacet",
  ].join("\n");
}

function boxToFacets(wall: WallRect, height: number) {
  const x0 = wall.x;
  const x1 = wall.x + wall.width;
  const y0 = wall.y;
  const y1 = wall.y + wall.depth;
  const z0 = 0;
  const z1 = height;
  const p000: [number, number, number] = [x0, y0, z0];
  const p100: [number, number, number] = [x1, y0, z0];
  const p110: [number, number, number] = [x1, y1, z0];
  const p010: [number, number, number] = [x0, y1, z0];
  const p001: [number, number, number] = [x0, y0, z1];
  const p101: [number, number, number] = [x1, y0, z1];
  const p111: [number, number, number] = [x1, y1, z1];
  const p011: [number, number, number] = [x0, y1, z1];

  return [
    facet([0, 0, -1], [p000, p010, p110]),
    facet([0, 0, -1], [p000, p110, p100]),
    facet([0, 0, 1], [p001, p101, p111]),
    facet([0, 0, 1], [p001, p111, p011]),
    facet([0, -1, 0], [p000, p100, p101]),
    facet([0, -1, 0], [p000, p101, p001]),
    facet([0, 1, 0], [p010, p011, p111]),
    facet([0, 1, 0], [p010, p111, p110]),
    facet([-1, 0, 0], [p000, p001, p011]),
    facet([-1, 0, 0], [p000, p011, p010]),
    facet([1, 0, 0], [p100, p110, p111]),
    facet([1, 0, 0], [p100, p111, p101]),
  ];
}

function generateStl(grid: PixelGrid, params: Params) {
  const walls = buildWallRects(grid, params.cellSizeMm, params.wallThicknessMm);
  const facets = walls.flatMap((wall) => boxToFacets(wall, params.wallHeightMm));

  return [
    "solid pixel_knock_grid",
    ...facets,
    "endsolid pixel_knock_grid",
  ].join("\n");
}

function formatObjNumber(value: number) {
  return value.toFixed(4).replace(/\.?0+$/, "") || "0";
}

function objVertex(point: [number, number, number]) {
  return `v ${formatObjNumber(point[0])} ${formatObjNumber(point[1])} ${formatObjNumber(point[2])}`;
}

function appendObjBox(
  lines: string[],
  vertexIndex: number,
  groupName: string,
  materialName: string,
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  height: number,
) {
  const x0 = x;
  const x1 = x + width;
  const y0 = y;
  const y1 = y + depth;
  const z0 = z;
  const z1 = z + height;
  const base = vertexIndex;
  const points: Array<[number, number, number]> = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ];

  lines.push(`g ${groupName}`, `usemtl ${materialName}`, ...points.map(objVertex));
  lines.push(
    `f ${base} ${base + 1} ${base + 2} ${base + 3}`,
    `f ${base + 4} ${base + 7} ${base + 6} ${base + 5}`,
    `f ${base} ${base + 4} ${base + 5} ${base + 1}`,
    `f ${base + 1} ${base + 5} ${base + 6} ${base + 2}`,
    `f ${base + 2} ${base + 6} ${base + 7} ${base + 3}`,
    `f ${base + 3} ${base + 7} ${base + 4} ${base}`,
  );

  return vertexIndex + points.length;
}

function buildMtl(grid: PixelGrid) {
  const lines = [
    "# Pixel Knock Grid Generator color preview materials",
    "newmtl grid_wall",
    "Kd 0.68 0.68 0.68",
    "Ka 0.08 0.08 0.08",
    "d 1",
  ];

  grid.colors.forEach((item, index) => {
    const { red, green, blue } = parseHex(item.color);

    lines.push(
      "",
      `newmtl color_${index + 1}`,
      `Kd ${(red / 255).toFixed(4)} ${(green / 255).toFixed(4)} ${(blue / 255).toFixed(4)}`,
      "Ka 0.08 0.08 0.08",
      "d 1",
    );
  });

  return lines.join("\n");
}

function buildSeparatedBlocksMtl(grid: PixelGrid) {
  const lines = ["# Pixel Knock Grid Generator separated block materials"];

  grid.colors.forEach((item, index) => {
    const { red, green, blue } = parseHex(item.color);
    const normalized = [
      (red / 255).toFixed(4),
      (green / 255).toFixed(4),
      (blue / 255).toFixed(4),
    ].join(" ");

    lines.push(
      "",
      `newmtl color_${index + 1}`,
      `Kd ${normalized}`,
      `Ka ${normalized}`,
      "d 1.0",
    );
  });

  return lines.join("\n");
}

function generateObjMtl(grid: PixelGrid, params: Params) {
  const blockSizeMm = params.cellSizeMm - params.wallThicknessMm - params.blockClearanceMm;
  const colorIndexes = getColorIndexMap(grid);
  const lines = [
    "# Pixel Knock Grid Generator color preview",
    "mtllib pixel-knock-color-preview.mtl",
    "o pixel_knock_color_preview",
  ];
  let vertexIndex = 1;

  buildWallRects(grid, params.cellSizeMm, params.wallThicknessMm).forEach((wall, index) => {
    vertexIndex = appendObjBox(
      lines,
      vertexIndex,
      `grid_wall_${index + 1}`,
      "grid_wall",
      wall.x,
      wall.y,
      0,
      wall.width,
      wall.depth,
      params.wallHeightMm,
    );
  });

  grid.cells.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell.empty || !cell.color) return;

      const colorIndex = colorIndexes.get(cell.color) || 1;
      const offset = (params.cellSizeMm - blockSizeMm) / 2;

      vertexIndex = appendObjBox(
        lines,
        vertexIndex,
        `color_${colorIndex}_cell_${colIndex + 1}_${rowIndex + 1}`,
        `color_${colorIndex}`,
        colIndex * params.cellSizeMm + offset,
        rowIndex * params.cellSizeMm + offset,
        0,
        blockSizeMm,
        blockSizeMm,
        params.blockHeightMm,
      );
    });
  });

  return {
    obj: lines.join("\n"),
    mtl: buildMtl(grid),
    blockSizeMm,
  };
}

function generateSeparatedBlocksObjMtl(grid: PixelGrid, params: Params) {
  const blockSizeMm = params.cellSizeMm - params.wallThicknessMm - params.blockClearanceMm;
  const groupGapMm = params.cellSizeMm * 3;
  const lines = [
    "# Pixel Knock Grid Generator separated color blocks",
    "mtllib pixel-knock-color-blocks-separated.mtl",
  ];
  let vertexIndex = 1;
  let groupOffsetY = 0;

  grid.colors.forEach((item, colorIndex) => {
    const columns = clamp(Math.ceil(Math.sqrt(item.count)), 1, 12);
    const rows = Math.ceil(item.count / columns);

    lines.push(`o color_${colorIndex + 1}_blocks`, `usemtl color_${colorIndex + 1}`);

    for (let index = 0; index < item.count; index += 1) {
      const col = index % columns;
      const row = Math.floor(index / columns);

      vertexIndex = appendObjBox(
        lines,
        vertexIndex,
        `color_${colorIndex + 1}_block_${index + 1}`,
        `color_${colorIndex + 1}`,
        col * params.cellSizeMm,
        groupOffsetY + row * params.cellSizeMm,
        0,
        blockSizeMm,
        blockSizeMm,
        params.blockHeightMm,
      );
    }

    groupOffsetY += rows * params.cellSizeMm + groupGapMm;
  });

  return {
    obj: lines.join("\n"),
    mtl: buildSeparatedBlocksMtl(grid),
    blockSizeMm,
  };
}

function getPrinterBrand(brand: string) {
  return printerPresets.find((preset) => preset.brand === brand) || printerPresets[0];
}

function getPrinterModel(brand: string, modelId: string) {
  const selectedBrand = getPrinterBrand(brand);

  return selectedBrand.models.find((model) => model.id === modelId) || selectedBrand.models[0];
}

function getPrinterModelById(modelId: string) {
  for (const preset of printerPresets) {
    const model = preset.models.find((item) => item.id === modelId);

    if (model) {
      return {
        brand: preset,
        model,
      };
    }
  }

  return {
    brand: printerPresets[0],
    model: printerPresets[0].models[0],
  };
}

function estimateBedFit(grid: PixelGrid | null, params: Params, bedWidth: number, bedDepth: number) {
  if (!grid || bedWidth <= 0 || bedDepth <= 0) {
    return null;
  }

  const frameWidth = grid.width * params.cellSizeMm;
  const frameDepth = grid.height * params.cellSizeMm;

  return {
    bedWidth,
    bedDepth,
    frameWidth,
    frameDepth,
    fitsAsPlaced: frameWidth <= bedWidth && frameDepth <= bedDepth,
    fitsRotated: frameDepth <= bedWidth && frameWidth <= bedDepth,
  };
}

function estimateColorBlockAreas(grid: PixelGrid | null, params: Params) {
  if (!grid || grid.colors.length === 0) {
    return [];
  }

  const blockSizeMm = params.cellSizeMm - params.wallThicknessMm - params.blockClearanceMm;
  const blockGapMm = 1;

  if (blockSizeMm <= 0) {
    return [];
  }

  return grid.colors.map((item, index) => {
    const columns = Math.ceil(Math.sqrt(item.count));
    const rows = Math.ceil(item.count / columns);
    const width = columns * (blockSizeMm + blockGapMm);
    const depth = rows * (blockSizeMm + blockGapMm);

    return {
      index: index + 1,
      color: item.color,
      count: item.count,
      width,
      depth,
      area: width * depth,
    };
  });
}

function estimateColorBlockPlates(groups: ColorBlockArea[], bedWidth: number, bedDepth: number) {
  if (groups.length === 0 || bedWidth <= 0 || bedDepth <= 0) {
    return 0;
  }

  let plates = 0;
  let cursorX = 0;
  let cursorY = 0;
  let rowDepth = 0;
  let hasActivePlate = false;
  const sortedGroups = [...groups].sort((first, second) => second.area - first.area);

  const startPlate = () => {
    plates += 1;
    cursorX = 0;
    cursorY = 0;
    rowDepth = 0;
    hasActivePlate = true;
  };

  sortedGroups.forEach((group) => {
    if (group.width > bedWidth || group.depth > bedDepth) {
      plates += 1;
      hasActivePlate = false;
      cursorX = 0;
      cursorY = 0;
      rowDepth = 0;
      return;
    }

    if (!hasActivePlate) {
      startPlate();
    }

    if (cursorX + group.width <= bedWidth && cursorY + group.depth <= bedDepth) {
      cursorX += group.width;
      rowDepth = Math.max(rowDepth, group.depth);
      return;
    }

    if (cursorY + rowDepth + group.depth <= bedDepth) {
      cursorX = group.width;
      cursorY += rowDepth;
      rowDepth = group.depth;
      return;
    }

    startPlate();
    cursorX = group.width;
    rowDepth = group.depth;
  });

  return plates;
}

function buildColorCsv(grid: PixelGrid) {
  const lines = ["index,hex,r,g,b,cells,percentage"];

  grid.colors.forEach((item, index) => {
    const { red, green, blue } = parseHex(item.color);
    const percentage = grid.activeCells > 0 ? (item.count / grid.activeCells) * 100 : 0;

    lines.push(
      [
        index + 1,
        item.color,
        red,
        green,
        blue,
        item.count,
        formatPercentage(percentage),
      ].join(","),
    );
  });

  return lines.join("\n");
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBinaryFile(content: Uint8Array, fileName: string, mimeType: string) {
  const arrayBuffer = new ArrayBuffer(content.byteLength);

  new Uint8Array(arrayBuffer).set(content);

  const blob = new Blob([arrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function canvasToPngBytes(canvas: HTMLCanvasElement) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("Could not create PNG."));
        return;
      }

      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });
}

function buildReadme(
  grid: PixelGrid,
  params: Params,
  blockSizeMm: number,
  printerInfo: PrinterReadmeInfo,
) {
  const modelWidth = grid.width * params.cellSizeMm;
  const modelHeight = grid.height * params.cellSizeMm;
  const englishFitAsPlaced = printerInfo.bedFit
    ? printerInfo.bedFit.fitsAsPlaced ? "Yes" : "No"
    : "Not calculated";
  const englishFitRotated = printerInfo.bedFit
    ? printerInfo.bedFit.fitsRotated ? "Yes" : "No"
    : "Not calculated";
  const chineseFitAsPlaced = printerInfo.bedFit
    ? printerInfo.bedFit.fitsAsPlaced ? "可以放下" : "放不下"
    : "未计算";
  const chineseFitRotated = printerInfo.bedFit
    ? printerInfo.bedFit.fitsRotated ? "可以放下" : "放不下"
    : "未计算";

  return [
    "Pixel Knock Grid Generator Project",
    "",
    "English",
    "-------",
    "pixel-knock-grid.stl: use this file to 3D print the grid frame.",
    "pixel-knock-color-preview.obj: shows the assembled color preview with the grid and blocks together.",
    "pixel-knock-color-preview.mtl: material colors for the assembled OBJ preview.",
    "pixel-knock-color-blocks-separated.obj: contains only blocks, separated by color group for easier printing or preparation.",
    "pixel-knock-color-blocks-separated.mtl: material colors for the separated block OBJ.",
    "pixel-knock-color-list.csv: color list with required block counts.",
    "pixel-knock-preview.png: pixel preview image.",
    "STL files do not reliably store color information.",
    "For production, print pixel-knock-grid.stl first, then prepare blocks by color using the CSV or separated OBJ.",
    "",
    `Grid size: ${grid.width} x ${grid.height}`,
    `Model size: ${modelWidth.toFixed(1)} x ${modelHeight.toFixed(1)} mm`,
    `Cell size: ${params.cellSizeMm} mm`,
    `Wall thickness: ${params.wallThicknessMm} mm`,
    `Wall height: ${params.wallHeightMm} mm`,
    `Block size: ${blockSizeMm.toFixed(2)} mm`,
    `Block height: ${params.blockHeightMm} mm`,
    `Block fit clearance: ${params.blockClearanceMm} mm`,
    "",
    `Selected printer brand / model: ${printerInfo.brandName} / ${printerInfo.modelName}`,
    ...(printerInfo.modelPending
      ? ["Preset size status: Size not confirmed. Please check the actual bed size in your slicer."]
      : []),
    ...(printerInfo.modelNote && !printerInfo.modelPending ? [`Preset note: ${printerInfo.modelNote}`] : []),
    `Selected bed size: ${printerInfo.bedWidth.toFixed(1)} x ${printerInfo.bedDepth.toFixed(1)} mm`,
    `Frame size: ${modelWidth.toFixed(1)} x ${modelHeight.toFixed(1)} mm`,
    `Fits as placed: ${englishFitAsPlaced}`,
    `Fits if rotated: ${englishFitRotated}`,
    `Estimated plate count: ${printerInfo.totalPlates}`,
    "Note: The usable area may be smaller because of slicer limits, nozzle mode, purge/wipe towers, or protected zones. Always check the final layout in your slicer.",
    "",
    "Chinese / 中文",
    "------------",
    "pixel-knock-grid.stl：用于 3D 打印敲敲乐网格外框。",
    "pixel-knock-color-preview.obj：用于查看格栅和颜色方块组合后的成品预览。",
    "pixel-knock-color-preview.mtl：成品预览 OBJ 的材质颜色。",
    "pixel-knock-color-blocks-separated.obj：只包含方块，并按颜色分组分开放置，方便根据颜色分别打印或备料。",
    "pixel-knock-color-blocks-separated.mtl：分色方块 OBJ 的材质颜色。",
    "pixel-knock-color-list.csv：颜色清单，包含每种颜色所需颗粒数。",
    "pixel-knock-preview.png：像素预览图。",
    "STL 文件通常不可靠保存颜色信息，请根据颜色清单准备对应颜色颗粒。",
    "如果你要实际制作，建议先打印 pixel-knock-grid.stl，再根据 CSV 或分色 OBJ 准备对应颜色颗粒。",
    "",
    `网格数：${grid.width} x ${grid.height}`,
    `外框总尺寸：${modelWidth.toFixed(1)} x ${modelHeight.toFixed(1)} mm`,
    `单格尺寸：${params.cellSizeMm} mm`,
    `墙厚：${params.wallThicknessMm} mm`,
    `墙高：${params.wallHeightMm} mm`,
    `方块尺寸：${blockSizeMm.toFixed(2)} mm`,
    `方块高度：${params.blockHeightMm} mm`,
    `方块松紧公差：${params.blockClearanceMm} mm`,
    "",
    `当前选择的打印机品牌 / 型号：${printerInfo.brandNameZh} / ${printerInfo.modelNameZh}`,
    ...(printerInfo.modelPending
      ? ["预设尺寸状态：尺寸暂未确认，请以切片软件实际热床显示为准。"]
      : []),
    ...(printerInfo.modelNoteZh && !printerInfo.modelPending ? [`型号说明：${printerInfo.modelNoteZh}`] : []),
    `当前热床尺寸：${printerInfo.bedWidth.toFixed(1)} x ${printerInfo.bedDepth.toFixed(1)} mm`,
    `外框尺寸：${modelWidth.toFixed(1)} x ${modelHeight.toFixed(1)} mm`,
    `当前方向是否放得下：${chineseFitAsPlaced}`,
    `旋转 90° 后是否放得下：${chineseFitRotated}`,
    `预计打印盘数：${printerInfo.totalPlates}`,
    "提示：不同切片软件、喷头模式、擦料塔和边界保护可能会减少实际可用区域，请以切片软件最终显示为准。",
  ].join("\n");
}

export default function PixelKnockBoardGeneratorTool({
  locale = "en",
}: PixelKnockBoardGeneratorToolProps) {
  const { isDark } = useTheme();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [language, setLanguage] = useState<Language>(
    locale === "en" ? "en" : "zh",
  );
  const [fileName, setFileName] = useState("");
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState("");
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [grid, setGrid] = useState<PixelGrid | null>(null);
  const [gridWidth, setGridWidth] = useState(String(defaultParams.gridWidth));
  const [maxColors, setMaxColors] = useState(String(defaultParams.maxColors));
  const [colorSimplification, setColorSimplification] = useState<ColorSimplification>(
    defaultParams.colorSimplification,
  );
  const [mergeSimilarColors, setMergeSimilarColors] = useState(String(defaultParams.mergeSimilarColors));
  const [cellSizeMm, setCellSizeMm] = useState(String(defaultParams.cellSizeMm));
  const [wallThicknessMm, setWallThicknessMm] = useState(String(defaultParams.wallThicknessMm));
  const [wallHeightMm, setWallHeightMm] = useState(String(defaultParams.wallHeightMm));
  const [blockHeightMm, setBlockHeightMm] = useState(String(defaultParams.blockHeightMm));
  const [blockClearanceMm, setBlockClearanceMm] = useState(String(defaultParams.blockClearanceMm));
  const [alphaThreshold, setAlphaThreshold] = useState(String(defaultParams.alphaThreshold));
  const [whiteThreshold, setWhiteThreshold] = useState(String(defaultParams.whiteThreshold));
  const [removeWhiteBackground, setRemoveWhiteBackground] = useState(true);
  const [cropMode, setCropMode] = useState<CropMode>("center");
  const [paddingCells, setPaddingCells] = useState("2");
  const [printerBrand, setPrinterBrand] = useState(printerPresets[0].brand);
  const [printerModelId, setPrinterModelId] = useState(printerPresets[0].models[0].id);
  const [bedWidth, setBedWidth] = useState(String(printerPresets[0].models[0].width));
  const [bedDepth, setBedDepth] = useState(String(printerPresets[0].models[0].depth));
  const [previewMode, setPreviewMode] = useState<PreviewMode>("compare");
  const [showColorNumbers, setShowColorNumbers] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLanguage(locale === "en" ? "en" : "zh");
  }, [locale]);

  const t = copy[language];

  const params: Params = {
    gridWidth: parseNumber(gridWidth, defaultParams.gridWidth, 8, 64),
    maxColors: parseNumber(maxColors, defaultParams.maxColors, 2, 16),
    colorSimplification,
    mergeSimilarColors: parseNumber(mergeSimilarColors, defaultParams.mergeSimilarColors, 0, 100),
    cellSizeMm: parseNumber(cellSizeMm, defaultParams.cellSizeMm, 1, 100),
    wallThicknessMm: parseNumber(wallThicknessMm, defaultParams.wallThicknessMm, 0.2, 20),
    wallHeightMm: parseNumber(wallHeightMm, defaultParams.wallHeightMm, 0.2, 100),
    blockHeightMm: parseNumber(blockHeightMm, defaultParams.blockHeightMm, 0.2, 100),
    blockClearanceMm: parseNumber(blockClearanceMm, defaultParams.blockClearanceMm, 0, 20),
    alphaThreshold: parseNumber(alphaThreshold, defaultParams.alphaThreshold, 0, 255),
    whiteThreshold: parseNumber(whiteThreshold, defaultParams.whiteThreshold, 0, 255),
    removeWhiteBackground,
  };
  const selectedPrinterBrand = getPrinterBrand(printerBrand);
  const selectedPrinterModel = getPrinterModel(printerBrand, printerModelId);
  const selectedPrinterNote =
    (language === "zh" ? selectedPrinterModel.noteZh : selectedPrinterModel.note) || "";
  const printerPresetMessage = selectedPrinterModel.pending
    ? String(t.presetPendingWarning)
    : selectedPrinterNote;
  const parsedBedWidth = parseNumber(bedWidth, selectedPrinterModel.width, -100000, 100000);
  const parsedBedDepth = parseNumber(bedDepth, selectedPrinterModel.depth, -100000, 100000);
  const bedFit = estimateBedFit(grid, params, parsedBedWidth, parsedBedDepth);
  const colorBlockAreas = estimateColorBlockAreas(grid, params);
  const colorBlockPlates = estimateColorBlockPlates(
    colorBlockAreas,
    parsedBedWidth,
    parsedBedDepth,
  );
  const totalEstimatedPlates = grid && colorBlockPlates > 0 ? 1 + colorBlockPlates : 0;
  const printerReadmeInfo: PrinterReadmeInfo = {
    brandName: selectedPrinterBrand.brand,
    brandNameZh: selectedPrinterBrand.brandZh,
    modelName: selectedPrinterModel.name,
    modelNameZh: selectedPrinterModel.nameZh,
    modelPending: Boolean(selectedPrinterModel.pending),
    modelNote: selectedPrinterModel.note || "",
    modelNoteZh: selectedPrinterModel.noteZh || "",
    bedWidth: parsedBedWidth,
    bedDepth: parsedBedDepth,
    bedFit,
    colorBlockPlates,
    totalPlates: totalEstimatedPlates,
  };

  const getAnalyticsParams = (targetGrid = grid, extra: Record<string, string | number | boolean | undefined> = {}) => ({
    tool: "pixel-knock-board-generator",
    gridWidth: targetGrid?.width,
    gridHeight: targetGrid?.height,
    colorCount: targetGrid?.colors.length,
    activeBlocks: targetGrid?.activeCells,
    lang: language,
    printerPreset: printerModelId,
    printerBrand: selectedPrinterBrand.brand,
    printerModel: selectedPrinterModel.name,
    printerPresetPending: Boolean(selectedPrinterModel.pending),
    bedWidth: parsedBedWidth,
    bedDepth: parsedBedDepth,
    colorSimplification: params.colorSimplification,
    mergeSimilarColors: params.mergeSimilarColors,
    maxColors: params.maxColors,
    finalColorCount: targetGrid?.colors.length,
    ...extra,
  });
  const parsedPaddingCells = parseNumber(paddingCells, 2, 0, 8);

  useEffect(() => {
    return () => {
      if (originalPreviewUrl) {
        URL.revokeObjectURL(originalPreviewUrl);
      }
    };
  }, [originalPreviewUrl]);

  useEffect(() => {
    if (grid && previewCanvasRef.current) {
      drawPreview(previewCanvasRef.current, grid, isDark, showColorNumbers);
    }
  }, [grid, isDark, showColorNumbers, previewMode]);

  const getPreviewCanvas = () => {
    if (previewCanvasRef.current) {
      return previewCanvasRef.current;
    }

    if (!grid) {
      return null;
    }

    const canvas = document.createElement("canvas");

    drawPreview(canvas, grid, isDark, showColorNumbers);

    return canvas;
  };

  const handlePrinterBrandChange = (brand: string) => {
    const nextBrand = getPrinterBrand(brand);
    const nextModel = nextBrand.models[0];

    setPrinterBrand(nextBrand.brand);
    setPrinterModelId(nextModel.id);
    setBedWidth(String(nextModel.width));
    setBedDepth(String(nextModel.depth));
  };

  const handlePrinterModelChange = (modelId: string) => {
    const { brand, model } = getPrinterModelById(modelId);

    setPrinterBrand(brand.brand);
    setPrinterModelId(model.id);
    setBedWidth(String(model.width));
    setBedDepth(String(model.depth));
  };

  const processCurrentImage = (image = imageElement) => {
    if (!image) {
      setGrid(null);
      setError(t.errors.uploadFirst);
      return;
    }

    try {
      const nextGrid = prepareGridForOutput(
        processImageToGrid(image, params),
        cropMode,
        parsedPaddingCells,
      );

      if (!nextGrid) {
        setGrid(null);
        setError(t.errors.noVisiblePixels);
        return;
      }

      setGrid(nextGrid);
      setError("");
      trackEvent("generate_preview", getAnalyticsParams(nextGrid));
    } catch {
      setGrid(null);
      setError(t.errors.couldNotProcess);
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setImageElement(null);
      setGrid(null);
      setFileName("");
      setOriginalPreviewUrl("");
      setError(t.errors.invalidFile);
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    setOriginalPreviewUrl(url);

    image.onload = () => {
      setFileName(file.name);
      setImageElement(image);
      setError("");

      try {
        const nextGrid = prepareGridForOutput(
          processImageToGrid(image, params),
          cropMode,
          parsedPaddingCells,
        );

        if (!nextGrid) {
          setGrid(null);
          setError(t.errors.noVisiblePixels);
          return;
        }

        setGrid(nextGrid);
        trackEvent("upload_image", getAnalyticsParams(nextGrid));
      } catch {
        setGrid(null);
        setError(t.errors.couldNotProcess);
      }
    };
    image.onerror = () => {
      setOriginalPreviewUrl("");
      setImageElement(null);
      setGrid(null);
      setError(t.errors.couldNotLoad);
    };
    image.src = url;
  };

  const reset = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setFileName("");
    setOriginalPreviewUrl("");
    setImageElement(null);
    setGrid(null);
    setPreviewMode("compare");
    setError("");
  };

  const downloadPreview = () => {
    const previewCanvas = getPreviewCanvas();

    if (!previewCanvas || !grid) {
      setError(t.errors.previewFirst);
      return;
    }

    previewCanvas.toBlob((blob) => {
      if (!blob) {
        setError(t.errors.couldNotCreatePng);
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "pixel-knock-preview.png";
      link.click();
      URL.revokeObjectURL(url);
      trackEvent("download_png_preview", getAnalyticsParams());
    }, "image/png");
  };

  const downloadStl = () => {
    if (!grid || grid.activeCells === 0) {
      setError(t.errors.stlFirst);
      return;
    }

    downloadTextFile(
      generateStl(grid, params),
      "pixel-knock-grid.stl",
      "model/stl",
    );
    trackEvent("download_stl_grid", getAnalyticsParams());
  };

  const downloadCsv = () => {
    if (!grid || grid.activeCells === 0) {
      setError(t.errors.stlFirst);
      return;
    }

    downloadTextFile(
      buildColorCsv(grid),
      "pixel-knock-color-list.csv",
      "text/csv;charset=utf-8",
    );
    trackEvent("download_color_csv", getAnalyticsParams());
  };

  const downloadProjectZip = async () => {
    const previewCanvas = getPreviewCanvas();

    if (!grid || grid.activeCells === 0 || grid.colors.length === 0 || !previewCanvas) {
      setError(t.errors.stlFirst);
      return;
    }

    const blockSizeMm = params.cellSizeMm - params.wallThicknessMm - params.blockClearanceMm;

    if (blockSizeMm <= 0) {
      setError(t.errors.blockSizeInvalid);
      return;
    }

    if (parsedBedWidth <= 0 || parsedBedDepth <= 0) {
      setError(t.errors.bedSizeInvalid);
      return;
    }

    try {
      const pngBytes = await canvasToPngBytes(previewCanvas);
      const { obj, mtl } = generateObjMtl(grid, params);
      const separatedBlocks = generateSeparatedBlocksObjMtl(grid, params);
      const files = {
        "pixel-knock-grid.stl": strToU8(generateStl(grid, params)),
        "pixel-knock-color-preview.obj": strToU8(obj),
        "pixel-knock-color-preview.mtl": strToU8(mtl),
        "pixel-knock-color-blocks-separated.obj": strToU8(separatedBlocks.obj),
        "pixel-knock-color-blocks-separated.mtl": strToU8(separatedBlocks.mtl),
        "pixel-knock-color-list.csv": strToU8(buildColorCsv(grid)),
        "pixel-knock-preview.png": pngBytes,
        "README.txt": strToU8(buildReadme(grid, params, blockSizeMm, printerReadmeInfo)),
      };
      const zipBytes = zipSync(files, { level: 6 });

      downloadBinaryFile(
        zipBytes,
        `pixel-knock-${grid.width}x${grid.height}-project.zip`,
        "application/zip",
      );
      setError("");
      trackEvent("download_project_zip", getAnalyticsParams());
    } catch {
      setError(t.errors.couldNotCreateZip);
    }
  };

  const totalCells = grid ? grid.width * grid.height : 0;
  const emptyCells = grid ? totalCells - grid.activeCells : 0;
  const modelWidth = grid ? grid.width * params.cellSizeMm : 0;
  const modelHeight = grid ? grid.height * params.cellSizeMm : 0;
  const selectClass = `w-full max-w-full rounded-2xl border px-4 py-4 outline-none transition ${
    isDark
      ? "border-white/10 bg-white/[0.04] text-white focus:border-lime-300/40"
      : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B] focus:border-[#2563EB]/40"
  }`;

  return (
    <ToolPanel>
      <div className="w-full max-w-full">
      <div className="flex w-full max-w-full flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold">{t.title}</h2>
          <p className={isDark ? "mt-3 max-w-3xl leading-7 text-white/60" : "mt-3 max-w-3xl leading-7 text-[#6B665D]"}>
            {t.subtitle}
          </p>
        </div>

        <div className="w-full shrink-0 md:w-auto">
          <ToolLabel>{t.language}</ToolLabel>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap [&_button]:min-h-12 [&_button]:w-full sm:[&_button]:w-auto">
            <ToolButton
              onClick={() => {
                setLanguage("en");
                trackEvent("switch_language", getAnalyticsParams(grid, { lang: "en" }));
              }}
              variant={language === "en" ? "primary" : "secondary"}
            >
              {t.english}
            </ToolButton>
            <ToolButton
              onClick={() => {
                setLanguage("zh");
                trackEvent("switch_language", getAnalyticsParams(grid, { lang: "zh" }));
              }}
              variant={language === "zh" ? "primary" : "secondary"}
            >
              {t.chinese}
            </ToolButton>
          </div>
        </div>
      </div>

      <ToolResultBox muted>
        {t.description}
      </ToolResultBox>

      <div className="mt-5 w-full max-w-full">
        <ToolLabel>{t.uploadLabel}</ToolLabel>
        <div
          className={`flex w-full max-w-full flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${
            isDark
              ? "border-white/10 bg-white/[0.04]"
              : "border-[#E5DED0] bg-[#F5F2EA]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
            className="hidden"
          />
          <div className="w-full sm:w-auto [&_button]:min-h-12 [&_button]:w-full sm:[&_button]:w-auto">
            <ToolButton onClick={() => fileInputRef.current?.click()}>
              {t.chooseFile}
            </ToolButton>
          </div>
          <span className={isDark ? "min-w-0 break-all text-sm text-white/55" : "min-w-0 break-all text-sm text-[#6B665D]"}>
            {fileName ? `${t.loadedLocally}: ${fileName}` : t.noFile}
          </span>
        </div>
        <p className={isDark ? "mt-2 text-sm text-white/45" : "mt-2 text-sm text-[#8A8173]"}>
          {t.localProcessingNote}
        </p>
        <div
          className={`mt-3 w-full max-w-full rounded-2xl border p-4 text-sm leading-6 ${
            isDark
              ? "border-red-400/30 bg-red-500/10 text-red-100"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {t.uploadTip}
        </div>
      </div>

      <div className="mt-5 grid w-full max-w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <ToolLabel>{t.gridWidth} (8-64)</ToolLabel>
          <ToolInput value={gridWidth} onChange={setGridWidth} type="number" />
        </div>
        <div className="min-w-0">
          <ToolLabel>{t.maxColors} (2-16)</ToolLabel>
          <ToolInput value={maxColors} onChange={setMaxColors} type="number" />
          <p className={isDark ? "mt-2 text-sm leading-6 text-white/50" : "mt-2 text-sm leading-6 text-[#6B665D]"}>
            {t.maxColorsHelp}
          </p>
        </div>
        <div className="min-w-0 sm:col-span-2 lg:col-span-2">
          <ToolLabel>{t.colorSimplification}</ToolLabel>
          <div className="grid w-full max-w-full grid-cols-1 gap-2 sm:grid-cols-3 [&_button]:min-h-12 [&_button]:w-full">
            <ToolButton
              onClick={() => setColorSimplification("strong")}
              variant={colorSimplification === "strong" ? "primary" : "secondary"}
            >
              {t.simplificationStrong}
            </ToolButton>
            <ToolButton
              onClick={() => setColorSimplification("standard")}
              variant={colorSimplification === "standard" ? "primary" : "secondary"}
            >
              {t.simplificationStandard}
            </ToolButton>
            <ToolButton
              onClick={() => setColorSimplification("detailed")}
              variant={colorSimplification === "detailed" ? "primary" : "secondary"}
            >
              {t.simplificationDetailed}
            </ToolButton>
          </div>
          <p className={isDark ? "mt-2 text-sm leading-6 text-white/50" : "mt-2 text-sm leading-6 text-[#6B665D]"}>
            {colorSimplification === "strong"
              ? t.simplificationStrongHelp
              : colorSimplification === "detailed"
                ? t.simplificationDetailedHelp
                : t.simplificationStandardHelp}
          </p>
        </div>
        <div className="min-w-0">
          <ToolLabel>{t.mergeSimilarColors} (0-100)</ToolLabel>
          <ToolInput value={mergeSimilarColors} onChange={setMergeSimilarColors} type="number" />
          <p className={isDark ? "mt-2 text-sm leading-6 text-white/50" : "mt-2 text-sm leading-6 text-[#6B665D]"}>
            {t.mergeSimilarColorsHelp}
          </p>
        </div>
        <div className="min-w-0 sm:col-span-2 lg:col-span-2">
          <ToolLabel>{t.cropMode}</ToolLabel>
          <div className="grid w-full max-w-full grid-cols-1 gap-2 sm:grid-cols-3 [&_button]:min-h-12 [&_button]:w-full">
            <ToolButton
              onClick={() => setCropMode("tight")}
              variant={cropMode === "tight" ? "primary" : "secondary"}
            >
              {t.cropModeTight}
            </ToolButton>
            <ToolButton
              onClick={() => setCropMode("center")}
              variant={cropMode === "center" ? "primary" : "secondary"}
            >
              {t.cropModeCenter}
            </ToolButton>
            <ToolButton
              onClick={() => setCropMode("original")}
              variant={cropMode === "original" ? "primary" : "secondary"}
            >
              {t.cropModeOriginal}
            </ToolButton>
          </div>
        </div>
        <div className="min-w-0">
          <ToolLabel>{t.paddingCells} (0-8)</ToolLabel>
          <ToolInput value={paddingCells} onChange={setPaddingCells} type="number" />
          <p className={isDark ? "mt-2 text-sm leading-6 text-white/50" : "mt-2 text-sm leading-6 text-[#6B665D]"}>
            {t.paddingCellsHelp}
          </p>
        </div>
        <div className="min-w-0">
          <ToolLabel>{t.cellSize}</ToolLabel>
          <ToolInput value={cellSizeMm} onChange={setCellSizeMm} type="number" />
        </div>
        <div className="min-w-0">
          <ToolLabel>{t.wallThickness}</ToolLabel>
          <ToolInput value={wallThicknessMm} onChange={setWallThicknessMm} type="number" />
        </div>
        <div className="min-w-0">
          <ToolLabel>{t.wallHeight}</ToolLabel>
          <ToolInput value={wallHeightMm} onChange={setWallHeightMm} type="number" />
        </div>
        <div className="min-w-0">
          <ToolLabel>{t.blockHeight}</ToolLabel>
          <ToolInput value={blockHeightMm} onChange={setBlockHeightMm} type="number" />
        </div>
        <div className="min-w-0">
          <ToolLabel>{t.blockClearance}</ToolLabel>
          <ToolInput value={blockClearanceMm} onChange={setBlockClearanceMm} type="number" />
          <p className={isDark ? "mt-2 text-sm leading-6 text-white/50" : "mt-2 text-sm leading-6 text-[#6B665D]"}>
            {t.blockClearanceHelp}
          </p>
          <p className={isDark ? "mt-1 text-sm leading-6 text-white/45" : "mt-1 text-sm leading-6 text-[#8A8173]"}>
            {t.blockClearanceRecommend}
          </p>
          <div className="mt-3 grid w-full max-w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 [&_button]:min-h-10 [&_button]:w-full">
            <ToolButton onClick={() => setBlockClearanceMm("0.2")} variant="secondary">
              {t.clearanceTight}
            </ToolButton>
            <ToolButton onClick={() => setBlockClearanceMm("0.4")} variant="secondary">
              {t.clearanceStandard}
            </ToolButton>
            <ToolButton onClick={() => setBlockClearanceMm("0.6")} variant="secondary">
              {t.clearanceLoose}
            </ToolButton>
          </div>
        </div>
        <div className="min-w-0">
          <ToolLabel>{t.alphaThreshold}</ToolLabel>
          <ToolInput value={alphaThreshold} onChange={setAlphaThreshold} type="number" />
        </div>
        <div className="min-w-0">
          <ToolLabel>{t.whiteThreshold}</ToolLabel>
          <ToolInput value={whiteThreshold} onChange={setWhiteThreshold} type="number" />
        </div>
      </div>

      <ToolResultBox muted>
        <div className="grid gap-2">
          <p>{t.colorReductionNote}</p>
          {params.maxColors <= 3 ? <p>{t.lowColorWarning}</p> : null}
        </div>
      </ToolResultBox>

      <ToolResultBox>
        <div className="grid gap-4">
          <h3 className="text-lg font-semibold">{t.bedFit}</h3>
          <div className="grid w-full max-w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <ToolLabel>{t.printerBrand}</ToolLabel>
              <select
                value={printerBrand}
                onChange={(event) => handlePrinterBrandChange(event.target.value)}
                className={selectClass}
              >
                {printerPresets.map((preset) => (
                  <option key={preset.brand} value={preset.brand}>
                    {language === "zh" ? preset.brandZh : preset.brand}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <ToolLabel>{t.printerModel}</ToolLabel>
              <select
                value={printerModelId}
                onChange={(event) => handlePrinterModelChange(event.target.value)}
                className={selectClass}
              >
                {selectedPrinterBrand.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {language === "zh" ? model.nameZh : model.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <ToolLabel>{t.bedWidth}</ToolLabel>
              <ToolInput value={bedWidth} onChange={setBedWidth} type="number" />
            </div>
            <div className="min-w-0">
              <ToolLabel>{t.bedDepth}</ToolLabel>
              <ToolInput value={bedDepth} onChange={setBedDepth} type="number" />
            </div>
          </div>
          {printerPresetMessage ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                selectedPrinterModel.pending
                  ? isDark
                    ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                  : isDark
                    ? "border-white/10 bg-white/[0.04] text-white/65"
                    : "border-[#E5DED0] bg-[#F8F4EA] text-[#6B665D]"
              }`}
            >
              {printerPresetMessage}
            </div>
          ) : null}
          <p className={isDark ? "text-sm leading-6 text-white/50" : "text-sm leading-6 text-[#6B665D]"}>
            {t.bedUsableAreaNote}
          </p>
        </div>
      </ToolResultBox>

      <div className="mt-5 grid w-full max-w-full grid-cols-1 gap-3 sm:grid-cols-2">
        <ToolCheckbox checked={removeWhiteBackground} onChange={setRemoveWhiteBackground}>
          {t.removeWhiteBackground}
        </ToolCheckbox>
        <ToolCheckbox
          checked={showColorNumbers}
          onChange={(checked) => {
            setShowColorNumbers(checked);
            trackEvent(
              "toggle_show_color_numbers",
              getAnalyticsParams(grid, { enabled: checked }),
            );
          }}
        >
          {t.showColorNumbers}
        </ToolCheckbox>
      </div>

      <div className="mt-4 flex w-full max-w-full flex-col gap-3 sm:flex-row sm:flex-wrap [&_button]:min-h-12 [&_button]:w-full sm:[&_button]:w-auto">
        <ToolButton onClick={() => processCurrentImage()}>{t.generatePreview}</ToolButton>
        <ToolButton onClick={downloadProjectZip}>
          {t.downloadZip}
        </ToolButton>
        <ToolButton onClick={downloadPreview} variant="secondary">
          {t.downloadPng}
        </ToolButton>
        <ToolButton onClick={downloadStl} variant="secondary">
          {t.downloadStl}
        </ToolButton>
        <ToolButton onClick={downloadCsv} variant="secondary">
          {t.downloadCsv}
        </ToolButton>
        <ToolButton onClick={reset} variant="danger">
          {t.clear}
        </ToolButton>
      </div>

      <ToolResultBox muted>
        <div className="grid gap-2">
          <p>{t.zipIncludesNote}</p>
          <p>{t.objColorNote}</p>
        </div>
      </ToolResultBox>

      {error ? <ToolResultBox>{error}</ToolResultBox> : null}

      {grid ? (
        <>
          <div className="mt-5 grid w-full max-w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ToolStatCard label={t.gridSize} value={`${grid.width} × ${grid.height}`} />
            <ToolStatCard label={t.totalCells} value={totalCells} />
            <ToolStatCard label={t.activeCells} value={grid.activeCells} />
            <ToolStatCard label={t.emptyCells} value={emptyCells} />
            <ToolStatCard label={t.modelSize} value={`${modelWidth.toFixed(1)} × ${modelHeight.toFixed(1)} mm`} />
          </div>

          <ToolResultBox>
            <div className="grid gap-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{t.bedFit}</h3>
                  {bedFit ? (
                    <p className={isDark ? "mt-2 text-sm text-white/50" : "mt-2 text-sm text-[#6B665D]"}>
                      {t.frameSize}: {bedFit.frameWidth.toFixed(1)} × {bedFit.frameDepth.toFixed(1)} mm
                      <br />
                      {t.selectedBed}: {bedFit.bedWidth.toFixed(1)} × {bedFit.bedDepth.toFixed(1)} mm
                    </p>
                  ) : (
                    <p className={isDark ? "mt-2 text-sm text-red-200" : "mt-2 text-sm text-red-700"}>
                      {t.errors.bedSizeInvalid}
                    </p>
                  )}
                </div>

                {bedFit ? (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                      bedFit.fitsAsPlaced
                        ? isDark
                          ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : bedFit.fitsRotated
                          ? isDark
                            ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                          : isDark
                            ? "border-red-300/30 bg-red-400/10 text-red-200"
                            : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {bedFit.fitsAsPlaced
                      ? t.bedFits
                      : bedFit.fitsRotated
                        ? t.bedFitsRotated
                        : t.bedDoesNotFit}
                  </div>
                ) : null}
              </div>

              {bedFit ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={`rounded-2xl border p-4 ${isDark ? "border-white/10" : "border-[#E5DED0]"}`}>
                    <p className="text-sm font-semibold">{t.fitsAsPlaced}</p>
                    <p className={bedFit.fitsAsPlaced ? "mt-2 text-emerald-500" : "mt-2 text-red-500"}>
                      {bedFit.fitsAsPlaced ? t.yes : t.no}
                    </p>
                  </div>
                  <div className={`rounded-2xl border p-4 ${isDark ? "border-white/10" : "border-[#E5DED0]"}`}>
                    <p className="text-sm font-semibold">{t.fitsIfRotated}</p>
                    <p className={bedFit.fitsRotated ? "mt-2 text-emerald-500" : "mt-2 text-red-500"}>
                      {bedFit.fitsRotated ? t.yes : t.no}
                    </p>
                  </div>
                </div>
              ) : null}

              {bedFit ? (
                <p className={isDark ? "text-sm leading-6 text-white/55" : "text-sm leading-6 text-[#6B665D]"}>
                  {bedFit.fitsAsPlaced
                    ? t.bedSuggestionFits
                    : bedFit.fitsRotated
                      ? t.bedSuggestionRotate
                      : t.bedSuggestionReduce}
                </p>
              ) : null}

              <p className={isDark ? "text-sm leading-6 text-white/45" : "text-sm leading-6 text-[#8A8173]"}>
                {t.bedUsableAreaNote}
              </p>

              {bedFit ? (
                <div className={`rounded-2xl border p-4 ${isDark ? "border-white/10" : "border-[#E5DED0]"}`}>
                  <h4 className="font-semibold">{t.estimatedPlates}: {totalEstimatedPlates}</h4>
                  <p className={isDark ? "mt-2 text-sm text-white/55" : "mt-2 text-sm text-[#6B665D]"}>
                    {String(t.plateCountDetail).replace("{count}", String(colorBlockPlates))}
                  </p>
                  <p className={isDark ? "mt-2 text-sm text-white/45" : "mt-2 text-sm text-[#8A8173]"}>
                    {t.plateEstimateNote}
                  </p>
                </div>
              ) : null}

              {colorBlockAreas.length > 0 ? (
                <div>
                  <h4 className="font-semibold">{t.colorBlockAreas}</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {colorBlockAreas.map((area) => (
                      <div
                        key={area.color}
                        className={`min-w-0 rounded-2xl border p-4 ${
                          isDark ? "border-white/10" : "border-[#E5DED0]"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="shrink-0 text-sm font-semibold">#{area.index}</span>
                          <span
                            className="h-7 w-7 shrink-0 rounded-md border border-current/10"
                            style={{ backgroundColor: area.color }}
                          />
                          <span className="min-w-0 break-all font-mono text-sm">{area.color}</span>
                        </div>
                        <p className={isDark ? "mt-3 text-sm text-white/60" : "mt-3 text-sm text-[#6B665D]"}>
                          {t.cellCount}: {area.count}
                          <br />
                          {t.estimatedArea}: {area.width.toFixed(0)} × {area.depth.toFixed(0)} mm
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </ToolResultBox>

          <ToolResultBox>
            <div className="grid w-full max-w-full gap-4">
              <div className="flex w-full max-w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <p className={isDark ? "max-w-3xl text-sm leading-6 text-white/55" : "max-w-3xl text-sm leading-6 text-[#6B665D]"}>
                  {t.previewCompareNote}
                </p>
                <div className="grid w-full max-w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto [&_button]:min-h-10 [&_button]:w-full">
                  <ToolButton
                    onClick={() => setPreviewMode("compare")}
                    variant={previewMode === "compare" ? "primary" : "secondary"}
                  >
                    {t.previewModeCompare}
                  </ToolButton>
                  <ToolButton
                    onClick={() => setPreviewMode("original")}
                    variant={previewMode === "original" ? "primary" : "secondary"}
                  >
                    {t.previewModeOriginal}
                  </ToolButton>
                  <ToolButton
                    onClick={() => setPreviewMode("pixel")}
                    variant={previewMode === "pixel" ? "primary" : "secondary"}
                  >
                    {t.previewModePixel}
                  </ToolButton>
                </div>
              </div>

              <div className={`grid w-full max-w-full grid-cols-1 gap-4 ${previewMode === "compare" ? "lg:grid-cols-2" : ""}`}>
                {previewMode !== "pixel" ? (
                  <div
                    className={`min-w-0 rounded-2xl border p-4 ${
                      isDark ? "border-white/10 bg-white/[0.03]" : "border-[#E5DED0] bg-[#FFFDF7]"
                    }`}
                  >
                    <h3 className="mb-3 text-lg font-semibold">{t.originalImage}</h3>
                    {originalPreviewUrl ? (
                      <img
                        src={originalPreviewUrl}
                        alt={t.originalImage}
                        className="mx-auto block h-auto max-h-[70vh] max-w-full object-contain"
                      />
                    ) : (
                      <p className={isDark ? "text-sm text-white/50" : "text-sm text-[#6B665D]"}>
                        {t.noFile}
                      </p>
                    )}
                  </div>
                ) : null}

                {previewMode !== "original" ? (
                  <div
                    className={`min-w-0 rounded-2xl border p-4 ${
                      isDark ? "border-white/10 bg-white/[0.03]" : "border-[#E5DED0] bg-[#FFFDF7]"
                    }`}
                  >
                    <h3 className="mb-3 text-lg font-semibold">{t.pixelPreview}</h3>
                    <div className="flex w-full max-w-full justify-center overflow-hidden">
                      <canvas
                        ref={previewCanvasRef}
                        className={`block h-auto max-h-[70vh] max-w-full object-contain rounded-2xl border [image-rendering:pixelated] ${
                          isDark ? "border-white/10" : "border-[#E5DED0]"
                        }`}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </ToolResultBox>

          <ToolResultBox>
            <h3 className="mb-4 text-lg font-semibold">{t.colorList}</h3>
            <div className="grid w-full max-w-full grid-cols-1 gap-3 sm:grid-cols-2">
              {grid.colors.map((item, index) => {
                const { red, green, blue } = parseHex(item.color);
                const percentage = grid.activeCells > 0 ? (item.count / grid.activeCells) * 100 : 0;

                return (
                  <div
                    key={item.color}
                    className={`flex min-w-0 flex-col gap-3 rounded-2xl border p-4 ${
                      isDark ? "border-white/10" : "border-[#E5DED0]"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 text-sm font-semibold">#{index + 1}</span>
                      <span
                        className="h-8 w-8 shrink-0 rounded-md border border-current/10"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="min-w-0 break-all font-mono text-sm">{item.color}</span>
                    </div>
                    <div className={isDark ? "grid gap-1 text-sm text-white/60" : "grid gap-1 text-sm text-[#6B665D]"}>
                      <div className="min-w-0 break-all font-mono">
                        {t.hex}: {item.color}
                      </div>
                      <div className="font-mono">
                        {t.rgb}: {red}, {green}, {blue}
                      </div>
                      <div>
                        {t.cellCount}: {item.count}
                      </div>
                      <div>
                        {t.percentage}: {formatPercentage(percentage)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>{t.emptyState}</ToolResultBox>
      )}
      </div>
    </ToolPanel>
  );
}
