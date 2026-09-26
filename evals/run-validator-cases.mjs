#!/usr/bin/env node
// Regression test for the rulings that this Skill now enforces.
//
//   node evals/run-validator-cases.mjs
//
// Part 1 runs scripts/validate-visual-plan.mjs against every fixture in evals/cases/
// and asserts the exit code and one required substring of the JSON output.
// Part 2 asserts the rulings are stated in the documents that are the implementation,
// and that the contract document is not a second home for craft's grouping vocabulary.
// Part 3 asserts the flow itself is visible: every stage declares its completion
// criteria, skipped steps leave a trace, and the handoff checks named artifacts.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evalsDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.dirname(evalsDir);
const validator = path.join(skillDir, 'scripts', 'validate-visual-plan.mjs');
const casesDir = path.join(evalsDir, 'cases');

const CASES = [
  ['ok-text-free-picture-only.json', 0, 'nothing the review page can show', false],
  ['ok-omitted-captions-key.json', 0, 'captions must be an array of strings', false],
  ['ok-caption-only-text-screen.json', 0, 'assets must be an array', false],
  ['bad-two-screens-one-beat.json', 3, 'beat_id may have only one screen', true],
  ['bad-empty-screen.json', 3, 'declares nothing the review page can show', true],
  ['bad-material-free-sample.json', 3, 'declares no assets', true],
  ['bad-craft-owned-field.json', 3, "belongs to craft's grouping", true],
  ['bad-states-field.json', 3, "belongs to craft's grouping", true],
];

let failures = 0;
const check = (ok, label, detail = '') => {
  if (ok) { console.log(`  ok    ${label}`); return; }
  failures += 1;
  console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
};

console.log('Part 1 · validator fixtures');
for (const [name, expectedExit, needle, shouldContain] of CASES) {
  const file = path.join(casesDir, name);
  let stdout = '';
  let exit = 0;
  try {
    stdout = execFileSync(process.execPath, [validator, file], { encoding: 'utf8' });
  } catch (error) {
    stdout = String(error.stdout || '');
    exit = error.status;
  }
  const contains = stdout.includes(needle);
  check(exit === expectedExit, `${name} exits ${expectedExit}`, `got ${exit}`);
  check(contains === shouldContain,
    `${name} output ${shouldContain ? 'mentions' : 'does not mention'} ${JSON.stringify(needle)}`,
    stdout.replace(/\s+/g, ' ').slice(0, 160));
}

console.log('Part 2 · the rulings are stated where they are implemented');
const read = (relative) => fs.readFileSync(path.join(skillDir, relative), 'utf8');
const contract = read('references/visual-plan-contract.md');
const explanation = read('references/visual-explanation.md');
const stage04b = read('stages/04b-screen-content-and-sample.md');
const stage05 = read('stages/05-read-aloud-review-and-handoff.md');
const skill = read('SKILL.md');
const validatorSource = read('scripts/validate-visual-plan.mjs');
const reviewServer = read('scripts/start-read-aloud-review.mjs');

// Step 5 · the contract document must not re-declare craft's grouping vocabulary.
for (const name of ['screenIntent', 'visualModel', 'modelStructure', 'onScreenTextRule', 'visual_model', 'model_structure']) {
  check(!contract.includes(name) && !explanation.includes(name),
    `contract documents do not carry craft's name ${name}`);
}
check(validatorSource.includes("'screenIntent'") && validatorSource.includes("'states'"),
  'the validator still enforces craft-owned names');
check(/names owned by craft's grouping/.test(validatorSource),
  'the enforcement list is commented as craft-owned');

// Step 6 · text-free screens legal, page still showable.
check(contract.includes('允许空数组'), 'contract allows an empty must_show');
check(/一张图也是素材/.test(contract), 'contract says a picture-only screen still declares material');
check(stage04b.includes('没有任何上屏文字的屏是合法的'), 'stage 4B states text-free screens are legal');
check(!/must_show must be non-empty/.test(validatorSource), 'validator no longer demands a non-empty must_show');
check(/sample\.captions != null/.test(validatorSource), 'captions are only validated when present');
check(!/if \(!screen \|\| !screen\.sample\) return null;/.test(reviewServer),
  'the review server keeps screens that carry no sample');

