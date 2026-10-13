#!/usr/bin/env node
// /recruit: the mechanical half of recruiting a role (docs/TEAM.md, "Recruiting"), one command at HQ.
//   node .claude/skills/recruit/recruit.js "<Name>" <lab path> "<one line: what the lab is>" --role "<the role in a few words>"
//        [--does "<one line: the job>"] [--local] [--session <link>] [--root <dir>]
// Makes the lab from templates/, its repo (private, on GitHub unless --local or no githubOwner in hq.json), the
// .claude/labs.list line, the row in docs/TEAM.md, the onboarding card on the desk, then runs the lab check.
// Each step already done is skipped and said, so a run that stopped halfway is finished by running it again.
// Commits name their paths, so nothing else that is staged rides along. Never forces, never stashes, never prints a secret.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const argv = process.argv.slice(2);
const flag = (k) => { const i = argv.indexOf(k); if (i < 0) return ''; const v = argv[i + 1] || ''; argv.splice(i, 2); return v; };
const bool = (k) => { const i = argv.indexOf(k); if (i < 0) return false; argv.splice(i, 1); return true; };
const role = flag('--role'), does = flag('--does'), session = flag('--session'), rootArg = flag('--root'), local = bool('--local');
const ROOT = path.resolve(rootArg || path.join(__dirname, '..', '..', '..'));
const L = require(path.join(ROOT, '.claude', 'hooks', 'lib.js'));
const [name = '', labArg = '', what = ''] = argv;
const refuse = (s) => { console.error(red(`recruit refused, nothing written: ${s}`)); process.exit(1); };

