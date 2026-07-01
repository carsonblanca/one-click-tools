import Link from "next/link";

export const metadata = {
  title: "拒绝访问",
};

export default function AdminForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <section className="max-w-lg rounded-2xl border border-red-200 bg-white p-7">
        <p className="text-sm font-medium text-red-700">403 · 拒绝访问</p>
        <h1 className="mt-2 text-2xl font-semibold">当前账号没有所需权限</h1>
        <p className="mt-3 text-sm leading-6 text-[#667281]">
          后台权限由集中 Scope 模型控制，隐藏按钮不会替代服务端权限校验。
        </p>
        <Link
          href="/admin"
          className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-[#1F5FAF] px-4 py-2 text-sm font-medium text-white"
        >
          返回后台
        </Link>
      </section>
    </main>
  );
}
