#!/usr/bin/env python3
"""Read-only security baseline checks for OneClick Tools."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

try:
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover - older Python fallback
    ZoneInfo = None  # type: ignore[assignment]


@dataclass(frozen=True)
class SensitivePattern:
    label: str
    pattern: re.Pattern[str]


SKIP_DIRS = {
    ".git",
    ".next",
    ".vercel",
    "coverage",
    "node_modules",
    "out",
}
TEXT_SUFFIXES = {
    ".css",
    ".env",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".ts",
    ".tsx",
    ".txt",
    ".yml",
    ".yaml",
}
TEXT_FILENAMES = {
    "Dockerfile",
    "LICENSE",
    "README",
}


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def generated_at() -> datetime:
    if ZoneInfo is not None:
        return datetime.now(ZoneInfo("Asia/Shanghai"))
    return datetime.now(timezone(timedelta(hours=8)))


def prefix_pattern(prefix: str) -> re.Pattern[str]:
    return re.compile(r"(?<![A-Za-z0-9])" + re.escape(prefix) + r"[A-Za-z0-9_-]{12,}")


def exact_pattern(value: str) -> re.Pattern[str]:
    return re.compile(re.escape(value))


SENSITIVE_PATTERNS = [
    SensitivePattern("GitHub classic token prefix", prefix_pattern("ghp" + "_")),
    SensitivePattern("GitHub fine-grained token prefix", prefix_pattern("github" + "_pat" + "_")),
    SensitivePattern("SMTP password assignment", exact_pattern("SMTP" + "_PASS=")),
    SensitivePattern("Legacy notification webhook assignment", exact_pattern("FEISHU" + "_WEBHOOK_URL=")),
    SensitivePattern("OpenAI-style API key prefix", prefix_pattern("sk" + "-")),
    SensitivePattern("Slack bot token prefix", prefix_pattern("xoxb" + "-")),
]


def add_issue(issues: list[dict[str, str]], level: str, message: str) -> None:
    issues.append({"level": level, "message": message})


def risk_counts(issues: list[dict[str, str]]) -> dict[str, int]:
    return {
        "high": sum(1 for issue in issues if issue["level"] == "High"),
        "medium": sum(1 for issue in issues if issue["level"] == "Medium"),
        "low": sum(1 for issue in issues if issue["level"] == "Low"),
    }


def security_status(counts: dict[str, int]) -> str:
    if counts["high"]:
        return "High risk"
    if counts["medium"]:
        return "Needs attention"
    if counts["low"]:
        return "Passed with notes"
    return "Passed"


def is_text_file(path: Path) -> bool:
    return path.suffix.lower() in TEXT_SUFFIXES or path.name in TEXT_FILENAMES


def iter_scan_files(root: Path) -> list[Path]:
    files: list[Path] = []

    for path in root.rglob("*"):
        if any(part in SKIP_DIRS for part in path.relative_to(root).parts):
            continue
        if not path.is_file():
            continue
        if not is_text_file(path):
            continue
        if path.stat().st_size > 1_000_000:
            continue
        files.append(path)

    return sorted(files)


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return ""
    except FileNotFoundError:
        return ""


def scan_sensitive_strings(root: Path, files: list[Path]) -> list[dict[str, str]]:
    matches: list[dict[str, str]] = []

    for path in files:
        text = read_text(path)
        if not text:
            continue

        for item in SENSITIVE_PATTERNS:
            if item.pattern.search(text):
                matches.append({
                    "file": str(path.relative_to(root)),
                    "pattern": item.label,
                })

    return matches


def scan_workflow_literals(workflow_text: str) -> list[str]:
    return sorted(
        item.label
        for item in SENSITIVE_PATTERNS
        if item.pattern.search(workflow_text)
    )


def find_upload_tools(root: Path) -> list[str]:
    tools_dir = root / "components/tools"
    indicators = [
        'type="file"',
        "type='file'",
        "FileReader",
        "createObjectURL",
        ".files",
        "accept=",
    ]
    upload_tools: list[str] = []

    if not tools_dir.exists():
        return upload_tools

    for path in sorted(tools_dir.glob("*.tsx")):
        text = read_text(path)
        if any(indicator in text for indicator in indicators):
            upload_tools.append(path.name)

    return upload_tools


def find_raw_html_rendering(root: Path) -> list[str]:
    source_roots = [
        root / "app",
        root / "components",
    ]
    files: list[str] = []

    for source_root in source_roots:
        if not source_root.exists():
            continue
        for path in sorted(source_root.rglob("*.tsx")):
            text = read_text(path)
            if "dangerouslySetInnerHTML" in text:
                files.append(str(path.relative_to(root)))

    return files


def recommended_actions(result: dict[str, Any]) -> list[str]:
    actions: list[str] = []
    lockfiles = result["lockfiles"]
    workflow = result["workflow"]
    sensitive_scan = result["sensitive_string_scan"]

    if sensitive_scan["matches_count"]:
        actions.append("Rotate any exposed credentials and remove sensitive literals from repository files.")
    if lockfiles["other_lockfiles"]:
        actions.append("Keep one package manager lockfile in the repository to reduce supply-chain ambiguity.")
    if not workflow["permissions_configured"]:
        actions.append("Add explicit least-privilege permissions to GitHub Actions workflows.")
    if workflow["sensitive_literals"]:
        actions.append("Move workflow secrets to GitHub Secrets and avoid plaintext values in workflow files.")
    if result["upload_tools"]["count"]:
        actions.append("Keep upload/image tools browser-only and avoid sending uploaded files to remote services.")
    if result["frontend_xss"]["raw_html_render_files"]:
        actions.append("Review raw HTML preview components and sanitize or sandbox user-generated HTML.")
    if not actions:
        actions.append("No urgent security action required. Continue daily automated checks.")

    return actions


def run_security_check(root: Optional[Path] = None) -> dict[str, Any]:
    root = root or repo_root()
    issues: list[dict[str, str]] = []

    package_json_exists = (root / "package.json").exists()
    package_lock_exists = (root / "package-lock.json").exists()
    other_lockfiles = [
        file_name
        for file_name in ["yarn.lock", "pnpm-lock.yaml"]
        if (root / file_name).exists()
    ]

    if not package_json_exists:
        add_issue(issues, "High", "package.json is missing.")
    if not package_lock_exists:
        add_issue(issues, "Medium", "package-lock.json is missing; reproducible npm installs are weaker.")
    if other_lockfiles:
        add_issue(issues, "Medium", f"Multiple package manager lockfiles detected: {', '.join(other_lockfiles)}.")

    workflow_path = root / ".github/workflows/daily-report.yml"
    workflow_text = read_text(workflow_path)
    workflow_exists = workflow_path.exists()
    workflow_permissions = "permissions:" in workflow_text
    workflow_uses_secrets = "secrets." in workflow_text
    workflow_sensitive_literals = scan_workflow_literals(workflow_text)

    if not workflow_exists:
        add_issue(issues, "Medium", "Daily report workflow is missing.")
    if workflow_exists and not workflow_permissions:
        add_issue(issues, "Medium", "Daily report workflow does not define explicit permissions.")
    if workflow_exists and not workflow_uses_secrets:
        add_issue(issues, "Low", "Daily report workflow does not reference GitHub Secrets.")
    if workflow_sensitive_literals:
        add_issue(issues, "High", "Daily report workflow may contain plaintext sensitive values.")

    scan_files = iter_scan_files(root)
    sensitive_matches = scan_sensitive_strings(root, scan_files)

    if sensitive_matches:
        add_issue(issues, "High", f"Sensitive string scan found {len(sensitive_matches)} possible match(es).")

    required_pages = {
        "app/privacy/page.tsx": (root / "app/privacy/page.tsx").exists(),
        "app/terms/page.tsx": (root / "app/terms/page.tsx").exists(),
        "app/contact/page.tsx": (root / "app/contact/page.tsx").exists(),
    }

    for path, exists in required_pages.items():
        if not exists:
            add_issue(issues, "Medium", f"Required trust/legal page is missing: {path}.")

    upload_tools = find_upload_tools(root)

    if upload_tools:
        add_issue(issues, "Low", f"Local upload/image tools present: {len(upload_tools)} file-handling component(s).")

    raw_html_render_files = find_raw_html_rendering(root)

    if raw_html_render_files:
        add_issue(
            issues,
            "Medium",
            f"Raw HTML rendering requires XSS review: {', '.join(raw_html_render_files)}.",
        )

    daily_report_exists = (root / "scripts/daily_report.py").exists()
    reports_daily_exists = (root / "reports/daily").exists()

    if not daily_report_exists:
        add_issue(issues, "Medium", "scripts/daily_report.py is missing.")
    if not reports_daily_exists:
        add_issue(issues, "Low", "reports/daily directory is missing.")

    counts = risk_counts(issues)
    result: dict[str, Any] = {
        "generated_at": generated_at().isoformat(),
        "status": security_status(counts),
        "risk_counts": counts,
        "lockfiles": {
            "package_json_exists": package_json_exists,
            "package_lock_exists": package_lock_exists,
            "other_lockfiles": other_lockfiles,
            "status": "Multiple lockfiles detected" if other_lockfiles else "Single npm lockfile expected",
        },
        "workflow": {
            "exists": workflow_exists,
            "permissions_configured": workflow_permissions,
            "uses_secrets": workflow_uses_secrets,
            "sensitive_literals": workflow_sensitive_literals,
        },
        "sensitive_string_scan": {
            "status": "Passed" if not sensitive_matches else "Possible sensitive strings found",
            "matches_count": len(sensitive_matches),
            "matches": sensitive_matches,
        },
        "required_pages": required_pages,
        "upload_tools": {
            "count": len(upload_tools),
            "files": upload_tools,
        },
        "frontend_xss": {
            "raw_html_render_files": raw_html_render_files,
            "raw_html_render_count": len(raw_html_render_files),
        },
        "daily_report": {
            "script_exists": daily_report_exists,
            "reports_daily_exists": reports_daily_exists,
        },
        "issues": issues,
    }
    result["recommended_actions"] = recommended_actions(result)
    return result


def main() -> int:
    print(json.dumps(run_security_check(), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
