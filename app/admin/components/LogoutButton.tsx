"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/admin/auth/logout", {
        method: "POST",
      });
      const result = (await response.json()) as { redirectTo?: string };
      router.replace(result.redirectTo ?? "/admin/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="min-h-10 rounded-lg border border-[#CBD3DC] bg-white px-4 py-2 text-sm font-medium hover:bg-[#F4F6F8] disabled:opacity-60"
    >
      {pending ? "正在退出…" : "退出登录"}
    </button>
  );
}
