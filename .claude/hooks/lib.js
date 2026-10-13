// What every hook, the recruit skill, the check and the dashboard share. Zero dependencies.
//   hq.json             the director's name, the GitHub owner for lab repos, the dashboard port
//   .claude/labs.list   the labs, one path under labs/ per line, a child lab under its parent
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const LAB_PATH = /^[a-z0-9-]+(\/[a-z0-9-]+)*$/;

function config(root = ROOT) {
  let c = {};
  try { c = JSON.parse(fs.readFileSync(path.join(root, 'hq.json'), 'utf8')); } catch { /* not set up yet */ }
  return {
    director: (c.director || '').trim() || 'the director',
    githubOwner: (process.env.GITHUB_OWNER || c.githubOwner || '').trim(),
    repoPrefix: c.repoPrefix == null ? 'lab-' : c.repoPrefix,
    port: Number(process.env.PORT) || c.port || 4800,
  };
}

// The labs in list order, parents before children whatever order they were written in.
function labs(root = ROOT) {
  try {
    const list = fs.readFileSync(path.join(root, '.claude', 'labs.list'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => LAB_PATH.test(l));
    return [...new Set(list)].sort((a, b) => a.split('/').length - b.split('/').length || list.indexOf(a) - list.indexOf(b));
  } catch { return []; }
}
const labDir = (rel, root = ROOT) => path.join(root, 'labs', ...rel.split('/'));
// A lab's repo: <owner>/<prefix><last segment>. The last segment names it, so every lab name is unique in HQ.
const repoOf = (rel, cfg = config()) => `${cfg.githubOwner}/${cfg.repoPrefix}${rel.split('/').pop()}`;

const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
// The role's name: the first line under "## Role", up to its first comma ("Tony Stark, the engineer."). "none" means
// the lab above holds it.
function roleOf(dir) {
  const m = read(path.join(dir, 'CLAUDE.md')).match(/^## Role[ \t]*\r?\n+[ \t]*([^\n,.]+)/m);
  const name = m ? m[1].trim() : '';
  return /^(none|nobody|-|<.*>)$/i.test(name) ? '' : name;
}
const section = (file, head) => { const m = read(file).match(new RegExp(`^## ${head}[ \\t]*\\r?\\n+([^\\n]+)`, 'm')); return m ? m[1].trim().replace(/\.$/, '') : ''; };
const whatOf = (dir) => section(path.join(dir, 'CLAUDE.md'), 'What this is');
const nextStep = (dir) => section(path.join(dir, 'NOW.md'), 'Next step');

const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'core.longpaths=true', ...args], { cwd, encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }).trim();

// A hook's input (JSON on stdin), or {} when run by hand.
function hookInput() {
  if (process.stdin.isTTY) return {};
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}
// The lab a folder is in: the deepest listed lab that contains it, or '' at HQ.
function labAt(cwd, root = ROOT) {
  const at = path.resolve(cwd);
  return labs(root).filter((rel) => { const d = labDir(rel, root); return at === d || at.startsWith(d + path.sep); })
    .sort((a, b) => b.length - a.length)[0] || '';
}
// Every lab carries .claude/settings.json calling these hooks with --lab. When HQ's own settings fire in a lab as well,
// HQ's call stands aside, so a hook never runs twice.
const standAside = (cwd) => !process.argv.includes('--lab') && !!labAt(cwd) && fs.existsSync(path.join(labDir(labAt(cwd)), '.claude', 'settings.json'));

// The desk: cards in desk/cards/<id>.json, the director's answers in desk/replies/<id>.json.
function readDesk(root = ROOT) {
  const dir = (d) => { try { return fs.readdirSync(path.join(root, 'desk', d)).filter((f) => f.endsWith('.json')); } catch { return []; } };
  const cards = [], replies = {}, bad = [];
  for (const f of dir('cards')) { try { cards.push({ ...JSON.parse(read(path.join(root, 'desk', 'cards', f))), id: f.slice(0, -5) }); } catch { bad.push(`desk/cards/${f}`); } }
  for (const f of dir('replies')) { try { replies[f.slice(0, -5)] = JSON.parse(read(path.join(root, 'desk', 'replies', f))); } catch { bad.push(`desk/replies/${f}`); } }
  cards.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
  return { cards, replies, bad };
}
function readBoard(root = ROOT) {
  const cards = [], bad = [];
  let files = []; try { files = fs.readdirSync(path.join(root, 'board', 'cards')).filter((f) => f.endsWith('.json')); } catch { /* none */ }
  for (const f of files) { try { cards.push({ ...JSON.parse(read(path.join(root, 'board', 'cards', f))), id: f.slice(0, -5) }); } catch { bad.push(`board/cards/${f}`); } }
  cards.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
  return { cards, bad };
}

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const red = (s) => `\x1b[31m${s}\x1b[0m`;

module.exports = { ROOT, LAB_PATH, config, labs, labDir, repoOf, read, roleOf, whatOf, nextStep, git, hookInput, labAt, standAside, readDesk, readBoard, today, red };
