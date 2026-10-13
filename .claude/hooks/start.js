#!/usr/bin/env node
// Session start: bring HQ and every lab level with GitHub (cloning the labs this machine has not got), then say who this
// session is, the next job, and what is on the desk and the board. A red line only when something is wrong. Never blocks.
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');

const input = L.hookInput();
const cwd = path.resolve(input.cwd || process.cwd());
if (L.standAside(cwd)) process.exit(0);

const { ROOT, red } = L;
const cfg = L.config();
const CAP = 3072;
const out = [];

// 1. Level with GitHub. Only ever a fast-forward; an uncommitted edit in its way is named, never forced or stashed.
function sync(name, dir) {
  try {
    if (!L.git(dir, 'remote')) return '';
    try { L.git(dir, 'fetch', '--quiet'); }
    catch (e) { return red(`${name}: git fetch failed: ${(e.stderr || '').toString().trim().split('\n').pop()}`); }
    let counts; try { counts = L.git(dir, 'rev-list', '--left-right', '--count', 'HEAD...@{u}'); } catch { return `${name}: no upstream branch yet`; }
    const [ahead, behind] = counts.split(/\s+/).map(Number);
    if (!behind) return ahead ? `${name}: ${ahead} unpushed` : '';
    if (ahead) return red(`${name}: diverged (${ahead} ahead, ${behind} behind), not touched`);
    try { L.git(dir, 'merge', '--ff-only', '--quiet', '@{u}'); }
    catch (e) {
      const list = (...a) => L.git(dir, ...a).split('\n').filter(Boolean);
      const mine = new Set([...list('diff', '--name-only', 'HEAD'), ...list('ls-files', '--others', '--exclude-standard')]);
      const inWay = list('diff', '--name-only', 'HEAD', '@{u}').filter((f) => mine.has(f));
      return red(`${name}: ${behind} behind, not pulled: ${inWay.length ? `uncommitted edits in the way (${inWay.join(', ')})` : (e.stderr || '').toString().trim().split('\n').pop()}`);
    }
    return `${name}: pulled ${behind}`;
  } catch (e) { return red(`${name}: sync check failed: ${(e.message || '').split('\n')[0]}`); }
}
const synced = [sync('HQ', ROOT)];
const list = L.labs();
const missing = [];
for (const rel of list) {
  const dir = L.labDir(rel);
  if (fs.existsSync(path.join(dir, '.git'))) { synced.push(sync(rel, dir)); continue; }
  if (fs.existsSync(dir) && fs.readdirSync(dir).some((f) => !list.includes(`${rel}/${f}`))) { synced.push(red(`${rel}: a folder is here but not its repo, not touched`)); continue; }
  missing.push(rel);
}
if (missing.length && cfg.githubOwner) {
  require('child_process').spawn(process.execPath, [path.join(__dirname, 'clone.js'), ...missing], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  synced.push(`cloning in the background: ${missing.join(', ')}`);
} else if (missing.length) synced.push(red(`listed but not here, and no githubOwner in hq.json to clone them from: ${missing.join(', ')}`));

// 2. HQ's own card stays small.
let bytes = 0;
try { bytes = Buffer.byteLength(L.read(path.join(ROOT, 'CLAUDE.md')), 'utf8'); } catch { /* said below */ }
out.push(`HQ: CLAUDE.md ${bytes}/${CAP} B · director: ${cfg.director}${synced.filter(Boolean).length ? ' · ' + synced.filter(Boolean).join(' · ') : ''}`);
if (!bytes) out.push(red('HQ: CLAUDE.md missing'));
if (bytes > CAP) out.push(red(`CLAUDE.md is over its cap by ${bytes - CAP} B: cut it before anything else`));
if (cfg.director === 'the director') out.push(red('hq.json has no director name yet: run node setup.mjs --director "<name>"'));

// 3. Who this session is. HQ opens as its own role (Jarvis): it talks with the director and hands each job to a lab.
// A lab opens as its Role line; "none" means the lab above holds it, and with no lab above, HQ's role does.
const hqRole = L.roleOf(ROOT) || 'Jarvis';
const onDisk = [];
(function walk(d, r) {
  try {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f), rr = r ? `${r}/${f}` : f;
      if (f.startsWith('.') || !fs.statSync(p).isDirectory()) continue;
      if (fs.existsSync(path.join(p, 'NOW.md'))) onDisk.push(rr);
      if (rr.split('/').length < 4) walk(p, rr);
    }
  } catch { /* no labs yet */ }
})(path.join(ROOT, 'labs'), '');
const unlisted = onDisk.filter((h) => !list.includes(h));
if (unlisted.length) out.push(red(`labs on disk but not in .claude/labs.list, so no other machine gets them: ${unlisted.join(', ')}`));
const below = (prefix) => list.filter((h) => h.startsWith(prefix) && !h.slice(prefix.length).includes('/'))
  .map((h) => `${L.roleOf(L.labDir(h)) || 'no role yet'} (${h.slice(prefix.length)}): ${L.nextStep(L.labDir(h)) || 'no next step'}`);
