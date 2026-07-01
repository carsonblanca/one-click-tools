"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm({
  configured,
  configurationMessage,
}: {
  configured: boolean;
  configurationMessage: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || submitting) return;

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as {
        error?: string;
        redirectTo?: string;
      };
      if (!response.ok) {
        setError(result.error ?? "登录失败。");
        return;
      }
      router.replace(result.redirectTo ?? "/admin");
      router.refresh();
    } catch {
      setError("登录请求失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-5">
      <div>
        <label htmlFor="admin-email" className="mb-2 block text-sm font-medium">
          管理员邮箱
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={!configured}
          required
          className="w-full rounded-lg border border-[#CBD3DC] bg-white px-4 py-3 outline-none focus:border-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#EEF1F4]"
        />
      </div>

      <div>
        <label
          htmlFor="admin-password"
          className="mb-2 block text-sm font-medium"
        >
          密码
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={!configured}
          required
          className="w-full rounded-lg border border-[#CBD3DC] bg-white px-4 py-3 outline-none focus:border-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#EEF1F4]"
        />
      </div>

      {!configured ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {configurationMessage}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!configured || submitting}
        className="min-h-11 w-full rounded-lg bg-[#1F5FAF] px-4 py-3 font-medium text-white hover:bg-[#184D8E] disabled:cursor-not-allowed disabled:bg-[#9AA8B7]"
      >
        {submitting ? "正在登录…" : "登录管理后台"}
      </button>
    </form>
  );
}
