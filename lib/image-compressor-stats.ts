export const unavailableCompressionLabel = "—";

export function getQualityPercent(quality: number | string): number {
  const value = Number(quality);

  if (!Number.isFinite(value)) return 0;

  return Math.round(value * 100);
}

export function getSavedBytes(originalBytes: number, outputBytes: number): number {
  if (
    !Number.isFinite(originalBytes) ||
    !Number.isFinite(outputBytes) ||
    originalBytes <= 0 ||
    outputBytes < 0
  ) {
    return 0;
  }

  return Math.max(0, originalBytes - outputBytes);
}

export function getCompressionRatePercent(
  originalBytes: number,
  outputBytes: number,
): number | null {
  if (
    !Number.isFinite(originalBytes) ||
    !Number.isFinite(outputBytes) ||
    originalBytes <= 0 ||
    outputBytes < 0
  ) {
    return null;
  }

  const rate = ((originalBytes - outputBytes) / originalBytes) * 100;

  if (!Number.isFinite(rate) || rate <= 0) return 0;

  return Math.max(0, Math.round(rate));
}

export function getCompressionRateLabel(
  originalBytes: number,
  outputBytes: number,
): string {
  const rate = getCompressionRatePercent(originalBytes, outputBytes);

  return rate === null ? unavailableCompressionLabel : `${rate}%`;
}

export function isOutputSmaller(
  originalBytes: number,
  outputBytes: number,
): boolean {
  return (
    Number.isFinite(originalBytes) &&
    Number.isFinite(outputBytes) &&
    originalBytes > 0 &&
    outputBytes >= 0 &&
    outputBytes < originalBytes
  );
}

export function formatImageCompressorFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return unavailableCompressionLabel;

  return `${(bytes / 1024).toFixed(2)} KB`;
}

export function formatImageDimensions(width: number, height: number): string {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return unavailableCompressionLabel;
  }

  return `${Math.round(width)} × ${Math.round(height)} px`;
}

export function isResolutionUnchanged({
  originalWidth,
  originalHeight,
  outputWidth,
  outputHeight,
}: {
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
}): boolean {
  return (
    Number.isFinite(originalWidth) &&
    Number.isFinite(originalHeight) &&
    Number.isFinite(outputWidth) &&
    Number.isFinite(outputHeight) &&
    originalWidth > 0 &&
    originalHeight > 0 &&
    outputWidth > 0 &&
    outputHeight > 0 &&
    Math.round(originalWidth) === Math.round(outputWidth) &&
    Math.round(originalHeight) === Math.round(outputHeight)
  );
}
