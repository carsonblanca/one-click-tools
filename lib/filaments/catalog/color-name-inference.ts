const COLOR_NAME_RULES: Array<{ names: string[]; codes: string[]; english: string }> = [
  { names: ["黑", "黑色", "哑黑", "哑光黑"], codes: ["BLK", "BK", "BLACK"], english: "Black" },
  { names: ["白", "白色", "透明白", "乳白", "自然白"], codes: ["WHT", "WH", "WHITE"], english: "White" },
  { names: ["消防红", "消防車红", "消防车红"], codes: ["FRED", "FIREENGINE"], english: "Fire Engine Red" },
  { names: ["红", "红色", "正红", "大红"], codes: ["RED", "RD"], english: "Red" },
  { names: ["浅蓝", "淡蓝"], codes: ["LBLU", "LIGHTBLUE"], english: "Light Blue" },
  { names: ["深蓝", "藏青", "宝蓝"], codes: ["DBLU", "NAVY", "ROYALBLUE"], english: "Navy Blue" },
  { names: ["湖蓝"], codes: ["LAKEBLUE"], english: "Lake Blue" },
  { names: ["天蓝"], codes: ["SKY"], english: "Sky Blue" },
  { names: ["蓝", "蓝色"], codes: ["BLU", "BLUE"], english: "Blue" },
  { names: ["浅绿", "淡绿"], codes: ["LGRN", "LIGHTGREEN"], english: "Light Green" },
  { names: ["深绿"], codes: ["DGRN", "DARKGREEN"], english: "Dark Green" },
  { names: ["绿", "绿色"], codes: ["GRN", "GREEN"], english: "Green" },
  { names: ["黄", "黄色"], codes: ["YEL", "YELLOW"], english: "Yellow" },
  { names: ["浅橙色", "浅橙"], codes: ["LORN", "LIGHTORANGE"], english: "Light Orange" },
  { names: ["橙", "橙色", "橘色"], codes: ["ORN", "ORANGE"], english: "Orange" },
  { names: ["紫", "紫色", "薰衣草", "淡紫"], codes: ["PUR", "PURPLE"], english: "Purple" },
  { names: ["粉", "粉色", "粉红", "粉红色"], codes: ["PNK", "PINK"], english: "Pink" },
  { names: ["浅灰", "淡灰"], codes: ["LGRY", "LIGHTGRAY"], english: "Light Gray" },
  { names: ["深灰"], codes: ["DGRY", "DARKGRAY"], english: "Dark Gray" },
  { names: ["灰", "灰色"], codes: ["GRY", "GRAY", "GREY"], english: "Gray" },
  { names: ["棕", "棕色", "咖啡", "咖啡色"], codes: ["BRN", "BROWN"], english: "Brown" },
  { names: ["金", "金色", "金属金"], codes: ["GLD", "GOLD"], english: "Gold" },
  { names: ["银", "银色", "金属银"], codes: ["SLV", "SILVER"], english: "Silver" },
  { names: ["肤色", "肉色"], codes: ["SKIN", "SKINTONE"], english: "Skin Tone" },
  { names: ["米色", "米白"], codes: ["BEI", "BEIGE"], english: "Beige" },
  { names: ["自然色", "原色"], codes: ["NAT", "NATURAL"], english: "Natural" },
  { names: ["透明", "透明色", "半透明"], codes: ["CLR", "TRANSPARENT", "CLEAR"], english: "Transparent" },
  { names: ["夜光", "夜光色", "荧光", "发光"], codes: ["GLOW", "LUM"], english: "Glow-in-the-dark" },
  { names: ["青色", "孔雀蓝"], codes: ["CYN", "CYAN"], english: "Cyan" },
  { names: ["玫红", "洋红", "品红"], codes: ["MAG", "MAGENTA"], english: "Magenta" },
];

/** Returns an industry-readable English color name without overwriting an official value. */
export function inferIndustryColorNameEn(nameZh: string, officialCode = ""): string {
  const zh = nameZh.trim();
  const code = officialCode.trim().toUpperCase();
  const exact = COLOR_NAME_RULES.find((rule) => rule.names.includes(zh) || rule.codes.includes(code));
  if (exact) return exact.english;

  const partial = COLOR_NAME_RULES.find((rule) => rule.names.some((name) => zh.includes(name)));
  return partial?.english || "";
}
