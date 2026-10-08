#!/usr/bin/env node
/**
 * 念稿审阅面的 **surface 文档**（业务）＋写盘＋校验。宿主生命周期不在这里（模组 Node CLI）。
 *
 * 与 planners-bypage 那家的差别只有三处业务事实，**契约与宿主完全不感知**：
 *   · `dir` 是审阅目录本身（页面、本地化样张素材都在里面）；
 *   · 这个面**不上传文件**（作者只写意见），但页面需要把未提交的输入写成草稿，
 *     所以只声明 `draft`，不声明 `asset-upload`；
 *   · 反馈文件的形状是"一份当前轮"（`feedback.json`），没有轮次历史，翻译在收件层。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { moduleScript } from './lib/planners-modules.mjs';

export const SURFACE_REL = 'review-surface.json';
/** 页面提交落在哪：**提交文件**，不是本 Skill 的原生记录。翻译在收件层（`review-inbox.mjs`）。 */
export const SUBMISSIONS_REL = 'review-submissions.json';
/** 页面刷新保护：不属于收件层，模型不能把它当成提交。 */
export const DRAFT_REL = 'review-draft.json';
/** 本 Skill 的原生记录：**一份当前轮**（agent 与 stages/05 读的就是它）。 */
export const FEEDBACK_REL = 'feedback.json';
/** 生成器写下的身份（稿子/契约/指纹/上一轮）：收件层按需取用，不塞进反馈文件。 */
export const CONTEXT_REL = 'review-context.json';
export const ID = 'video-idea-system/read-aloud';

/**
 * `project_root` 相对 surface 文件。本 Skill 的审阅目录有两种历史命名：项目根下的
 * `.video-story`（旧）与 `_idea`（新），再往下 `reviews/script/` —— 两种都是
 * "审阅目录上一级的上一级是项目根"。约定被改掉时退一级（一定是存在的祖先），不假装知道项目根在哪。
 */
export function projectRootRel(reviewDir) {
  const parts = resolve(reviewDir).split(/[\\/]/).filter(Boolean);
  return parts.at(-2) === 'reviews' ? '../../..' : '..';
}

export const surfacePath = (reviewDir) => join(resolve(reviewDir), SURFACE_REL);
export const submissionsPath = (reviewDir) => join(resolve(reviewDir), SUBMISSIONS_REL);
export const draftPath = (reviewDir) => join(resolve(reviewDir), DRAFT_REL);
export const feedbackPath = (reviewDir) => join(resolve(reviewDir), FEEDBACK_REL);
export const contextPath = (reviewDir) => join(resolve(reviewDir), CONTEXT_REL);

export function surfaceDocument(reviewDir, { title = '念稿 · 样张审阅' } = {}) {
  return {
    contract_version: 'review-surface/2.0.0',
    id: ID,
    title,
    description: '一段一屏：左边念的稿、右边这一屏大概的样子；两个反馈框分开写，最后给一个整体决定。',
    project_root: projectRootRel(reviewDir),
    dir: '.',
    entry: 'index.html',
    feedback: SUBMISSIONS_REL,
    draft: DRAFT_REL,
    wake: {
      // 插话（steer → next-step），不进持久队列：提交的语义是"现在就收件"。声明 queue 会排到
      // 当前回合之后 —— 模型正忙时它躺在队列里，界面上同时出现「已送达」与「排队中」两份。
      mode: 'steer',
      text: '念稿审阅有新的提交（{unit}）：先跑 scripts/review-inbox.mjs 收件'
        + '（它把提交翻译成 feedback.json，并把页面报上来的前提带进收据），'
        + '再按 stages/05-read-aloud-review-and-handoff.md 分诊反馈。',
    },
    // 这个面不上传文件：作者只写意见；draft 只保存未提交输入，不进入收件层。
    capabilities: ['draft'],
    // 不声明 watch：页面是**重出**的产物（不是"同页换图"），没有可盯的信号源。
  };
}

export function writeSurface(reviewDir, options) {
  const target = surfacePath(reviewDir);
  mkdirSync(dirname(target), { recursive: true });
  const payload = JSON.stringify(surfaceDocument(reviewDir, options), null, 2) + '\n';
  if (!existsSync(target) || readFileSync(target, 'utf8') !== payload) writeFileSync(target, payload, 'utf8');
  return target;
}

/** 跑公共模组的唯一校验器（Node CLI）。不合规就抛，不自己解释一遍。 */
export function validateSurface(reviewDir) {
  const target = surfacePath(reviewDir);
  if (!existsSync(target)) throw new Error('还没有审阅面：先写 surface，写出 ' + target);
  const result = spawnSync(process.execPath,
    [moduleScript('planners-review-core', 'scripts/validate-surface.mjs'), target, '--text'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('审阅面不合规（' + target + '）：\n' + (result.stdout || result.stderr).trim());
  return { ok: true, output: (result.stdout || '').trim() };
}

/** DSH 侧栏挂载用：surface 的**绝对路径**（宿主只收这个）。 */
export function surfaceOnly(reviewDir, options) {
  const target = writeSurface(reviewDir, options);
  const report = validateSurface(reviewDir);
  return {
    status: 'surface_ready',
    surface: resolve(target),
    entry: resolve(reviewDir, 'index.html'),
    submissions: submissionsPath(reviewDir),
    draft: draftPath(reviewDir),
    host_started: false,
    validator: report.output.split('\n').at(-1),
    next_action_zh: '把 surface 的绝对路径交给宿主的 review_open 工具（有插件时）；'
      + '没有那个工具时用模组的无插件宿主起本地服务。',
  };
}

export function main(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[argv[i]] = argv[i + 1];
  if (!args['--review-dir']) {
    process.stdout.write(JSON.stringify({ ok: false, error: '用法：review-surface.mjs --review-dir <审阅目录>' }) + '\n');
    return 2;
  }
  try {
    const result = surfaceOnly(resolve(args['--review-dir']), {});
    process.stdout.write(JSON.stringify({ ok: true, ...result }, null, 1) + '\n');
    return 0;
  } catch (error) {
    process.stdout.write(JSON.stringify({ ok: false, error: String(error.message || error) }, null, 1) + '\n');
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) process.exit(main());

/** 收件层用：把 surface 里声明的路径解析成绝对路径（相对 surface 文件）。 */
export function resolveSurfacePaths(surfaceFile) {
  const surface = resolve(surfaceFile);
  const doc = JSON.parse(readFileSync(surface, 'utf8'));
  const base = dirname(surface);
  const dir = resolve(base, String(doc.dir || '.'));
  return {
    surface,
    doc,
    dir,
    entry: resolve(dir, String(doc.entry)),
    submissions: doc.feedback ? resolve(base, String(doc.feedback)) : null,
    feedback: (doc.feedback ? resolve(base, String(doc.feedback)) : null),
    draft: doc.draft ? resolve(base, String(doc.draft)) : null,
    projectRoot: resolve(base, String(doc.project_root || '.')),
    contentHash: createHash('sha256').update(readFileSync(surface)).digest('hex').slice(0, 12),
  };
}