if (!name.trim() || !labArg || !what.trim() || !role.trim()) refuse('usage: /recruit "<Name>" <lab path> "<what the lab is>" --role "<the role in a few words>"');
if (/,/.test(name)) refuse('the name cannot hold a comma (the Role line reads the name up to its first comma)');
const rel = labArg.replace(/\\/g, '/').replace(/^\.?\/?labs\//, '').replace(/\/+$/, '');
if (!L.LAB_PATH.test(rel)) refuse(`lab path "${labArg}": lowercase words joined by hyphens, under labs/ (engineering, engineering/suits)`);
for (const f of ['CLAUDE.md', 'templates/CLAUDE.md', 'templates/check-lab.mjs', 'docs/TEAM.md', '.claude/labs.list'])
  if (!fs.existsSync(path.join(ROOT, f))) refuse(`${f} is not at ${ROOT}: run it from HQ`);

const cfg = L.config(ROOT);
const seg = rel.split('/').pop();
const lab = L.labDir(rel, ROOT);
const today = L.today();
const repo = cfg.githubOwner ? L.repoOf(rel, cfg) : '';
const onGitHub = !local && !!cfg.githubOwner;
if (rel.includes('/') && !fs.existsSync(path.join(path.dirname(lab), '.git'))) refuse(`the parent lab labs/${rel.split('/').slice(0, -1).join('/')} is not here as a repo: recruit it first`);

// The team table in docs/TEAM.md: a name already on it in another lab is a different role.
const TEAM = path.join(ROOT, 'docs', 'TEAM.md');
const teamRows = () => {
  const lines = fs.readFileSync(TEAM, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => /^## The team/.test(l));
  const rows = [];
  for (let i = start + 1; start >= 0 && i < lines.length && !/^## /.test(lines[i]); i++) if (/^\|/.test(lines[i]) && !/^\|\s*-/.test(lines[i])) rows.push({ i, cells: lines[i].split('|').map((c) => c.trim()) });
  return { lines, start, rows: rows.slice(1) };
};
const same = (a) => a.toLowerCase() === name.trim().toLowerCase();
const mine = teamRows().rows.find((r) => same(r.cells[1]));
if (mine && mine.cells[3] !== `labs/${rel}`) refuse(`${name} is already on the team in ${mine.cells[3]}`);

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }).trim();
const git = (cwd, ...a) => L.git(cwd, ...a);
const ok = (fn) => { try { fn(); return true; } catch { return false; } };
const why = (e) => ((e.stderr || '').toString().trim().split('\n').pop() || (e.message || '').split('\n')[0]);
const dirty = (cwd, f) => !!git(cwd, 'status', '--porcelain', '--', f);
const upstream = (cwd) => ok(() => git(cwd, 'rev-parse', '--abbrev-ref', '@{u}'));
const push = (cwd) => {
  if (!ok(() => git(cwd, 'remote', 'get-url', 'origin'))) return 'no remote, kept local';
  if (upstream(cwd) && !Number(git(cwd, 'rev-list', '--count', '@{u}..HEAD'))) return 'nothing to push';
  git(cwd, 'push', '--quiet', '-u', 'origin', 'HEAD');
  return 'pushed';
};
const commit = (cwd, msg, paths) => {
  if (!paths.length || !git(cwd, 'status', '--porcelain', '--', ...paths)) return false;
  git(cwd, 'add', '-A', '--', ...paths);
  git(cwd, 'commit', '--quiet', '-m', msg, '--', ...paths);
  return true;
};
const steps = [];
const say = (n, s, bad) => { const line = `${n}. ${s}`; steps.push(line); console.log(bad ? red(line) : line); };
const step = (n, title, fn) => { try { say(n, `${title}: ${fn()}`); } catch (e) { say(n, `${title}: FAILED, ${why(e)}`, true); } };

console.log(`recruit ${name} (${role}) into labs/${rel}${onGitHub ? ` (${repo}, private)` : ' (local only)'}, ${today}`);

// 1. The lab from templates/, the names filled in.
const T = (f) => fs.readFileSync(path.join(ROOT, 'templates', f), 'utf8').replace(/\r\n/g, '\n').replace(/<lab>/g, seg);
const up = '../'.repeat(rel.split('/').length + 1);
const hook = (f, extra = '') => `{ "type": "command", "command": "node \\"$CLAUDE_PROJECT_DIR/${up}.claude/hooks/${f}\\" --lab"${extra} }`;
const FILES = {
  'CLAUDE.md': () => T('CLAUDE.md')
    .replace(/(## What this is\n)One line\./, `$1${what.trim()}`)
    .replace(/^<Name>, .*$/m, `${name.trim()}, ${role.trim()}. Recruited ${today} by Jarvis with the director.`)
    .replace(/^- Does: .*$/m, `- Does: ${does.trim() || 'TODO (onboarding, with the director): one line, the job this role is for.'}`)
    .replace(/^- Model: .*$/m, '- Model: TODO (onboarding, with the director).'),
  'NOW.md': () => T('NOW.md')
    .replace(/(## Status\n).*/, `$1Recruited ${today}. Onboarding not started.`)
    .replace(/(## Next step\n).*/, '$1Onboarding: work through ONBOARDING.md, one session in this lab.')
    .replace(/(## Blocked on\n).*/, '$1nothing')
    .replace(/(## Open questions for the director\n).*/, '$1- none yet'),
  'DECISIONS.md': () => T('DECISIONS.md').split('\n## ')[0].trimEnd()
    + `\n\n## ${today} · ${name.trim()} recruited as ${role.trim()}\nStatus: PROPOSED\nWhat: ${name.trim()} holds labs/${rel}: ${what.trim()}\nEvidence: none yet. The director's keep after onboarding makes it DECIDED.\n`,
  'LESSONS.md': () => T('LESSONS.md').split('\n').filter((l) => !l.includes('<the rule')).join('\n').trimEnd() + '\n',
  'ONBOARDING.md': () => T('ONBOARDING.md').replace('../../templates/check-lab.mjs', `${up}templates/check-lab.mjs`),
  '.gitignore': () => T('gitignore'),
  '.claude/settings.json': () => `{
  "hooks": {
    "SessionStart": [{ "matcher": "startup", "hooks": [${hook('start.js')}] }],
    "UserPromptSubmit": [{ "hooks": [${hook('nudge.js', ', "timeout": 10')}] }],
    "Stop": [{ "hooks": [${hook('end.js', ', "timeout": 120')}] }],
    "SessionEnd": [{ "hooks": [${hook('end.js', ', "timeout": 120')}] }]
  }
}
`,
};
step(1, 'lab from templates', () => {
  if (fs.existsSync(path.join(lab, '.git')) && ok(() => git(lab, 'rev-parse', '--verify', 'HEAD'))) return 'already made, skipped (never rewritten once it has commits)';
  const wrote = Object.keys(FILES).filter((f) => !fs.existsSync(path.join(lab, f)));
  for (const f of wrote) { fs.mkdirSync(path.dirname(path.join(lab, f)), { recursive: true }); fs.writeFileSync(path.join(lab, f), FILES[f]()); }
  return wrote.length ? `wrote ${wrote.join(', ')} in labs/${rel}` : 'all files there, skipped';
});

// 2. Its own repo on main, the first commit.
step(2, 'git init on main, first commit', () => {
  const said = [];
  if (!fs.existsSync(path.join(lab, '.git'))) { git(lab, 'init', '--quiet', '-b', 'main'); said.push('initialised'); }
  if (!ok(() => git(lab, 'rev-parse', '--verify', 'HEAD'))) {
    git(lab, 'add', '-A');
    git(lab, 'commit', '--quiet', '-m', `${name.trim()}'s lab, recruited ${today} (/recruit)`);
    said.push(`committed ${git(lab, 'rev-parse', '--short', 'HEAD')}`);
  }
  return said.length ? said.join(', ') : 'already a repo with commits, skipped';
});

// 3. The private repo on GitHub, pushed. Skipped when local.
step(3, 'GitHub repo', () => {
  if (!onGitHub) return local ? 'skipped (--local)' : 'skipped: no githubOwner in hq.json, so the lab stays on this machine. Set it and run this again to push';
  const said = [];
  if (!ok(() => run('gh', ['repo', 'view', repo, '--json', 'name'], lab))) { run('gh', ['repo', 'create', repo, '--private'], lab); said.push(`${repo} created, private`); }
  const vis = run('gh', ['repo', 'view', repo, '--json', 'visibility', '--jq', '.visibility'], lab);
  if (vis !== 'PRIVATE') said.push(red(`${repo} is ${vis}, not private: not changed here, tell the director`));
  if (!ok(() => git(lab, 'remote', 'get-url', 'origin'))) { git(lab, 'remote', 'add', 'origin', `https://github.com/${repo}.git`); said.push('origin set'); }
  said.push(push(lab));
  return said.join(', ');
});

// 3b. A child lab is ignored by its parent's repo, one line, so the parent never swallows it.
if (rel.includes('/')) step('3b', 'the parent lab ignores the child', () => {
  const parent = path.dirname(lab), gi = path.join(parent, '.gitignore'), line = `/${seg}/`;
  const text = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8').replace(/\r\n/g, '\n') : '';
  if (text.split('\n').includes(line)) return 'already in its .gitignore, skipped';
  if (fs.existsSync(gi) && dirty(parent, '.gitignore')) throw new Error('its .gitignore has uncommitted edits, not touched');
  fs.writeFileSync(gi, text + (text && !text.endsWith('\n') ? '\n' : '') + line + '\n');
  commit(parent, `Ignore ${seg}: a lab of its own`, ['.gitignore']);
  return `added ${line}, committed, ${push(parent)}`;
});

// 4. The path in .claude/labs.list, so every machine clones it.
const hqPaths = [];
step(4, '.claude/labs.list', () => {
  if (L.labs(ROOT).includes(rel)) return `${rel} already listed, skipped`;
  const f = path.join(ROOT, '.claude', 'labs.list');
  const text = fs.readFileSync(f, 'utf8');
  fs.writeFileSync(f, text + (text.endsWith('\n') ? '' : '\n') + rel + '\n');
  hqPaths.push('.claude/labs.list');
  return `${rel} added`;
});

// 5. The row in docs/TEAM.md, "## The team".
step(5, 'row in docs/TEAM.md', () => {
  if (mine) return 'already on the team, skipped';
  const { lines, start, rows } = teamRows();
  if (start < 0) throw new Error('docs/TEAM.md has no "## The team" table');
  const at = rows.length ? rows[rows.length - 1].i + 1 : start + 4;
  lines.splice(at, 0, `| ${name.trim()} | ${role.trim()} | labs/${rel} | ${today} |`);
  fs.writeFileSync(TEAM, lines.join('\n'));
  hqPaths.push('docs/TEAM.md');
  return 'added';
});

// 6. The onboarding card on the desk: a task for the director, so a `do` card.
const cardId = `${seg}-onboarding`, cardRel = `desk/cards/${cardId}.json`;
step(6, `desk card ${cardId}`, () => {
  if (fs.existsSync(path.join(ROOT, cardRel))) return 'already on the desk, skipped';
  if (ok(() => git(ROOT, 'log', '--oneline', '-1', '--', cardRel)) && git(ROOT, 'log', '--oneline', '-1', '--', cardRel)) return 'made before and cleared since (git log), not remade';
  const card = {
    from: seg,
    kind: 'do',
    title: `${name.trim()}'s first day`,
    text: `${name.trim()} is recruited as ${role.trim()} in \`labs/${rel}\`. One session there does the onboarding checklist with you. Tap **Done** when its NOW.md says what is next.`,
    ...(session ? { session } : {}),
    at: today,
    steps: [
      `Open Claude Code in the folder \`labs/${rel}\``,
      `It opens as **${name.trim()}**. Say: **onboard**`,
      'Answer its questions on what the role does and which model it runs on',
      'When it says the checklist is done, tap **Done** here',
    ],
  };
  fs.mkdirSync(path.dirname(path.join(ROOT, cardRel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, cardRel), JSON.stringify(card, null, 2) + '\n');
  hqPaths.push(cardRel);
  return 'written';
});

// 6b. HQ's NOW.md still asking for the first recruit moves on to the onboarding.
step('6b', "HQ's next step", () => {
  const f = path.join(ROOT, 'NOW.md'), text = L.read(f);
  if (!/## Next step\s*\n+Recruit the first role/.test(text)) return 'not the first recruit, left as it is';
  fs.writeFileSync(f, text
    .replace(/(## Next step\s*\n+)Recruit the first role[^\n]*/, `$1${name.trim()}'s first day: the card on the desk.`)
    .replace(/(## Status\s*\n+)[^\n]*/, `$1${name.trim()} recruited ${today} as ${role.trim()}.`)
    .replace(/(## Open questions for the director\s*\n+)- Who is the first role[^\n]*/, '$1- none'));
  hqPaths.push('NOW.md');
  return 'moved on to the onboarding';
});

// 7. HQ committed (and pushed, when it has a remote): the list line, the team row, the card.
step(7, 'HQ committed', () => {
  const did = commit(ROOT, `Recruit ${name.trim()} (${role.trim()}) into labs/${rel}`, hqPaths);
  return did ? `committed, ${push(ROOT)}` : 'nothing changed, skipped';
});

// 8. The lab checked against the templates' rules.
step(8, 'templates/check-lab.mjs', () => {
  try { return run(process.execPath, [path.join(ROOT, 'templates', 'check-lab.mjs'), lab], ROOT); }
  catch (e) { return red(((e.stdout || '') + (e.stderr || '')).toString().trim().replace(/\n/g, '\n   ')); }
});

const todos = [];
for (const f of ['CLAUDE.md', 'NOW.md', 'DECISIONS.md']) {
  L.read(path.join(lab, f)).split(/\r?\n/).forEach((l, i) => { if (l.includes('TODO')) todos.push(`${f}:${i + 1}  ${l.trim()}`); });
}
console.log(`\nNext: the onboarding card is on the desk. ${name.trim()}'s first session, in labs/${rel}, works through ONBOARDING.md with the director.`
  + (todos.length ? `\nTODO lines for onboarding (${todos.length}):\n${todos.map((t) => '  ' + t).join('\n')}` : ''));
process.exit(steps.some((s) => s.includes('FAILED')) ? 1 : 0);
