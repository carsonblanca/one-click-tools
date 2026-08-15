"use client";

import { useMemo, useState } from "react";
import { getColorCardImageUrl } from "@/lib/filaments/catalog/image-roles";
import type { CatalogRecord } from "@/lib/filaments/catalog/mock-catalog-ext";

export function ColorCardImage({ record }: { record: CatalogRecord }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = useMemo(() => getColorCardImageUrl(record), [record]);
  const available = Boolean(imageUrl && imageUrl !== failedUrl);
  const productKey = record.productLineId || "";
  const officialColorCode = record.color.digitalSwatch?.officialColorCode || "";

  return (
    <div
      className="group/color-image relative z-0 aspect-square w-[43%] max-w-[111px] min-w-[80px] lg:hover:z-30"
      data-color-image-slot
      data-product-key={productKey}
      data-official-color-code={officialColorCode}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl transition-transform duration-200 ease-out lg:group-hover/color-image:scale-[1.7]" data-color-image-frame>
          {available ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`${record.productLine} ${officialColorCode} official color spool`}
              className="h-full w-full rounded-2xl object-contain"
              data-image-role="color"
              height={256}
              loading="lazy"
              onError={() => setFailedUrl(imageUrl)}
              src={imageUrl || ""}
              width={256}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-current/15 text-xs opacity-45"
              data-color-image-missing
            >
              --
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PublishedProductImage({ record }: { record: CatalogRecord }) {
  const [unavailable, setUnavailable] = useState(false);
  const sourceRunId = record.published?.sourceRunId;
  const hasProductImage = record.published?.images.some((image) => image.role === "product" && image.url);

  if (!sourceRunId || !hasProductImage || unavailable) {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-current/15 text-xs opacity-45"
        data-product-image-missing
      >
        --
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={`${record.brand} ${record.productLine} official product image`}
      className="h-full w-full object-contain"
      data-image-role="product"
      height={256}
      onError={() => setUnavailable(true)}
      src={`/api/filaments/product-image?sourceRunId=${encodeURIComponent(sourceRunId)}`}
      width={256}
    />
  );
}
