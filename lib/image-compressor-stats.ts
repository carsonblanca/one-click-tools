export const unavailableCompressionLabel = "—";
export const imageCompressorDebounceMs = 250;

export const imageCompressorQualityPresets = [
  { id: "high-quality", quality: "0.9", percent: 90, label: "High quality 90%" },
  { id: "balanced", quality: "0.7", percent: 70, label: "Balanced 70%" },
  { id: "smaller-file", quality: "0.5", percent: 50, label: "Smaller file 50%" },
  { id: "strong-compression", quality: "0.3", percent: 30, label: "Strong compression 30%" },
] as const;

export function getQualityPercent(quality: number | string): number {
  const value = Number(quality);

  if (!Number.isFinite(value)) return 0;

  return Math.round(value * 100);
}

export function getQualityPresetId(quality: number | string): string | null {
  const value = Number(quality);

  if (!Number.isFinite(value)) return null;

  const preset = imageCompressorQualityPresets.find(
    (candidate) => Math.abs(Number(candidate.quality) - value) < 0.000001,
  );

  return preset?.id || null;
}

export function getLatestDebouncedQuality<T>(values: readonly T[]): T | null {
  return values.length > 0 ? values[values.length - 1] : null;
}

export function isLatestCompressionRequest(
  requestId: number,
  latestRequestId: number,
): boolean {
  return requestId === latestRequestId;
}

export function getProcessingStateAfterRequestSettles({
  currentProcessing,
  requestId,
  latestRequestId,
}: {
  currentProcessing: boolean;
  requestId: number;
  latestRequestId: number;
}): boolean {
  return isLatestCompressionRequest(requestId, latestRequestId)
    ? false
    : currentProcessing;
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
