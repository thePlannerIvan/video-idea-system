#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.dirname(scriptDir);
const SUPPORTED_CONTRACTS = new Set(['4.0', '5.0']);
const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.html': 'text/html; charset=utf-8',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.m4v': 'video/x-m4v',
};

function parseArgs(argv) {
  const parsed = { assetRoots: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    if (key === 'no-open') {
      parsed.noOpen = true;
    } else if (key === 'asset-root') {
      parsed.assetRoots.push(argv[i + 1]);
      i += 1;
    } else {
      parsed[key] = argv[i + 1];
      i += 1;
    }
  }
  return parsed;
}

function usage() {
  console.log([
    'Usage:',
    '  node start-read-aloud-review.mjs --script <script.md> [--visual-plan <visual-plan.json>]',
    '    --review-dir <dir> [--asset-root <dir> ...] [--port 0] [--no-open]',
    '',
    '--asset-root defaults to the project root inferred from --review-dir.',
    'Sample asset paths in visual-plan.json resolve against the asset roots.',
  ].join('\n'));
}

function normalizeId(value, index) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '');
  return normalized || `beat-${String(index + 1).padStart(2, '0')}`;
}

function cleanBody(markdown) {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*---\s*$/gm, '')
    .trim();
}

function parseBeatMarkdown(markdown, fallbackLabel = '全文') {
  const heading = /^##\s+([^\n｜|]+?)(?:\s*[｜|]\s*([^\n]+))?\s*$/gm;
  const matches = [...markdown.matchAll(heading)];
  if (!matches.length) {
    const withoutTitle = markdown
      .replace(/^#\s+.*$/m, '')
      .replace(/^>\s+.*$/gm, '')
      .trim();
    const paragraphs = withoutTitle
      .split(/\n\s*---\s*\n|\n\s*\n+/)
      .map(cleanBody)
      .filter(Boolean);
    if (paragraphs.length > 1) {
      return paragraphs.map((body, index) => ({
        id: `beat-${String(index + 1).padStart(2, '0')}`,
        title: `段落 ${index + 1}`,
        body,
      }));
    }
    return [{ id: 'beat-01', title: fallbackLabel, body: paragraphs[0] || '' }];
  }
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : markdown.length;
    return {
      id: normalizeId(match[1], index),
      title: (match[2] || match[1]).trim(),
      body: cleanBody(markdown.slice(start, end)),
    };
  });
}