// Step 4 · the four owner rulings.
check(/样张只用真素材/.test(contract) && /概念样张也不算样张/.test(contract),
  'sample policy is real material only');
check(/一屏不得声明多个状态/.test(contract) && /着重动画在录后按实测音频加/.test(contract),
  'one Beat = one screen; emphasis animation is not a contract state');
check(/消费者：\*\*Video Craft\*\*/.test(contract),
  'the surviving contract names Video Craft as the consumer');
check(/自然改口是声音依据/.test(read('references/spoken-writing.md'))
  && !/保留语气并修复逻辑/.test(read('references/spoken-writing.md')),
  'spoken-writing.md:64 keeps the wording that flags doubt instead of repairing logic');

// Step 7 · one confirmation surface for both shapes, carrying the picture design.
check(/唯一的确认面/.test(skill) && /唯一的确认面/.test(stage05) && /两种形状都要过/.test(contract),
  'documents state one confirmation surface for both shapes');
check(/放哪张图/.test(stage05) && /什么样的模型/.test(stage05) && /模型上有什么字/.test(stage05),
  'the review page is where the picture design is settled');
check(/这是整部片唯一的确认面/.test(read('assets/read-aloud-review.html')),
  'the page itself says it is the single confirmation surface');

// Step 8 · routing is two axes, not a content type.
check(!/expected_route/.test(read('evals/evals.json')), 'eval cases carry no content-type route');
check(/不是路由维度/.test(skill) && /不是路由维度/.test(read('stages/03-spoken-storyline.md')),
  'simple/knowledge/mixed is no longer a routing dimension');
check(/片级形状/.test(skill) && /当前交付目标/.test(read('references/交给Craft.md')),
  'the film-level shape and where it is recorded are stated');

// Step 9 · the handoff points at the picture-making step, not the animation layer.
const handoff = read('references/downstream-handoff.md');
check(/做画面那一步/.test(handoff) && /录制之前/.test(handoff), 'handoff points at the picture-making step, before recording');
check(!/hyperframes/.test(handoff) || /不是 `hyperframes`/.test(handoff), 'handoff no longer sends the pictures to hyperframes/frontend-design');

// Step 10 · on-screen text and 花字 are declared here.
check(/花字/.test(contract) && /唯一/.test(contract) && /on_screen_text\.json/.test(contract),
  'contract states the 花字 / on-screen-text declaration is the one downstream checks');

// Part 3 · the whole flow is visible, and a skipped step cannot pass silently.
console.log('Part 3 · the flow is visible and skipped steps leave a trace');
const reviewPage = read('assets/read-aloud-review.html');
const handoffDoc = read('references/downstream-handoff.md');

// The skill opens with the whole flow, one line per step, each with a done marker.
check(/### 整条流程/.test(skill) && /做完的标志/.test(skill),
  'SKILL.md opens with the whole flow and a done marker per step');
check(/52 方法/.test(skill) && /发散与自筛/.test(skill) && /_idea\/method-history\.json/.test(skill),
  'the 52-method divergence engine is a first-class step with its artifacts named');
check(/跳过 <步骤名>/.test(skill), 'SKILL.md states the skip-log rule');
check(/check-handoff-artifacts\.mjs/.test(skill) && /check-handoff-artifacts\.mjs/.test(stage05),
  'SKILL.md and stage 5 both run the handoff artifact check');

// Every stage document carries the full stage structure, including the three-way
// completion criterion (semantic / machine / not provable by a validator).
const STAGE_SECTIONS = [
  '## 这一步在做什么', '## 为什么需要这一步', '## 输入及其作用', '## 主要结果与认知动作',
  '## 判断框架', '## 不要做什么', '## 工作方式', '## 人机介入', '## 产物', '## 完成标准',
  '语义完成', '机器检查', '不能由 Validator 证明',
];
for (const stage of [
  'stages/01-source-grounding.md', 'stages/02-story-battle.md', 'stages/03-spoken-storyline.md',
  'stages/04-spoken-script.md', 'stages/04b-screen-content-and-sample.md',
  'stages/05-read-aloud-review-and-handoff.md',
]) {
  const text = read(stage);
  const absent = STAGE_SECTIONS.filter((section) => !text.includes(section));
  check(absent.length === 0, `${stage} follows the stage structure`, `missing: ${absent.join(', ')}`);
}

