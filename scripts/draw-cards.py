#!/usr/bin/env python3
"""Read selected creative principles and their case appendix; rotate exploration.

Only `record` writes project state. Other commands are read-only. Historical
step2/step3/check calls are intentionally retired; index/plan/show/cases/record/stats
separate navigation, reading, case lookup, actual attempts, and author selections.
`cases` slices the compiled appendix so only the card in play enters context.
"""
from __future__ import annotations

import argparse
from collections import Counter
from contextlib import contextmanager
import json
import os
from pathlib import Path
import random
import re
import sys
import tempfile

DATA_PATH = Path(__file__).resolve().parents[1] / 'references' / 'cards.json'
APPENDIX_PATH = Path(__file__).resolve().parents[1] / 'references' / '案例附录.md'


def ids(value: str) -> list[int]:
    if not value.strip():
        return []
    result = []
    for token in value.replace('，', ',').split(','):
        token = token.strip().removeprefix('#')
        if not token.isdecimal() or not 1 <= int(token) <= 52:
            raise ValueError(f'无效卡号：{token!r}；使用 1–52，逗号分隔')
        n = int(token)
        if n not in result:
            result.append(n)
    return result


def load_cards() -> dict[int, dict]:
    data = json.loads(DATA_PATH.read_text(encoding='utf-8'))
    entries = data['cards']
    if len(entries) != 52 or {c['id'] for c in entries} != set(range(1, 53)):
        raise ValueError('卡库必须完整且唯一地包含 1–52')
    for c in entries:
        if not all(c.get(k) for k in ('name', 'question', 'principle', 'groups')):
            raise ValueError(f"卡片字段缺失：{c.get('id')}")
    return {c['id']: c for c in entries}


def load_appendix() -> dict[int, str]:
    """Return {card_id: markdown section} for the compiled case appendix."""
    if not APPENDIX_PATH.is_file():
        raise ValueError(f'案例附录不存在：{APPENDIX_PATH}；先运行 scripts/compile_case_appendix.py')
    text = APPENDIX_PATH.read_text(encoding='utf-8')
    marks = list(re.finditer(r'^## (\d{1,2}) (.+)$', text, re.M))
    sections: dict[int, str] = {}
    for i, mark in enumerate(marks):
        n = int(mark.group(1))
        if not 1 <= n <= 52 or n in sections:
            continue
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        sections[n] = text[mark.start():end].strip()
    if sorted(sections) != list(range(1, 53)):
        raise ValueError('案例附录的卡片节不完整；重新运行 scripts/compile_case_appendix.py')
    return sections


def load_history(path: Path | None) -> dict:
    if path is None or not path.exists():
        return {'schema_version': 1, 'runs': {}}
    data = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(data, dict) or data.get('schema_version') != 1 or not isinstance(data.get('runs'), dict):
        raise ValueError('方法记录格式不兼容；保留原文件，指定新的记录路径')
    for key, row in data['runs'].items():
        if not isinstance(row, dict):
            raise ValueError(f'轮次记录损坏：{key}')
        for field in ('cards', 'selected'):
            values = row.get(field)
            if (not isinstance(values, list) or any(type(n) is not int or not 1 <= n <= 52 for n in values)
                    or len(values) != len(set(values))):
                raise ValueError(f'轮次 {key} 的 {field} 无效')
        if not set(row['selected']) <= set(row['cards']):
            raise ValueError(f'轮次 {key} 的选定卡不在尝试卡内')
    return data


def counts(history: dict, field: str) -> Counter:
    return Counter(n for row in history['runs'].values() for n in row[field])


def plan(cards: dict[int, dict], history: dict, anchors: list[int], explore: int, seed: int) -> dict:
    if not 1 <= explore <= 52 - len(anchors):
        raise ValueError(f'探索数量须为 1–{52 - len(anchors)}，且不与相关卡重复')
    used = counts(history, 'cards')
    rng = random.Random(seed)
    groups = {g for n in anchors for g in cards[n]['groups']}
    pool = [n for n in sorted(cards) if n not in anchors]
    items = [{'id': n, 'role': '相关', 'reason': 'Agent 按当前问题显式选择', 'attempts': used[n]} for n in anchors]
    for _ in range(explore):
        least = min(used[n] for n in pool)
        candidates = [n for n in pool if used[n] == least]
        novelty = max(len(set(cards[n]['groups']) - groups) for n in candidates)
        candidates = [n for n in candidates if len(set(cards[n]['groups']) - groups) == novelty]
        n = rng.choice(candidates)
        items.append({'id': n, 'role': '探索', 'reason': f'当前可选卡中尝试次数最低（{least} 次）；同次数下补标签覆盖，再按 seed 取样', 'attempts': used[n]})
        groups.update(cards[n]['groups'])
        pool.remove(n)
    return {'seed': seed, 'unique_cards': len(items), 'coverage_tags': sorted(groups), 'items': items,
            'note': '仅提供导航，不代表已读原理或已发想；完成初稿后再按实际同质性选挑战卡。'}


def navigation(c: dict) -> str:
    return f"#{c['id']:02d} {c['name']} [{'+'.join(c['groups'])}] — {c['question']}"


