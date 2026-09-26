#!/usr/bin/env node
/**
 * 收件：把审阅面提交的那**一份**文件翻译回本 Skill 自己的形状。
 *
 * ## 为什么需要这一层
 *
 * 缝的 `write` 是覆盖写一份文件；本 Skill 的原生记录 `feedback.json` 有自己的形状
 * （`{version, sourceHash, scriptPath, visualPlanPath, savedAt, overallDecision, overallFeedback, beats}`），
 * 而且页面上报的**前提**（"这一轮是在上一轮作废之后写的"、"哪几段是默认通过、人没碰"）
 * 不属于这个形状 —— R5b 要求它在**数据里**，形状又不许变。所以：
 *
 *   · 提交文件（`review-submissions.json`）= 页面写的全部，含前提；
 *   · 收件层 = 白名单出原生形状（**一个字段不多、一个不少**）+ 把前提写进**收据**给模型；
 *   · 顺带把身份补齐（`version` / `scriptPath` / `visualPlanPath` / `savedAt` 来自生成器写的
 *     `review-context.json`）—— 这三件事原先是那个 HTTP 服务端替页面填的。
 *
 * ## 幂等
 *
 * 原生记录只有"当前轮"这一份（没有轮次历史），同一份提交收两次结果一样，所以不需要游标。
 * 但保存前的**语义检查**要保留：现有 `feedback.json` 的指纹若与这次提交的不同，
 * 说明它是另一版稿子留下的 → 备份成 `feedback.previous.json` 并**在收据里说出来**
 * （这是本 Skill 原有的"作废要出声"语义，位置从页面挪到了收件层）。
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FEEDBACK_REL, contextPath, feedbackPath, resolveSurfacePaths, surfacePath } from './review-surface.mjs';

const VOCABULARY = new Set(['approve', 'revise', 'cut']);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** 提交里属于"缝/页面"的东西：进收据，不进原生记录。 */
const SUBMISSION_ONLY = ['reviewState', 'pre_check', 'pre_check_note'];

function problems(doc) {
  const out = [];
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return ['提交不是对象'];
  if (doc.overallDecision !== undefined && typeof doc.overallDecision !== 'string') out.push('overallDecision 必须是字符串');
  if (doc.overallFeedback !== undefined && typeof doc.overallFeedback !== 'string') out.push('overallFeedback 必须是字符串');
  if (doc.sourceHash !== undefined && !/^[a-f0-9]{64}$/.test(doc.sourceHash)) out.push('sourceHash 必须是 64 位小写十六进制');
  if (doc.beats !== undefined) {
    if (!doc.beats || typeof doc.beats !== 'object' || Array.isArray(doc.beats)) out.push('beats 必须是对象');
    else for (const [id, beat] of Object.entries(doc.beats)) {
      if (!beat || typeof beat !== 'object') { out.push(`${id} 不是对象`); continue; }
      if (typeof beat.status !== 'string' || !beat.status) out.push(`${id}.status 必须是非空字符串`);
      if (beat.spokenNotes !== undefined && typeof beat.spokenNotes !== 'string') out.push(`${id}.spokenNotes 必须是字符串`);
      if (beat.visualNotes !== undefined && typeof beat.visualNotes !== 'string') out.push(`${id}.visualNotes 必须是字符串`);
    }
  }
  return out;
}

