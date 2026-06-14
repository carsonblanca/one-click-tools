#!/usr/bin/env python3
"""Generate a daily OneClick Tools health report."""

from __future__ import annotations

import json
import os
import re
import smtplib
import ssl
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any

try:
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover - older Python fallback
    ZoneInfo = None  # type: ignore[assignment]

try:
    from security_check import run_security_check
except Exception as error:  # pragma: no cover - keeps reports resilient
    run_security_check = None  # type: ignore[assignment]
    SECURITY_CHECK_IMPORT_ERROR = error.__class__.__name__
else:
    SECURITY_CHECK_IMPORT_ERROR = ""


REQUIRED_TOOL_FIELDS = [
    "name",
    "slug",
    "tag",
    "category",
    "categorySlug",
    "desc",
    "description",
]
REQUIRED_ROUTES = [
    "app/about/page.tsx",
    "app/privacy/page.tsx",
    "app/terms/page.tsx",
    "app/contact/page.tsx",
]
ROUTE_CANDIDATES = {
    "app/about/page.tsx": ["app/about/page.tsx", "app/(en)/about/page.tsx"],
    "app/privacy/page.tsx": ["app/privacy/page.tsx", "app/(en)/privacy/page.tsx"],
    "app/terms/page.tsx": ["app/terms/page.tsx", "app/(en)/terms/page.tsx"],
    "app/contact/page.tsx": ["app/contact/page.tsx", "app/(en)/contact/page.tsx"],
}
REQUIRED_SUPPORT_FILES = [
    "app/sitemap.ts",
    "app/robots.ts",
    "components/ToolSeoContent.tsx",
    "components/SiteFooter.tsx",
]
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
REGISTRATION_PATTERN = re.compile(r'slug === "([^"]+)"')
IMPORT_PATTERN = re.compile(
    r'import\s+\w+\s+from\s+"(?:@/components/tools/|\.\./\.\./\.\./(?:\.\./)?components/tools/)([^"]+)"'
)
EMAIL_ENV_KEYS = [
    "REPORT_EMAIL_TO",
    "REPORT_EMAIL_FROM",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
]


@dataclass
class Issue:
    level: str
    message: str


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def report_date() -> datetime:
    if ZoneInfo is not None:
        return datetime.now(ZoneInfo("Asia/Shanghai"))
    return datetime.now(timezone(timedelta(hours=8)))


def load_json(path: Path, issues: list[Issue]) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        issues.append(Issue("High", f"Missing required JSON file: {path}"))
    except json.JSONDecodeError as error:
        issues.append(Issue("High", f"Invalid JSON in {path}: {error}"))
    return []


def read_text(path: Path, issues: list[Issue], required: bool = True) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        if required:
            issues.append(Issue("High", f"Missing required file: {path}"))
    return ""


def any_repo_path_exists(root: Path, candidates: list[str]) -> bool:
    return any((root / candidate).exists() for candidate in candidates)


