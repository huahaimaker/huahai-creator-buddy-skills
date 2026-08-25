#!/usr/bin/env python3
"""Validate repository structure and deterministic runtime contracts."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
EXPECTED_SKILLS = 14
DELETED_OR_STALE = (
    "xhs-ops-copilot",
    "xhs-content-research",
    "xiaohongshu-content-tools",
    "huahai-cat-illustrations",
    "~/.claude",
)


def run(command: list[str]) -> tuple[bool, str]:
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
    output = (result.stdout + result.stderr).strip()
    return result.returncode == 0, output[-1200:]


def main() -> None:
    failures: list[str] = []
    checks = 0
    skill_files = sorted(path for path in ROOT.rglob("SKILL.md") if ".git" not in path.parts)
    if len(skill_files) != EXPECTED_SKILLS:
        failures.append(f"expected {EXPECTED_SKILLS} SKILL.md files, found {len(skill_files)}")

    names: set[str] = set()
    for skill_file in skill_files:
        checks += 1
        text = skill_file.read_text(encoding="utf-8")
        lines = text.splitlines()
        if not lines or lines[0].strip() != "---":
            failures.append(f"{skill_file.relative_to(ROOT)}: missing frontmatter start")
            continue
        try:
            end = next(index for index in range(1, len(lines)) if lines[index].strip() == "---")
        except StopIteration:
            failures.append(f"{skill_file.relative_to(ROOT)}: missing frontmatter end")
            continue
        frontmatter = lines[1:end]
        name_line = next((line for line in frontmatter if line.startswith("name:")), "")
        description_line = next((line for line in frontmatter if line.startswith("description:")), "")
        name = name_line.partition(":")[2].strip()
        if not name.startswith("huahai-"):
            failures.append(f"{skill_file.relative_to(ROOT)}: name must start with huahai-")
        if name in names:
            failures.append(f"duplicate skill name: {name}")
        names.add(name)
        if not description_line.partition(":")[2].strip():
            failures.append(f"{skill_file.relative_to(ROOT)}: empty description")

        prompt_path = skill_file.parent / "test-prompts.json"
        checks += 1
        if not prompt_path.is_file():
            failures.append(f"{prompt_path.relative_to(ROOT)}: missing")
        else:
            try:
                prompts = json.loads(prompt_path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                failures.append(f"{prompt_path.relative_to(ROOT)}: {exc}")
                prompts = []
            if not isinstance(prompts, list) or len(prompts) < 2:
                failures.append(f"{prompt_path.relative_to(ROOT)}: expected at least 2 cases")
            ids: set[str] = set()
            for item in prompts if isinstance(prompts, list) else []:
                if not isinstance(item, dict) or not all(str(item.get(key, "")).strip() for key in ("id", "prompt", "expected")):
                    failures.append(f"{prompt_path.relative_to(ROOT)}: malformed case")
                    continue
                if item["id"] in ids:
                    failures.append(f"{prompt_path.relative_to(ROOT)}: duplicate id {item['id']}")
                ids.add(item["id"])

    for path in sorted(ROOT.rglob("*.json")):
        if ".git" in path.parts:
            continue
        checks += 1
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            failures.append(f"{path.relative_to(ROOT)}: invalid JSON: {exc}")

    for path in sorted(ROOT.rglob("*.py")):
        if ".git" in path.parts:
            continue
        checks += 1
        try:
            compile(path.read_text(encoding="utf-8"), str(path), "exec")
        except SyntaxError as exc:
            failures.append(f"{path.relative_to(ROOT)}: Python syntax: {exc}")

    node = shutil.which("node")
    js_files = sorted(path for path in ROOT.rglob("*.js") if ".git" not in path.parts)
    if js_files and not node:
        failures.append("node is required to validate JavaScript files")
    elif node:
        for path in js_files:
            checks += 1
            ok, output = run([node, "--check", str(path)])
            if not ok:
                failures.append(f"{path.relative_to(ROOT)}: node --check failed: {output}")

    root_skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")
    route_paths = []
    in_routes = False
    for line in root_skill.splitlines():
        if line.strip() == "routes:":
            in_routes = True
            continue
        if in_routes and line.startswith("    - "):
            route_paths.append(line.split("- ", 1)[1].strip())
        elif in_routes and line and not line.startswith(" "):
            in_routes = False
    checks += 1
    if len(route_paths) != EXPECTED_SKILLS - 1:
        failures.append(f"root routes: expected {EXPECTED_SKILLS - 1}, found {len(route_paths)}")
    for route in route_paths:
        if not (ROOT / route / "SKILL.md").is_file():
            failures.append(f"root route missing: {route}")

    for skill_file in skill_files:
        text = skill_file.read_text(encoding="utf-8")
        for stale in DELETED_OR_STALE:
            if stale in text:
                failures.append(f"{skill_file.relative_to(ROOT)}: stale reference {stale}")
    checks += len(skill_files) * len(DELETED_OR_STALE)

    for stale_dir in ("gzh-Skills", "xhs-Skills", "video-Skills", "huahai-Skills"):
        checks += 1
        if (ROOT / stale_dir).exists():
            failures.append(f"stale top-level directory exists: {stale_dir}")

    runtime_tests = [
        ["node", "huahai-gzh-Skills/huahai-global-content-search/scripts/test_cli_contract.js"],
        [sys.executable, "huahai-gzh-Skills/huahai-space-wechat-layout/scripts/test_render_wechat_layout.py"],
    ]
    for command in runtime_tests:
        checks += 1
        ok, output = run(command)
        if not ok:
            failures.append(f"runtime test failed: {' '.join(command)}: {output}")

    payload = {
        "status": "success" if not failures else "error",
        "skills": len(skill_files),
        "skill_names": sorted(names),
        "test_prompt_files": len([path for path in ROOT.rglob("test-prompts.json") if ".git" not in path.parts]),
        "python_files": len([path for path in ROOT.rglob("*.py") if ".git" not in path.parts]),
        "javascript_files": len(js_files),
        "checks": checks,
        "failures": failures,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    raise SystemExit(0 if not failures else 1)


if __name__ == "__main__":
    main()
