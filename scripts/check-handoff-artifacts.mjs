#!/usr/bin/env node
// 交接前的产物核对：哪些必经步骤的产物不在磁盘上，以及 deliverable/assets/ 是否恰好等于
// 契约引用的那几张。
//
//   node check-handoff-artifacts.mjs --project <project> [--visual-plan <visual-plan.json>]
//
// 这不是第二套流程，只是一次存在性核对：它只报“在 / 不在”，不判断内容好坏。
// 缺项要拿去向作者确认是跳过还是漏了；作者说跳过，就在 <project>/_idea/current.md
// 记一行“跳过 <步骤>：<原因>”，然后继续。

import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
};
const projectArg = flag('--project');
if (!projectArg) {
  console.error('Usage: node check-handoff-artifacts.mjs --project <project> [--visual-plan <visual-plan.json>]');
  process.exit(1);
}
const projectRoot = path.resolve(projectArg);
if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
  console.error(`Project not found: ${projectRoot}`);
  process.exit(2);
}
const planPath = path.resolve(flag('--visual-plan') || path.join(projectRoot, 'deliverable', 'visual-plan.json'));

const REQUIRED = [
  ['_idea/current.md', '决定记录：核心版本、两个轴的结论、跳过的步骤', '从「洞察与目标」起持续维护'],
  ['.video-story/story-lock.md', '冻结的主张、必留项、砍掉项、最大反例', '「主张 Battle」stages/02'],
  ['_idea/method-history.json', '52 方法的跨片轮换记录', '「发散与自筛」references/发散引擎.md'],
  ['_idea/ideas.json', '发散后的候选池', '「发散与自筛」references/网页交付.md'],
  ['_idea/web/', '候选页与脚本页（离线 HTML）', '「发散与自筛」references/网页交付.md'],
];

const present = [];
const missing = [];
for (const [relative, what, home] of REQUIRED) {
  const full = path.join(projectRoot, relative);
  // 目录里一个文件都没有，等于这一步没有产出。
  const produced = fs.existsSync(full)
    && (fs.statSync(full).isDirectory() ? walkFiles(full).length > 0 : true);
  if (produced) present.push(relative);
  else missing.push({ path: relative, what, home });
}

// delivery 侧的资产核对：契约里 sample.assets[] 引用到的文件，与 deliverable/assets/
// 目录里实际躺着的文件，两边的集合必须一致。
const declared = [];
const unresolved = [];
const onDisk = [];
const assetCheck = { plan: null, note: '', declared: [], onDisk: [], missingOnDisk: [], unreferencedOnDisk: [] };

function walkFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, base));
    else if (entry.isFile()) out.push(path.relative(base, full));
  }
  return out;
}

if (fs.existsSync(planPath)) {
  assetCheck.plan = planPath;
  let plan = null;
  try {
    plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  } catch (error) {
    unresolved.push({ path: planPath, reason: `visual-plan.json 无法解析：${error.message}` });
  }
  for (const screen of (plan?.screens || plan?.blueprints || [])) {
    for (const asset of (screen?.sample?.assets || [])) {
      const relative = String(asset?.path || '').trim();
      if (!relative) continue;
      const full = path.isAbsolute(relative) ? relative : path.join(projectRoot, relative);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) declared.push(path.relative(projectRoot, full));
      else unresolved.push({ path: relative, reason: `契约 screens[].sample.assets[].path 指向的文件不存在（屏 ${screen.screen_id || screen.beat_id || '?'}）` });
    }
  }
  const assetsDir = path.join(projectRoot, 'deliverable', 'assets');
  if (fs.existsSync(assetsDir) && fs.statSync(assetsDir).isDirectory()) {
    onDisk.push(...walkFiles(assetsDir).map((name) => path.join('deliverable/assets', name)));
  }
  const declaredAssets = new Set(declared);
  const onDiskSet = new Set(onDisk);
  assetCheck.declared = [...declaredAssets].sort();
  assetCheck.onDisk = [...onDiskSet].sort();
  assetCheck.missingOnDisk = [...declaredAssets].filter((item) => !onDiskSet.has(item)).sort();
  assetCheck.unreferencedOnDisk = [...onDiskSet].filter((item) => !declaredAssets.has(item)).sort();
} else {
  assetCheck.plan = null;
  assetCheck.note = '没有 visual-plan.json（纯口播），未做资产核对';
}

const currentPath = path.join(projectRoot, '_idea', 'current.md');
let skipLines = [];
if (fs.existsSync(currentPath)) {
  skipLines = fs.readFileSync(currentPath, 'utf8')
    .split('\n')
    .filter((line) => /跳过/.test(line))
    .map((line) => line.trim());
}

const problems = [];
for (const item of missing) problems.push(`缺产物 ${item.path}（${item.what}，本该由${item.home}产出）`);
for (const item of unresolved) problems.push(`引用不成立 ${item.path}：${item.reason}`);
for (const item of assetCheck.missingOnDisk) problems.push(`deliverable/assets/ 少了契约引用的 ${item}`);
for (const item of assetCheck.unreferencedOnDisk) problems.push(`deliverable/assets/ 多出契约没引用的 ${item}`);

const next = [];
if (missing.length) {
  next.push(skipLines.length
    ? '_idea/current.md 里已有跳过记录；逐条核对缺的产物是不是都对应其中一行，对不上就问作者。'
    : '把每一项缺失拿去问作者：这一步是跳过，还是漏了？作者说跳过，就在 _idea/current.md 记一行「跳过 <步骤>：<原因>」；漏了就补做。');
}
if (assetCheck.missingOnDisk.length) {
  next.push('把契约引用到、但 deliverable/assets/ 里没有的文件放进去（它们就在契约写的相对路径上）。');
}
if (assetCheck.unreferencedOnDisk.length) {
  next.push('deliverable/assets/ 里多出的文件先报告给作者，由作者决定补进契约还是移出目录；不要自己删。');
}
if (unresolved.length) {
  next.push('契约引用路径不成立：先修正路径或补齐素材，再交接。');
}

const result = {
  ok: problems.length === 0,
  project: projectRoot,
  present,
  missing,
  skipLinesInCurrent: skipLines,
  assetCheck,
  problems,
  next: problems.length ? next : ['产物齐备，可以交接。'],
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 3);
