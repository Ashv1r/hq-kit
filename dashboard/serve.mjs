#!/usr/bin/env node
// The dashboard: one page (index.html, styled by theme.css) with three tabs, Home, Desk and Board. Zero dependencies.
//   node dashboard/serve.mjs            then http://localhost:4800 (the port is in hq.json)
// It listens on this machine only. HOST=0.0.0.0 opens it to your network (a phone on the same wifi, or a private
// network like Tailscale); then anyone who can reach it can answer cards, so never open it to the internet.
// An answer or a tap is written to its file, committed by path, and pushed when HQ has a remote.
import http from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import L from '../.claude/hooks/lib.js';

const ROOT = L.ROOT;
const cfg = L.config();
const HOST = process.env.HOST || '127.0.0.1';
const ID = /^[a-z0-9][a-z0-9-]{0,60}$/;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

const git = (...args) => new Promise((resolve) => execFile('git', args, { cwd: ROOT, windowsHide: true, timeout: 60000 },
  (err, out, errOut) => resolve({ ok: !err, out: String(out).trim(), err: String(errOut || err?.message || '').trim() })));
let queue = Promise.resolve();
// Commit one file by its path (a deletion too), then push if there is somewhere to push to. Never blocks the answer.
function save(rel, msg) {
  queue = queue.then(async () => {
    if (!existsSync(path.join(ROOT, '.git'))) return;
    await git('add', '-A', '--', rel);
    if ((await git('diff', '--cached', '--quiet', '--', rel)).ok) return;
    const c = await git('commit', '--quiet', '-m', msg, '--', rel);
    if (!c.ok) return console.error('commit failed:', c.err);
    if (!(await git('rev-parse', '--abbrev-ref', '@{u}')).ok) return;
    const p = await git('push', '--quiet');
    if (!p.ok) console.error('committed, push refused:', p.err.split('\n').pop());
  }).catch((e) => console.error('could not save to git:', e.message));
}
const fail = (status, message) => Object.assign(new Error(message), { status });
const clean = (s, n) => (s == null ? undefined : String(s).replace(/\p{Cc}/gu, ' ').trim().slice(0, n) || undefined);

async function answer({ id, v, note, choice, label }) {
  if (!ID.test(String(id))) throw fail(404, 'no such card');
  const card = JSON.parse(await readFile(path.join(ROOT, 'desk', 'cards', id + '.json'), 'utf8'));
  const allowed = card.kind === 'do' ? ['done', 'problem', 'later'] : card.kind === 'rule' ? ['keep', 'wrong'] : ['keep', 'wrong', 'later'];
  const rel = `desk/replies/${id}.json`, file = path.join(ROOT, rel);
  if (v == null) { await rm(file, { force: true }); save(rel, `Desk: answer taken back on ${card.title || id}`); return; }
  if (!allowed.includes(v)) throw fail(400, `this card is answered ${allowed.join(', ')}`);
  if ((v === 'wrong' || v === 'problem') && !clean(note, 1000)) throw fail(400, `a ${v} needs a note: say what`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ v, note: clean(note, 1000), choice: clean(choice, 60), label: clean(label, 80), at: new Date().toISOString() }, null, 1) + '\n');
  save(rel, `Desk: ${v}${label ? ` (${clean(label, 40)})` : ''} on ${card.title || id}`);
}

async function tap({ id }) {
  if (!ID.test(String(id))) throw fail(404, 'no such card');
  const rel = `board/cards/${id}.json`, file = path.join(ROOT, rel);
  const card = JSON.parse(await readFile(file, 'utf8'));
  if (card.from === 'director') throw fail(400, 'a card from the director needs no tap');
  if (card.state !== 'pinned') throw fail(400, 'only a pinned card takes a tap');
  if (!card.tapped) {
    card.tapped = new Date().toISOString();
    await writeFile(file, JSON.stringify(card, null, 1) + '\n');
    save(rel, `Board: tapped ${card.task || id}`);
  }
  return card.tapped;
}

// A role's picture, if one is in dashboard/avatars/ (tony-stark.png); the page shows initials without one.
const slug = (n) => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const avatarOf = (n) => { for (const ext of ['png', 'jpg', 'webp', 'svg']) { const f = `dashboard/avatars/${slug(n)}.${ext}`; if (slug(n) && existsSync(path.join(ROOT, f))) return f; } return ''; };

