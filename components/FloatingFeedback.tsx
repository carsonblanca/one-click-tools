"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import type { Locale } from "@/lib/i18n";
import {
  ToolButton,
  ToolInput,
  ToolLabel,
  ToolResultBox,
  ToolTextarea,
} from "./tool-ui/ToolUI";

const feedbackTypes = [
  "Bug",
  "Suggestion",
  "Wrong result",
  "UI issue",
  "Other",
] as const;

type FeedbackType = (typeof feedbackTypes)[number];

const feedbackCopy: Record<Locale, {
  button: string;
  openLabel: string;
  title: string;
  intro: string;
  closeLabel: string;
  close: string;
  type: string;
  email: string;
  message: string;
  messagePlaceholder: string;
  currentUrl: string;
  send: string;
  cancel: string;
  privacy: string;
  emptyMessage: string;
  sent: string;
  notProvided: string;
  userAgentUnknown: string;
}> = {
  en: {
    button: "Feedback",
    openLabel: "Open feedback dialog",
    title: "Send feedback",
    intro: "Report a bug, suggest a tool, or tell us what feels wrong.",
    closeLabel: "Close feedback dialog",
    close: "Close",
    type: "Feedback type",
    email: "Your email optional",
    message: "Message",
    messagePlaceholder: "Describe the issue or suggestion...",
    currentUrl: "Current URL:",
    send: "Send feedback",
    cancel: "Cancel",
    privacy: "This feedback opens your email app. Your message is not sent through OneClick Tools servers.",
    emptyMessage: "Please enter a message before sending feedback.",
    sent: "Your email app should open now.",
    notProvided: "Not provided",
    userAgentUnknown: "Unknown",
  },
  "zh-cn": {
    button: "反馈",
    openLabel: "打开反馈窗口",
    title: "发送反馈",
    intro: "报告问题、建议工具，或告诉我们哪里不顺手。",
    closeLabel: "关闭反馈窗口",
    close: "关闭",
    type: "反馈类型",
    email: "你的邮箱（可选）",
    message: "反馈内容",
    messagePlaceholder: "请描述问题或建议...",
    currentUrl: "当前页面：",
    send: "发送反馈",
    cancel: "取消",
    privacy: "此反馈会打开你的邮件应用。你的消息不会通过 OneClick Tools 服务器发送。",
    emptyMessage: "请先填写反馈内容。",
    sent: "邮件应用应该已经打开。",
    notProvided: "未提供",
    userAgentUnknown: "未知",
  },
  "zh-tw": {
    button: "回饋",
    openLabel: "開啟回饋視窗",
    title: "傳送回饋",
    intro: "回報問題、建議工具，或告訴我們哪裡不順手。",
    closeLabel: "關閉回饋視窗",
    close: "關閉",
    type: "回饋類型",
    email: "你的電子郵件（選填）",
    message: "回饋內容",
    messagePlaceholder: "請描述問題或建議...",
    currentUrl: "目前頁面：",
    send: "傳送回饋",
    cancel: "取消",
    privacy: "此回饋會開啟你的郵件應用程式。你的訊息不會透過 OneClick Tools 伺服器送出。",
    emptyMessage: "請先填寫回饋內容。",
    sent: "郵件應用程式應該已經開啟。",
    notProvided: "未提供",
    userAgentUnknown: "未知",
  },
};

const feedbackTypeLabels: Record<Locale, Record<FeedbackType, string>> = {
  en: {
    Bug: "Bug",
    Suggestion: "Suggestion",
    "Wrong result": "Wrong result",
    "UI issue": "UI issue",
    Other: "Other",
  },
  "zh-cn": {
    Bug: "错误",
    Suggestion: "建议",
    "Wrong result": "结果不正确",
    "UI issue": "界面问题",
    Other: "其他",
  },
  "zh-tw": {
    Bug: "錯誤",
    Suggestion: "建議",
    "Wrong result": "結果不正確",
    "UI issue": "介面問題",
    Other: "其他",
  },
};

