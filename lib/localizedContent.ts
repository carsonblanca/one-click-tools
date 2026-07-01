import { localized3dToolSlugs, type Locale } from "./i18n";

export type ChineseLocale = "zh-cn" | "zh-tw";

export type LocalizedTool = {
  name: string;
  slug: string;
  category: string;
  desc: string;
  description: string;
};

export type LocalizedBasicPage = {
  metadataTitle: string;
  metadataDescription: string;
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{
    title: string;
    paragraphs: string[];
  }>;
};

export const localizedHome = {
  "zh-cn": {
    metadataTitle: "OneClick Tools 简体中文 | 在线工具箱",
    metadataDescription:
      "常用计算、转换、文本处理和 3D 打印工具，打开网页就能用。",
    heroTitle: "一个干净好用的在线工具箱",
    heroSubtitle:
      "常用计算、转换、文本处理和 3D 打印工具，打开网页就能用。",
    sectionTitle: "3D 打印工具",
    sectionDescription:
      "快速估算耗材成本、打印时长、喷嘴流量、模型缩放和打印平台适配。",
    toolLibrary: "按分类浏览",
    toolLibraryIntro: "搜索、筛选并打开常用在线工具。多数工具可直接在浏览器中使用。",
    searchPlaceholder: "搜索工具...",
    allTools: "全部",
    reset: "重置",
    toolsOnline: "共 {count} 个工具",
    showingTools: "显示 {shown} / {total} 个工具",
    noLoginRequired: "无需登录",
    noToolsFound: "没有找到匹配的工具",
    noToolsHint: "换一个关键词，或选择其他分类。",
    oneClickUtility: "即开即用",
    openTool: "打开工具",
    backToEnglish: "English",
  },
  "zh-tw": {
    metadataTitle: "OneClick Tools 繁體中文 | 線上工具箱",
    metadataDescription:
      "常用計算、轉換、文字處理和 3D 列印工具，打開網頁就能用。",
    heroTitle: "一個乾淨好用的線上工具箱",
    heroSubtitle:
      "常用計算、轉換、文字處理和 3D 列印工具，打開網頁就能用。",
    sectionTitle: "3D 列印工具",
    sectionDescription:
      "快速估算線材成本、列印時間、噴嘴流量、模型縮放和列印平台適配。",
    toolLibrary: "按分類瀏覽",
    toolLibraryIntro: "搜尋、篩選並開啟常用線上工具。多數工具可直接在瀏覽器中使用。",
    searchPlaceholder: "搜尋工具...",
    allTools: "全部",
    reset: "重設",
    toolsOnline: "共 {count} 個工具",
    showingTools: "顯示 {shown} / {total} 個工具",
    noLoginRequired: "無需登入",
    noToolsFound: "找不到符合條件的工具",
    noToolsHint: "換一個關鍵字，或選擇其他分類。",
    oneClickUtility: "即開即用",
    openTool: "開啟工具",
    backToEnglish: "English",
  },
} satisfies Record<ChineseLocale, Record<string, string>>;

export const localizedCategoryNames: Record<ChineseLocale, Record<string, string>> = {
  "zh-cn": {
    Developer: "开发者",
    Text: "文本",
    Image: "图片",
    Utility: "实用工具",
    Converter: "转换",
    Calculator: "计算器",
    SEO: "SEO",
    Marketing: "营销",
    Color: "颜色",
    "Date Time": "日期时间",
    Security: "安全",
    Unit: "单位",
    File: "文件",
    AI: "AI",
    Finance: "财务",
    "3D Printing": "3D 打印",
  },
  "zh-tw": {
    Developer: "開發者",
    Text: "文字",
    Image: "圖片",
    Utility: "實用工具",
    Converter: "轉換",
    Calculator: "計算器",
    SEO: "SEO",
    Marketing: "行銷",
    Color: "顏色",
    "Date Time": "日期時間",
    Security: "安全",
    Unit: "單位",
    File: "檔案",
    AI: "AI",
    Finance: "財務",
    "3D Printing": "3D 列印",
  },
};

