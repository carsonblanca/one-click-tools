# Translation Quality Rules

OneClick Tools must treat language quality as product quality. Localized pages should be useful, natural, and trustworthy before they are published or indexed.

## Core Rules

- Do not publish direct machine translation without human review.
- Chinese copy must be natural, concise, and aligned with real Chinese internet, tool, and product wording.
- Technical terms must follow [language-glossary.md](./language-glossary.md).
- Simplified Chinese and Traditional Chinese are not just character conversion. Wording must be reviewed separately where needed.
- English copy must also be reviewed for grammar, clarity, and native-like phrasing.
- SEO titles and descriptions must be checked manually before indexing.
- Do not batch-translate all tool names and descriptions in one pass without quality review.
- Do not use stiff, literal, or uncommon translations just because they are technically correct.
- Localized UI text must fit mobile layouts and button widths before merge.

## Language QA Checklist

Every new localized page or tool must pass this checklist before merge:

- Page title, description, headings, buttons, labels, notes, errors, and empty states are reviewed.
- Terminology matches the glossary or has an explicit reason to differ.
- Simplified Chinese uses wording common in mainland Chinese product/tool contexts.
- Traditional Chinese uses wording common in Traditional Chinese product/tool contexts.
- Units, currencies, punctuation, and mixed English/Chinese terms are consistent.
- Technical explanations are accurate for the tool behavior.
- SEO metadata is not keyword-stuffed and does not promise unsupported features.
- Browser-only privacy statements are accurate and avoid absolute legal guarantees.
- Mobile screenshots or responsive checks confirm no text overflow.
- A reviewer can explain why the translation is better than a direct machine translation.

## Publishing Guidance

Localized placeholder pages are acceptable while translations are being prepared. A placeholder is better than publishing low-quality automated copy.

Localized tool pages should only be indexed after the actual tool UI, SEO metadata, help content, and FAQ are reviewed in that language.