// P-07 · assets[].label is the review caption, and the page keeps it apart from
// on-screen text.
check(/审阅页的图注，不是上屏文字/.test(contract),
  'contract qualifies assets[].label as the review caption, not on-screen text');
check(/图注/.test(reviewPage) && /不上屏/.test(reviewPage),
  'the review page labels it 图注 and says it does not go on screen');
check(/不把它画上屏/.test(handoffDoc), 'the handoff tells downstream not to render the label');

// P-11 · 「文字：」 is a marker the boundary strips, not正文.
check(/「文字：」是契约的标记/.test(contract) && /剥掉/.test(contract),
  'contract marks 「文字：」 as a marker to strip at the boundary');
check(/剥掉这个前缀/.test(handoffDoc), 'handoff tells downstream to strip the marker');

// The exact_labels / must_show ruling: independent, no forced subset.
check(/各自独立/.test(contract) && /子集/.test(contract),
  'contract states exact_labels and must_show are independent');

// The assets/ folder is produced upstream and must equal what the plan references.
check(/恰好是契约引用的那几张/.test(contract) && /Stage 4B 拼样张时产出/.test(handoffDoc),
  'the step that produces deliverable/assets/ is stated on both sides');

// The two wordings that were wrong: style library, and the video picture's own
// technical constraints (a video picture is not a PPTX).
check(/“模板库”不等于“风格库”/.test(handoffDoc) && /video-craft\/visual\/themes\//.test(handoffDoc),
  'handoff takes style from the style library, not the template library');
check(!/禁用元素/.test(handoffDoc) && /16:9 画幅/.test(handoffDoc),
  'handoff states the video picture constraints instead of the PPTX ones');

// P-09 · content-hash fingerprints, and invalidation announces itself.
const fingerprintLines = reviewServer.split('\n').filter((line) => line.includes('assetFingerprints.push'));
check(fingerprintLines.length > 0 && fingerprintLines.every((line) => !line.includes('size')),
  'asset fingerprints carry a content hash, not a file size', fingerprintLines.join(' | '));
check(/function fileHash\(/.test(reviewServer), 'the review server hashes asset content');
check(/invalidatePreviousFeedback/.test(reviewServer) && /反馈已作废/.test(reviewServer),
  'feedback invalidation writes a backup and announces itself');
check(/上一轮反馈已作废/.test(reviewPage), 'the review page shows the invalidation notice');
check(/作废会说出来/.test(stage05), 'stage 5 states that invalidation is announced');

// No leftover pointer at the absorbed skill.
const leftovers = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!/\.(md|json|mjs|yaml|html)$/.test(entry.name)) continue;
    if (entry.name === 'run-validator-cases.mjs') continue; // this file lists the forbidden pointers
    const text = fs.readFileSync(full, 'utf8');
    for (const needle of ['../video-story-system/', 'video-story-system/scripts', 'video-story-system/references', '.video-story/reviews/script']) {
      if (text.includes(needle)) leftovers.push(`${path.relative(skillDir, full)} → ${needle}`);
    }
  }
};
walk(skillDir);
check(leftovers.length === 0, 'no file path points at the absorbed skill', leftovers.join('; '));


/* ------------------------------------------------------------------ *
 * Part 4 · 缝上的念稿审阅面（公共缝 review-surface/2.0.0 + 模组 Node 宿主）
 *
 * 这一段的每一条都是"能区分新旧行为"的：换回旧实现就会红。
 *   · R3  入口只有**一个裸着独占一行**的 {{REVIEW_BRIDGE}}
 *   · R11 刷新出口**永久可见**，不藏在作废告警里
 *   · R7  指纹变了作废之后，人上一轮标过的 Beat **不许回到默认通过**，必须回来待复核
 *   · R5b 页面知道的前提（上一轮作废 / 哪些段是默认通过）要进**数据**，
 *         而原生 feedback.json 的形状**一个字段都不许多**
 * ------------------------------------------------------------------ */
