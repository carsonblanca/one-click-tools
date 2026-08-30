"use client";

import BrandEditor from "../_components/BrandEditor";

export default function NewBrandPage() {
  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">品牌管理</p>
        <h1 className="text-2xl font-semibold">新增品牌</h1>
        <p className="mt-2 text-sm text-slate-600">
          创建新的耗材品牌资料。当前页面先完成表单录入，数据库保存将在 catalog core 接入后启用。
        </p>
      </header>

      <BrandEditor mode="create" />
    </main>
  );
}
