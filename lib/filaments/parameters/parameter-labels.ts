export const PARAMETER_LABELS: Record<string, { zh: string; en: string }> = {
  filamentDiameter: { zh: "线径", en: "Filament diameter" },
  netWeight: { zh: "净重", en: "Net weight" },
  materialType: { zh: "材料类型", en: "Material type" },
  density: { zh: "密度", en: "Density" },
  diameterTolerance: { zh: "线径公差", en: "Diameter tolerance" },
  meltFlowIndex: { zh: "熔融指数", en: "Melt flow index" },
  heatDeflectionTemperature: { zh: "热变形温度", en: "Heat deflection temperature" },
  vicatSofteningTemperature: { zh: "维卡软化温度", en: "Vicat softening temperature" },
  tensileStrength: { zh: "拉伸强度", en: "Tensile strength" },
  elongationAtBreak: { zh: "拉伸断裂伸长率", en: "Elongation at break" },
  flexuralStrength: { zh: "弯曲强度", en: "Flexural strength" },
  flexuralModulus: { zh: "弯曲模量", en: "Flexural modulus" },
  unnotchedImpactStrength: { zh: "简支梁无缺口冲击强度", en: "Unnotched impact strength" },
  notchedImpactStrength: { zh: "简支梁缺口冲击强度", en: "Notched impact strength" },
  nozzleTemperature: { zh: "喷嘴温度", en: "Nozzle temperature" },
  bedTemperature: { zh: "平台温度", en: "Bed temperature" },
  recommendedPrintSpeed: { zh: "推荐打印速度", en: "Recommended print speed" },
  coolingFan: { zh: "冷却风扇", en: "Cooling fan" },
  flowRatio: { zh: "流量比例", en: "Flow ratio" },
  shrink: { zh: "收缩", en: "Shrink" },
  maxVolumetricSpeed: { zh: "最大体积速度", en: "Maximum volumetric speed" },
  chamberTemperature: { zh: "腔体温度", en: "Chamber temperature" },
  retractionLength: { zh: "回抽长度", en: "Retraction length" },
  retractionSpeed: { zh: "回抽速度", en: "Retraction speed" },
  zHop: { zh: "抬升高度", en: "Z hop" },
  dryingTemperature: { zh: "烘干温度", en: "Drying temperature" },
  dryingTime: { zh: "烘干时间", en: "Drying time" },
};

export function parameterLabel(key: string, locale: "zh-cn" | "en" = "zh-cn") {
  const label = PARAMETER_LABELS[key];
  if (label) return locale === "en" ? label.en : label.zh;
  return key;
}
