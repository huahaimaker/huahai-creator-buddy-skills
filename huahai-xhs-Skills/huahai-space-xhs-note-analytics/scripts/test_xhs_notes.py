#!/usr/bin/env python3
"""Deterministic contract tests for xhs_notes.py."""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parent
SCRIPT = ROOT / "xhs_notes.py"
SPEC = importlib.util.spec_from_file_location("xhs_notes", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def main() -> None:
    mapping, unknown = MODULE.map_columns(["标题", "阅读量", "点赞率", "like_percentage"])
    assert mapping["title"] == "标题" and mapping["read"] == "阅读量"
    assert "like" not in mapping and "点赞率" in unknown and "like_percentage" in unknown

    mixed = pd.Series(["0.05", "5", "6%"])
    normalized, conflict = MODULE.normalize_rate(mixed)
    assert conflict is True and normalized.isna().all()

    consistent = pd.Series(["5", "6", "7%"])
    normalized, conflict = MODULE.normalize_rate(consistent)
    assert conflict is False and normalized.round(4).tolist() == [0.05, 0.06, 0.07]

    zero_percent = pd.Series([0, 5, 6])
    normalized, conflict = MODULE.normalize_rate(zero_percent)
    assert conflict is False and normalized.round(4).tolist() == [0.0, 0.05, 0.06]

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        fixture = work / "notes.csv"
        pd.DataFrame({
            "标题": ["A", "B", "C", "D"],
            "曝光量": [1000, 100, 1000, 1000],
            "阅读量": [100, 120, 100, 100],
            "点击率": ["10%", "20%", "0.05", "5"],
            "点赞数": [10, 5, -1, 8],
            "收藏数": [4, 3, 2, 1],
            "统计周期": ["7天", "7天", "30天", "7天"],
            "类型": ["教程", "教程", "测评", "测评"],
        }).to_csv(fixture, index=False)
        _, loaded, _, _ = MODULE.load(fixture)
        enriched = MODULE.add_rates(loaded)
        assert enriched["ctr_unit_conflict"].all()
        assert enriched["ctr"].isna().all()
        assert pd.isna(enriched.loc[2, "like"])
        assert enriched["mixed_time_window"].all()
        report = MODULE.quality_report(enriched)
        assert "比率单位冲突" in report and "阅读>曝光" in report and "混合时间口径" in report

        result = subprocess.run(
            [sys.executable, str(SCRIPT), "group", str(fixture), "--by", "类型", "--metric", "like_rate"],
            text=True,
            capture_output=True,
            check=False,
        )
        assert result.returncode == 0, result.stderr
        assert "有效样本不足 3" in result.stdout and "(n=" in result.stdout

    print(json.dumps({"status": "success", "tests": 6}, ensure_ascii=False))


if __name__ == "__main__":
    main()