export const localizedBasicPages = {
  "zh-cn": {
    about: {
      metadataTitle: "关于 OneClick Tools | 在线工具箱",
      metadataDescription:
        "了解 OneClick Tools：一个轻量、直接、以浏览器本地处理为主的在线工具集合。",
      eyebrow: "关于 OneClick Tools",
      title: "把常用小工具放在一个清爽的地方。",
      intro:
        "OneClick Tools 收集常用的计算、转换、文本处理、图片处理、开发者和 3D 打印工具，目标是让用户不用安装软件，也能快速完成日常任务。",
      sections: [
        {
          title: "这个网站做什么",
          paragraphs: [
            "网站里的工具尽量保持简单直接：打开页面，输入参数，得到结果。多数工具设计为在浏览器本地运行，适合快速处理临时任务。",
            "当前工具覆盖文本、图片、开发者工具、SEO、文件处理、计算器和 3D 打印估算等场景。",
          ],
        },
        {
          title: "适合谁使用",
          paragraphs: [
            "OneClick Tools 适合开发者、创作者、学生、3D 打印用户，以及任何需要快速完成网页小任务的人。",
            "我们尽量减少登录、安装和复杂配置，让工具保持轻量、可读、易用。",
          ],
        },
      ],
    },
    privacy: {
      metadataTitle: "隐私说明 | OneClick Tools",
      metadataDescription:
        "了解 OneClick Tools 如何处理浏览器本地工具、反馈邮件、统计和未来广告相关数据。",
      eyebrow: "隐私说明",
      title: "我们尽量让工具在你的浏览器里完成工作。",
      intro:
        "OneClick Tools 的多数工具以浏览器本地处理为主。我们不会为了使用这些工具要求你注册账号。",
      sections: [
        {
          title: "工具数据",
          paragraphs: [
            "浏览器本地工具会尽量在你的设备上完成计算、转换或预览。你输入的内容不会被这些工具有意上传到 OneClick Tools 服务器。",
            "某些页面仍可能使用正常的网站托管、访问统计、搜索索引或广告基础设施。我们不会在隐私说明里做超出实际能力的承诺。",
          ],
        },
        {
          title: "反馈邮件",
          paragraphs: [
            "悬浮反馈入口会打开你的邮件客户端，并把你填写的内容放入邮件草稿。反馈不是通过 OneClick Tools 后端提交。",
            "如果你在邮件里留下联系方式，我们会用它来回复问题或建议。",
          ],
        },
        {
          title: "第三方服务",
          paragraphs: [
            "未来网站可能使用托管、统计、搜索索引和广告相关服务。如果加入广告，广告合作方可能使用 Cookie 或类似技术。",
          ],
        },
      ],
    },
    terms: {
      metadataTitle: "使用条款 | OneClick Tools",
      metadataDescription:
        "阅读 OneClick Tools 的基础使用条款：合法使用、结果自查、服务可用性和责任说明。",
      eyebrow: "使用条款",
      title: "请把工具结果作为辅助参考。",
      intro:
        "你可以将 OneClick Tools 用于合法、合理的个人或工作用途。工具结果应由使用者自行检查。",
      sections: [
        {
          title: "使用方式",
          paragraphs: [
            "请不要使用本站工具从事违法、侵权、攻击、滥用或干扰他人服务的行为。",
            "你需要对自己输入、生成、转换、下载或使用的内容负责。",
          ],
        },
        {
          title: "结果和可用性",
          paragraphs: [
            "工具按现状提供。我们会努力保持可用和准确，但不保证结果适合所有技术、法律、财务或重要场景。",
            "在 3D 打印、财务估算、代码处理或其他重要用途里，请结合切片软件、实际设备、材料说明和专业判断复核结果。",
          ],
        },
      ],
    },
    contact: {
      metadataTitle: "联系 OneClick Tools",
      metadataDescription:
        "联系 OneClick Tools，反馈问题、建议新工具或询问网站相关事项。",
      eyebrow: "联系",
      title: "欢迎反馈问题和工具建议。",
      intro:
        "如果你发现工具结果异常、页面不好用，或者希望增加某个工具，可以通过邮件联系我们。",
      sections: [
        {
          title: "联系邮箱",
          paragraphs: [
            "邮箱：gainerht@gmail.com",
            "你也可以使用页面右侧的 Feedback 按钮。它会打开你的邮件客户端，不通过本站服务器提交。",
          ],
        },
      ],
    },
  },
  "zh-tw": {
    about: {
      metadataTitle: "關於 OneClick Tools | 線上工具箱",
      metadataDescription:
        "了解 OneClick Tools：一個輕量、直接、以瀏覽器本機處理為主的線上工具集合。",
      eyebrow: "關於 OneClick Tools",
      title: "把常用小工具放在一個清爽的地方。",
      intro:
        "OneClick Tools 收集常用的計算、轉換、文字處理、圖片處理、開發者和 3D 列印工具，目標是讓使用者不用安裝軟體，也能快速完成日常任務。",
      sections: [
        {
          title: "這個網站做什麼",
          paragraphs: [
            "網站裡的工具盡量保持簡單直接：打開頁面，輸入參數，取得結果。多數工具設計為在瀏覽器本機執行，適合快速處理臨時任務。",
            "目前工具涵蓋文字、圖片、開發者工具、SEO、檔案處理、計算器和 3D 列印估算等場景。",
          ],
        },
        {
          title: "適合誰使用",
          paragraphs: [
            "OneClick Tools 適合開發者、創作者、學生、3D 列印使用者，以及任何需要快速完成網頁小任務的人。",
            "我們盡量減少登入、安裝和複雜設定，讓工具保持輕量、可讀、易用。",
          ],
        },
      ],
    },
    privacy: {
      metadataTitle: "隱私說明 | OneClick Tools",
      metadataDescription:
        "了解 OneClick Tools 如何處理瀏覽器本機工具、意見回饋郵件、統計和未來廣告相關資料。",
      eyebrow: "隱私說明",
      title: "我們盡量讓工具在你的瀏覽器裡完成工作。",
      intro:
        "OneClick Tools 的多數工具以瀏覽器本機處理為主。我們不會為了使用這些工具要求你註冊帳號。",
      sections: [
        {
          title: "工具資料",
          paragraphs: [
            "瀏覽器本機工具會盡量在你的裝置上完成計算、轉換或預覽。你輸入的內容不會被這些工具刻意上傳到 OneClick Tools 伺服器。",
            "某些頁面仍可能使用正常的網站託管、瀏覽統計、搜尋索引或廣告基礎設施。我們不會在隱私說明裡做超出實際能力的承諾。",
          ],
        },
        {
          title: "意見回饋郵件",
          paragraphs: [
            "懸浮回饋入口會開啟你的郵件客戶端，並把你填寫的內容放入郵件草稿。回饋不是透過 OneClick Tools 後端送出。",
            "如果你在郵件裡留下聯絡方式，我們會用它來回覆問題或建議。",
          ],
        },
        {
          title: "第三方服務",
          paragraphs: [
            "未來網站可能使用託管、統計、搜尋索引和廣告相關服務。如果加入廣告，廣告合作方可能使用 Cookie 或類似技術。",
          ],
        },
      ],
    },
    terms: {
      metadataTitle: "使用條款 | OneClick Tools",
      metadataDescription:
        "閱讀 OneClick Tools 的基本使用條款：合法使用、結果自查、服務可用性和責任說明。",
      eyebrow: "使用條款",
      title: "請把工具結果作為輔助參考。",
      intro:
        "你可以將 OneClick Tools 用於合法、合理的個人或工作用途。工具結果應由使用者自行檢查。",
      sections: [
        {
          title: "使用方式",
          paragraphs: [
            "請不要使用本站工具從事違法、侵權、攻擊、濫用或干擾他人服務的行為。",
            "你需要對自己輸入、產生、轉換、下載或使用的內容負責。",
          ],
        },
        {
          title: "結果和可用性",
          paragraphs: [
            "工具按現狀提供。我們會努力保持可用和準確，但不保證結果適合所有技術、法律、財務或重要場景。",
            "在 3D 列印、財務估算、程式碼處理或其他重要用途裡，請結合切片軟體、實際設備、材料說明和專業判斷複核結果。",
          ],
        },
      ],
    },
    contact: {
      metadataTitle: "聯絡 OneClick Tools",
      metadataDescription:
        "聯絡 OneClick Tools，回報問題、建議新工具或詢問網站相關事項。",
      eyebrow: "聯絡",
      title: "歡迎回報問題和工具建議。",
      intro:
        "如果你發現工具結果異常、頁面不好用，或者希望增加某個工具，可以透過電子郵件聯絡我們。",
      sections: [
        {
          title: "聯絡信箱",
          paragraphs: [
            "信箱：gainerht@gmail.com",
            "你也可以使用頁面右側的 Feedback 按鈕。它會開啟你的郵件客戶端，不透過本站伺服器提交。",
          ],
        },
      ],
    },
  },
} satisfies Record<ChineseLocale, Record<"about" | "privacy" | "terms" | "contact", LocalizedBasicPage>>;

