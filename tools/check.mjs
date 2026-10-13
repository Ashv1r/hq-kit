#!/usr/bin/env node
// Checks the whole of HQ: its own notes, every listed lab, the desk, the board and the team table.
//   node tools/check.mjs
// Exits 1 on any failure. Zero dependencies.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import L from '../.claude/hooks/lib.js';

const ROOT = L.ROOT, fail = [], ok = [];
const lab = (dir) => {
  try { return { ok: true, out: execFileSync(process.execPath, [path.join(ROOT, 'templates', 'check-lab.mjs'), dir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }; }
  catch (e) { return { ok: false, out: ((e.stdout || '') + (e.stderr || '')).toString().trim() }; }
};

// HQ itself
const cfg = L.config();
if (cfg.director === 'the director') fail.push('hq.json: no director name (node setup.mjs --director "<name>")');
const claude = L.read(path.join(ROOT, 'CLAUDE.md'));
const bytes = Buffer.byteLength(claude, 'utf8');
if (bytes > 3072) fail.push(`CLAUDE.md: ${bytes} B, over the 3072 B cap`);
const rules = (claude.match(/^## Rules\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m) || ['', ''])[1].split('\n').filter((l) => /^\s*[-*] /.test(l)).length;
if (rules > 10) fail.push(`CLAUDE.md: ${rules} rules, max 10. Remove one to add one`);
if (/\{\{[^}]+\}\}/.test(claude)) fail.push(`CLAUDE.md: still has ${claude.match(/\{\{[^}]+\}\}/g).join(', ')} (node setup.mjs, or edit by hand)`);
const hq = lab(ROOT);
(hq.ok ? ok : fail).push(hq.ok ? 'HQ notes: ok' : hq.out);

// every listed lab
const labs = L.labs();
for (const rel of labs) {
  const dir = L.labDir(rel);
  if (!existsSync(dir)) { fail.push(`labs/${rel}: listed but not on this machine (the start hook clones it)`); continue; }
  const r = lab(dir); (r.ok ? ok : fail).push(r.ok ? `labs/${rel}: ok` : r.out);
}

// the team table names every lab
const team = L.read(path.join(ROOT, 'docs', 'TEAM.md'));
const section = (team.split(/^## The team\s*$/m)[1] || '').split(/^## /m)[0];
for (const rel of labs) if (!section.includes(`| labs/${rel} |`)) fail.push(`docs/TEAM.md: no row for labs/${rel}`);

// the desk
const KINDS = ['look', 'try', 'choose', 'design', 'rule', 'do'];
const froms = new Set(['hq', ...labs.map((r) => r.split('/').pop())]);
const desk = L.readDesk();
for (const f of desk.bad) fail.push(`${f}: not readable JSON`);
for (const c of desk.cards) {
  const where = `desk/cards/${c.id}.json`;
  if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(c.id)) fail.push(`${where}: the id is lowercase words joined by hyphens`);
  if (!KINDS.includes(c.kind)) fail.push(`${where}: kind "${c.kind}" is not one of ${KINDS.join(', ')}`);
  if (!c.title) fail.push(`${where}: no title`);
  if (!froms.has(c.from)) fail.push(`${where}: from "${c.from}" is not hq or a listed lab's folder name`);
  if (c.kind === 'choose' && !(c.options || []).length) fail.push(`${where}: a choose card needs options`);
  if (c.kind === 'do' && !(c.steps || []).length) fail.push(`${where}: a do card needs steps`);
  for (const p of c.pictures || []) if (!existsSync(path.join(ROOT, 'desk', 'pics', c.id, p.src))) fail.push(`${where}: picture ${p.src} is not in desk/pics/${c.id}/`);
}
for (const id of Object.keys(desk.replies)) if (!desk.cards.some((c) => c.id === id)) fail.push(`desk/replies/${id}.json: an answer with no card (delete it with its card)`);

// the board
const STATES = ['pinned', 'taken', 'done', 'needs-director'];
const board = L.readBoard();
for (const f of board.bad) fail.push(`${f}: not readable JSON`);
for (const c of board.cards) {
  if (!c.task) fail.push(`board/cards/${c.id}.json: no task`);
  if (!STATES.includes(c.state)) fail.push(`board/cards/${c.id}.json: state "${c.state}" is not one of ${STATES.join(', ')}`);
  if (c.lab && !labs.includes(c.lab)) fail.push(`board/cards/${c.id}.json: lab "${c.lab}" is not in .claude/labs.list`);
}

console.log(ok.map((s) => '  ' + s).join('\n'));
console.log(`  desk: ${desk.cards.length} card${desk.cards.length === 1 ? '' : 's'}, ${Object.keys(desk.replies).length} answered · board: ${board.cards.length} card${board.cards.length === 1 ? '' : 's'}`);
if (fail.length) { console.error('HQ check failed:\n' + fail.map((s) => '  - ' + s.replace(/\n/g, '\n    ')).join('\n')); process.exit(1); }
console.log('HQ check: ok');
