#!/usr/bin/env node
// Checks a lab's CLAUDE.md, NOW.md, DECISIONS.md and LESSONS.md against the templates' rules.
//   node templates/check-lab.mjs <lab folder>
// Exits 1 on any failure. Zero dependencies.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('usage: node check-lab.mjs <lab folder>'); process.exit(2); }
const fail = [];
const read = (f) => existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : null;
const bytes = (s) => Buffer.byteLength(s, 'utf8');

const claude = read('CLAUDE.md');
if (claude == null) fail.push('CLAUDE.md missing');
else {
  if (bytes(claude) > 4096) fail.push(`CLAUDE.md ${bytes(claude)} B, cap 4096`);
  if (!/^## Role[ \t]*\r?\n+[ \t]*\S/m.test(claude)) fail.push('CLAUDE.md has no "## Role" line (the role\'s name, a comma, what it is)');
}

const now = read('NOW.md');
if (now == null) fail.push('NOW.md missing');
else {
  if (bytes(now) > 1536) fail.push(`NOW.md ${bytes(now)} B, cap 1536`);
  const heads = [...now.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  const want = ['Status', 'Next step', 'Blocked on', 'Open questions for the director'];
  if (heads.join('|') !== want.join('|')) fail.push(`NOW.md headings must be exactly: ${want.join(', ')}`);
}

const dec = read('DECISIONS.md');
if (dec == null) fail.push('DECISIONS.md missing');
else {
  dec.split(/^## /m).slice(1).forEach((e, i) => {
    const title = e.split('\n')[0].trim();
    const status = (e.match(/^Status:\s*(\w+)/m) || [])[1];
    if (!['IDEA', 'PROPOSED', 'DECIDED'].includes(status)) fail.push(`DECISIONS.md entry ${i + 1} "${title}": Status must be IDEA, PROPOSED or DECIDED`);
    if (status === 'DECIDED') {
      const said = (e.match(/^Director:\s*(.+)$/m) || [])[1];
      if (!said) fail.push(`DECISIONS.md "${title}": DECIDED without a Director: line`);
      else if ((said.match(/[.!?](\s|$)/g) || []).length > 2) fail.push(`DECISIONS.md "${title}": the Director: line is more than two sentences`);
      if (!/^Seen:\s*\S/m.test(e)) fail.push(`DECISIONS.md "${title}": DECIDED without a Seen: line (what they looked at)`);
    }
  });
}

const les = read('LESSONS.md');
if (les == null) fail.push('LESSONS.md missing');
else {
  if (bytes(les) > 4096) fail.push(`LESSONS.md ${bytes(les)} B, cap 4096: move the oldest lines to reference/lessons.md`);
  const undated = les.split(/\r?\n/).filter((l) => /^\s*(-|\d+\.)\s/.test(l) && !/^\s*(-|\d+\.)\s+\d{4}-\d{2}-\d{2}\s/.test(l));
  if (undated.length) fail.push(`LESSONS.md: ${undated.length} line${undated.length > 1 ? 's' : ''} without a date (every line starts "- YYYY-MM-DD ·"), first: "${undated[0].trim().slice(0, 60)}"`);
}

if (fail.length) { console.error(`lab check failed (${dir}):\n` + fail.map((s) => '  - ' + s).join('\n')); process.exit(1); }
console.log(`lab check: ok (${dir})`);
