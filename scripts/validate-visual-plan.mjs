#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const planPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
const scriptFlag = process.argv.indexOf('--script');
const scriptPath = scriptFlag >= 0 && process.argv[scriptFlag + 1] ? path.resolve(process.argv[scriptFlag + 1]) : null;
if (!planPath) { console.error('Usage: node validate-visual-plan.mjs <visual-plan.json> [--script script.md]'); process.exit(1); }

let plan;
try { plan = JSON.parse(fs.readFileSync(planPath, 'utf8')); }
catch (error) { console.error(`Invalid JSON: ${error.message}`); process.exit(2); }

const errors = [];
const warnings = [];
const ids = new Set();
const beatIds = new Set();
const LAYOUTS = new Set(['hero', 'grid', 'single', 'text']);
const ASSET_KINDS = new Set(['image', 'csv', 'html', 'glob', 'video']);
// The first group is this contract's own retired framework fields.
// The second group (screenIntent / visualModel / modelStructure / onScreenTextRule /
// states and their snake_case spellings) are names owned by craft's grouping; rejected
// here because the content contract carries no layout decisions. The names are kept in
// code as the enforcement list; the contract document must not be a second home for them.
const forbidden = [
  'viewer_should_understand', 'information_to_show', 'information_surplus',
  'evidence_refs', 'information_not_to_lose', 'known_assets',
  'screenIntent', 'visualModel', 'modelStructure', 'onScreenTextRule',
  'visual_model', 'model_structure', 'states', 'cue_phrase', 'cue_relation',
  'animation', 'startMs', 'durationMs', 'layout',
  'palette', 'fontFamily', 'transition', 'keyframes',
];

if (plan.contract_version !== '5.0') {
  if (plan.contract_version === '4.0') warnings.push('contract_version 4.0 is legacy: screens carry no sample, the review page cannot show a screen demo');
  else errors.push('contract_version must be "5.0"');
}
const screens = plan.screens || plan.blueprints;
if (!Array.isArray(screens) || !screens.length) errors.push('screens must be a non-empty array');
if (!plan.screens && plan.blueprints) warnings.push('blueprints is the legacy key; rename it to screens');
if ('visuals' in plan) errors.push('visuals is obsolete; use one screen per Speech Beat in screens');

