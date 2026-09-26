#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/** 扩展名 → 契约的 kind 枚举 */
function kindOf(extension) {
  if (['.md', '.txt', '.doc', '.docx', '.pdf', '.html', '.htm', '.srt', '.vtt'].includes(extension)) return 'document';
  if (['.xls', '.xlsx', '.csv', '.tsv', '.json'].includes(extension)) return 'workbook';
  if (extension === '.jsonl') return 'corpus';
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.heic'].includes(extension)) return 'image';
  if (['.mp3', '.m4a', '.wav', '.aac', '.mp4', '.mov', '.mkv', '.webm'].includes(extension)) return 'media';
  return 'other';
}

/** 稳定的 source_id：来自相对路径。中文文件名会被剥掉，靠哈希后缀保持唯一。 */
function sourceIdFor(relativePath) {
  const base = path.basename(relativePath).toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 40) || 'file';
  const hash = crypto.createHash('sha1').update(relativePath).digest('hex').slice(0, 6);
  return `src-${base}-${hash}`;
}

const args = process.argv.slice(2);
if (!args[0] || args.includes('--help')) {
  console.log('Usage: node inventory-sources.mjs <project-dir> --output <source-index.json>');
  process.exit(args.includes('--help') ? 0 : 1);
}

const projectDir = path.resolve(args[0]);
const outputIndex = args.indexOf('--output');
const outputPath = path.resolve(outputIndex >= 0 && args[outputIndex + 1]
  ? args[outputIndex + 1]
  : path.join(projectDir, '.video-story', 'source-index.json'));

const ignoredDirs = new Set([
  '.git', '.video-story', 'node_modules', 'dist', 'build', '.next', '.cache',
  'renders', '__pycache__',
]);
const ignoredFiles = new Set(['.DS_Store']);
const usefulExtensions = new Set([
  '.md', '.txt', '.doc', '.docx', '.pdf', '.ppt', '.pptx', '.xls', '.xlsx',
  '.csv', '.tsv', '.json', '.jsonl', '.html', '.htm', '.srt', '.vtt',
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.heic',
  '.mp3', '.m4a', '.wav', '.aac', '.mp4', '.mov', '.mkv', '.webm',
]);

function walk(dir, results) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredFiles.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name) && !absolute.startsWith(path.dirname(outputPath))) {
        walk(absolute, results);
      }
      continue;
    }
    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    if (!usefulExtensions.has(extension)) continue;
    const stat = fs.statSync(absolute);
    const relativePath = path.relative(projectDir, absolute).split(path.sep).join('/');
    results.push({
      source_id: sourceIdFor(relativePath),
      origin: {
        path: relativePath,
        // unread 的来源不必为哈希付代价（几 GB 的视频会在登记这一步白读一遍）；读完再补。
        sha256: null,
        bytes: stat.size,
      },
      kind: kindOf(extension),
      // role 在 unread 时可省 —— 还没读，用途未知。读完必须补。
      audit_layer: { mode: 'source_file', path: null, sha256: null, derived_from_sha256: null, snapshot_sha256: null, method: null, anchor_marks: null },
      coverage: {
        status: 'unread',
        scope: null,
        reason: '清单只证明发现了它，本轮未读',
        impact_if_incomplete: '未读它的内容；任何引用它的结论都还没有依据',
        counts: { bytes: stat.size },
      },
      anchors: [],
      conflicts: [],
      notes: `mtime=${stat.mtime.toISOString()}`,
    });
  }
}

if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
  console.error(`Project directory not found: ${projectDir}`);
  process.exit(2);
}

const sources = [];
walk(projectDir, sources);
sources.sort((a, b) => a.origin.path.localeCompare(b.origin.path, 'zh-CN'));

const payload = {
  contract_version: 'source-index/2.0.0',
  // 清单放在 <project>/.video-story/ 下，所以来源根是它上一级
  source_root: path.relative(path.dirname(outputPath), projectDir).split(path.sep).join('/') || '.',
  index_sha256: null,
  sources,
  // 一句话把「这份清单只证明发现了文件」写进契约，而不是写在自定义的 warning 字段里
  blind_spots: [{
    source_id: null,
    scope: '清单内全部文件的内容',
    reason: '本清单只证明文件被发现，没有读取任何内容',
    impact: '任何引用这些材料的结论都还没有依据；读完一项，就把该来源的 coverage.status 改为 full，并补 origin.sha256 与 role',
  }],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const tempPath = `${outputPath}.tmp`;
fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
fs.renameSync(tempPath, outputPath);
console.log(JSON.stringify({ output: outputPath, discovered: sources.length, contract: 'source-index/2.0.0', unread: sources.length }));