// Home: HQ's role, then every listed lab with its role (or who holds it), what it is, its next step and its state.
function home() {
  const c = L.config(), hq = L.roleOf(ROOT) || 'Jarvis';
  const { cards, replies } = L.readDesk(), board = L.readBoard().cards;
  const labs = L.labs().map((rel) => {
    const dir = L.labDir(rel), role = L.roleOf(dir), seg = rel.split('/').pop();
    let holder = '';
    if (!role) { for (let p = rel.split('/').slice(0, -1); p.length && !holder; p.pop()) holder = L.roleOf(L.labDir(p.join('/'))); holder ||= hq; }
    const here = existsSync(path.join(dir, 'NOW.md'));
    const waiting = cards.filter((k) => k.from === seg && (!replies[k.id] || replies[k.id].v === 'later')).length;
    const working = board.some((k) => k.lab === rel && k.state === 'taken');
    const state = !here ? 'away' : waiting ? 'waiting' : working ? 'working' : existsSync(path.join(dir, 'ONBOARDING.md')) ? 'onboarding' : 'ready';
    return { path: rel, depth: rel.split('/').length, role, avatar: avatarOf(role || holder), title: L.roleTitle(dir), holder, what: L.whatOf(dir), next: L.nextStep(dir), state, waiting, folder: dir };
  }).sort((a, b) => a.path.localeCompare(b.path));
  return { name: c.name, director: c.director, hq: { role: hq, avatar: avatarOf(hq), title: L.roleTitle(ROOT), next: L.nextStep(ROOT), folder: ROOT }, labs };
}

// Recruit from the page: the same /recruit script, its arguments passed as a list (never through a shell).
function recruit({ name, lab, what, role, does }) {
  if (!name || /[,\n]/.test(name) || !L.LAB_PATH.test(String(lab || '')) || !what || !role) throw fail(400, 'a name (no commas), a lab (lowercase words joined by hyphens), what the lab is, and the role');
  const args = [path.join(ROOT, '.claude', 'skills', 'recruit', 'recruit.js'), String(name).slice(0, 60), lab, String(what).slice(0, 200), '--role', String(role).slice(0, 80)];
  if (does) args.push('--does', String(does).slice(0, 200));
  return new Promise((resolve) => execFile(process.execPath, args, { cwd: ROOT, windowsHide: true, timeout: 180000 },
    (err, out, errOut) => resolve({ ok: !err, log: (String(out) + String(errOut)).replace(/\x1b\[[0-9;]*m/g, '').trim() })));
}

// Pin a job from the page: a board card from the director, so it needs no tap.
async function pin({ task, lab }) {
  task = clean(task, 200);
  if (!task || !L.labs().includes(lab)) throw fail(400, 'a task and one of the labs');
  const role = L.roleOf(L.labDir(lab)) || L.roleOf(ROOT) || 'Jarvis';
  const base = `${lab.split('/').pop()}-${task.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}`;
  let id = base, n = 2; while (existsSync(path.join(ROOT, 'board', 'cards', id + '.json'))) id = `${base}-${n++}`;
  const rel = `board/cards/${id}.json`;
  await mkdir(path.join(ROOT, 'board', 'cards'), { recursive: true });
  await writeFile(path.join(ROOT, rel), JSON.stringify({ task, lab, role, from: 'director', state: 'pinned', at: new Date().toISOString() }, null, 1) + '\n');
  save(rel, `Board: pinned ${task}`);
  return id;
}

function body(req, max = 8000) {
  return new Promise((resolve, reject) => {
    let b = ''; req.on('data', (c) => { b += c; if (b.length > max) { reject(fail(413, 'too long')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { reject(fail(400, 'not JSON')); } }); req.on('error', reject);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(o)); };
  try {
    if (url.pathname === '/api/desk') {
      if (req.method === 'POST') { await answer(await body(req)); return json(200, { ok: true }); }
      const { cards, replies } = L.readDesk();
      return json(200, { director: cfg.director, cards, replies });
    }
    if (url.pathname === '/api/board') {
      if (req.method === 'POST') return json(200, { ok: true, tapped: await tap(await body(req)) });
      return json(200, { cards: L.readBoard().cards });
    }
    if (url.pathname === '/api/home') return json(200, home());
    if (url.pathname === '/api/recruit' && req.method === 'POST') { const r = await recruit(await body(req)); return json(r.ok ? 200 : 500, r); }
    if (url.pathname === '/api/pin' && req.method === 'POST') return json(200, { ok: true, id: await pin(await body(req)) });
    let rel = url.pathname === '/' ? 'dashboard/index.html' : decodeURIComponent(url.pathname.slice(1));
    if (rel.includes('..') || !(/^dashboard\/(index\.html|theme\.css)$/.test(rel) || /^desk\/pics\/[a-z0-9-]+\/[\w.-]+$/.test(rel))) { res.writeHead(404); return res.end(); }
    const data = await readFile(path.join(ROOT, rel));
    res.writeHead(200, { 'content-type': TYPES[path.extname(rel).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' });
    return res.end(data);
  } catch (e) {
    if (url.pathname.startsWith('/api/')) return json(e.status || (e.code === 'ENOENT' ? 404 : 500), { error: e.code === 'ENOENT' ? 'no such card' : e.message });
    res.writeHead(404); res.end();
  }
}).listen(cfg.port, HOST, () => console.log(`${cfg.name} dashboard on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${cfg.port}`));
