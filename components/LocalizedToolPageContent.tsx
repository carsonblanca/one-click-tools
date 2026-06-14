"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import ToolClient from "../app/(en)/tools/[slug]/tool-client";
import type { ChineseLocale, LocalizedTool } from "../lib/localizedContent";
import { getLocalized3dTools } from "../lib/localizedContent";
import PageShell from "./PageShell";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { useTheme } from "./ThemeProvider";

const copy = {
  "zh-cn": {
    privacyTitle: "隐私提示",
    privacy:
      "这个工具在浏览器中完成计算，不需要上传文件或把输入内容发送到 OneClick Tools 服务器。结果是估算值，实际情况仍要以切片软件、设备、材料和打印参数为准。",
    relatedTitle: "相关 3D 打印工具",
    backHome: "返回 3D 打印工具",
  },
  "zh-tw": {
    privacyTitle: "隱私提示",
    privacy:
      "這個工具在瀏覽器中完成計算，不需要上傳檔案或把輸入內容送到 OneClick Tools 伺服器。結果是估算值，實際情況仍要以切片軟體、設備、材料和列印參數為準。",
    relatedTitle: "相關 3D 列印工具",
    backHome: "返回 3D 列印工具",
  },
};

const toolUiTranslations: Record<ChineseLocale, Record<string, string>> = {
  "zh-cn": {
    "Spool price": "整卷耗材价格",
    "Spool weight": "整卷耗材重量",
    "Spool weight unit": "耗材重量单位",
    Grams: "克",
    Kg: "千克",
    "Model weight (grams)": "模型重量（克）",
    "Waste percentage optional": "损耗比例（可选）",
    Calculate: "计算",
    Clear: "清空",
    "Cost per gram": "每克成本",
    "Material used with waste": "含损耗用量",
    "Estimated material cost": "预计材料成本",
    "Filament cost estimates will appear here.": "耗材成本估算会显示在这里。",
    "Print hours": "打印小时数",
    "Print minutes": "打印分钟数",
    "Hourly machine rate": "设备小时费率",
    "Material cost": "材料成本",
    "Labor/setup cost optional": "人工/设置成本（可选）",
    "Profit margin percentage optional": "利润率（可选）",
    "Print time": "打印时长",
    "Machine cost": "设备成本",
    "Base total cost": "基础总成本",
    "Suggested price": "建议报价",
    "No margin": "未填写利润率",
    "Print time cost estimates will appear here.": "打印时长成本估算会显示在这里。",
    "Filament diameter": "耗材直径",
    "Material density (g/cm³)": "材料密度（g/cm³）",
    "Weight (grams)": "重量（克）",
    "Material density presets": "材料密度预设",
    "Approximate filament length": "预计耗材长度",
    Diameter: "直径",
    "Approximate filament length will appear here.": "预计耗材长度会显示在这里。",
    "Filament length (meters)": "耗材长度（米）",
    "Estimated filament weight": "预计耗材重量",
    "Estimated filament weight will appear here.": "预计耗材重量会显示在这里。",
    "Compression quality": "压缩质量",
    "High quality 90%": "高质量 90%",
    "Balanced 70%": "平衡 70%",
    "Smaller file 50%": "小文件 50%",
    "Strong compression 30%": "强压缩 30%",
    "Original size": "原始大小",
    "Output size": "输出大小",
    "Actual compression": "实际压缩率",
    "Size reduced": "减少大小",
    "Original dimensions": "原始尺寸",
    "Output dimensions": "输出尺寸",
    "Resolution status": "分辨率状态",
    "Resolution unchanged": "分辨率未改变",
    "Resolution changed": "分辨率已改变",
    "Recompressing…": "正在重新压缩…",
    "The output file is not smaller. Try a lower quality setting.":
      "输出文件未变小，建议降低质量参数后重试。",
    "Choose an image to adjust compression quality.": "选择图片后即可调整压缩质量。",
    "Recompression failed. Please try again.": "重新压缩失败，请稍后重试。",
    "Target size": "目标尺寸",
    "Original X optional": "原 X（可选）",
    "Original Y optional": "原 Y（可选）",
    "Original Z optional": "原 Z（可选）",
    "Target X optional": "目标 X（可选）",
    "Target Y optional": "目标 Y（可选）",
    "Target Z optional": "目标 Z（可选）",
    "Uniform scale": "统一缩放",
    "X scale": "X 轴缩放",
    "Y scale": "Y 轴缩放",
    "Z scale": "Z 轴缩放",
    "Not provided": "未提供",
    "Scale percentages will appear here.": "缩放比例会显示在这里。",
    "Layer height (mm)": "层高（mm）",
    "Line width (mm)": "线宽（mm）",
    "Print speed (mm/s)": "打印速度（mm/s）",
    "Volumetric flow rate": "体积流量",
    Formula: "公式",
    "height × width × speed": "层高 × 线宽 × 速度",
    "Volumetric flow rate will appear here.": "体积流量会显示在这里。",
    "0.2 mm nozzle is usually for fine detail.": "0.2 mm 喷嘴通常用于精细模型。",
    "0.4 mm nozzle is general purpose.": "0.4 mm 喷嘴适合大多数常规打印。",
    "0.6 mm nozzle is a speed/detail balance.": "0.6 mm 喷嘴兼顾速度和细节。",
    "0.8 mm nozzle is for large fast prints.": "0.8 mm 喷嘴适合大尺寸快速打印。",
    "Target currency label": "目标货币标签",
    "Region name": "地区名称",
    "Material optional": "材料（可选）",
    Currency: "货币",
    Price: "价格",
    "Spool weight (kg)": "整卷重量（kg）",
    "Exchange rate to target": "换算到目标货币的汇率",
    "Remove row": "删除",
    "Add row": "添加一行",
    "Cheapest region": "最低价地区",
    "Most expensive region": "最高价地区",
    Difference: "差价",
    "Difference %": "差价比例",
    "Filament price comparison results will appear here.": "耗材价格对比结果会显示在这里。",
    "Search keyword": "搜索关键词",
    "Open search results": "打开搜索结果",
    "Enter a keyword to generate outbound model search links.": "输入关键词后会生成各平台的搜索链接。",
    "Solid model weight (grams)": "实心模型重量（克）",
    "Wall loops": "墙层数",
    "Infill percentage": "填充率",
    "Filament price per kg optional": "每公斤耗材价格（可选）",
    "Nozzle presets": "喷嘴预设",
    "0.2 nozzle": "0.2 喷嘴",
    "0.4 nozzle": "0.4 喷嘴",
    "0.6 nozzle": "0.6 喷嘴",
    "0.8 nozzle": "0.8 喷嘴",
    "Model complexity": "模型复杂度",
    Simple: "简单",
    Normal: "普通",
    Complex: "复杂",
    "Estimated filament": "预计耗材",
    "Volumetric flow": "体积流量",
    "Estimated print time": "预计打印时长",
    "Print time and filament estimates will appear here.": "打印时长和耗材估算会显示在这里。",
    "Main material weight (grams)": "主体材料重量（克）",
    "Support material weight (grams)": "支撑材料重量（克）",
    "Main material price per kg": "主体材料每公斤价格",
    "Support material price per kg": "支撑材料每公斤价格",
    "Main material cost": "主体材料成本",
    "Support material cost": "支撑材料成本",
    "Waste cost": "损耗成本",
    "Total material cost": "总材料成本",
    "Support material cost estimates will appear here.": "支撑材料成本估算会显示在这里。",
    "Current spool total weight (grams)": "当前线轴总重量（克）",
    "Empty spool weight (grams)": "空轴重量（克）",
    "Model weight optional (grams)": "单个模型重量（可选，克）",
    "Remaining weight": "剩余重量",
    "Remaining length": "剩余长度",
    "Remaining value": "剩余价值",
    "Approx. prints left": "预计可打印数量",
    "Remaining spool estimates will appear here.": "剩余耗材估算会显示在这里。",
    "Model X (mm)": "模型 X（mm）",
    "Model Y (mm)": "模型 Y（mm）",
    "Model Z (mm)": "模型 Z（mm）",
    "Build volume X (mm)": "成型尺寸 X（mm）",
    "Build volume Y (mm)": "成型尺寸 Y（mm）",
    "Build volume Z (mm)": "成型尺寸 Z（mm）",
    "Clearance margin optional (mm)": "预留间隙（可选，mm）",
    "Common printer presets": "常见打印机预设",
    "Allow XY rotation": "允许 XY 旋转",
    "Fits normally": "当前方向可放下",
    "Fits if rotated": "旋转后可放下",
    "Max uniform scale": "最大统一缩放",
    "Suggested scale": "建议缩放",
    Yes: "是",
    No: "否",
    "Build plate fit results will appear here.": "打印平台适配结果会显示在这里。",
  },
  "zh-tw": {
    "Spool price": "整卷線材價格",
    "Spool weight": "整卷線材重量",
    "Spool weight unit": "線材重量單位",
    Grams: "克",
    Kg: "公斤",
    "Model weight (grams)": "模型重量（克）",
    "Waste percentage optional": "耗損比例（可選）",
    Calculate: "計算",
    Clear: "清除",
    "Cost per gram": "每克成本",
    "Material used with waste": "含耗損用量",
    "Estimated material cost": "預估材料成本",
    "Filament cost estimates will appear here.": "線材成本估算會顯示在這裡。",
    "Print hours": "列印小時數",
    "Print minutes": "列印分鐘數",
    "Hourly machine rate": "設備小時費率",
    "Material cost": "材料成本",
    "Labor/setup cost optional": "人工/設定成本（可選）",
    "Profit margin percentage optional": "利潤率（可選）",
    "Print time": "列印時間",
    "Machine cost": "設備成本",
    "Base total cost": "基本總成本",
    "Suggested price": "建議報價",
    "No margin": "未填寫利潤率",
    "Print time cost estimates will appear here.": "列印時間成本估算會顯示在這裡。",
    "Filament diameter": "線材直徑",
    "Material density (g/cm³)": "材料密度（g/cm³）",
    "Weight (grams)": "重量（克）",
    "Material density presets": "材料密度預設",
    "Approximate filament length": "預估線材長度",
    Diameter: "直徑",
    "Approximate filament length will appear here.": "預估線材長度會顯示在這裡。",
    "Filament length (meters)": "線材長度（公尺）",
    "Estimated filament weight": "預估線材重量",
    "Estimated filament weight will appear here.": "預估線材重量會顯示在這裡。",
    "Compression quality": "壓縮品質",
    "High quality 90%": "高品質 90%",
    "Balanced 70%": "平衡 70%",
    "Smaller file 50%": "小檔案 50%",
    "Strong compression 30%": "強力壓縮 30%",
    "Original size": "原始大小",
    "Output size": "輸出大小",
    "Actual compression": "實際壓縮率",
    "Size reduced": "減少大小",
    "Original dimensions": "原始尺寸",
    "Output dimensions": "輸出尺寸",
    "Resolution status": "解析度狀態",
    "Resolution unchanged": "解析度未變更",
    "Resolution changed": "解析度已變更",
    "Recompressing…": "正在重新壓縮…",
    "The output file is not smaller. Try a lower quality setting.":
      "輸出檔案未變小，建議降低品質設定後重試。",
    "Choose an image to adjust compression quality.": "選擇圖片後即可調整壓縮品質。",
    "Recompression failed. Please try again.": "重新壓縮失敗，請稍後重試。",
    "Target size": "目標尺寸",
    "Original X optional": "原 X（可選）",
    "Original Y optional": "原 Y（可選）",
    "Original Z optional": "原 Z（可選）",
    "Target X optional": "目標 X（可選）",
    "Target Y optional": "目標 Y（可選）",
    "Target Z optional": "目標 Z（可選）",
    "Uniform scale": "統一縮放",
    "X scale": "X 軸縮放",
    "Y scale": "Y 軸縮放",
    "Z scale": "Z 軸縮放",
    "Not provided": "未提供",
    "Scale percentages will appear here.": "縮放比例會顯示在這裡。",
    "Layer height (mm)": "層高（mm）",
    "Line width (mm)": "線寬（mm）",
    "Print speed (mm/s)": "列印速度（mm/s）",
    "Volumetric flow rate": "體積流量",
    Formula: "公式",
    "height × width × speed": "層高 × 線寬 × 速度",
    "Volumetric flow rate will appear here.": "體積流量會顯示在這裡。",
    "0.2 mm nozzle is usually for fine detail.": "0.2 mm 噴嘴通常用於精細模型。",
    "0.4 mm nozzle is general purpose.": "0.4 mm 噴嘴適合大多數一般列印。",
    "0.6 mm nozzle is a speed/detail balance.": "0.6 mm 噴嘴兼顧速度和細節。",
    "0.8 mm nozzle is for large fast prints.": "0.8 mm 噴嘴適合大尺寸快速列印。",
    "Target currency label": "目標貨幣標籤",
    "Region name": "地區名稱",
    "Material optional": "材料（可選）",
    Currency: "貨幣",
    Price: "價格",
    "Spool weight (kg)": "整卷重量（kg）",
    "Exchange rate to target": "換算到目標貨幣的匯率",
    "Remove row": "刪除",
    "Add row": "新增一列",
    "Cheapest region": "最低價地區",
    "Most expensive region": "最高價地區",
    Difference: "價差",
    "Difference %": "價差比例",
    "Filament price comparison results will appear here.": "線材價格比較結果會顯示在這裡。",
    "Search keyword": "搜尋關鍵字",
    "Open search results": "開啟搜尋結果",
    "Enter a keyword to generate outbound model search links.": "輸入關鍵字後會產生各平台的搜尋連結。",
    "Solid model weight (grams)": "實心模型重量（克）",
    "Wall loops": "牆層數",
    "Infill percentage": "填充率",
    "Filament price per kg optional": "每公斤線材價格（可選）",
    "Nozzle presets": "噴嘴預設",
    "0.2 nozzle": "0.2 噴嘴",
    "0.4 nozzle": "0.4 噴嘴",
    "0.6 nozzle": "0.6 噴嘴",
    "0.8 nozzle": "0.8 噴嘴",
    "Model complexity": "模型複雜度",
    Simple: "簡單",
    Normal: "一般",
    Complex: "複雜",
    "Estimated filament": "預估線材",
    "Volumetric flow": "體積流量",
    "Estimated print time": "預估列印時間",
    "Print time and filament estimates will appear here.": "列印時間和線材估算會顯示在這裡。",
    "Main material weight (grams)": "主材料重量（克）",
    "Support material weight (grams)": "支撐材料重量（克）",
    "Main material price per kg": "主材料每公斤價格",
    "Support material price per kg": "支撐材料每公斤價格",
    "Main material cost": "主材料成本",
    "Support material cost": "支撐材料成本",
    "Waste cost": "耗損成本",
    "Total material cost": "總材料成本",
    "Support material cost estimates will appear here.": "支撐材料成本估算會顯示在這裡。",
    "Current spool total weight (grams)": "目前線軸總重量（克）",
    "Empty spool weight (grams)": "空軸重量（克）",
    "Model weight optional (grams)": "單個模型重量（可選，克）",
    "Remaining weight": "剩餘重量",
    "Remaining length": "剩餘長度",
    "Remaining value": "剩餘價值",
    "Approx. prints left": "預估可列印數量",
    "Remaining spool estimates will appear here.": "剩餘線材估算會顯示在這裡。",
    "Model X (mm)": "模型 X（mm）",
    "Model Y (mm)": "模型 Y（mm）",
    "Model Z (mm)": "模型 Z（mm）",
    "Build volume X (mm)": "成型尺寸 X（mm）",
    "Build volume Y (mm)": "成型尺寸 Y（mm）",
    "Build volume Z (mm)": "成型尺寸 Z（mm）",
    "Clearance margin optional (mm)": "預留間隙（可選，mm）",
    "Common printer presets": "常見印表機預設",
    "Allow XY rotation": "允許 XY 旋轉",
    "Fits normally": "目前方向可放下",
    "Fits if rotated": "旋轉後可放下",
    "Max uniform scale": "最大統一縮放",
    "Suggested scale": "建議縮放",
    Yes: "是",
    No: "否",
    "Build plate fit results will appear here.": "列印平台適配結果會顯示在這裡。",
  },
};

