type AnalyticsValue = string | number | boolean | null | undefined;

type AnalyticsParams = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, params?: Record<string, string | number | boolean>) => void;
    va?: (command: "event", event: { name: string; data?: Record<string, string | number | boolean> }) => void;
  }
}

function cleanParams(params: AnalyticsParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== null && value !== undefined),
  ) as Record<string, string | number | boolean>;
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const safeParams = cleanParams(params);

  try {
    window.gtag?.("event", eventName, safeParams);
  } catch {
    // Analytics should never block the tool workflow.
  }

  try {
    window.va?.("event", { name: eventName, data: safeParams });
  } catch {
    // Vercel Analytics is optional.
  }
}
