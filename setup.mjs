#!/usr/bin/env node
// One-time setup: the director's name, where lab repos live on GitHub, and this copy made yours.
//   node setup.mjs --director "<your name>" [--owner <github user or org>] [--runs "<what you run, one line>"] [--port 4800]
// Writes hq.json, fills the director into CLAUDE.md, and unhooks this copy from the kit's own repo so nothing you
// write ever goes back to it. Safe to run again: it only changes what you pass.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (k) => { const i = argv.indexOf(k); return i < 0 ? undefined : (argv[i + 1] || ''); };
const director = flag('--director'), owner = flag('--owner'), runs = flag('--runs'), port = flag('--port');
if (!director && owner == null && runs == null && port == null) {
  console.log('usage: node setup.mjs --director "<your name>" [--owner <github user or org>] [--runs "<what you run, one line>"] [--port 4800]');
  process.exit(2);
}
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const said = [];

const cfgFile = path.join(ROOT, 'hq.json');
const cfg = existsSync(cfgFile) ? JSON.parse(readFileSync(cfgFile, 'utf8')) : {};
if (director) cfg.director = director.trim();
if (owner != null) cfg.githubOwner = owner.trim();
if (port) cfg.port = Number(port);
cfg.repoPrefix ??= 'lab-';
writeFileSync(cfgFile, JSON.stringify({ director: cfg.director || '', githubOwner: cfg.githubOwner || '', repoPrefix: cfg.repoPrefix, port: cfg.port || 4800 }, null, 2) + '\n');
said.push(`hq.json: director ${cfg.director || '(not set)'}, lab repos ${cfg.githubOwner ? `${cfg.githubOwner}/${cfg.repoPrefix}<lab>, private` : 'local only (no --owner)'}`);

const claudeFile = path.join(ROOT, 'CLAUDE.md');
let claude = readFileSync(claudeFile, 'utf8');
const before = claude;
if (cfg.director) claude = claude.replace(/\{\{DIRECTOR\}\}/g, cfg.director);
if (runs) claude = claude.replace(/\{\{WHAT THE DIRECTOR RUNS, ONE LINE\}\}/g, runs.trim().replace(/\.$/, ''));
if (claude !== before) { writeFileSync(claudeFile, claude); said.push('CLAUDE.md: the director filled in'); }
if (/\{\{[^}]+\}\}/.test(claude)) said.push(`CLAUDE.md still has ${claude.match(/\{\{[^}]+\}\}/g).join(', ')}: run again with ${/RUNS/.test(claude) ? '--runs' : '--director'}, or edit it by hand`);

// This copy is yours: a remote still pointing at the kit is removed, so nothing you write goes back to it.
try {
  const url = git('remote', 'get-url', 'origin');
  if (/\/hq-kit(\.git)?$/.test(url)) {
    git('remote', 'remove', 'origin');
    said.push(`origin removed (it was the kit itself). To keep HQ on GitHub: gh repo create ${cfg.githubOwner || '<you>'}/hq --private --source . --push`);
  }
} catch { /* no git or no origin: nothing to unhook */ }

try {
  if (git('status', '--porcelain', '--', 'hq.json', 'CLAUDE.md')) {
    git('add', '--', 'hq.json', 'CLAUDE.md');
    git('commit', '--quiet', '-m', `Setup: ${cfg.director || 'HQ'}`, '--', 'hq.json', 'CLAUDE.md');
    said.push('committed');
  }
} catch (e) { said.push(`not committed: ${(e.stderr || e.message || '').toString().trim().split('\n').pop()}`); }

console.log(said.map((s, i) => `${i + 1}. ${s}`).join('\n'));
console.log('\nNext: node dashboard/serve.mjs, open http://localhost:' + (cfg.port || 4800) + ', then open Claude Code in this folder. Jarvis answers.');