console.log('Part 4 · 缝上的念稿审阅面');
const os = await import('node:os');
const { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync: readSync } = fs;
const { moduleScript } = await import('../scripts/lib/planners-modules.mjs');
const tmp = mkdtempSync(path.join(os.tmpdir(), 'video-idea-review-'));
const reviewDir = path.join(tmp, 'reviews', 'script');
mkdirSync(path.join(tmp, 'deliverable'), { recursive: true });
mkdirSync(path.join(tmp, 'assets2'), { recursive: true });
mkdirSync(reviewDir, { recursive: true });

// 一张真 PNG（1×1）+ 两段稿 + 契约 5.0 的画面契约
writeFileSync(path.join(tmp, 'assets2', 'shot.png'),
  Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));
writeFileSync(path.join(tmp, 'deliverable', 'script.md'), `# 测试片

## 第一段｜开场

第一段的口播。

## 第二段｜收束

第二段的口播。
`);
const screen = (beat) => ({
  screen_id: beat, beat_id: beat, question: '这一屏要回答什么？', must_show: ['一行字'],
  sample: { layout: 'single', assets: [{ kind: 'image', path: 'assets2/shot.png', label: '样张' }] },
});
writeFileSync(path.join(tmp, 'deliverable', 'visual-plan.json'), JSON.stringify({
  contract_version: '5.0', screens: [screen('beat-01'), screen('beat-02')],
}, null, 2));

// 上一轮：beat-01 被人标了 revise（带原话）、beat-02 通过 —— 指纹与这版稿子不同，于是会被作废
const prior = {
  version: '2.0.0', sourceHash: 'a'.repeat(64), scriptPath: 'old/script.md', visualPlanPath: 'old/visual-plan.json',
  savedAt: '2026-09-01T00:00:00.000Z', overallDecision: 'revise', overallFeedback: '',
  beats: {
    'beat-01': { status: 'revise', spokenNotes: '这句太书面，改口语。', visualNotes: '' },
    'beat-02': { status: 'approve', spokenNotes: '', visualNotes: '' },
    // 上一轮还有一条挂在 beat-99 上 —— 本版稿子里没有这一段（标题改过/段落删了）
    'beat-99': { status: 'revise', spokenNotes: '这一段后来被删了。', visualNotes: '' },
  },
};
writeFileSync(path.join(reviewDir, 'feedback.json'), JSON.stringify(prior, null, 2));

const runEntry = (extra) => {
  const out = execFileSync(process.execPath, [
    path.join(skillDir, 'scripts', 'start-read-aloud-review.mjs'),
    '--script', path.join(tmp, 'deliverable', 'script.md'),
    '--visual-plan', path.join(tmp, 'deliverable', 'visual-plan.json'),
    '--review-dir', reviewDir, '--asset-root', tmp, '--port', '0', ...extra,
  ], { encoding: 'utf8', env: { ...process.env, REVIEW_TEST_NO_OPEN: '1' } });
  return JSON.parse(out.slice(out.indexOf('{')));
};

// ① --surface-only：只写面 + 校验，**一次 start 都不许发生**
const quiet = runEntry(['--surface-only']);
check(quiet.status === 'surface_ready' && quiet.host_started === false && !quiet.url,
  '--surface-only 只报 surface 绝对路径（不起宿主）');
check(!existsSync(path.join(reviewDir, 'review_host.json')) && !existsSync(path.join(reviewDir, 'review_host.log')),
  '--surface-only 一次 start 都没发生（起了就一定有 review_host.json / review_host.log）');
check(/0 个警告/.test(String(quiet.validator)), 'surface 过唯一校验器且 0 警告');

// ② 真的起宿主（无插件），页面能开
const live = runEntry(['--no-open']);
check(typeof live.url === 'string' && live.started === true && live.opened === false,
  '入口起本地宿主并如实报 opened=false（--no-open）');
