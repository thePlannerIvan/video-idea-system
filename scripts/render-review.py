#!/usr/bin/env python3
"""Render offline review pages using the author's existing page styles."""
import argparse
import html
import json
import re
from pathlib import Path


def esc(value):
    return html.escape(str(value), quote=True)


def section(title, body):
    return '<section class="sec"><div class="wrap"><div class="slabel"><h2>' + esc(title) + '</h2></div>' + body + '</div></section>'


def required(obj, names, label):
    for name in names:
        if not isinstance(obj.get(name), str) or not obj[name].strip():
            raise ValueError(f'{label}.{name}: expected nonempty text')


def render(data, mode):
    required(data, ['title', 'core_version', 'audience', 'insight', 'shift', 'takeaway', 'status'], 'page')
    if mode == 'ideas':
        if data.get('core_confirmed') is not True:
            raise ValueError('Confirm the creative core before rendering a candidate pool')
        cards = data.get('cards', [])
        if not cards:
            raise ValueError('cards must not be empty')
        ids, parts = set(), []
        for c in cards:
            required(c, ['id', 'name', 'one', 'role', 'mechanism', 'materials', 'risk'], 'card')
            if c['id'] in ids:
                raise ValueError('Duplicate candidate id: ' + c['id'])
            ids.add(c['id'])
            if c['role'] not in ('结构', '零件'):
                raise ValueError('role must be 结构 or 零件')
            if not c.get('flow'):
                raise ValueError('Each candidate needs a concrete process')
            flow = ''
            for beat in c['flow']:
                required(beat, ['label', 'text'], 'flow')
                flow += f'<div class="fl"><div class="k">{esc(beat["label"])}</div><div class="v pre">{esc(beat["text"])}</div></div>'
            kind = 'is-struct' if c['role'] == '结构' else 'is-part'
            parts.append(f'''<article class="card {kind}"><div class="chips"><span class="chip">{esc(c['id'])}</span><span class="chip">{esc(c['role'])}</span></div>
<div class="cname">{esc(c['name'])}</div><p class="cone pre">{esc(c['one'])}</p><div class="rule"></div>
<p class="core pre">{esc(c['mechanism'])}</p><p class="lbl">过程</p>{flow}
<p class="lbl">材料与成立条件</p><p class="mat pre">{esc(c['materials'])}</p>
<p class="lbl">风险与取舍</p><p class="pre">{esc(c['risk'])}</p></article>''')
        content = section('候选 · 每批三个', '<div class="cards">' + ''.join(parts) + '</div><div class="nav"><button id="prev">上一批</button><span id="pg" aria-live="polite"></span><button id="next">下一批</button></div><p class="foot-note">可按编号保留、排除或提问；反馈请回到对话。</p>')
        # Raw pool stays optional and collapsed, so it does not precede the shortlist.
        if data.get('pool'):
            wall = ''.join('<div class="pre">' + esc(x) + '</div>' for x in data['pool'])
            content += section('发散记录', '<details><summary>展开后台点子摘要</summary><div class="wall">' + wall + '</div></details>')
        nav = '<a href="脚本.html">脚本 ↗</a>' if data.get('script_available') is True else ''
        filename, label = '创意展示.html', '创意候选 · 待讨论'
    else:
        rows = data.get('segments', [])
        if not rows:
            raise ValueError('segments must not be empty')
        result = []
        for row in rows:
            required(row, ['name', 'copy', 'visual', 'text'], 'segment')
            result.append('<tr>' + ''.join('<td class="pre">' + esc(x) + '</td>' for x in (row['name'], row.get('duration', '未估算'), row['copy'], row['visual'], row['text'])) + '</tr>')
        content = section('分段 · 文案 / 画面 / 花字', '<div class="table-scroll"><table><thead><tr><th>段落</th><th>时长（估算）</th><th>文案</th><th>画面</th><th>花字</th></tr></thead><tbody>' + ''.join(result) + '</tbody></table></div>')
        if data.get('questions'):
            content += section('待讨论 / 待补素材', '<ul class="hard">' + ''.join('<li class="pre">' + esc(q) + '</li>' for q in data['questions']) + '</ul>')
        nav = '<a href="创意展示.html">← 创意</a>' if data.get('ideas_available') is True else ''
        filename, label = '脚本.html', '段落脚本'
    values = {
        'TITLE': esc(data['title']), 'LABEL': label, 'NAV': nav,
        'META': esc(data['core_version'] + ' · ' + data['status']),
        'BRIEF': esc('\n'.join(['观众：' + data['audience'], '洞察：' + data['insight'], '期望变化：' + data['shift'], '留下的话：' + data['takeaway']])),
        'CONTENT': content, 'FOOTER': esc(data.get('notes', '')),
    }
    template = (Path(__file__).resolve().parents[1] / 'assets/web' / filename).read_text()
    return filename, re.sub(r'@@([A-Z]+)@@', lambda m: values[m[1]], template)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['ideas', 'script'])
    parser.add_argument('input', type=Path)
    parser.add_argument('--out-dir', required=True, type=Path)
    args = parser.parse_args()
    try:
        data = json.loads(args.input.read_text())
        filename, page = render(data, args.mode)
    except (ValueError, KeyError, TypeError) as exc:
        parser.exit(2, str(exc) + '\n')
    args.out_dir.mkdir(parents=True, exist_ok=True)
    output = args.out_dir / filename
    output.write_text(page)
    print(output.resolve())


if __name__ == '__main__':
    main()