export const localized3dTools: Record<ChineseLocale, Record<string, LocalizedTool>> = {
  "zh-cn": {
    "filament-cost-calculator": {
      name: "耗材成本计算器",
      slug: "filament-cost-calculator",
      category: "3D 打印",
      desc: "根据耗材价格、重量和损耗估算模型材料成本。",
      description: "输入整卷耗材价格、重量、模型用量和损耗比例，快速估算每克成本和模型材料成本。",
    },
    "print-time-cost-calculator": {
      name: "打印时长成本计算器",
      slug: "print-time-cost-calculator",
      category: "3D 打印",
      desc: "根据打印时长、设备费率、材料和人工估算报价。",
      description: "根据打印小时数、设备小时费率、材料成本、人工设置成本和利润率估算 3D 打印价格。",
    },
    "filament-length-calculator": {
      name: "耗材长度计算器",
      slug: "filament-length-calculator",
      category: "3D 打印",
      desc: "根据重量、直径和密度估算耗材长度。",
      description: "输入耗材重量、线径和材料密度，估算剩余或整卷耗材的大致长度。",
    },
    "3d-print-weight-calculator": {
      name: "3D 打印重量计算器",
      slug: "3d-print-weight-calculator",
      category: "3D 打印",
      desc: "根据耗材长度、直径和密度估算重量。",
      description: "输入耗材长度、线径和材料密度，估算对应的 3D 打印耗材重量。",
    },
    "scale-percentage-calculator": {
      name: "缩放比例计算器",
      slug: "scale-percentage-calculator",
      category: "3D 打印",
      desc: "根据原尺寸和目标尺寸计算切片软件缩放比例。",
      description: "计算统一缩放比例和 X/Y/Z 分轴缩放比例，适合在切片软件中调整模型大小。",
    },
    "nozzle-flow-rate-calculator": {
      name: "喷嘴体积流量计算器",
      slug: "nozzle-flow-rate-calculator",
      category: "3D 打印",
      desc: "根据层高、线宽和速度计算体积流量。",
      description: "用层高 × 线宽 × 打印速度估算喷嘴体积流量，辅助判断当前参数是否可能超过热端能力。",
    },
    "filament-price-comparison-calculator": {
      name: "耗材价格对比计算器",
      slug: "filament-price-comparison-calculator",
      category: "3D 打印",
      desc: "按地区、货币和汇率手动对比耗材价格。",
      description: "输入不同地区的耗材价格、重量、货币和汇率，统一换算每公斤价格，找出最便宜和最贵的选项。",
    },
    "3d-model-search-aggregator": {
      name: "3D 模型搜索入口",
      slug: "3d-model-search-aggregator",
      category: "3D 打印",
      desc: "从一个页面打开多个 3D 模型平台的搜索结果。",
      description: "输入关键词后生成 MakerWorld、Printables、Thingiverse 等平台的搜索链接，不抓取或嵌入外部结果。",
    },
    "3d-print-time-filament-estimator": {
      name: "打印时长和耗材估算器",
      slug: "3d-print-time-filament-estimator",
      category: "3D 打印",
      desc: "快速估算耗材用量、材料成本、体积流量和打印时长。",
      description: "根据模型重量、喷嘴、墙层数、填充率、层高、线宽、速度和材料密度估算打印成本与时长。",
    },
    "support-material-cost-calculator": {
      name: "支撑材料成本计算器",
      slug: "support-material-cost-calculator",
      category: "3D 打印",
      desc: "估算主体材料、支撑材料、损耗和总材料成本。",
      description: "适合估算带支撑结构、多材料打印、PVA 或支撑耗材的材料成本。",
    },
    "filament-spool-remaining-calculator": {
      name: "剩余耗材计算器",
      slug: "filament-spool-remaining-calculator",
      category: "3D 打印",
      desc: "根据线轴重量估算剩余耗材重量、长度和价值。",
      description: "输入当前线轴总重量、空轴重量、线径和密度，估算剩余耗材还能打印多少。",
    },
    "build-plate-fit-calculator": {
      name: "打印平台适配计算器",
      slug: "build-plate-fit-calculator",
      category: "3D 打印",
      desc: "检查模型边界尺寸是否能放进打印平台。",
      description: "输入模型尺寸和打印机成型尺寸，估算正常放置、旋转放置以及最大统一缩放比例。",
    },
    "pixel-knock-board-generator": {
      name: "敲豆豆像素图板生成器",
      slug: "pixel-knock-board-generator",
      category: "3D 打印",
      desc: "上传图片，生成适合 3D 打印的像素图板、外框和分色颗粒文件。",
      description: "上传图片，生成适合 3D 打印的像素图板、外框和分色颗粒文件。",
    },
  },
  "zh-tw": {
    "filament-cost-calculator": {
      name: "線材成本計算器",
      slug: "filament-cost-calculator",
      category: "3D 列印",
      desc: "依線材價格、重量和耗損估算模型材料成本。",
      description: "輸入整卷線材價格、重量、模型用量和耗損比例，快速估算每克成本和模型材料成本。",
    },
    "print-time-cost-calculator": {
      name: "列印時間成本計算器",
      slug: "print-time-cost-calculator",
      category: "3D 列印",
      desc: "依列印時間、設備費率、材料和人工估算報價。",
      description: "依列印小時數、設備小時費率、材料成本、人工設定成本和利潤率估算 3D 列印價格。",
    },
    "filament-length-calculator": {
      name: "線材長度計算器",
      slug: "filament-length-calculator",
      category: "3D 列印",
      desc: "依重量、直徑和密度估算線材長度。",
      description: "輸入線材重量、線徑和材料密度，估算剩餘或整卷線材的大致長度。",
    },
    "3d-print-weight-calculator": {
      name: "3D 列印重量計算器",
      slug: "3d-print-weight-calculator",
      category: "3D 列印",
      desc: "依線材長度、直徑和密度估算重量。",
      description: "輸入線材長度、線徑和材料密度，估算對應的 3D 列印線材重量。",
    },
    "scale-percentage-calculator": {
      name: "縮放比例計算器",
      slug: "scale-percentage-calculator",
      category: "3D 列印",
      desc: "依原尺寸和目標尺寸計算切片軟體縮放比例。",
      description: "計算統一縮放比例和 X/Y/Z 分軸縮放比例，適合在切片軟體中調整模型大小。",
    },
    "nozzle-flow-rate-calculator": {
      name: "噴嘴體積流量計算器",
      slug: "nozzle-flow-rate-calculator",
      category: "3D 列印",
      desc: "依層高、線寬和速度計算體積流量。",
      description: "用層高 × 線寬 × 列印速度估算噴嘴體積流量，輔助判斷目前參數是否可能超過熱端能力。",
    },
    "filament-price-comparison-calculator": {
      name: "線材價格比較計算器",
      slug: "filament-price-comparison-calculator",
      category: "3D 列印",
      desc: "依地區、貨幣和匯率手動比較線材價格。",
      description: "輸入不同地區的線材價格、重量、貨幣和匯率，統一換算每公斤價格，找出最便宜和最貴的選項。",
    },
    "3d-model-search-aggregator": {
      name: "3D 模型搜尋入口",
      slug: "3d-model-search-aggregator",
      category: "3D 列印",
      desc: "從一個頁面開啟多個 3D 模型平台的搜尋結果。",
      description: "輸入關鍵字後產生 MakerWorld、Printables、Thingiverse 等平台的搜尋連結，不抓取或嵌入外部結果。",
    },
    "3d-print-time-filament-estimator": {
      name: "列印時間和線材估算器",
      slug: "3d-print-time-filament-estimator",
      category: "3D 列印",
      desc: "快速估算線材用量、材料成本、體積流量和列印時間。",
      description: "依模型重量、噴嘴、牆層數、填充率、層高、線寬、速度和材料密度估算列印成本與時間。",
    },
    "support-material-cost-calculator": {
      name: "支撐材料成本計算器",
      slug: "support-material-cost-calculator",
      category: "3D 列印",
      desc: "估算主材料、支撐材料、耗損和總材料成本。",
      description: "適合估算帶支撐結構、多材料列印、PVA 或支撐線材的材料成本。",
    },
    "filament-spool-remaining-calculator": {
      name: "剩餘線材計算器",
      slug: "filament-spool-remaining-calculator",
      category: "3D 列印",
      desc: "依線軸重量估算剩餘線材重量、長度和價值。",
      description: "輸入目前線軸總重量、空軸重量、線徑和密度，估算剩餘線材還能列印多少。",
    },
    "build-plate-fit-calculator": {
      name: "列印平台適配計算器",
      slug: "build-plate-fit-calculator",
      category: "3D 列印",
      desc: "檢查模型邊界尺寸是否能放進列印平台。",
      description: "輸入模型尺寸和印表機成型尺寸，估算正常放置、旋轉放置以及最大統一縮放比例。",
    },
    "pixel-knock-board-generator": {
      name: "敲豆豆像素圖板產生器",
      slug: "pixel-knock-board-generator",
      category: "3D 列印",
      desc: "上傳圖片，產生適合 3D 列印的像素圖板、外框與分色顆粒檔案。",
      description: "上傳圖片，產生適合 3D 列印的像素圖板、外框與分色顆粒檔案。",
    },
  },
};

export function isChineseLocale(locale: Locale): locale is ChineseLocale {
  return locale === "zh-cn" || locale === "zh-tw";
}

export function getLocalized3dTools(locale: ChineseLocale) {
  return localized3dToolSlugs
    .map((slug) => localized3dTools[locale][slug])
    .filter((tool): tool is LocalizedTool => tool != null);
}

export function getLocalized3dTool(locale: ChineseLocale, slug: string) {
  return localized3dTools[locale][slug] || null;
}