const served = execFileSync(process.execPath, ['-e', `
  const { execSync } = require('child_process');
  fetch(process.argv[1]).then(r => r.text()).then(t => process.stdout.write(t));
`, live.url], { encoding: 'utf8' });

// ③ R7：作废之后，人上一轮标过的那一段必须回来"待复核"，**不许默认通过**
check(JSON.stringify(live.prior_round_flagged_beats) === JSON.stringify(['beat-01', 'beat-99']),
  'R7：上一轮被人标过的段全被带回来（深度相等，含对不上本版的孤儿）', JSON.stringify(live.prior_round_flagged_beats));
check(JSON.stringify(live.prior_round_orphaned_beats) === JSON.stringify(['beat-99']),
  '上一轮对不上本版任何一段的意见要**出声**（不许静默丢），且不猜映射',
  JSON.stringify(live.prior_round_orphaned_beats));
const boot = JSON.parse(served.slice(served.indexOf('const BOOT=') + 'const BOOT='.length, served.indexOf(';\nconst esc=')));
// 防御式读：旧实现里根本没有这个字段 —— 那应当报 FAIL，而不是把整个套件摔掉
const bootFlagged = (boot.priorRound && boot.priorRound.flagged) || {};
check(JSON.stringify(Object.keys(bootFlagged)) === JSON.stringify(['beat-01', 'beat-99']),
  'R7：页面拿到的 BOOT.priorRound.flagged 就是那两段（数据在，不靠页面自己猜）',
  JSON.stringify(Object.keys(bootFlagged)));
check(bootFlagged['beat-01'] && bootFlagged['beat-01'].status === 'revise'
  && bootFlagged['beat-01'].spokenNotes === '这句太书面，改口语。',
  'R7：上一轮的原话作为只读上下文带回来');
const pageSource = read('assets/read-aloud-review.html');
// 判据要防"永远为假"：不看某一行长什么样，而是要求**每一处**默认值赋值都读了上一轮。
const defaultAssignments = pageSource.split('\n').filter((line) => /state\.beats\[id\]\s*=/.test(line));
check(defaultAssignments.length > 0 && defaultAssignments.every((line) => /priorFor\(id\)/.test(line)),
  'R7：默认值那一步真的读了上一轮（没有"无条件默认通过"的写法）', defaultAssignments.join(' | '));

// ④ R11：刷新出口永久可见，且不在作废告警里
check(/id="reload"/.test(pageSource) && !/invalidated[\s\S]{0,400}id="reload"/.test(pageSource),
  'R11：页面有一个永久可见的刷新出口，且不依赖告警出现');
check(/id="reload"/.test(served), 'R11：serve 出去的页面上刷新出口还在');

// ⑤ R3：注入点裸着独占一行，只出现一次
const markerLines = pageSource.split('\n').filter((line) => line.trim() === '{{REVIEW_BRIDGE}}');
check(markerLines.length === 1 && !/src="\{\{REVIEW_BRIDGE\}\}"/.test(pageSource)
  && !/>\{\{REVIEW_BRIDGE\}\}</.test(pageSource), 'R3：入口只有一个裸着独占一行的注入点');

// ⑥ 提交：两个反馈框各一条 + 整体意见；页面报的前提进数据
const submissions = path.join(reviewDir, 'review-submissions.json');
writeFileSync(submissions, JSON.stringify({
  sourceHash: live.source_hash, overallDecision: 'revise', overallFeedback: '整体节奏可以。',
  reviewState: {
    priorRoundInvalidated: true, priorRoundSavedAt: '2026-09-01T00:00:00.000Z',
    flaggedBeats: ['beat-01'], redecidedBeats: ['beat-01'], defaultedBeats: ['beat-02'],
    preCheck: false, preCheckNote: '页面未做版本核对。',
  },
  beats: {
    'beat-01': { status: 'approve', spokenNotes: '改成"我们先看开场"。', visualNotes: '样张换一张。' },
    'beat-02': { status: 'approve', spokenNotes: '', visualNotes: '' },
  },
}, null, 2));
const native = JSON.parse(execFileSync(process.execPath,
  [path.join(skillDir, 'scripts', 'review-inbox.mjs'), '--surface', live.surface], { encoding: 'utf8' }));