function estimateSeconds(text) {
  const compact = text.replace(/[`*_#>\[\](){}-]/g, '').replace(/\s+/g, '');
  return Math.max(2, Math.round(compact.length / 4));
}

// 素材指纹按内容算，不按文件大小：换一张字节数恰好相同的图也必须改变指纹。
// 分块读取，避免把大视频整份载入内存。
function fileHash(filePath) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.allocUnsafe(1 << 20);
    let bytes = fs.readSync(fd, buffer, 0, buffer.length, null);
    while (bytes > 0) {
      hash.update(buffer.subarray(0, bytes));
      bytes = fs.readSync(fd, buffer, 0, buffer.length, null);
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

function imageSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length > 24 && buffer.toString('latin1', 1, 4) === 'PNG') {
    return { w: buffer.readUInt32BE(16), h: buffer.readUInt32BE(20) };
  }
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buffer.readUInt16BE(offset + 5), w: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') { field += '"'; i += 1; } else { quoted = false; }
      } else field += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === ',') { row.push(field); field = ''; continue; }
    if (char === '\r') continue;
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += char;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function openBrowser(url) {
  let command;
  let commandArgs;
  if (process.platform === 'darwin') {
    command = 'open';
    commandArgs = [url];
  } else if (process.platform === 'win32') {
    command = 'cmd';
    commandArgs = ['/c', 'start', '', url];
  } else {
    command = 'xdg-open';
    commandArgs = [url];
  }
  const child = spawn(command, commandArgs, { detached: true, stdio: 'ignore' });
  child.unref();
}

const args = parseArgs(process.argv.slice(2));
if (!args.script || !args['review-dir']) {
  usage();
  process.exit(1);
}

const scriptPath = path.resolve(args.script);
const visualPlanPath = args['visual-plan'] ? path.resolve(args['visual-plan']) : null;
const reviewDir = path.resolve(args['review-dir']);
const requestedPort = Number(args.port || 0);
const projectRoot = path.resolve(reviewDir, '..', '..', '..');
const assetRoots = (args.assetRoots.length ? args.assetRoots : [projectRoot])
  .filter(Boolean)
  .map((root) => path.resolve(root));
assetRoots.push(projectRoot);
const uniqueRoots = [...new Set(assetRoots.map((root) => {
  try { return fs.realpathSync(root); } catch { return root; }
}))];

if (!fs.existsSync(scriptPath)) {
  console.error(`Script not found: ${scriptPath}`);
  process.exit(2);
}
if (visualPlanPath && !fs.existsSync(visualPlanPath)) {
  console.error(`Visual plan not found: ${visualPlanPath}`);
  process.exit(2);
}

const scriptText = fs.readFileSync(scriptPath, 'utf8');
const visualPlanText = visualPlanPath ? fs.readFileSync(visualPlanPath, 'utf8') : '';
let visualPlan = null;
if (visualPlanText) {
  try {
    visualPlan = JSON.parse(visualPlanText);
  } catch (error) {
    console.error(`Invalid visual plan JSON: ${error.message}`);
    process.exit(2);
  }
  if (!SUPPORTED_CONTRACTS.has(visualPlan.contract_version)) {
    console.error('Visual plan must use contract_version "5.0" (or legacy "4.0")');
    process.exit(2);
  }
  // Contract 4.0 blueprints carry no sample; treat them as screens without one.
  if (!Array.isArray(visualPlan.screens)) visualPlan.screens = visualPlan.blueprints;
  if (!Array.isArray(visualPlan.screens)) {
    console.error('Visual plan must carry a screens array');
    process.exit(2);
  }
}

function resolveAsset(relativePath) {
  const cleaned = String(relativePath || '').trim();
  if (!cleaned) return null;
  const candidates = path.isAbsolute(cleaned)
    ? [cleaned]
    : uniqueRoots.map((root) => path.resolve(root, cleaned));
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return fs.realpathSync(candidate);
    } catch { /* keep looking */ }
  }
  return null;
}

function resolveDir(relativePath) {
  const cleaned = String(relativePath || '').trim();
  if (!cleaned) return null;
  const candidates = path.isAbsolute(cleaned)
    ? [cleaned]
    : uniqueRoots.map((root) => path.resolve(root, cleaned));
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return fs.realpathSync(candidate);
    } catch { /* keep looking */ }
  }
  return null;
}

// 样张素材：**复制进审阅目录**，页面用相对 `dir` 的路径引用。
//
// 为什么不像原来那样开一个 `/asset?p=<任意绝对路径>` 的端点：缝只 serve surface 声明的
// `dir` 一棵树。要显示项目里的真实素材，只有两条路 —— 把 `dir` 放大到"公共祖先"
// （这里会是整个工作区），或者把**被引用的那几个文件**搬进审阅目录。选后者：
// 被 serve 的树小、包含性校验天然成立，而且这正是本库别处已有的做法
// （planners-bypage 把 markdown 图搬进审阅目录）。代价：素材被复制一份
// （实测两个真实项目都只有图片、合计数 MB；真引到 GB 级视频时这笔开销要重新算）。
const localizedAssets = new Map();
function localizeAsset(absolutePath) {
  if (localizedAssets.has(absolutePath)) return localizedAssets.get(absolutePath);
  const targetDir = path.join(reviewDir, 'assets');
  fs.mkdirSync(targetDir, { recursive: true });
  const ext = path.extname(absolutePath);
  const stem = path.basename(absolutePath, ext).replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 60) || 'asset';
  let name = `${stem}${ext}`;
  for (let index = 2; fs.existsSync(path.join(targetDir, name)); index += 1) {
    const existing = path.join(targetDir, name);
    if (fs.readFileSync(existing).equals(fs.readFileSync(absolutePath))) break;   // 同一份内容：不重复搬
    name = `${stem}-${index}${ext}`;
  }
  const target = path.join(targetDir, name);
  if (!fs.existsSync(target)) fs.copyFileSync(absolutePath, target);
  const rel = `assets/${name}`;
  localizedAssets.set(absolutePath, rel);
  return rel;
}

function assetUrl(absolutePath) {
  return localizeAsset(absolutePath);
}

const assetFingerprints = [];

function resolveSampleAsset(asset) {
  const kind = asset.kind || 'image';
  const label = asset.label || '';
  const common = { kind, label, span: asset.span || 0 };
  if (kind === 'glob') {
    const dir = resolveDir(asset.path);
    if (!dir) {
      return { ...common, kind: 'missing', label: `${label}（未找到：${asset.path}）` };
    }
    const limit = Number(asset.limit || 12);
    const items = fs.readdirSync(dir)
      .filter((name) => MIME[path.extname(name).toLowerCase()]?.startsWith('image/'))
      .sort()
      .slice(0, limit)
      .map((name) => {
        const full = path.join(dir, name);
        assetFingerprints.push(`${name}:${fileHash(full)}`);
        return { url: assetUrl(full), name };
      });
    return { ...common, kind: 'glob', items };
  }
  const file = resolveAsset(asset.path);
  if (!file) {
    return { ...common, kind: 'missing', label: `${label}（未找到：${asset.path}）` };
  }
  assetFingerprints.push(`${path.relative(projectRoot, file)}:${fileHash(file)}`);
  if (kind === 'csv') {
    const rows = parseCsv(fs.readFileSync(file, 'utf8'));
    const header = rows[0] || [];
    const wanted = Array.isArray(asset.columns) && asset.columns.length
      ? asset.columns.map((name) => header.indexOf(name))
      : [0, header.length - 1];
    const body = rows.slice(1, 1 + Number(asset.lines || 6))
      .map((row) => wanted.map((index) => (index >= 0 ? String(row[index] ?? '').slice(0, 120) : '')));
    return { ...common, kind: 'csv', url: assetUrl(file), rows: body };
  }
  if (kind === 'html') {
    return { ...common, kind, url: assetUrl(file), vw: Number(asset.viewport?.w) || 1000, vh: Number(asset.viewport?.h) || 625 };
  }
  if (kind === 'video') {
    return { ...common, kind, url: assetUrl(file) };
  }
  const size = imageSize(file) || {};
  return { ...common, kind: 'image', url: assetUrl(file), w: size.w || 0, h: size.h || 0, mark: asset.mark || null, zoom: asset.zoom || null, dim: !!asset.dim };
}

function resolveScreen(screen) {
  // A screen without a sample is the screen-level "no picture" decision: it still belongs on
  // the review page (its content contract is shown), it just carries no right-hand sample.
  if (!screen) return null;
  if (!screen.sample) return { ...screen, sample: null };
  const sample = screen.sample;
  return {
    ...screen,
    sample: {
      layout: sample.layout || 'grid',
      note: sample.note || '',
      cols: sample.cols || 0,
      thumbCols: sample.thumbCols || 2,
      captions: Array.isArray(sample.captions) ? sample.captions : [],
      assets: (Array.isArray(sample.assets) ? sample.assets : []).map(resolveSampleAsset),
    },
  };
}

const documentTitle = scriptText.match(/^#\s+(.+)$/m)?.[1]?.trim()
  || path.basename(scriptPath, path.extname(scriptPath));
const scriptBeats = parseBeatMarkdown(scriptText);
const screenMap = new Map();
const screenIds = new Set();
for (const raw of (visualPlan?.screens || [])) {
  const screenId = raw.screen_id || raw.blueprint_id;
  // A screen with no on-screen text at all is legal (it may be one picture). What is not legal is a
  // screen the review page can show nothing for: it must declare must_show, material, or 花字.
  const mustShowOk = Array.isArray(raw.must_show);
  const sampleAssets = Array.isArray(raw.sample?.assets) ? raw.sample.assets : [];
  const sampleCaptions = Array.isArray(raw.sample?.captions) ? raw.sample.captions : [];
  const showable = (mustShowOk && raw.must_show.length > 0) || sampleAssets.length > 0 || sampleCaptions.length > 0;
  if (!screenId || !String(raw.question || '').trim() || !mustShowOk || !showable) {
    console.error(`Screen is incomplete: ${screenId || '(missing screen_id)'}`);
    if (mustShowOk && !showable) console.error('  it must declare must_show, sample.assets or sample.captions; the review page has to show something for every screen');
    process.exit(2);
  }
  if ('related_beat_ids' in raw) {
    console.error(`Screen must bind exactly one beat_id: ${screenId}`);
    process.exit(2);
  }
  if (screenIds.has(screenId)) {
    console.error(`Duplicate screen_id: ${screenId}`);
    process.exit(2);
  }
  screenIds.add(screenId);
  if (!raw.beat_id || screenMap.has(raw.beat_id)) {
    console.error(`Each Speech Beat may have at most one screen: ${raw.beat_id || '(missing beat_id)'}`);
    process.exit(2);
  }
  screenMap.set(raw.beat_id, resolveScreen({ ...raw, screen_id: screenId }));
}
const scriptBeatIds = new Set(scriptBeats.map((beat) => beat.id));
for (const beatId of screenMap.keys()) {
  if (!scriptBeatIds.has(beatId)) {
    console.error(`Screen references unknown Speech Beat: ${beatId}`);
    process.exit(2);
  }
}

const beats = scriptBeats.map((beat, index) => ({
  ...beat,
  index: index + 1,
  estimatedSeconds: estimateSeconds(beat.body),
  screen: screenMap.get(beat.id) || null,
}));

const sourceHash = crypto.createHash('sha256')
  .update(scriptText).update('\0')
  .update(visualPlanText).update('\0')
  .update(assetFingerprints.sort().join('\n'))
  .digest('hex');

fs.mkdirSync(reviewDir, { recursive: true });
const feedbackPath = path.join(reviewDir, 'feedback.json');
const previousFeedbackPath = path.join(reviewDir, 'feedback.previous.json');
const templatePath = path.join(skillDir, 'assets', 'read-aloud-review.html');
const indexPath = path.join(reviewDir, 'index.html');

let existingFeedback = null;
let invalidated = null;

// 旧反馈作废时留备份并说明原因：作者必须看得见“上一轮的意见为什么没了”，
// 而不是自己发现页面上的意见消失。
function invalidatePreviousFeedback(reason) {
  if (!fs.existsSync(feedbackPath)) return null;
  fs.copyFileSync(feedbackPath, previousFeedbackPath);
  const notice = {
    reason,
    backupPath: previousFeedbackPath,
    invalidatedAt: new Date().toISOString(),
  };
  console.error(`反馈已作废：${reason}。旧反馈已备份到 ${previousFeedbackPath}`);
  return notice;
}

if (fs.existsSync(feedbackPath)) {
  try {
    const candidate = JSON.parse(fs.readFileSync(feedbackPath, 'utf8'));
    if (candidate.sourceHash === sourceHash) {
      existingFeedback = candidate;
    } else {
      invalidated = invalidatePreviousFeedback(
        '这一轮保存的反馈绑定的是另一版稿子、契约或样张素材（指纹已变），本轮不沿用',
      );
      if (invalidated) invalidated.previousSavedAt = candidate.savedAt || null;
    }
  } catch {
    existingFeedback = null;
  }
}

/* ------------------------------------------------------------------ *
 * 与上一轮的关系（R7：不许把人的决定抹掉/伪造）
 *
 * 指纹一变，旧反馈就作废 —— 这是本 Skill 原有的语义（并且**会说出来**）。但作废之后
 * 页面原先是**空**的：每个 Beat 取默认 `approve`，于是"人上一轮标了需要修改 → 模型改完稿 →
 * 重出审阅页 → 人只写了一句整体意见就保存"会让那些 Beat 静默变回"这一段可录"。
 * 现在：把刚作废那一轮里**人明确标过的** Beat 带回来，作为"必须重新明确选择"的依据；
 * 原话只作只读上下文，**不预填进任何输入框**（预填＝本轮凭空多出一条假意见）。
 * ------------------------------------------------------------------ */
function readPriorRoundBeats() {
  if (!fs.existsSync(previousFeedbackPath)) return null;
  let doc = null;
  try { doc = JSON.parse(fs.readFileSync(previousFeedbackPath, 'utf8')); } catch { return null; }
  if (!doc || typeof doc !== 'object' || !doc.beats || typeof doc.beats !== 'object') return null;
  const VOCABULARY = new Set(['approve', 'revise', 'cut']);
  const beats = {};
  for (const [id, raw] of Object.entries(doc.beats)) {
    if (!raw || typeof raw !== 'object') continue;
    const status = typeof raw.status === 'string' ? raw.status : '';
    // 旧一代文件里有本 Skill 现在词表里没有的取值（实测真实项目里就有
    // `approved-after-typo-correction`）。页面不去猜它的意思 —— 一律当"需要复核"，
    // 并把原值原样带出来给人看，**绝不把它改写成 approve**。
    const known = VOCABULARY.has(status);
    if (known && status === 'approve') continue;      // 上一轮就通过的，不打扰
    beats[id] = {
      status,
      known,
      spokenNotes: typeof raw.spokenNotes === 'string' ? raw.spokenNotes : (typeof raw.notes === 'string' ? raw.notes : ''),
      visualNotes: typeof raw.visualNotes === 'string' ? raw.visualNotes : '',
    };
  }
  return {
    savedAt: typeof doc.savedAt === 'string' ? doc.savedAt : null,
    overallDecision: typeof doc.overallDecision === 'string' ? doc.overallDecision : null,
    beatCount: Object.keys(doc.beats).length,
    flagged: beats,
  };
}
// 只在"这一版稿子没有活的反馈"时才用 previous.json 里的上一轮：
// 有活反馈时页面本来就带着人的决定，再叠一份更旧的只会打架。
const priorRoundBase = (!existingFeedback) ? readPriorRoundBeats() : null;
// 上一轮的意见挂在 beat_id 上，而 beat_id 是从**标题文字**推出来的（normalizeId）——
// 标题一改，那一条意见就再也对不上任何一段（实测真项目里就有：上一轮的 `beat-01`
// 在本版里成了 `ai-ai`）。**不猜这个映射**，但必须出声：孤儿意见要让人和模型都看见。
if (priorRoundBase) {
  const liveIds = new Set(beats.map((beat) => beat.id));
  priorRoundBase.orphaned = Object.keys(priorRoundBase.flagged).filter((id) => !liveIds.has(id));
}
const priorRound = priorRoundBase;

const bootstrap = {
  version: '2.0.0',
  title: documentTitle,
  scriptPath,
  visualPlanPath,
  sourceHash,
  feedbackPath,
  hasVisual: [...screenMap.values()].some((screen) => !!(screen && screen.sample)),
  screens: visualPlan?.screens || [],
  beats,
  feedback: existingFeedback,
  invalidated,
  // 上一轮人明确标过的 Beat（作废之后仍然带回来，作为"必须重新复核"的依据）——R7
  priorRound,
};

const template = fs.readFileSync(templatePath, 'utf8');
const html = template.replace('__REVIEW_BOOTSTRAP__', JSON.stringify(bootstrap).replace(/</g, '\\u003c'));
fs.writeFileSync(indexPath, html, 'utf8');

// 收件层要知道的身份（哪些稿、哪个指纹、哪一轮被作废）：落在 surface 旁边的小文件。
// 反馈文件的**形状不许变**，所以这些东西不能塞进 feedback.json —— 由收件层按需取用。
fs.writeFileSync(path.join(reviewDir, 'review-context.json'), JSON.stringify({
  scriptPath,
  visualPlanPath,
  sourceHash,
  savedBy: 'start-read-aloud-review.mjs',
  generatedAt: new Date().toISOString(),
  feedbackPath,
  priorRound: priorRound ? { savedAt: priorRound.savedAt, beatCount: priorRound.beatCount, orphaned: priorRound.orphaned } : null,
  invalidated: invalidated ? { reason: invalidated.reason, previousSavedAt: invalidated.previousSavedAt || null } : null,
}, null, 2) + '\n', 'utf8');

/* ------------------------------------------------------------------ *
 * 交给公共缝：surface（这个面是什么）+ 宿主（谁 serve、谁落盘、谁叫醒模型）。
 * 起/复用/判死活/停干净全在模组的 Node CLI 里，本文件一行都不实现。
 * ------------------------------------------------------------------ */
const { moduleScript } = await import('./lib/planners-modules.mjs');
const reviewSurface = await import('./review-surface.mjs');
const { openReview } = await import(moduleScript('planners-review-core', 'scripts/review-host.mjs'));

reviewSurface.writeSurface(reviewDir, { title: documentTitle });

if (process.argv.includes('--surface-only') || process.argv.includes('--no-host')) {
  const surface = reviewSurface.surfaceOnly(reviewDir, { title: documentTitle });
  console.log(JSON.stringify({
    url: null,
    feedback_path: feedbackPath,
    source_hash: sourceHash,
    screens: screenMap.size,
    asset_roots: uniqueRoots,
    pid: null,
    invalidated_feedback: invalidated,
    prior_round_flagged_beats: priorRound ? Object.keys(priorRound.flagged) : [],
    prior_round_orphaned_beats: priorRound ? priorRound.orphaned : [],
    ...surface,
  }, null, 2));
} else {
  const shouldOpen = !args.noOpen && process.env.REVIEW_TEST_NO_OPEN !== '1';
  const state = await openReview(reviewSurface.surfacePath(reviewDir), requestedPort, shouldOpen);
  console.log(JSON.stringify({
    url: state.url,
    feedback_path: feedbackPath,
    submissions_path: reviewSurface.submissionsPath(reviewDir),
    source_hash: sourceHash,
    screens: screenMap.size,
    asset_roots: uniqueRoots,
    pid: state.pid,
    port: state.port,
    started: state.started,
    reused: state.reused,
    opened: state.opened,
    surface: state.surface,
    invalidated_feedback: invalidated,
    prior_round_flagged_beats: priorRound ? Object.keys(priorRound.flagged) : [],
    prior_round_orphaned_beats: priorRound ? priorRound.orphaned : [],
    next_action_zh: '作者在页面上保存后：先跑 scripts/review-inbox.mjs 收件，再按 stages/05 处理反馈。',
  }, null, 2));
}
