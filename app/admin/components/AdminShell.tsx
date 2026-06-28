import type { ReactNode } from "react";
import Link from "next/link";
import type { AdminSession } from "@/lib/admin/types";
import LogoutButton from "./LogoutButton";

export default function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[#D9E0E7] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-lg font-semibold">OneClick Tools 管理后台</p>
            <p className="mt-1 text-xs text-[#667281]">
              当前角色：{session.role} · 会话 ID：{session.sessionId.slice(0, 8)}
            </p>
            <nav className="mt-3 flex flex-wrap gap-3 text-xs text-[#1F5FAF]">
              <Link href="/admin/filaments" className="hover:underline">耗材管理</Link>
              <Link href="/admin/filament-import" className="hover:underline">耗材包上传</Link>
              <Link href="/admin/filament-evidence" className="hover:underline">证据采集</Link>
              <Link href="/admin/brands" className="hover:underline">品牌管理</Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
