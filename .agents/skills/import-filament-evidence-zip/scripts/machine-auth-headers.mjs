export const PREVIEW_BYPASS_KEYCHAIN_SERVICE = "one-click-tools-preview-vercel-bypass";

export function isVercelPreviewUrl(baseUrl) {
  return new URL(baseUrl).hostname.endsWith(".vercel.app");
}

export function buildMachineAuthHeaders({ baseUrl, token, previewBypassSecret }) {
  const headers = { Authorization: `Bearer ${token}` };
  if (!isVercelPreviewUrl(baseUrl)) return headers;

  const bypassSecret = typeof previewBypassSecret === "string"
    ? previewBypassSecret.trim()
    : "";
  if (!bypassSecret) {
    throw new Error("Vercel Preview protection bypass secret is required");
  }
  headers["x-vercel-protection-bypass"] = bypassSecret;
  return headers;
}
