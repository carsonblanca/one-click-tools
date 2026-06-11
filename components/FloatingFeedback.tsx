"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
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

export default function FloatingFeedback() {
  const { isDark } = useTheme();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("Bug");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [error, setError] = useState("");
  const [sentNotice, setSentNotice] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCurrentUrl(window.location.href);
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
  }, [isOpen]);

  const openDialog = () => {
    setCurrentUrl(window.location.href);
    setError("");
    setSentNotice("");
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setError("");
    setSentNotice("");
  };

  const sendFeedback = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setError("Please enter a message before sending feedback.");
      setSentNotice("");
      return;
    }

    const userAgent = navigator.userAgent || "Unknown";
    const subject = `OneClick Tools Feedback - ${feedbackType}`;
    const body = [
      `Feedback type: ${feedbackType}`,
      `User email: ${email.trim() || "Not provided"}`,
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
    setSentNotice("Your email app should open now.");
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
        aria-label="Open feedback dialog"
        onClick={openDialog}
        className={`fixed right-3 bottom-20 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold shadow-lg transition sm:right-6 sm:bottom-28 sm:h-auto sm:w-auto sm:min-h-12 sm:gap-2 sm:px-4 sm:py-3 ${
          isDark
            ? "border-lime-300/30 bg-lime-300 text-black shadow-lime-950/30 hover:bg-lime-200"
            : "border-[#D4C7A8] bg-[#18181B] text-white shadow-[#18181B]/15 hover:bg-[#2D2D32]"
        }`}
      >
        <span aria-hidden="true">?</span>
        <span className="hidden sm:inline">Feedback</span>
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
                  Send feedback
                </h2>
                <p
                  className={`mt-2 text-sm leading-6 ${
                    isDark ? "text-white/55" : "text-[#6B665D]"
                  }`}
                >
                  Report a bug, suggest a tool, or tell us what feels wrong.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close feedback dialog"
                onClick={closeDialog}
                className={`rounded-full border px-3 py-2 text-sm transition ${
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
                    : "border-[#E5DED0] bg-[#F5F2EA] text-[#6B665D] hover:text-[#18181B]"
                }`}
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <ToolLabel>Feedback type</ToolLabel>
                <select
                  value={feedbackType}
                  onChange={(event) => setFeedbackType(event.target.value as FeedbackType)}
                  className={selectClass}
                >
                  {feedbackTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <ToolLabel>Your email optional</ToolLabel>
                <ToolInput
                  value={email}
                  onChange={setEmail}
                  type="email"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <ToolLabel>Message</ToolLabel>
                <ToolTextarea
                  value={message}
                  onChange={setMessage}
                  rows={6}
                  placeholder="Describe the issue or suggestion..."
                />
              </div>

              <div
                className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-white/55"
                    : "border-[#E5DED0] bg-[#F5F2EA] text-[#6B665D]"
                }`}
              >
                <span className="font-semibold">Current URL:</span>{" "}
                <span className="break-all">{currentUrl}</span>
              </div>

              {error ? <ToolResultBox>{error}</ToolResultBox> : null}
              {sentNotice ? <ToolResultBox muted>{sentNotice}</ToolResultBox> : null}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <ToolButton onClick={sendFeedback}>Send feedback</ToolButton>
              <ToolButton onClick={closeDialog} variant="secondary">
                Cancel
              </ToolButton>
            </div>

            <p
              className={`mt-5 text-xs leading-5 ${
                isDark ? "text-white/45" : "text-[#8A8173]"
              }`}
            >
              This feedback opens your email app. Your message is not sent through
              OneClick Tools servers.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