const feedback = JSON.parse(readSync(path.join(reviewDir, 'feedback.json'), 'utf8'));
check(JSON.stringify(Object.keys(feedback).sort()) === JSON.stringify(
  ['beats', 'overallDecision', 'overallFeedback', 'savedAt', 'scriptPath', 'sourceHash', 'version', 'visualPlanPath']),
  '原生 feedback.json 的形状一个字段不多、一个不少', Object.keys(feedback).join(','));
check(!('reviewState' in feedback) && JSON.stringify(native.imported.dropped_submission_fields) === JSON.stringify(['reviewState']),
  'R5b：页面报的前提被收件层摘进收据，不写进原生记录');
check(native.review_state && native.review_state.defaultedBeats
  && JSON.stringify(native.review_state.defaultedBeats) === JSON.stringify(['beat-02']),
  'R5b：收据里带着"哪些段是默认通过、人没碰"（模型据此知道该怎么读）');
check(native.pre_check === false && !!native.pre_check_note,
  'R5b：页面"没做版本核对"这件事也在收据里');
check(JSON.stringify(native.orphaned_prior_beats) === JSON.stringify(['beat-99']) && !!native.orphaned_note,
  'R5b：孤儿意见也进收据 —— 模型不能以为"没人提过那一段"',
  JSON.stringify(native.orphaned_prior_beats));
check(feedback.beats['beat-01'].spokenNotes === '改成"我们先看开场"。'
  && feedback.beats['beat-01'].visualNotes === '样张换一张。',
  '两个反馈框各写一条都被收下（spokenNotes / visualNotes 分开）');

// ⑦ 词表外的取值：只出声，不静默改写
writeFileSync(submissions, JSON.stringify({
  sourceHash: live.source_hash, overallDecision: 'approve', overallFeedback: '',
  beats: {
    'beat-01': { status: 'approved-after-typo-correction', spokenNotes: '', visualNotes: '' },
    'beat-02': { status: 'approve', spokenNotes: '', visualNotes: '' },
  },
}, null, 2));
const legacy = JSON.parse(execFileSync(process.execPath,
  [path.join(skillDir, 'scripts', 'review-inbox.mjs'), '--surface', live.surface], { encoding: 'utf8' }));
check(JSON.stringify(legacy.off_vocabulary_beats) === JSON.stringify(['beat-01']),
  '词表外的 status 照样收下（旧文件里真有），但在收据里出声',
  JSON.stringify(legacy.off_vocabulary_beats));