export function importSubmission(surfaceFile) {
  const paths = resolveSurfacePaths(surfaceFile);
  const reviewDir = paths.dir;
  const receipt = {
    ok: true,
    surface: paths.surface,
    review_dir: reviewDir,
    submissions: paths.submissions,
    feedback: feedbackPath(reviewDir),
    imported: null,
    invalidated: null,
    rejected: [],
  };
  if (!paths.submissions || !existsSync(paths.submissions)) {
    receipt.skipped = '还没有提交：' + String(paths.submissions);
    receipt.next_action_zh = '作者还没在审阅页上保存（或宿主还没落盘）。';
    return receipt;
  }
  let submission;
  try {
    submission = readJson(paths.submissions);
  } catch (error) {
    receipt.ok = false;
    receipt.rejected.push('提交文件不是合法 JSON：' + error.message);
    return receipt;
  }
  const found = problems(submission);
  if (found.length) {
    receipt.ok = false;
    receipt.rejected.push(...found);
    receipt.next_action_zh = '这份提交没被收下（形状不合本 Skill 的契约）—— 上面每条都说明哪里不对。';
    return receipt;
  }

  // R5b：页面知道、但机器看不见的前提 —— 带进收据（影响模型怎么读这份数据）。
  if (submission.reviewState && typeof submission.reviewState === 'object') receipt.review_state = submission.reviewState;
  // 页面把"没做版本核对"写在 reviewState 里（也可能直接写在顶层）—— 两处都认。
  const preCheck = submission.pre_check === false || (submission.reviewState && submission.reviewState.preCheck === false);
  if (preCheck) {
    receipt.pre_check = false;
    receipt.pre_check_note = String(submission.pre_check_note
      || (submission.reviewState && submission.reviewState.preCheckNote)
      || '提交方声明：没有经过版本前置核对。');
  }
  // 词表外的取值照样收（旧文件里真有），但**出声**：模型得知道它不在当前词表里。
  const offVocabulary = Object.entries(submission.beats || {})
    .filter(([, beat]) => beat && typeof beat.status === 'string' && !VOCABULARY.has(beat.status))
    .map(([id]) => id);
  if (offVocabulary.length) receipt.off_vocabulary_beats = offVocabulary;

  const context = existsSync(contextPath(reviewDir)) ? readJson(contextPath(reviewDir)) : {};
  // 上一轮有些意见挂的 beat_id 在本版稿子里已经不存在（标题改了/段落删了）：
  // 那些意见**没有被收进这一轮**，模型必须知道（否则它会以为"没人提过"）。
  if (context.priorRound && Array.isArray(context.priorRound.orphaned) && context.priorRound.orphaned.length) {
    receipt.orphaned_prior_beats = context.priorRound.orphaned;
    receipt.orphaned_note = '上一轮这些 Beat 的意见对不上本版任何一段（beat_id 变了或被删）：'
      + context.priorRound.orphaned.join('、') + '。它们只留在 feedback.previous.json 里，没有被带进这一轮。';
  }
  const existing = feedbackPath(reviewDir);
  if (existsSync(existing)) {
    try {
      const previous = readJson(existing);
      if (previous.sourceHash && submission.sourceHash && previous.sourceHash !== submission.sourceHash) {
        const backup = resolve(reviewDir, 'feedback.previous.json');
        writeFileSync(backup, readFileSync(existing, 'utf8'));
        receipt.invalidated = {
          reason: '现有 feedback.json 绑的是另一版稿子/契约/样张（指纹已变），本轮不沿用',
          backupPath: backup,
          previousSavedAt: previous.savedAt || null,
        };
      }
    } catch { /* 现有文件坏了：不动它，收件照样进行 */ }
  }

  // 原生形状：白名单 + 身份补齐。**字段一个不多、一个不少。**
  const native = {
    version: '2.0.0',
    sourceHash: submission.sourceHash || context.sourceHash || null,
    scriptPath: context.scriptPath || null,
    visualPlanPath: context.visualPlanPath || null,
    savedAt: new Date().toISOString(),
    overallDecision: submission.overallDecision || 'approve',
    overallFeedback: typeof submission.overallFeedback === 'string' ? submission.overallFeedback : '',
    beats: {},
  };
  for (const [id, beat] of Object.entries(submission.beats || {})) {
    native.beats[id] = {
      status: beat.status,
      spokenNotes: typeof beat.spokenNotes === 'string' ? beat.spokenNotes : '',
      visualNotes: typeof beat.visualNotes === 'string' ? beat.visualNotes : '',
    };
  }
  if (context.sourceHash && submission.sourceHash && context.sourceHash !== submission.sourceHash) {
    receipt.hash_mismatch = { submission: submission.sourceHash.slice(0, 12), context: context.sourceHash.slice(0, 12) };
  }
  writeFileSync(existing, JSON.stringify(native, null, 2) + '\n', 'utf8');
  receipt.imported = {
    feedback: relativeTo(reviewDir, existing),
    beats: Object.keys(native.beats).length,
    overall_decision: native.overallDecision,
    source_hash: native.sourceHash,
    dropped_submission_fields: SUBMISSION_ONLY.filter((key) => key in submission),
  };
  receipt.next_action_zh = '收件完成：按 stages/05-read-aloud-review-and-handoff.md 逐 Beat 分诊'
    + '（口播问题进 spokenNotes、画面问题进 visualNotes、status 的 revise/cut 决定改哪儿）。';
  return receipt;
}

function relativeTo(base, target) {
  return resolve(target).startsWith(resolve(base)) ? resolve(target).slice(resolve(base).length + 1) : resolve(target);
}

export function main(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[argv[i]] = argv[i + 1];
  const surfaceFile = args['--surface']
    ? resolve(args['--surface'])
    : args['--review-dir'] ? surfacePath(resolve(args['--review-dir'])) : null;
  if (!surfaceFile || !existsSync(surfaceFile)) {
    process.stdout.write(JSON.stringify({ ok: false, error: '用法：review-inbox.mjs --surface <review-surface.json>（或 --review-dir <审阅目录>）' }) + '\n');
    return 2;
  }
  const receipt = importSubmission(surfaceFile);
  process.stdout.write(JSON.stringify(receipt, null, 1) + '\n');
  return receipt.ok ? 0 : 1;
}

if (process.argv[1] && process.argv[1].endsWith('review-inbox.mjs')) process.exit(main());

/** 给测试用的小工具：一份提交的内容哈希（判"是不是同一份"）。 */
export function submissionHash(surfaceFile) {
  const paths = resolveSurfacePaths(surfaceFile);
  if (!paths.submissions || !existsSync(paths.submissions)) return null;
  return createHash('sha256').update(readFileSync(paths.submissions)).digest('hex');
}
