import { redirect } from "next/navigation";
import { getBootstrapAdminConfig } from "@/lib/admin/auth";
import { readAdminSession } from "@/lib/admin/session";
import AdminLoginForm from "../components/AdminLoginForm";

export const metadata = {
  title: "登录",
};

export default async function AdminLoginPage() {
  const session = await readAdminSession();
  if (session) {
    redirect("/admin");
  }
  const config = getBootstrapAdminConfig();

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-[#D9E0E7] bg-white p-7 shadow-sm">
        <p className="text-sm font-medium text-[#1F5FAF]">OneClick Tools</p>
        <h1 className="mt-2 text-2xl font-semibold">管理后台登录</h1>
        <p className="mt-3 text-sm leading-6 text-[#667281]">
          当前仅支持由环境变量配置的开发环境 Bootstrap Admin。
        </p>
        <AdminLoginForm
          configured={config.configured}
          configurationMessage={config.message}
        />
      </section>
    </main>
  );
}