// ⑦.5 页面必须能"**没有桥也把自己画出来**"——渲染不许挂在握手/网络/任何外部依赖上。
// 做法：页面脚本拿到 node 里跑一遍，DOM 换成会记账的桩，localStorage 一读就抛
// （**照抄不透明源 iframe 的真实行为**：有插件时页面就在那种帧里）。
const vm = await import('node:vm');
function renderPageOffline(html, options) {
  const opts = options || {};
  const script = html.slice(html.lastIndexOf('<script>') + '<script>'.length, html.lastIndexOf('</script>'));
  const made = {};
  const stub = () => {
    const target = { innerHTML: '', textContent: '', value: '', hidden: false,
                     style: {}, dataset: {}, classList: { toggle() {}, add() {}, remove() {}, contains: () => false } };
    return new Proxy(target, {
      get(t, key) {
        if (key === 'querySelectorAll') return () => [];
        if (key === 'querySelector') return () => stub();
        if (key === 'appendChild' || key === 'addEventListener' || key === 'removeAttribute'
          || key === 'setAttribute' || key === 'getAttribute') return () => null;
        if (key in t) return t[key];
        return () => undefined;
      },
      set(t, key, value) { t[key] = value; return true; },
    });
  };
  const sandbox = {
    document: {
      getElementById: (id) => (made[id] = made[id] || stub()),
      querySelectorAll: () => [],
      querySelector: () => stub(),
      addEventListener: () => {},
      body: stub(),
    },
    window: {
      // 不透明源：读 localStorage 直接抛（页面必须 try/catch，且不许让整页脚本死掉）
      get localStorage() { throw new Error("Failed to read the 'localStorage' property: sandboxed and lacks allow-same-origin"); },
      addEventListener: () => {},
      location: { reload: () => {} },
    },
    // 不透明源里裸 `localStorage` 也存在，但**一碰就抛**（真实行为）
    localStorage: {
      getItem() { throw new Error("Failed to read the 'localStorage' property: sandboxed and lacks allow-same-origin"); },
      setItem() { throw new Error('SecurityError'); },
      removeItem() { throw new Error('SecurityError'); },
    },
    setTimeout, clearTimeout, requestAnimationFrame: () => 0, console, structuredClone,
  };
  if ('bridge' in opts && opts.bridge) sandbox.window.ReviewBridge = opts.bridge;
  if (opts.bridge) sandbox.ReviewBridge = opts.bridge;
  vm.runInNewContext(script, sandbox, { timeout: 5000 });
  return made;
}
const pageHtml = readSync(path.join(reviewDir, 'index.html'), 'utf8');
// 注意别把 class="screen-head" 也算进去
const countScreens = (html) => (String(html).match(/<section class="screen[ \"]/g) || []).length;
const countNav = (html) => (String(html).match(/<a href=/g) || []).length;

const safeRender = (opts) => {
  try { return { made: renderPageOffline(opts.pageHtml, opts.options), error: null }; }
  catch (error) { return { made: {}, error: String(error.message || error) }; }
};
const offline = safeRender({ pageHtml, options: {} });
check(!offline.error && countScreens(offline.made['beats'].innerHTML) === 2 && countNav(offline.made['beatnav'].innerHTML) === 2,
  '页面必须能"没有桥也把自己画出来"（没有桥也要有逐段与导航）',
  offline.error ? ('脚本当场抛：' + offline.error)
    : 'beats=' + countScreens(offline.made['beats'].innerHTML) + ' nav=' + countNav(offline.made['beatnav'].innerHTML));
check(!offline.error && !!offline.made['progressBar'].style.width,
  '进度条也要画出来（不依赖握手）', offline.error || JSON.stringify(offline.made['progressBar'] && offline.made['progressBar'].style.width));

// 反面对照：握手**永不返回** —— 页面仍然必须完整，而且明确说"没有桥、只读"
const hanging = { connect: () => new Promise(() => {}) };
const stuck = safeRender({ pageHtml, options: { bridge: hanging } });
check(!stuck.error && countScreens(stuck.made['beats'].innerHTML) === 2 && countNav(stuck.made['beatnav'].innerHTML) === 2,
  '反面对照：握手永不返回时页面仍然必须完整画出来',
  stuck.error ? ('脚本当场抛：' + stuck.error) : 'beats=' + countScreens(stuck.made['beats'].innerHTML));
await new Promise((resolve) => setTimeout(resolve, 1800));
check(/只读|连不上/.test(String((stuck.made['saveState'] || {}).textContent) + String((stuck.made['invalidated'] || {}).innerHTML)),
  '握手不落地时页面要**说出来**（只读），不能零报错地空着',
  String((stuck.made['saveState'] || {}).textContent).slice(0, 80));
// 旧写法是"把渲染挂在握手上"：那会被这一条抓住（渲染排在 await 之后）
const bootMatch = pageHtml.slice(pageHtml.indexOf('(async function boot(){'));
check(bootMatch.indexOf('render()') < bootMatch.indexOf('await'),
  '渲染必须排在第一个 await 之前（桥是增强，不是氧气）');

// ⑧ 起→停：不留进程、不留端口
const reviewHost = await import(moduleScript('planners-review-core', 'scripts/review-host.mjs'));
await reviewHost.stopHost(reviewHost.hostState(live.surface));
check((await reviewHost.hostAlive(live.surface)) === null, '停完之后宿主判死（判据归模组）');
let stillServing = false;
try { await fetch(live.url, { signal: AbortSignal.timeout(1500) }); stillServing = true; } catch { /* 连接被拒 = 端口也放掉了 */ }
check(!stillServing, '停完之后端口不该还在应答');

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