def run_build(root: Path) -> tuple[bool, str]:
    command = ["npm", "run", "build", "--", "--webpack"]
    completed = subprocess.run(
        command,
        cwd=root,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    return completed.returncode == 0, completed.stdout


def check_tools(root: Path, issues: list[Issue]) -> dict[str, Any]:
    tools_path = root / "data/tools.json"
    categories_path = root / "data/categories.json"
    tools = load_json(tools_path, issues)
    categories = load_json(categories_path, issues) if categories_path.exists() else []

    if not isinstance(tools, list):
        issues.append(Issue("High", "data/tools.json must contain a list."))
        tools = []

    if categories and not isinstance(categories, list):
        issues.append(Issue("Medium", "data/categories.json should contain a list."))
        categories = []

    slugs = [tool.get("slug", "") for tool in tools if isinstance(tool, dict)]
    duplicate_slugs = sorted({slug for slug in slugs if slugs.count(slug) > 1})
    invalid_slugs = sorted(slug for slug in slugs if not SLUG_PATTERN.match(slug))
    missing_fields: list[str] = []

    for index, tool in enumerate(tools):
        if not isinstance(tool, dict):
            missing_fields.append(f"tool at index {index} is not an object")
            continue

        slug = tool.get("slug") or f"index-{index}"
        for field in REQUIRED_TOOL_FIELDS:
            if not tool.get(field):
                missing_fields.append(f"{slug}: missing {field}")

    for slug in duplicate_slugs:
        issues.append(Issue("High", f"Duplicate tool slug: {slug}"))

    for slug in invalid_slugs:
        issues.append(Issue("Medium", f"Invalid slug format: {slug}"))

    for item in missing_fields:
        issues.append(Issue("High", f"Tool metadata incomplete: {item}"))

    return {
        "tools": tools,
        "categories": categories,
        "tool_count": len(tools),
        "category_count": len(categories),
        "duplicate_slugs": duplicate_slugs,
        "invalid_slugs": invalid_slugs,
        "missing_fields": missing_fields,
    }


def check_registry(root: Path, tools: list[dict[str, Any]], issues: list[Issue]) -> dict[str, Any]:
    tool_client_path = root / "app/(en)/tools/[slug]/tool-client.tsx"
    tool_client = read_text(tool_client_path, issues)
    registered_slugs = REGISTRATION_PATTERN.findall(tool_client)
    metadata_slugs = [tool["slug"] for tool in tools if isinstance(tool, dict) and tool.get("slug")]
    registered_set = set(registered_slugs)
    metadata_set = set(metadata_slugs)

    missing_registrations = sorted(metadata_set - registered_set)
    stale_registrations = sorted(registered_set - metadata_set)
    duplicate_registrations = sorted(
        {slug for slug in registered_slugs if registered_slugs.count(slug) > 1}
    )

    for slug in missing_registrations:
        issues.append(Issue("High", f"Tool metadata has no component registration: {slug}"))

    for slug in stale_registrations:
        issues.append(Issue("Medium", f"Component registration has no metadata slug: {slug}"))

    for slug in duplicate_registrations:
        issues.append(Issue("Medium", f"Duplicate component registration: {slug}"))

    imported_components = {
        f"{match}.tsx" for match in IMPORT_PATTERN.findall(tool_client)
    }
    tools_dir = root / "components/tools"
    component_files = sorted(
        path.name
        for path in tools_dir.glob("*.tsx")
        if path.name != "tool-client.tsx"
    )
    unregistered_components = sorted(
        file_name for file_name in component_files if file_name not in imported_components
    )

    for file_name in unregistered_components:
        issues.append(Issue("Medium", f"Tool component file is not registered: {file_name}"))

    return {
        "registered_count": len(registered_slugs),
        "missing_registrations": missing_registrations,
        "stale_registrations": stale_registrations,
        "duplicate_registrations": duplicate_registrations,
        "component_files_count": len(component_files),
        "unregistered_components": unregistered_components,
    }


def check_routes(root: Path, issues: list[Issue]) -> dict[str, bool]:
    results: dict[str, bool] = {}

    for relative_path in [*REQUIRED_ROUTES, *REQUIRED_SUPPORT_FILES]:
        exists = any_repo_path_exists(
            root,
            ROUTE_CANDIDATES.get(relative_path, [relative_path]),
        )
        results[relative_path] = exists
        if not exists:
            issues.append(Issue("High", f"Missing required route/support file: {relative_path}"))

    return results


def check_sitemap(root: Path, tools: list[dict[str, Any]], issues: list[Issue]) -> dict[str, Any]:
    sitemap_text = read_text(root / "app/sitemap.ts", issues)
    required_static_paths = ["/about", "/privacy", "/terms", "/contact"]
    missing_static_paths = [path for path in required_static_paths if path not in sitemap_text]
    includes_home = '""' in sitemap_text or "url: baseUrl" in sitemap_text
    includes_tool_pages = "/tools/${tool.slug}" in sitemap_text and "tools.map" in sitemap_text

    if not includes_home:
        issues.append(Issue("High", "Sitemap does not appear to include the homepage."))

    for path in missing_static_paths:
        issues.append(Issue("Medium", f"Sitemap does not appear to include {path}."))

    if not includes_tool_pages and tools:
        issues.append(Issue("High", "Sitemap does not appear to include tool pages."))

    expected_urls = [
        "https://one-click-tools.com",
        "https://one-click-tools.com/about",
        "https://one-click-tools.com/privacy",
        "https://one-click-tools.com/terms",
        "https://one-click-tools.com/contact",
        *[
            f"https://one-click-tools.com/tools/{tool['slug']}"
            for tool in tools
            if isinstance(tool, dict) and tool.get("slug")
        ],
    ]
    duplicate_urls = sorted({url for url in expected_urls if expected_urls.count(url) > 1})

    for url in duplicate_urls:
        issues.append(Issue("High", f"Duplicate expected sitemap URL: {url}"))

    return {
        "includes_home": includes_home,
        "includes_tool_pages": includes_tool_pages,
        "missing_static_paths": missing_static_paths,
        "expected_url_count": len(expected_urls),
        "duplicate_urls": duplicate_urls,
    }


def highest_risk(issues: list[Issue]) -> str:
    levels = [issue.level for issue in issues]
    if "High" in levels:
        return "High"
    if "Medium" in levels:
        return "Medium"
    if "Low" in levels:
        return "Low"
    return "Low"


def markdown_list(items: list[str], empty: str = "None") -> str:
    if not items:
        return f"- {empty}"
    return "\n".join(f"- {item}" for item in items)


def fallback_security_summary(message: str) -> dict[str, Any]:
    return {
        "status": "High risk",
        "risk_counts": {
            "high": 1,
            "medium": 0,
            "low": 0,
        },
        "lockfiles": {
            "status": "Unknown",
            "other_lockfiles": [],
        },
        "workflow": {
            "permissions_configured": False,
            "sensitive_literals": [],
        },
        "sensitive_string_scan": {
            "status": "Not run",
            "matches_count": 0,
        },
        "upload_tools": {
            "count": 0,
            "files": [],
        },
        "issues": [
            {
                "level": "High",
                "message": message,
            },
        ],
        "recommended_actions": [
            "Fix scripts/security_check.py so the daily report can include security checks.",
        ],
    }


def collect_security_summary(root: Path) -> dict[str, Any]:
    if run_security_check is None:
        return fallback_security_summary(
            f"Security check could not be imported: {SECURITY_CHECK_IMPORT_ERROR or 'Unknown error'}."
        )

    try:
        return run_security_check(root)
    except Exception as error:  # pragma: no cover - keeps reports resilient
        return fallback_security_summary(
            f"Security check failed while running: {error.__class__.__name__}."
        )


def build_report(
    *,
    generated_at: datetime,
    tools_summary: dict[str, Any],
    registry_summary: dict[str, Any],
    route_summary: dict[str, bool],
    sitemap_summary: dict[str, Any],
    security_summary: dict[str, Any],
    build_ok: bool,
    build_output: str,
    issues: list[Issue],
) -> str:
    issue_lines = [
        f"**{issue.level}**: {issue.message}"
        for issue in issues
    ]
    build_tail = "\n".join(build_output.strip().splitlines()[-30:])
    next_actions = []
    security_counts = security_summary.get("risk_counts", {})
    security_scan = security_summary.get("sensitive_string_scan", {})
    security_workflow = security_summary.get("workflow", {})
    security_lockfiles = security_summary.get("lockfiles", {})
    security_upload_tools = security_summary.get("upload_tools", {})
    security_frontend_xss = security_summary.get("frontend_xss", {})
    security_actions = security_summary.get("recommended_actions", [])

    if not build_ok:
        next_actions.append("Investigate and fix the webpack production build failure.")
    if registry_summary["missing_registrations"]:
        next_actions.append("Register missing tool slugs in app/(en)/tools/[slug]/tool-client.tsx.")
    if tools_summary["duplicate_slugs"] or tools_summary["invalid_slugs"]:
        next_actions.append("Normalize or de-duplicate tool slugs in data/tools.json.")
    if tools_summary["missing_fields"]:
        next_actions.append("Fill missing required tool metadata fields.")
    if route_summary and not all(route_summary.values()):
        next_actions.append("Restore missing required legal, sitemap, robots, SEO, or footer files.")
    if security_counts.get("high", 0) or security_counts.get("medium", 0):
        next_actions.append("Review the Security Summary and address High or Medium security findings.")
    if not next_actions:
        next_actions.append("No urgent action required. Continue monitoring daily report output.")

    return f"""# OneClick Tools Daily Health Report

Generated at: {generated_at.isoformat()}

## Executive Summary

- Overall risk: **{highest_risk(issues)}**
- Build status: **{"Passed" if build_ok else "Failed"}**
- Tools checked: **{tools_summary["tool_count"]}**
- Categories checked: **{tools_summary["category_count"]}**
- Issues found: **{len(issues)}**

## Tools count

- Total tools: {tools_summary["tool_count"]}

## Category count

- Total categories: {tools_summary["category_count"]}

## Build status

- Command: `npm run build -- --webpack`
- Result: **{"Passed" if build_ok else "Failed"}**

<details>
<summary>Build output tail</summary>

```text
{build_tail}
```

</details>

## Route/basic page status

{markdown_list([f"{path}: {'OK' if exists else 'Missing'}" for path, exists in route_summary.items()])}

## Tool registry status

- Registered slugs: {registry_summary["registered_count"]}
- Component files: {registry_summary["component_files_count"]}
- Missing registrations: {len(registry_summary["missing_registrations"])}
- Stale registrations: {len(registry_summary["stale_registrations"])}
- Unregistered components: {len(registry_summary["unregistered_components"])}

### Missing registrations

{markdown_list(registry_summary["missing_registrations"])}

### Stale registrations

{markdown_list(registry_summary["stale_registrations"])}

### Unregistered tool components

{markdown_list(registry_summary["unregistered_components"])}

## Sitemap status

- Includes homepage: {"Yes" if sitemap_summary["includes_home"] else "No"}
- Includes tool pages: {"Yes" if sitemap_summary["includes_tool_pages"] else "No"}
- Expected URL count: {sitemap_summary["expected_url_count"]}
- Missing static paths: {", ".join(sitemap_summary["missing_static_paths"]) or "None"}
- Duplicate expected URLs: {", ".join(sitemap_summary["duplicate_urls"]) or "None"}

## Slug and metadata status

- Duplicate slugs: {", ".join(tools_summary["duplicate_slugs"]) or "None"}
- Invalid slugs: {", ".join(tools_summary["invalid_slugs"]) or "None"}
- Missing required metadata fields: {len(tools_summary["missing_fields"])}

## Security Summary

- Security status: **{security_summary.get("status", "Unknown")}**
- High risks count: {security_counts.get("high", 0)}
- Medium risks count: {security_counts.get("medium", 0)}
- Low risks count: {security_counts.get("low", 0)}
- Sensitive string scan result: {security_scan.get("status", "Unknown")} ({security_scan.get("matches_count", 0)} match(es))
- Workflow permissions status: {"Configured" if security_workflow.get("permissions_configured") else "Missing or unknown"}
- Lockfile status: {security_lockfiles.get("status", "Unknown")}
- Upload tool count: {security_upload_tools.get("count", 0)}
- Frontend XSS review files: {security_frontend_xss.get("raw_html_render_count", 0)}

### Recommended security actions

{markdown_list(security_actions)}

## Issues and risk levels

{markdown_list(issue_lines, "No issues found")}

## Recommended next actions

{markdown_list(next_actions)}
"""


def get_email_config() -> dict[str, str] | None:
    values = {key: os.environ.get(key, "").strip() for key in EMAIL_ENV_KEYS}
    missing = [key for key, value in values.items() if not value]

    if missing:
        print("SMTP email variables are incomplete; email notification skipped.")
        return None

    return values


def build_email_body(
    *,
    report_path: Path,
    report_text: str,
    build_ok: bool,
    issues: list[Issue],
    tools_count: int,
) -> str:
    risk = highest_risk(issues)
    summary = (
        "OneClick Tools daily health report\n"
        f"Report: {report_path.name}\n"
        f"Build: {'Passed' if build_ok else 'Failed'}\n"
        f"Risk: {risk}\n"
        f"Tools: {tools_count}\n"
        f"Issues: {len(issues)}"
    )

    return f"""{summary}

Full Markdown report
====================

{report_text}
"""


def send_email_report(
    config: dict[str, str],
    report_path: Path,
    report_text: str,
    build_ok: bool,
    issues: list[Issue],
    tools_count: int,
) -> None:
    try:
        smtp_port = int(config["SMTP_PORT"])
    except ValueError:
        print("SMTP_PORT is invalid; email notification skipped.")
        return

    message = EmailMessage()
    message["Subject"] = f"OneClick Tools Daily Report - {report_path.stem}"
    message["From"] = config["REPORT_EMAIL_FROM"]
    message["To"] = config["REPORT_EMAIL_TO"]
    message.set_content(
        build_email_body(
            report_path=report_path,
            report_text=report_text,
            build_ok=build_ok,
            issues=issues,
            tools_count=tools_count,
        )
    )

    context = ssl.create_default_context()

    try:
        if smtp_port == 465:
            with smtplib.SMTP_SSL(
                config["SMTP_HOST"],
                smtp_port,
                context=context,
                timeout=30,
            ) as server:
                server.login(config["SMTP_USER"], config["SMTP_PASS"])
                server.send_message(message)
        else:
            with smtplib.SMTP(config["SMTP_HOST"], smtp_port, timeout=30) as server:
                server.starttls(context=context)
                server.login(config["SMTP_USER"], config["SMTP_PASS"])
                server.send_message(message)

        print("Email notification sent.")
    except (OSError, smtplib.SMTPException, TimeoutError) as error:
        print(f"Email notification skipped after send error: {error.__class__.__name__}.")


def main() -> int:
    root = repo_root()
    now = report_date()
    issues: list[Issue] = []

    tools_summary = check_tools(root, issues)
    tools = [
        tool for tool in tools_summary["tools"]
        if isinstance(tool, dict)
    ]
    registry_summary = check_registry(root, tools, issues)
    route_summary = check_routes(root, issues)
    sitemap_summary = check_sitemap(root, tools, issues)
    security_summary = collect_security_summary(root)

    for security_issue in security_summary.get("issues", []):
        level = security_issue.get("level")
        message = security_issue.get("message")
        if level in {"High", "Medium"} and message:
            issues.append(Issue(level, f"Security: {message}"))

    build_ok, build_output = run_build(root)

    if not build_ok:
        issues.append(Issue("High", "Production webpack build failed."))

    reports_dir = root / "reports/daily"
    reports_dir.mkdir(parents=True, exist_ok=True)
    report_path = reports_dir / f"{now.strftime('%Y-%m-%d')}.md"
    report = build_report(
        generated_at=now,
        tools_summary=tools_summary,
        registry_summary=registry_summary,
        route_summary=route_summary,
        sitemap_summary=sitemap_summary,
        security_summary=security_summary,
        build_ok=build_ok,
        build_output=build_output,
        issues=issues,
    )
    report_path.write_text(report, encoding="utf-8")

    print(f"Daily report written: {report_path.relative_to(root)}")
    print(f"Build status: {'passed' if build_ok else 'failed'}")
    print(f"Issues found: {len(issues)}")

    email_config = get_email_config()

    if email_config:
        send_email_report(
            email_config,
            report_path,
            report,
            build_ok,
            issues,
            tools_summary["tool_count"],
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
