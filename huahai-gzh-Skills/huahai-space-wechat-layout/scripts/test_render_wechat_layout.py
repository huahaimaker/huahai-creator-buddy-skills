#!/usr/bin/env python3
"""Deterministic smoke tests for render_wechat_layout.py."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RENDERER = ROOT / "render_wechat_layout.py"


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, str(RENDERER), *args], text=True, capture_output=True, check=False)


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        source = work / "article.md"
        output = work / "index.html"
        source.write_text(
            "---\ntitle: 可验证教程\nprivate: metadata-not-body\n---\n\n# 可验证教程\n\n这是 **第一段事实**。\n\n## 步骤\n\n1. 保留原文\n2. 生成预览\n\n| 字段 | 状态 |\n| --- | --- |\n| 数据 | 已核验 |\n\n```bash\necho ok\n```\n",
            encoding="utf-8",
        )
        result = run("--input", str(source), "--output", str(output), "--style", "auto")
        assert result.returncode == 0, result.stderr or result.stdout
        payload = json.loads(result.stdout)
        page = output.read_text(encoding="utf-8")
        assert payload["status"] == "success"
        assert payload["style"] == "openai"
        assert payload["frontmatter_removed"] is True
        assert payload["block_count"] >= 5
        assert "第一段事实" in page and "已核验" in page and "echo ok" in page
        assert "data-wechat-article" in page and "复制 HTML" in page
        assert "{{TITLE}}" not in page and "{{ARTICLE_HTML}}" not in page
        assert "metadata-not-body" not in page
        assert "<script>" not in page.split('data-wechat-article="true"', 1)[1].split("</section>", 1)[0]

        chinese = work / "chinese.md"
        chinese.write_text("# 技术教程\n\n这是一篇纯中文开发教程。\n", encoding="utf-8")
        chinese_result = run("--input", str(chinese), "--output", str(work / "chinese.html"), "--style", "auto")
        assert chinese_result.returncode == 0
        assert json.loads(chinese_result.stdout)["style"] == "openai"

        ordinary = work / "ordinary.md"
        ordinary.write_text("---\n这不是 YAML，而是正文。\n---\n\n后续正文不能丢。\n", encoding="utf-8")
        ordinary_output = work / "ordinary.html"
        ordinary_result = run("--input", str(ordinary), "--output", str(ordinary_output))
        assert ordinary_result.returncode == 0
        ordinary_payload = json.loads(ordinary_result.stdout)
        ordinary_page = ordinary_output.read_text(encoding="utf-8")
        assert ordinary_payload["frontmatter_removed"] is False
        assert "这不是 YAML" in ordinary_page and "后续正文不能丢" in ordinary_page

        ambiguous = work / "ambiguous.md"
        ambiguous.write_text("---\nTitle: this is body text\n---\n\n正文。\n", encoding="utf-8")
        ambiguous_output = work / "ambiguous.html"
        kept = run(
            "--input", str(ambiguous),
            "--output", str(ambiguous_output),
            "--frontmatter", "keep",
        )
        assert kept.returncode == 0
        assert json.loads(kept.stdout)["frontmatter_removed"] is False
        assert "Title: this is body text" in ambiguous_output.read_text(encoding="utf-8")

        empty = work / "empty.md"
        empty.write_text("\n", encoding="utf-8")
        failed = run("--input", str(empty), "--output", str(work / "empty.html"))
        assert failed.returncode == 2
        assert json.loads(failed.stdout)["status"] == "error"

        blocker = work / "blocker"
        blocker.write_text("file", encoding="utf-8")
        unwritable = run("--input", str(source), "--output", str(blocker / "index.html"))
        assert unwritable.returncode == 1
        lines = [line for line in unwritable.stdout.splitlines() if line.strip()]
        assert len(lines) == 1 and json.loads(lines[0])["status"] == "error"

        invalid_utf8 = work / "invalid.md"
        invalid_utf8.write_bytes(b"\xff\xfe\x00")
        unreadable = run("--input", str(invalid_utf8), "--output", str(work / "invalid.html"))
        assert unreadable.returncode == 1
        assert json.loads(unreadable.stdout)["status"] == "error"

    print(json.dumps({"status": "success", "tests": 7}, ensure_ascii=False))


if __name__ == "__main__":
    main()
