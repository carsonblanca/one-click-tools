import type { ReactNode } from "react";
import LogoutButton from "./LogoutButton";
import AdminSidebar from "./AdminSidebar";

export default function AdminShell({
  role,
  sessionId,
  children,
}: {
  role: string;
  sessionId: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[#D9E0E7] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-lg font-semibold">OneClick Tools 管理后台</p>
            <p className="mt-1 text-xs text-[#667281]">
              当前角色：{role} · 会话 ID：{sessionId}
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-5 py-6">
        <aside className="hidden w-44 shrink-0 md:block">
          <AdminSidebar />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
