#!/usr/bin/env node
// End of every reply, and session end: commit and push the notes, so no session has to remember to save. A session left
// open for days never "ends", so the reply trigger is the one that does the work; it costs a git status when nothing
// changed. Only notes are committed: what is true today, what was decided, the desk and the board. Code is never
// committed here, not even if already staged; a commit of code is the director's, or asked for.
// Never blocks, never forces: a refused push (another machine got there first) is left for the start hook to report.
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');

const input = L.hookInput();
if (L.standAside(path.resolve(input.cwd || process.cwd()))) process.exit(0);

const NOTES = { HQ: { cwd: L.ROOT, files: ['CLAUDE.md', 'NOW.md', 'DECISIONS.md', 'LESSONS.md', 'docs/TEAM.md', 'desk', 'board'] } };
for (const rel of L.labs()) NOTES[rel] = { cwd: L.labDir(rel), files: ['CLAUDE.md', 'NOW.md', 'DECISIONS.md', 'LESSONS.md', 'ONBOARDING.md'] };

const out = [];
for (const [name, { cwd, files }] of Object.entries(NOTES)) {
  try {
    if (!fs.existsSync(path.join(cwd, '.git'))) continue;
    // A note deleted on purpose (ONBOARDING.md when done, a cleared desk card) is committed as a deletion too.
    const tracked = new Set(L.git(cwd, 'ls-files').split('\n'));
    const paths = files.filter((f) => fs.existsSync(path.join(cwd, f)) || [...tracked].some((t) => t === f || t.startsWith(f + '/')));
    if (!paths.length || !L.git(cwd, 'status', '--porcelain', '--', ...paths)) continue;
    L.git(cwd, 'add', '-A', '--', ...paths);
    const when = new Date().toISOString().slice(0, 16).replace('T', ' ');
    // Naming the paths commits those files only, so anything else already staged stays out of this commit.
    L.git(cwd, 'commit', '--quiet', '-m', `notes: ${when}`, '-m', 'Written by the end hook: notes, desk and board only.', '--', ...paths);
    if (!L.git(cwd, 'remote')) { out.push(`${name}: notes committed, no remote to push to`); continue; }
    try { L.git(cwd, 'push', '--quiet'); out.push(`${name}: notes pushed`); }
    catch (e) { out.push(`${name}: notes committed, push refused (${(e.stderr || '').toString().trim().split('\n').pop()}); the start hook will say so`); }
  } catch (e) { out.push(`${name}: save failed: ${(e.message || '').split('\n')[0]}`); }
}
if (out.length) console.log(out.join(' · '));
