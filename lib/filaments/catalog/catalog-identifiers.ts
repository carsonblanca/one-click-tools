export function canonicalBrandId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function canonicalBrandName(value: string) {
  const brandId = canonicalBrandId(value);
  if (brandId === "kexcelled") return "Kexcelled";
  if (brandId === "r3d") return "R3D";
  if (brandId === "bambu-lab") return "Bambu Lab";
  return value.trim();
}

export function canonicalProductLineId(brand: string, productLine: string) {
  const brandId = canonicalBrandId(brand);
  const lineId = productLine
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${brandId}-${lineId}`;
}
