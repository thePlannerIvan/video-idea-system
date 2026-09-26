#!/usr/bin/env python3
"""Compile the per-card case appendix from the workspace case libraries.

Reads the original case library (English tool descriptions + official case
videos) and the structured modern-case data, then writes
`references/案例附录.md` with one section per card. The appendix is meant to be
sliced, not read whole: `draw-cards.py cases <N>` prints a single card's part.

Only high-confidence modern mappings are kept, and mappings derived from film /
trailer synopses are dropped: they are not advertising cases.

Refresh after the source libraries change; the appendix records source hashes.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parents[1]

# The case libraries live outside this Skill, in the workspace's 07-SkillLab tree.
# Nothing here hardcodes a machine path: the default is derived from where this
# Skill itself sits (…/<workspace>/02-skills-library/<category>/video-idea-system),
# and `VIDEO_IDEA_CASE_LIBRARY_DIR` (or the --original / --cases flags) override it.
CASE_LIBRARY_DIR = Path(
    os.environ.get("VIDEO_IDEA_CASE_LIBRARY_DIR")
    or (SKILL_DIR.parents[2] / "07-SkillLab" / "创意方法" / "Methods")
).expanduser()
DEFAULT_ORIGINAL = CASE_LIBRARY_DIR / "02-原版案例库-758个官方案例.md"
DEFAULT_CASES = CASE_LIBRARY_DIR / "05-案例库数据.json"
DEFAULT_OUT = SKILL_DIR / "references" / "案例附录.md"

# Mapping sources that describe films or trailers, not advertising work.
EXCLUDED_SOURCE_MARKER = "预告片"
KEEP_CONFIDENCE = {"h"}
# Mapping source used when a case also appears in the official case library.
OVERLAP_SOURCE = "官方案例重合"


def parse_original(text: str) -> dict[int, dict]:
    """Split the original library into {card_id: {name, principle, cases}}."""
    heading = re.compile(r"^\s*###\s+(\d{1,2})\.\s*(.+?)\s*[|｜]\s*(.+?)\s*$", re.M)
    marks = list(heading.finditer(text))
    if len(marks) != 52 or [int(m.group(1)) for m in marks] != list(range(1, 53)):
        raise ValueError(f"原版案例库结构异常：解析到 {len(marks)} 段，卡号不连续")

    out: dict[int, dict] = {}
    for i, mark in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        body = text[mark.end():end]
        principle = re.search(r"\*\*原版说明：\*\*(.*?)(?=\*\*官方案例：\*\*|\Z)", body, re.S)
        cases = re.search(r"\*\*官方案例：\*\*(.*)", body, re.S)
        if not principle or not cases:
            raise ValueError(f"第 {mark.group(1)} 卡缺少原版说明或官方案例段")
        lines = [ln.rstrip() for ln in cases.group(1).splitlines() if ln.strip().startswith("- ")]
        if not lines:
            raise ValueError(f"第 {mark.group(1)} 卡没有解析到任何官方案例")
        out[int(mark.group(1))] = {
            "name": mark.group(2).strip(),
            "name_en": mark.group(3).strip(),
            "principle": principle.group(1).strip(),
            "cases": lines,
        }
    return out


def load_modern(path: Path, include_official_overlap: bool = False) -> dict[int, list[dict]]:
    """Return {card_id: [case, ...]} after dedupe and confidence filtering."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    unique: dict[tuple, dict] = {}
    for row in raw:
        key = (row.get("brand"), row.get("campaign"), row.get("year"))
        current = unique.get(key)
        if current is None or (row.get("tool_conf") == "h" and current.get("tool_conf") != "h"):
            unique[key] = row
    kept = [r for r in unique.values()
            if r.get("tool_conf") in KEEP_CONFIDENCE
            and EXCLUDED_SOURCE_MARKER not in (r.get("tool_src") or "")]
    if not include_official_overlap:
        # Drop entries already printed in the official list above.
        kept = [r for r in kept if r.get("tool_src") != OVERLAP_SOURCE]
    out: dict[int, list[dict]] = {n: [] for n in range(1, 53)}
    for row in kept:
        tool = row.get("tool")
        if isinstance(tool, int) and 1 <= tool <= 52:
            out[tool].append(row)
    for rows in out.values():
        rows.sort(key=lambda r: (-int(r.get("year") or 0), (r.get("brand") or "").lower()))
    return out


