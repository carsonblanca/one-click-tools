# OneClick Tools Agent Rules

You are working on OneClick Tools, a Next.js + Tailwind CSS online tools website.

## Core principles

- Do not rewrite the whole project.
- Do not change routing structure unless explicitly requested.
- Do not push directly to main.
- Create small, focused changes.
- Keep SEO pages fast, simple, and static-friendly.
- Do not add heavy dependencies unless explicitly approved.
- Do not add API calls, databases, authentication, payments, or server actions unless explicitly requested.
- Do not touch deployment, DNS, Vercel, Cloudflare, or Google verification files unless explicitly requested.

## Git and PR workflow

- Codex may run normal Git operations on feature branches, including creating branches, committing, pushing, and opening pull requests.
- Do not push directly to `main`.
- Do not merge pull requests or merge feature branches into `main`; all development must go through a PR for the user to review and merge.
- Do not force push.
- Do not delete `main` or important remote branches.
- Check the working tree before creating a new branch.
- If uncommitted changes already exist, do not delete or overwrite them. Stop and report, or save them to a safe branch or stash with a clear note.
- Do not include auto-generated `reports/daily/*` files in ordinary feature PRs.
- Do not leak secrets, tokens, cookies, passwords, API keys, or user data.

## Project structure

Important files:

- `data/tools.json` stores tool metadata.
- `data/categories.json` stores allowed categories.
- `app/page.tsx` is the homepage.
- `app/tools/[slug]/page.tsx` is the dynamic tool page.
- `app/tools/[slug]/tool-client.tsx` routes tool slugs to tool components.
- `components/tools/` stores individual tool components.
- `components/tool-ui/ToolUI.tsx` stores reusable tool UI components.
- `components/ThemeProvider.tsx` controls light/dark theme.
- `components/PageShell.tsx`, `SiteHeader.tsx`, `SiteFooter.tsx` are shared layout components.

## Tool development rules

When adding a new tool:

1. Add metadata to `data/tools.json`.
2. Use an existing category from `data/categories.json`.
3. Create one component in `components/tools/`.
4. Register the component in `app/tools/[slug]/tool-client.tsx`.
5. Use only reusable components from `components/tool-ui/ToolUI.tsx` for:
   - inputs
   - textareas
   - buttons
   - panels
   - result boxes
   - stat cards
6. Do not use hardcoded purple buttons such as `bg-purple-600`.
7. Do not use hardcoded black input backgrounds such as `bg-black/30` unless inside reusable UI components.
8. The tool must work in both light and dark themes.
9. The tool must run fully in the browser whenever possible.
10. The tool must not upload user data to any server.

## Design rules

- Keep the current design language:
  - Dark theme: graphite black + lime/cyan accents.
  - Light theme: warm gray/cream + blue/copper accents.
- Do not introduce a new unrelated visual style.
- Keep cards rounded, calm, readable, and responsive.
- Avoid generic AI-template purple gradients.

## SEO rules

- Every tool needs:
  - `name`
  - `slug`
  - `tag`
  - `category`
  - `categorySlug`
  - `desc`
  - `description`
- Slugs must be lowercase and hyphenated.
- Do not remove `sitemap.ts`, `robots.ts`, or Google verification metadata.
- Do not break `/sitemap.xml`.

## Testing rules

Before considering a task done, run:

```bash
npm run build
```
