"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const localePrefixes: Record<string, string> = {
  en: "",
  "zh-cn": "/zh-cn",
  "zh-tw": "/zh-tw",
};

export default function FilamentPresetRedirect({
  locale = "en",
}: {
  locale?: string;
}) {
  const router = useRouter();
  const prefix = localePrefixes[locale] || "";
  const target = `${prefix}/filaments`;

  useEffect(() => {
    router.replace(target);
  }, [router, target]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm opacity-60">
      Redirecting to Filament Library...
    </div>
  );
}
