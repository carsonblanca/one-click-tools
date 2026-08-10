"use client";

import { useCallback, useState } from "react";
import brandAssets from "@/data/filament-brand-assets.json";

type BrandAsset = {
  brandId: string;
  brandName: string;
  logoPath: string | null;
  verificationStatus: string;
};

function findAsset(brand: string): BrandAsset | undefined {
  const lookup = brand.toLowerCase().replace(/\s+/g, "-");
  return (brandAssets as BrandAsset[]).find(
    (a) => a.brandId === lookup || a.brandName.toLowerCase() === brand.toLowerCase()
  );
}

export default function BrandLogo({
  brand,
  size = 28,
  logoPath: logoOverride,
}: {
  brand: string;
  size?: number;
  logoPath?: string | null;
}) {
  const asset = findAsset(brand);
  const [failed, setFailed] = useState(false);
  const safeOverride = logoOverride?.startsWith("filament-imports/")
    ? `/api/filament-assets?key=${encodeURIComponent(logoOverride)}`
    : logoOverride?.startsWith("/") && !logoOverride.startsWith("//")
      ? logoOverride
      : null;
  const logoPath = safeOverride || (asset?.logoPath && asset.verificationStatus === "verified" ? asset.logoPath : null);
  const fallback = "/filament-brands/generic-spool.svg";

  const handleError = useCallback(() => setFailed(true), []);

  const src = failed || !logoPath ? fallback : logoPath;
  const alt = `${brand} ${asset?.verificationStatus === "verified" ? "brand logo" : "brand logo pending verification"}`;

  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={alt}
        title={brand}
        width={size}
        height={size}
        onError={handleError}
        className="max-h-full max-w-full object-contain"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