@contextmanager
def history_lock(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    lock = path.with_name(path.name + '.lock')
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as exc:
        raise ValueError(f'记录正在写入：{lock}；稍后重试。若进程已退出，先核查再处理遗留锁') from exc
    try:
        os.close(fd)
        yield
    finally:
        lock.unlink()


def record(path: Path, run: str, attempted: list[int], selected: list[int] | None, artifact: Path) -> dict:
    if not run.strip() or not attempted:
        raise ValueError('轮次名称和实际尝试卡不能为空')
    if not artifact.is_file():
        raise ValueError(f'发散产物不存在：{artifact}')
    if path.resolve() == artifact.resolve():
        raise ValueError('方法记录不能覆盖发散产物')
    with history_lock(path):
        data = load_history(path)
        previous = data['runs'].get(run, {})
        # Omission preserves an existing author choice on idempotent re-records.
        selected = previous.get('selected', []) if selected is None else selected
        if not set(selected) <= set(attempted):
            raise ValueError('选定卡必须包含在本轮实际尝试卡内；修改尝试卡时须明确更新选定卡')
        row = {'cards': attempted, 'selected': selected, 'artifact': str(artifact.resolve())}
        data['runs'][run] = row
        tmp = None
        try:
            with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as f:
                tmp = Path(f.name)
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write('\n')
            os.replace(tmp, path)
        finally:
            if tmp is not None and tmp.exists():
                tmp.unlink()
    return row


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('index', help='全体 52 方法的短导航，不加载完整原理')
    show = sub.add_parser('show', help='只输出所选卡的完整原理')
    show.add_argument('cards')
    cs = sub.add_parser('cases', help='只输出所选卡的案例附录一段（原版说明、官方案例、现代案例）')
    cs.add_argument('cards')
    p = sub.add_parser('plan', help='相关卡 + 最少尝试的探索卡；只读记录')
    p.add_argument('--anchor', default='')
    p.add_argument('--explore', type=int, default=4)
    p.add_argument('--seed', type=int, required=True)
    p.add_argument('--history', type=Path)
    p.add_argument('--json', action='store_true')
    r = sub.add_parser('record', help='发散完成后记录实际尝试；同轮替换，不重复累计')
    r.add_argument('--history', type=Path, required=True)
    r.add_argument('--run', required=True)
    r.add_argument('--cards', required=True)
    r.add_argument('--selected', default=None, help='仅填写作者已选概念的卡；空字符串明确清空')
    r.add_argument('--artifact', type=Path, required=True)
    st = sub.add_parser('stats', help='分别显示尝试覆盖与作者选定次数')
    st.add_argument('--history', type=Path, required=True)
    st.add_argument('--json', action='store_true')
    args = parser.parse_args(argv)
    try:
        cards = load_cards()
        if args.command == 'index':
            print('52 方法导航；标签为项目自建交叉分类，不代表可用性或机制互斥。')
            for c in cards.values():
                print(navigation(c))
        elif args.command == 'show':
            selected = ids(args.cards)
            if not selected:
                raise ValueError('至少指定一张卡')
            print('原理来自本地中文二手整理稿；是创意启发，不是效果定律。导航问题为 Skill 改编。\n')
            for n in selected:
                print(navigation(cards[n]))
                print('原理：' + cards[n]['principle'] + '\n')
        elif args.command == 'cases':
            selected = ids(args.cards)
            if not selected:
                raise ValueError('至少指定一张卡')
            sections = load_appendix()
            print('案例附录：逐字取自本地案例库，是理解机制的参考，不是效果证据、不是逐字核验的官方标准。')
            print('链接可用性与品牌归因未逐条复验。需要更多现代案例时再按需查外置案例库。\n')
            for n in selected:
                print(sections[n] + '\n')
        elif args.command == 'plan':
            result = plan(cards, load_history(args.history), ids(args.anchor), args.explore, args.seed)
            if args.json:
                print(json.dumps(result, ensure_ascii=False, indent=2))
            else:
                print(f"seed={args.seed}；{result['unique_cards']} 张独立卡；标签覆盖 {''.join(result['coverage_tags'])}")
                for item in result['items']:
                    print(f"[{item['role']}] {navigation(cards[item['id']])}\n  理由：{item['reason']}")
                print(result['note'])
                print('实际原理读取：show ' + ','.join(str(i['id']) for i in result['items']))
        elif args.command == 'record':
            row = record(args.history, args.run, ids(args.cards), None if args.selected is None else ids(args.selected), args.artifact)
            print(f"已记录 {args.run}：实际尝试 {len(row['cards'])} 张，作者选定 {len(row['selected'])} 张。语义真实性仍需对照产物。")
        elif args.command == 'stats':
            history = load_history(args.history)
            attempted, chosen = counts(history, 'cards'), counts(history, 'selected')
            result = {'runs': len(history['runs']), 'attempted_unique': len(attempted), 'total_cards': 52,
                      'untried': [n for n in cards if not attempted[n]],
                      'attempts': dict(sorted(attempted.items())), 'author_selected': dict(sorted(chosen.items())),
                      'note': '记录只覆盖当前 history 文件；卡片尝试和选定分布不能证明创意质量。'}
            if args.json:
                print(json.dumps(result, ensure_ascii=False, indent=2))
            else:
                print(f"{result['runs']} 轮；尝试覆盖 {result['attempted_unique']}/52")
                print('尚未尝试：' + ','.join(map(str, result['untried'])))
                print('次数：卡号 / 尝试 / 作者选定')
                for n in sorted(attempted, key=lambda n: (-attempted[n], n)):
                    print(f"#{n:02d} {cards[n]['name']} / {attempted[n]} / {chosen[n]}")
                print(result['note'])
        return 0
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f'错误：{exc}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