const lab = L.labAt(cwd);
if (lab) {
  let who = '', from = '';
  for (let parts = lab.split('/'); parts.length; parts.pop()) { who = L.roleOf(L.labDir(parts.join('/'))); if (who) { from = parts.join('/'); break; } }
  const face = !who ? `${hqRole}, holding labs/${lab} until the director gives it a role of its own`
    : from === lab ? `${who}, in labs/${lab}` : `${who}, holding labs/${lab} (a lab under yours) until the director gives it a role of its own`;
  const kids = below(lab + '/');
  out.push(`You are ${face}. One job, in this lab only: a lab knows down, never up, so what you need from outside goes back to ${hqRole} at HQ. Read CLAUDE.md, NOW.md, LESSONS.md and DECISIONS.md before anything (ONBOARDING.md first, while it is there). Next step on record: ${L.nextStep(L.labDir(lab)) || 'none written'}.${kids.length ? ` Labs below: ${kids.join(' · ')}.` : ''}`);
} else {
  const team = below('');
  out.push(`You are ${hqRole}, ${cfg.director}'s interface at HQ. You talk with the director, shape the work with them, and hand each job to the right role: one job per session, opened in that role's lab. The next job, from NOW.md: ${L.nextStep(ROOT) || 'none written: write one'}. State it; never ask what to do next. The team: ${team.join(' · ') || 'nobody recruited yet (/recruit)'}.`);
}

// 4. The desk: what waits on the director, and what they answered. In a lab, its own answers are the first job.
try {
  const { cards, replies, bad } = L.readDesk();
  const answered = cards.filter((c) => replies[c.id] && replies[c.id].v !== 'later');
  const said = (cs) => cs.map((c) => { const r = replies[c.id]; return `${c.id}: ${r.label || r.v}${r.note ? ` ("${r.note}")` : ''}`; }).join(' · ');
  const seg = lab ? lab.split('/').pop() : 'hq';
  const mine = answered.filter((c) => c.from === seg);
  if (mine.length) out.push(red(`${cfg.director} answered this ${lab ? 'lab' : 'HQ'}'s cards on the desk. Before anything else, act on them: a keep goes in DECISIONS.md as DECIDED with the director's words, a wrong, a problem or a comment with something to do becomes the next step in NOW.md (or gets done), a done means carry on. Then delete the card, its reply and its pictures (desk/cards/<id>.json, desk/replies/<id>.json, desk/pics/<id>/). ${said(mine)}`));
  const rest = answered.filter((c) => c.from !== seg);
  out.push(`desk: ${cards.length - answered.length} card${cards.length - answered.length === 1 ? '' : 's'} waiting on ${cfg.director}${rest.length ? `; answered, for the lab that sent each: ${said(rest)}` : ''}. Anything for the director to decide or look at goes on the desk as a card (desk/README.md), never as a list in chat.`);
  if (bad.length) out.push(red(`desk: not readable JSON: ${bad.join(', ')}`));
} catch { /* no desk */ }

// 5. The board: what needs the director, what waits for a tap.
try {
  const { cards } = L.readBoard();
  const need = cards.filter((c) => c.state === 'needs-director'), tap = cards.filter((c) => c.state === 'pinned' && c.from !== 'director' && !c.tapped);
  if (need.length || tap.length) out.push(`board: ${need.length} need the director, ${tap.length} wait for a tap${need.length ? ` (${need.map((c) => c.task).join(' · ')})` : ''}`);
} catch { /* no board */ }

// 6. A second session in a folder that already has one working spends double and disagrees. A transcript of this folder
// touched in the last 15 minutes (and older than a minute, so this session's own does not count) is live.
try {
  const tdir = path.join(require('os').homedir(), '.claude', 'projects', cwd.replace(/[^a-zA-Z0-9]/g, '-'));
  const live = fs.readdirSync(tdir).filter((f) => { const age = Date.now() - fs.statSync(path.join(tdir, f)).mtimeMs; return f.endsWith('.jsonl') && age > 60000 && age < 15 * 60000; }).length;
  if (live) out.push(red('another session worked in this folder in the last 15 minutes: say so, and suggest using that one unless this is a different job'));
} catch { /* no transcripts yet */ }

console.log(out.join('\n'));
