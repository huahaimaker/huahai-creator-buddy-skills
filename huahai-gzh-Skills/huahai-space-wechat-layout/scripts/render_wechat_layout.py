#!/usr/bin/env python3
"""Render a Markdown article into a deterministic WeChat preview page."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
from pathlib import Path


STYLE_TOKENS = {
    "claude": {
        "ink": "#171717",
        "muted": "#6f6a62",
        "accent": "#a16207",
        "soft": "#fbfaf7",
        "line": "#e7e1d7",
    },
    "openai": {
        "ink": "#111111",
        "muted": "#5f6368",
        "accent": "#111111",
        "soft": "#f6f8fa",
        "line": "#e5e7eb",
    },
    "google": {
        "ink": "#202124",
        "muted": "#5f6368",
        "accent": "#1a73e8",
        "soft": "#f8fbff",
        "line": "#d8e2f0",
    },
}


def fail(message: str, code: int = 2) -> None:
    print(json.dumps({"status": "error", "error": message}, ensure_ascii=False))
    raise SystemExit(code)


def inline(text: str) -> str:
    value = html.escape(text, quote=True)
    value = re.sub(r"`([^`]+)`", r'<code style="font-family:SFMono-Regular,Consolas,monospace;background:#f1f3f5;padding:1px 4px;border-radius:4px;">\1</code>', value)
    value = re.sub(r"\*\*([^*]+)\*\*", r'<strong style="font-weight:700;">\1</strong>', value)
    value = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r'<em>\1</em>', value)
    value = re.sub(
        r"\[([^\]]+)\]\((https?://[^\s)]+)\)",
        r'<a href="\2" style="color:inherit;text-decoration:underline;">\1</a>',
        value,
    )
    return value


def pick_style(requested: str, source: str) -> str:
    if requested != "auto":
        return requested
    if "```" in source or re.search(r"\b(API|CLI)\b", source, re.I) or re.search(r"代码|教程|开发|技术", source):
        return "openai"
    if re.search(r"^\s*\|.+\|\s*$", source, re.M) or len(re.findall(r"^\s*[-*]\s+", source, re.M)) >= 5:
        return "google"
    return "claude"


def extract_title(source: str, fallback: str) -> str:
    for line in source.splitlines():
        match = re.match(r"^#\s+(.+?)\s*$", line)
        if match:
            return re.sub(r"[*_`]", "", match.group(1)).strip()
    return fallback


def split_frontmatter(source: str, mode: str = "auto") -> tuple[str, dict[str, str], bool]:
    if mode == "keep":
        return source, {}, False
    lines = source.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    if not lines or lines[0].strip() != "---":
        return source, {}, False
    try:
        end = next(index for index in range(1, len(lines)) if lines[index].strip() == "---")
    except StopIteration:
        return source, {}, False
    candidate = lines[1:end]
    top_level_key = re.compile(r"^[A-Za-z0-9_-]+:\s*.*$")
    has_key = any(top_level_key.match(line) for line in candidate)
    yaml_like = all(
        not line.strip()
        or line.lstrip().startswith("#")
        or bool(top_level_key.match(line))
        or bool(re.match(r"^\s+\S.*$", line))
        or bool(re.match(r"^-\s+\S.*$", line))
        for line in candidate
    )
    if mode == "auto" and (not has_key or not yaml_like):
        return source, {}, False
    metadata: dict[str, str] = {}
    for line in candidate:
        match = re.match(r"^([A-Za-z0-9_-]+):\s*(.*?)\s*$", line)
        if match:
            metadata[match.group(1)] = match.group(2).strip('"\'')
    return "\n".join(lines[end + 1 :]).lstrip("\n"), metadata, True


def is_table_separator(line: str) -> bool:
    cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
    return bool(cells) and all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells)


def table_cells(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def render_markdown(source: str, style_name: str) -> tuple[str, int]:
    t = STYLE_TOKENS[style_name]
    lines = source.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    blocks: list[str] = []
    paragraph: list[str] = []
    i = 0

    def flush_paragraph() -> None:
        if not paragraph:
            return
        joined = " ".join(part.strip() for part in paragraph if part.strip())
        blocks.append(f'<p style="margin:0 0 1.05em;font-size:16px;line-height:1.9;color:{t["ink"]};">{inline(joined)}</p>')
        paragraph.clear()

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if not stripped:
            flush_paragraph()
            i += 1
            continue

        if stripped.startswith("```"):
            flush_paragraph()
            language = stripped[3:].strip()
            code_lines: list[str] = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            if i >= len(lines):
                raise ValueError("unclosed fenced code block")
            code = html.escape("\n".join(code_lines))
            label = f'<p style="margin:0 0 8px;color:{t["muted"]};font-size:12px;">{html.escape(language)}</p>' if language else ""
            blocks.append(
                f'<section style="margin:18px 0;padding:14px 16px;border:1px solid {t["line"]};border-radius:6px;background:{t["soft"]};">'
                f'{label}<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.7;color:{t["ink"]};"><code>{code}</code></pre></section>'
            )
            i += 1
            continue

        if i + 1 < len(lines) and "|" in line and is_table_separator(lines[i + 1]):
            flush_paragraph()
            headers = table_cells(line)
            rows: list[list[str]] = []
            i += 2
            while i < len(lines) and "|" in lines[i] and lines[i].strip():
                rows.append(table_cells(lines[i]))
                i += 1
            head_html = "".join(
                f'<th style="padding:9px 10px;border:1px solid {t["line"]};background:{t["soft"]};text-align:left;font-size:14px;line-height:1.5;">{inline(cell)}</th>'
                for cell in headers
            )
            body_html = "".join(
                "<tr>" + "".join(
                    f'<td style="padding:9px 10px;border:1px solid {t["line"]};font-size:14px;line-height:1.6;vertical-align:top;">{inline(cell)}</td>'
                    for cell in row
                ) + "</tr>"
                for row in rows
            )
            blocks.append(
                f'<section style="margin:18px 0;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;color:{t["ink"]};">'
                f'<thead><tr>{head_html}</tr></thead><tbody>{body_html}</tbody></table></section>'
            )
            continue

        heading = re.match(r"^(#{1,3})\s+(.+?)\s*$", line)
        if heading:
            flush_paragraph()
            level = len(heading.group(1))
            text = inline(heading.group(2))
            if level == 1:
                css = f'margin:0 0 24px;font-size:28px;line-height:1.35;color:{t["ink"]};font-weight:800;'
            elif level == 2:
                css = f'margin:30px 0 14px;padding-bottom:8px;border-bottom:2px solid {t["accent"]};font-size:22px;line-height:1.45;color:{t["ink"]};font-weight:750;'
            else:
                css = f'margin:24px 0 10px;font-size:18px;line-height:1.5;color:{t["ink"]};font-weight:700;'
            blocks.append(f'<h{level} style="{css}">{text}</h{level}>')
            i += 1
            continue

        if re.fullmatch(r"-{3,}", stripped):
            flush_paragraph()
            blocks.append(f'<hr style="margin:24px 0;border:0;border-top:1px solid {t["line"]};">')
            i += 1
            continue

        if stripped.startswith(">"):
            flush_paragraph()
            quote_lines: list[str] = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote_lines.append(lines[i].strip()[1:].strip())
                i += 1
            quote = "<br>".join(inline(item) for item in quote_lines)
            blocks.append(
                f'<blockquote style="margin:18px 0;padding:12px 16px;border-left:3px solid {t["accent"]};background:{t["soft"]};color:{t["muted"]};font-size:15px;line-height:1.8;">{quote}</blockquote>'
            )
            continue

        unordered = re.match(r"^\s*[-*+]\s+(.+)$", line)
        ordered = re.match(r"^\s*\d+[.)]\s+(.+)$", line)
        if unordered or ordered:
            flush_paragraph()
            tag = "ul" if unordered else "ol"
            items: list[str] = []
            while i < len(lines):
                match = re.match(r"^\s*[-*+]\s+(.+)$", lines[i]) if tag == "ul" else re.match(r"^\s*\d+[.)]\s+(.+)$", lines[i])
                if not match:
                    break
                items.append(match.group(1))
                i += 1
            item_html = "".join(f'<li style="margin:6px 0;">{inline(item)}</li>' for item in items)
            blocks.append(f'<{tag} style="margin:12px 0 18px;padding-left:1.5em;font-size:16px;line-height:1.8;color:{t["ink"]};">{item_html}</{tag}>')
            continue

        paragraph.append(line)
        i += 1

    flush_paragraph()
    article = (
        f'<section data-wechat-article="true" style="box-sizing:border-box;max-width:677px;margin:0 auto;padding:32px 24px;background:#ffffff;'
        f'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,Microsoft YaHei,Arial,sans-serif;color:{t["ink"]};">'
        + "".join(blocks)
        + "</section>"
    )
    return article, len(blocks)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="UTF-8 Markdown input")
    parser.add_argument("--output", required=True, help="output index.html")
    parser.add_argument("--style", choices=["auto", *STYLE_TOKENS], default="auto")
    parser.add_argument("--frontmatter", choices=["auto", "keep", "strip"], default="auto")
    parser.add_argument("--title", help="override preview title")
    args = parser.parse_args()

    input_path = Path(args.input).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()
    if not input_path.is_file():
        fail(f"input file not found: {input_path}")
    try:
        source = input_path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        fail(f"cannot read input: {exc}", 1)
    if not source.strip():
        fail("input article is empty")

    body_source, frontmatter, frontmatter_removed = split_frontmatter(source, args.frontmatter)
    if not body_source.strip():
        fail("article body is empty after frontmatter")
    style = pick_style(args.style, body_source)
    title = args.title or frontmatter.get("title") or extract_title(body_source, input_path.stem)
    try:
        article_html, block_count = render_markdown(body_source, style)
    except ValueError as exc:
        fail(str(exc))

    template_path = Path(__file__).resolve().parent.parent / "assets" / "static-preview-template.html"
    if not template_path.is_file():
        fail(f"template not found: {template_path}", 1)
    try:
        template = template_path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        fail(f"cannot read template: {exc}", 1)
    page = template.replace("{{TITLE}}", html.escape(title)).replace("{{ARTICLE_HTML}}", article_html)
    if "{{TITLE}}" in page or "{{ARTICLE_HTML}}" in page:
        fail("template placeholders were not fully replaced", 1)

    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(page, encoding="utf-8")
    except OSError as exc:
        fail(f"cannot write output: {exc}", 1)
    metadata = {
        "status": "success",
        "output": str(output_path),
        "title": title,
        "style": style,
        "source_bytes": len(source.encode("utf-8")),
        "frontmatter_removed": frontmatter_removed,
        "block_count": block_count,
        "article_sha256": hashlib.sha256(article_html.encode("utf-8")).hexdigest(),
    }
    print(json.dumps(metadata, ensure_ascii=False))


if __name__ == "__main__":
    main()