function translateToolUi(root: HTMLElement, locale: ChineseLocale) {
  const dictionary = toolUiTranslations[locale];
  const translateValue = (value: string) => dictionary[value.trim()] || null;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const replacement = translateValue(node.textContent || "");

    if (replacement) {
      node.textContent = replacement;
    }

    node = walker.nextNode();
  }

  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder], textarea[placeholder]").forEach((element) => {
    const replacement = translateValue(element.placeholder);

    if (replacement) {
      element.placeholder = replacement;
    }
  });
}

export default function LocalizedToolPageContent({
  locale,
  tool,
}: {
  locale: ChineseLocale;
  tool: LocalizedTool;
}) {
  const { isDark } = useTheme();
  const toolContainerRef = useRef<HTMLDivElement>(null);
  const t = copy[locale];
  const relatedTools = getLocalized3dTools(locale)
    .filter((item) => item.slug !== tool.slug)
    .slice(0, 3);
  const cardClass = isDark
    ? "border-white/10 bg-white/[0.03]"
    : "border-[#E5DED0] bg-[#FFFDF7]";
  const mutedText = isDark ? "text-white/60" : "text-[#6B665D]";

  useEffect(() => {
    const root = toolContainerRef.current;

    if (!root) {
      return;
    }

    translateToolUi(root, locale);

    const observer = new MutationObserver(() => {
      translateToolUi(root, locale);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [locale]);

  return (
    <PageShell>
      <SiteHeader />

      <section className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10">
          <div
            className={`mb-4 inline-block rounded-full border px-3 py-1 text-xs ${
              isDark
                ? "border-white/10 bg-white/[0.05] text-white/55"
                : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D]"
            }`}
          >
            {tool.category}
          </div>

          <h1 className="text-5xl font-semibold tracking-[-0.05em]">
            {tool.name}
          </h1>

          <p className={`mt-6 max-w-3xl text-lg leading-8 ${mutedText}`}>
            {tool.description || tool.desc}
          </p>
        </div>

        <div
          ref={toolContainerRef}
          className={`rounded-[32px] border p-6 ${
            isDark
              ? "border-white/10 bg-[#101014]/80"
              : "border-[#E5DED0] bg-[#FFFDF7]/90"
          }`}
        >
          <ToolClient slug={tool.slug} locale={locale} />
        </div>

        <section className="mt-16">
          <h2 className="text-3xl font-semibold">{t.privacyTitle}</h2>
          <div className={`mt-5 rounded-2xl border p-6 ${cardClass}`}>
            <p className={`leading-8 ${mutedText}`}>{t.privacy}</p>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-3xl font-semibold">{t.relatedTitle}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {relatedTools.map((relatedTool) => (
              <Link
                key={relatedTool.slug}
                href={`/${locale}/tools/${relatedTool.slug}`}
                className={`rounded-2xl border p-5 transition ${cardClass}`}
              >
                <h3 className="font-semibold">{relatedTool.name}</h3>
                <p className={`mt-3 text-sm leading-6 ${mutedText}`}>
                  {relatedTool.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-16">
          <Link
            href={`/${locale}`}
            className={`inline-flex rounded-2xl border px-6 py-4 ${
              isDark
                ? "border-white/10 bg-white/[0.04] text-white/70"
                : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D]"
            }`}
          >
            {t.backHome}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </PageShell>
  );
}
