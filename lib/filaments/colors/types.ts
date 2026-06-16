export type ColorVerificationStatus = "verified" | "partial" | "pending";

export type ColorValueSource =
  | "official"
  | "official-image-estimate"
  | "community"
  | "unknown";

export type Opacity = "opaque" | "translucent" | "transparent";

export type FilamentColorSku = {
  id: string;
  productLineId: string;
  brandId: string;

  officialName: string;
  displayNameZh: string | null;
  aliases: string[];

  officialColorCode: string | null;
  hex: string | null;
  rgb: [number, number, number] | null;

  finish: string | null;
  opacity: Opacity | null;

  officialProductUrl: string | null;
  officialColorSourceUrl: string | null;
  officialImageUrl: string | null;

  colorValueSource: ColorValueSource;

  hasOfficialColorChart: boolean;
  hasPhysicalSwatch: boolean;

  verificationStatus: ColorVerificationStatus;
  lastVerifiedAt: string | null;
  sourceNotes: string;
  completenessStatus: "complete" | "partial" | "unknown";
};

export type BrandColorData = {
  brandId: string;
  brandName: string;
  verifiedAt: string | null;
  colors: FilamentColorSku[];
};
