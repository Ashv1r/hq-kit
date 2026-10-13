#!/usr/bin/env node
// Clones the labs this machine has not got, from <githubOwner>/<repoPrefix><last segment> (hq.json), in list order,
// parent before child, so a child never lands in a folder its parent's clone still has to create.
// Run by the start hook in the background:   node clone.js <lab path> [<lab path> ...]
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');

const cfg = L.config();
if (!cfg.githubOwner) { console.log('no githubOwner in hq.json: nothing to clone from'); process.exit(0); }
for (const rel of process.argv.slice(2).filter((r) => L.LAB_PATH.test(r))) {
  const dir = L.labDir(rel);
  if (fs.existsSync(path.join(dir, '.git'))) continue;
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  try {
    L.git(path.dirname(dir), 'clone', '--quiet', `https://github.com/${L.repoOf(rel, cfg)}.git`, path.basename(dir));
    console.log(`${rel}: cloned`);
  } catch (e) { console.log(`${rel}: clone failed: ${(e.stderr || '').toString().trim().split('\n').pop()}`); }
}
