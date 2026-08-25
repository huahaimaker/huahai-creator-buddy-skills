# Style Guide

Read this file only when implementing or changing the selected style.

## Shared rules

- The copied article uses inline styles; preview chrome may use normal CSS.
- Use a conservative preview width near 677px. This is a layout choice, not a claim about a current platform hard limit.
- Prefer the system font stack already present in the template.
- Body text: 16px, line height near 1.9, dark text on white.
- Use one accent color, one border color, and one quiet background tint.
- No gradients, glass effects, heavy shadows, giant rounded cards, decorative English kickers, or card-per-paragraph layouts.
- Do not place instructions, copy buttons, status text, or scrollable body windows inside the copied article.
- Tables stay real HTML tables. Code stays selectable text. Essential information must not be an image.

## Claude

For narrative, reflective and opinion writing.

- Ink `#171717`, muted `#6f6a62`.
- Accent `#a16207`, soft background `#fbfaf7`, border `#e7e1d7`.
- Editorial whitespace and restrained amber quote borders.

## OpenAI

For technical articles, tutorials and product notes.

- Ink `#111111`, muted `#5f6368`.
- Accent `#111111`, soft background `#f6f8fa`, border `#e5e7eb`.
- Crisp heading rules, compact tables, monospaced code blocks.

## Google

For data, lists, comparisons and education.

- Ink `#202124`, muted `#5f6368`.
- Accent `#1a73e8`, soft background `#f8fbff`, border `#d8e2f0`.
- Use blue sparingly for headings and table hierarchy; do not imitate product UI or use four-color decoration.

## Content preservation

- Split a long paragraph only at a natural sentence boundary.
- Never summarize, reorder, hide, or truncate source sections for visual neatness.
- If a structure cannot be represented safely, report it instead of converting it into a screenshot or dropping it.
