/**
 * 公共模组的解析适配器（每个消费方一份）。
 *
 * 「公共模组单独发布成条目」意味着：发布后它们与本 Skill **平铺在同一个 skills 根下**，
 * 所以按名字找兄弟目录即可，不需要任何 runtime 专属路径。开发时它们还在 monorepo 里。
 *
 * 找的顺序（票 11 定的约定）：
 *   ① $PLANNERS_MODULES_HOME/<name>
 *   ② 本 Skill 目录的兄弟：<skills-root>/<name>          ← 发布后的主路径
 *   ③ monorepo：02-skills-library/<分类>/<name>
 *   ④ 都没有 → 报错并给安装提示（**不许静默降级成"跳过校验"**）
 *
 * 本 Skill 只用到 `planners-review-core`（审阅面的契约校验器 + 宿主生命周期）。
 * 自检：node scripts/lib/planners-modules.mjs --check
 */
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));   // <skill>/scripts/lib
const SKILL_ROOT = resolve(HERE, '..', '..');            // <skill>
const SKILLS_ROOT = resolve(SKILL_ROOT, '..');           // 发布后的 skills 根
const REPO_ROOT = resolve(SKILLS_ROOT, '..');

/** monorepo 里所有分类目录（00-system、01-data-analysis、…）。公共模组可以住在任何一类。 */
function repoCategories() {
  try {
    return readdirSync(REPO_ROOT, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && /^\d\d-/.test(entry.name))
      .map(entry => join(REPO_ROOT, entry.name));
  } catch {
    return [];
  }
}

export function moduleCandidates(name) {
  return [
    process.env.PLANNERS_MODULES_HOME ? join(process.env.PLANNERS_MODULES_HOME, name) : null,
    join(SKILLS_ROOT, name),
    ...repoCategories().map(category => join(category, name)),
  ].filter(Boolean);
}

export function resolveModule(name) {
  for (const candidate of moduleCandidates(name)) if (existsSync(candidate)) return candidate;
  throw new Error(
    `找不到公共模组 ${name}。找过：\n  ` + moduleCandidates(name).join('\n  ')
    + `\n装法：把 ${name} 放进同一个 skills 根目录，或设 PLANNERS_MODULES_HOME 指向它所在目录。`,
  );
}

/** 公共模组里的一个脚本的绝对路径 */
export function moduleScript(name, relPath) {
  const target = join(resolveModule(name), relPath);
  if (!existsSync(target)) throw new Error(`公共模组 ${name} 里没有这个脚本：${relPath}`);
  return target;
}

if (process.argv.includes('--check')) {
  for (const name of ['planners-review-core']) {
    try { console.log(`✓ ${name} → ${resolveModule(name)}`); }
    catch (error) { console.log(`✗ ${name}：${String(error.message).split('\n')[0]}`); }
  }
}
