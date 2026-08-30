export type ParameterCategory = "print" | "material";

export const PARAMETER_PRESETS: Record<ParameterCategory, Array<{ key: string; zh: string; en: string }>> = {
  print: [
    { key: "nozzleTemperature", zh: "喷嘴温度", en: "Nozzle temperature" },
    { key: "bedTemperature", zh: "热床温度", en: "Bed temperature" },
    { key: "chamberTemperature", zh: "腔体温度", en: "Chamber temperature" },
    { key: "flowRatio", zh: "流量比例", en: "Flow ratio" },
    { key: "shrink", zh: "收缩", en: "Shrink" },
    { key: "maxVolumetricSpeed", zh: "最大体积速度", en: "Maximum volumetric speed" },
    { key: "recommendedPrintSpeed", zh: "推荐打印速度", en: "Recommended print speed" },
    { key: "coolingFan", zh: "冷却风扇", en: "Cooling fan" },
    { key: "retractionLength", zh: "回抽长度", en: "Retraction length" },
    { key: "retractionSpeed", zh: "回抽速度", en: "Retraction speed" },
    { key: "zHop", zh: "抬升高度", en: "Z hop" },
  ],
  material: [
    { key: "filamentDiameter", zh: "线径", en: "Filament diameter" },
    { key: "netWeight", zh: "净重", en: "Net weight" },
    { key: "materialType", zh: "材料类型", en: "Material type" },
    { key: "density", zh: "密度", en: "Density" },
    { key: "meltFlowIndex", zh: "熔融指数", en: "Melt flow index" },
    { key: "tensileStrength", zh: "拉伸强度", en: "Tensile strength" },
    { key: "elongationAtBreak", zh: "拉伸断裂伸长率", en: "Elongation at break" },
    { key: "flexuralStrength", zh: "弯曲强度", en: "Flexural strength" },
    { key: "flexuralModulus", zh: "弯曲模量", en: "Flexural modulus" },
    { key: "heatDeflectionTemperature", zh: "热变形温度", en: "Heat deflection temperature" },
    { key: "vicatSofteningTemperature", zh: "维卡软化温度", en: "Vicat softening temperature" },
    { key: "diameterTolerance", zh: "线径公差", en: "Diameter tolerance" },
  ],
};

const PRINT_PARAMETER_TOKENS = [
  "nozzle", "bedtemperature", "chambertemperature", "printspeed", "speed",
  "fan", "cooling", "retraction", "zhop", "acceleration", "jerk", "flow",
  "pressureadvance", "volumetric", "linewidth",
];

export function getParameterCategory(key: string): ParameterCategory {
  const normalized = key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return PRINT_PARAMETER_TOKENS.some((token) => normalized.includes(token)) ? "print" : "material";
}

export function parameterCategoryLabel(category: ParameterCategory, locale: "zh-cn" | "en" = "zh-cn") {
  if (locale === "en") return category === "print" ? "Print parameters" : "Material parameters";
  return category === "print" ? "打印参数" : "材料参数";
}
