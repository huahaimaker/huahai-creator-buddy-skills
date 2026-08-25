#!/usr/bin/env python3
"""Deterministic contract tests for fetch_xhs_hot_articles.py."""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SCRIPT = ROOT / "fetch_xhs_hot_articles.py"
SPEC = importlib.util.spec_from_file_location("xhs_hotspot", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def fixture() -> dict:
    return {
        "keyword": "AI",
        "total": 1,
        "returnedCount": 1,
        "articles": [{
            "id": "note1",
            "title": "<b>真实标题</b>",
            "authorId": "author1",
            "authorNickname": "<script>alert(1)</script>",
            "shareInfoLink": "https://www.xiaohongshu.com/explore/note1?xsec_token=token123",
            "interactiveCount": "1w+",
            "likedCount": 12,
        }],
    }


def main() -> None:
    assert MODULE.valid_note_link({"shareInfoLink": "https://www.xiaohongshu.com/explore/a?xsec_token=t"})
    assert MODULE.valid_note_link({"shareInfoLink": "https://sub.xhslink.com/a"})
    assert not MODULE.valid_note_link({"shareInfoLink": "https://evilxiaohongshu.com/a?xsec_token=t"})
    assert not MODULE.valid_note_link({"shareInfoLink": "https://xhslink.com.evil.example/a"})
    assert not MODULE.valid_note_link({"shareInfoLink": "https://www.xiaohongshu.com/a?xsec_token="})

    accepted = {12: 12, 12.0: 12, "12": 12, "1,200": 1200}
    for raw, expected in accepted.items():
        assert MODULE.exact_count(raw) == expected
    for raw in (-1, -1.0, 1.5, "1.5", "1w+", "1万", True, float("inf")):
        assert MODULE.exact_count(raw) is None

    payload = MODULE.format_as_json(fixture())
    item = payload["items"][0]
    assert item["interactiveCount"] is None and item["metricsRaw"]["interactiveCount"] == "1w+"
    assert item["totalScore"] is None and item["relevanceScore"] is None
    rendered_html = MODULE.format_as_html(fixture())
    assert "<script>alert(1)</script>" not in rendered_html
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in rendered_html

    with tempfile.TemporaryDirectory() as tmp:
        MODULE.fetch_xhs_hot_notes = lambda **_: fixture()
        old_argv = sys.argv
        stdout, stderr = io.StringIO(), io.StringIO()
        try:
            sys.argv = [str(SCRIPT), "--keyword", "AI", "--output-file", tmp]
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                try:
                    MODULE.main()
                except SystemExit as exc:
                    assert exc.code == 1
        finally:
            sys.argv = old_argv
        lines = [line for line in stdout.getvalue().splitlines() if line.strip()]
        assert len(lines) == 1
        assert json.loads(lines[0])["status"] == "error"

    print(json.dumps({"status": "success", "tests": 5}, ensure_ascii=False))


if __name__ == "__main__":
    main()