export default function FloatingFeedback({ locale = "en" }: { locale?: Locale }) {
  const { isDark } = useTheme();
  const copy = feedbackCopy[locale];
  const typeLabels = feedbackTypeLabels[locale];
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("Bug");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [error, setError] = useState("");
  const [sentNotice, setSentNotice] = useState("");

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setError("");
    setSentNotice("");
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDialog();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDialog, isOpen]);

  const openDialog = () => {
    setCurrentUrl(window.location.href);
    setError("");
    setSentNotice("");
    setIsOpen(true);
  };

  const sendFeedback = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setError(copy.emptyMessage);
      setSentNotice("");
      return;
    }

    const userAgent = navigator.userAgent || copy.userAgentUnknown;
    const subject = `OneClick Tools Feedback - ${feedbackType}`;
    const body = [
      `Feedback type: ${feedbackType}`,
      `User email: ${email.trim() || copy.notProvided}`,
      `Current URL: ${currentUrl || window.location.href}`,
      `User agent: ${userAgent}`,
      "",
      "Message:",
      trimmedMessage,
    ].join("\n");

    window.location.href = `mailto:gainerht@gmail.com?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    setError("");
    setSentNotice(copy.sent);
  };

  const selectClass = `w-full rounded-2xl border px-4 py-4 outline-none transition ${
    isDark
      ? "border-white/10 bg-[#161B22] text-white focus:border-lime-300/40"
      : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B] focus:border-[#2563EB]/40"
  }`;

  return (
    <>
      <button
        type="button"
        aria-label={copy.openLabel}
        onClick={openDialog}
        className={`fixed right-3 bottom-20 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold shadow-lg transition sm:right-6 sm:bottom-28 sm:h-auto sm:w-auto sm:min-h-12 sm:gap-2 sm:px-4 sm:py-3 ${
          isDark
            ? "border-lime-300/30 bg-lime-300 text-black shadow-lime-950/30 hover:bg-lime-200"
            : "border-[#D4C7A8] bg-[#18181B] text-white shadow-[#18181B]/15 hover:bg-[#2D2D32]"
        }`}
      >
        <span aria-hidden="true">?</span>
        <span className="hidden sm:inline">{copy.button}</span>
      </button>

      {isOpen ? (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center px-4 py-5 sm:items-center ${
            isDark ? "bg-[#05070A]/75" : "bg-[#18181B]/35"
          }`}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            tabIndex={-1}
            className={`max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-[28px] border p-5 shadow-2xl outline-none sm:p-6 ${
              isDark
                ? "border-white/10 bg-[#0F141B] text-white shadow-black/40"
                : "border-[#E5DED0] bg-[#FFFDF7] text-[#18181B] shadow-[#18181B]/20"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="feedback-title" className="text-2xl font-semibold">
                  {copy.title}
                </h2>
                <p
                  className={`mt-2 text-sm leading-6 ${
                    isDark ? "text-white/55" : "text-[#6B665D]"
                  }`}
                >
                  {copy.intro}
                </p>
              </div>
              <button
                type="button"
                aria-label={copy.closeLabel}
                onClick={closeDialog}
                className={`rounded-full border px-3 py-2 text-sm transition ${
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
                    : "border-[#E5DED0] bg-[#F5F2EA] text-[#6B665D] hover:text-[#18181B]"
                }`}
              >
                {copy.close}
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <ToolLabel>{copy.type}</ToolLabel>
                <select
                  value={feedbackType}
                  onChange={(event) => setFeedbackType(event.target.value as FeedbackType)}
                  className={selectClass}
                >
                  {feedbackTypes.map((type) => (
                    <option key={type} value={type}>
                      {typeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <ToolLabel>{copy.email}</ToolLabel>
                <ToolInput
                  value={email}
                  onChange={setEmail}
                  type="email"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <ToolLabel>{copy.message}</ToolLabel>
                <ToolTextarea
                  value={message}
                  onChange={setMessage}
                  rows={6}
                  placeholder={copy.messagePlaceholder}
                />
              </div>

              <div
                className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-white/55"
                    : "border-[#E5DED0] bg-[#F5F2EA] text-[#6B665D]"
                }`}
              >
                <span className="font-semibold">{copy.currentUrl}</span>{" "}
                <span className="break-all">{currentUrl}</span>
              </div>

              {error ? <ToolResultBox>{error}</ToolResultBox> : null}
              {sentNotice ? <ToolResultBox muted>{sentNotice}</ToolResultBox> : null}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <ToolButton onClick={sendFeedback}>{copy.send}</ToolButton>
              <ToolButton onClick={closeDialog} variant="secondary">
                {copy.cancel}
              </ToolButton>
            </div>

            <p
              className={`mt-5 text-xs leading-5 ${
                isDark ? "text-white/45" : "text-[#8A8173]"
              }`}
            >
              {copy.privacy}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