for (const [index, screen] of (screens || []).entries()) {
  const label = `screens[${index}]`;
  const screenId = screen.screen_id || screen.blueprint_id;
  if (!screenId) errors.push(`${label}.screen_id is required`);
  else if (ids.has(screenId)) errors.push(`duplicate screen_id: ${screenId}`);
  else ids.add(screenId);
  if (screen.screen_id && screen.blueprint_id) warnings.push(`${label} carries both screen_id and blueprint_id; keep screen_id only`);
  if (!String(screen.beat_id || '').trim()) errors.push(`${label}.beat_id is required`);
  else if (beatIds.has(screen.beat_id)) errors.push(`beat_id may have only one screen: ${screen.beat_id}`);
  else beatIds.add(screen.beat_id);
  if ('related_beat_ids' in screen) errors.push(`${label}.related_beat_ids is forbidden; one screen must bind exactly one beat_id`);
  if (!String(screen.title || '').trim()) errors.push(`${label}.title is required`);
  if (!String(screen.question || '').trim()) errors.push(`${label}.question is required`);
  if (!Array.isArray(screen.must_show)) errors.push(`${label}.must_show must be an array (it may be empty: a screen with no on-screen text is legal)`);
  for (const key of ['must_express', 'exact_labels', 'evidence']) {
    if (key in screen && (!Array.isArray(screen[key]) || screen[key].some((item) => typeof item !== 'string'))) {
      errors.push(`${label}.${key} must be an array of strings`);
    }
  }
  for (const key of forbidden) if (key in screen) errors.push(`${label}.${key} belongs to craft's grouping and is forbidden here: the content contract carries no layout decisions`);

  const hasSample = 'sample' in screen;
  const sample = hasSample ? screen.sample : null;
  let sampleAssets = [];
  let sampleCaptions = [];
  if (!hasSample) {
    warnings.push(`${label} has no sample; the review page will show this screen's contract and the spoken copy only`);
  } else if (!sample || typeof sample !== 'object') {
    errors.push(`${label}.sample must be an object`);
  } else {
    const slabel = `${label}.sample`;
    if (!LAYOUTS.has(sample.layout)) errors.push(`${slabel}.layout must be one of: ${[...LAYOUTS].join(', ')}`);
    if (Array.isArray(sample.captions)) sampleCaptions = sample.captions;
    else if (sample.captions != null) errors.push(`${slabel}.captions must be an array of strings (omit the key when the screen has no on-screen text)`);
    if (sample.note != null && typeof sample.note !== 'string') errors.push(`${slabel}.note must be a string`);
    if (sample.cols != null && (!Number.isInteger(sample.cols) || sample.cols < 1 || sample.cols > 6)) errors.push(`${slabel}.cols must be an integer 1-6`);
    if (sample.thumbCols != null && (!Number.isInteger(sample.thumbCols) || sample.thumbCols < 1 || sample.thumbCols > 4)) errors.push(`${slabel}.thumbCols must be an integer 1-4`);
    // The contract marks assets[] as "required except for layout text", so a text screen may
    // omit the key entirely; only a non-text screen must carry it.
    const assets = 'assets' in sample ? sample.assets : (sample.layout === 'text' ? [] : null);
    if (!Array.isArray(assets)) {
      errors.push(`${slabel}.assets must be an array`);
    } else {
      sampleAssets = assets;
      if (sample.layout === 'text' && assets.length) errors.push(`${slabel} uses layout "text" but declares assets`);
      if (sample.layout !== 'text' && !assets.length) errors.push(`${slabel} declares no assets; use layout "text" for a text-only screen`);
      for (const [assetIndex, asset] of assets.entries()) {
        const alabel = `${slabel}.assets[${assetIndex}]`;
        if (!ASSET_KINDS.has(asset.kind)) errors.push(`${alabel}.kind must be one of: ${[...ASSET_KINDS].join(', ')}`);
        if (!String(asset.path || '').trim()) errors.push(`${alabel}.path is required (relative to an asset root)`);
        if (!String(asset.label || '').trim()) errors.push(`${alabel}.label is required`);
        if (asset.mark) {
          const { cols, rows, index: cell } = asset.mark;
          if (!Number.isInteger(cols) || !Number.isInteger(rows) || !Number.isInteger(cell)) errors.push(`${alabel}.mark needs integer cols, rows and index`);
          else if (cell < 1 || cell > cols * rows) errors.push(`${alabel}.mark.index ${cell} is outside a ${cols}x${rows} sheet`);
        }
        if (asset.zoom) {
          const { x, y, w, h } = asset.zoom;
          for (const [key, value] of Object.entries({ x, y, w, h })) {
            if (typeof value !== 'number' || value < 0 || value > 100) errors.push(`${alabel}.zoom.${key} must be a number 0-100`);
          }
          if (w <= 0 || h <= 0) errors.push(`${alabel}.zoom needs positive w and h`);
          if (x + w > 100 || y + h > 100) errors.push(`${alabel}.zoom region runs outside the image`);
        }
        if (asset.kind === 'csv' && (!Array.isArray(asset.columns) || !asset.columns.length)) {
          warnings.push(`${alabel} is a csv asset without columns; it will show the first and last column only`);
        }
        if (asset.kind === 'glob' && !Number.isInteger(asset.limit)) warnings.push(`${alabel} is a glob asset without an integer limit; 12 will be used`);
      }
    }
  }

  // The review page must always be able to show something for every screen: the content
  // contract, a picture, or a 花字 layer. A screen that declares none of them is a content
  // defect, not a "not decided yet".
  const showable = (Array.isArray(screen.must_show) && screen.must_show.length > 0)
    || sampleAssets.length > 0
    || sampleCaptions.length > 0;
  if (!showable) {
    errors.push(`${label} declares nothing the review page can show; give must_show, sample.assets or sample.captions`);
  }
}

if (scriptPath) {
  if (!fs.existsSync(scriptPath)) errors.push(`script not found: ${scriptPath}`);
  else {
    const scriptBuffer = fs.readFileSync(scriptPath);
    const hash = crypto.createHash('sha256').update(scriptBuffer).digest('hex');
    if (plan.script_hash !== hash) errors.push(`script_hash mismatch: expected ${hash}`);
    const scriptText = scriptBuffer.toString('utf8');
    const headings = [...scriptText.matchAll(/^##\s+([^\n｜|]+?)(?:\s*[｜|]\s*[^\n]+)?\s*$/gm)];
    const scriptBeatIds = new Set(headings.length
      ? headings.map((match, index) => match[1].trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || `beat-${String(index + 1).padStart(2, '0')}`)
      : ['beat-01']);
    for (const beatId of beatIds) if (!scriptBeatIds.has(beatId)) errors.push(`screen references unknown Speech Beat: ${beatId}`);
  }
} else if (!String(plan.script_hash || '').trim()) warnings.push('script_hash is empty; bind the final script before handoff');

const result = {
  ok: errors.length === 0,
  plan: planPath,
  contract_version: plan.contract_version,
  screens: ids.size,
  beatsWithScreens: beatIds.size,
  samples: (screens || []).filter((screen) => screen.sample).length,
  errors,
  warnings,
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 3);