def case_line(row: dict) -> str:
    brand = row.get("brand") or "?"
    campaign = row.get("campaign") or "?"
    year = row.get("year") or "?"
    link = row.get("link") or ""
    head = f"- **{brand}**: {campaign} ({year})"
    return f"{head} · [案例页]({link})" if link else head


def build(original: Path, cases: Path, out: Path, include_official_overlap: bool = False) -> dict:
    if not original.is_file():
        raise FileNotFoundError(
            f"找不到原版案例库：{original}\n"
            "  修法（任选其一）：\n"
            "    VIDEO_IDEA_CASE_LIBRARY_DIR=<案例库所在目录> python3 scripts/compile_case_appendix.py\n"
            "    python3 scripts/compile_case_appendix.py --original <02-原版案例库-758个官方案例.md 的路径>")
    if not cases.is_file():
        raise FileNotFoundError(
            f"找不到案例库数据：{cases}\n"
            "  修法（任选其一）：\n"
            "    VIDEO_IDEA_CASE_LIBRARY_DIR=<案例库所在目录> python3 scripts/compile_case_appendix.py\n"
            "    python3 scripts/compile_case_appendix.py --cases <05-案例库数据.json 的路径>")

    cards = parse_original(original.read_text(encoding="utf-8"))
    modern = load_modern(cases, include_official_overlap)
    empty = [n for n in range(1, 53) if not modern[n]]

    cards_json = json.loads((SKILL_DIR / "references" / "cards.json").read_text(encoding="utf-8"))
    names = {c["id"]: c["name"] for c in cards_json["cards"]}

    parts: list[str] = []
    parts.append("# 案例附录 · 按卡切片\n")
    parts.append(
        "不要整篇读入上下文。用 `python3 scripts/draw-cards.py cases 卡号` 只取需要的那一张卡。\n"
    )
    parts.append(
        "来源：工作区 `07-SkillLab/创意方法/Methods/` 的 02 号原版案例库与 05 号案例库数据；"
        f"编译于 {dt.date.today().isoformat()}，重跑 `scripts/compile_case_appendix.py` 刷新。"
        "本地二手整理稿，非逐字核验的官方标准，链接未逐条复验。\n"
    )
    toc = "\n".join(f"- {n:02d} {names[n]}" for n in range(1, 53))
    parts.append(f"\n## 目录\n\n{toc}\n\n---\n")

    for n in range(1, 53):
        c = cards[n]
        parts.append(f"\n## {n:02d} {names[n]}\n")
        parts.append(f"*{c['name_en']}*\n")
        parts.append("### 原版说明\n")
        parts.append(c["principle"] + "\n")
        parts.append(f"### 官方案例（{len(c['cases'])}）\n")
        parts.extend(ln + "\n" for ln in c["cases"])
        if modern[n]:
            parts.append(f"\n### 补充案例（{len(modern[n])}）\n")
            parts.extend(case_line(r) + "\n" for r in modern[n])
        parts.append("\n---\n")

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("".join(parts), encoding="utf-8")

    per = sorted(len(modern[n]) for n in range(1, 53))
    return {
        "out": out,
        "official_total": sum(len(c["cases"]) for c in cards.values()),
        "modern_total": sum(len(modern[n]) for n in range(1, 53)),
        "modern_min": per[0],
        "modern_median": per[26],
        "modern_max": per[-1],
        "empty_cards": empty,
        "bytes": out.stat().st_size,
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--original", type=Path, default=DEFAULT_ORIGINAL)
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--include-official-overlap", action="store_true",
                        help="同时列出与官方案例库重合的高置信度条目（默认剔除，避免重复）")
    args = parser.parse_args(argv)
    try:
        info = build(args.original, args.cases, args.out, args.include_official_overlap)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"错误：{exc}")
        return 2
    print(f"已生成 {info['out']}")
    print(f"  官方案例 {info['official_total']} 条；补充案例 {info['modern_total']} 条"
          f"（每卡 min/中位/max = {info['modern_min']}/{info['modern_median']}/{info['modern_max']}）")
    print(f"  文件大小 {info['bytes']} 字节；无现代案例的卡：{info['empty_cards'] or '无'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
