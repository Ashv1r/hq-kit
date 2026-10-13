#!/usr/bin/env node
// Every prompt: the director's nudge. The director directs and should not have to notice a session going nowhere, so the
// session says so itself. Going nowhere means twenty of the director's turns with no "keep" and no change to the nearest
// NOW.md since the session began. What is printed here goes into the session's context, so the session says it to the
// director in its own words, once, and not again for another twenty turns. Never blocks; any error is silent.
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');

const EVERY = 20;

function main() {
  const ev = L.hookInput();
  const cwd = path.resolve(ev.cwd || process.cwd());
  if (L.standAside(cwd)) return;
  const transcript = ev.transcript_path;
  if (!transcript || !fs.existsSync(transcript)) return;

  let turns = 0, startedAt = null, kept = false;
  for (const line of fs.readFileSync(transcript, 'utf8').split('\n')) {
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (m.type !== 'user' || !m.message) continue;
    const c = m.message.content;
    const text = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((b) => b.type === 'text').map((b) => b.text).join(' ') : '';
    if (!text || text.startsWith('<')) continue;   // tool results and reminders are not the director's turns
    turns++;
    if (!startedAt && m.timestamp) startedAt = Date.parse(m.timestamp);
    if (/\bkeep\b/i.test(text)) kept = true;
  }
  if (turns < EVERY || turns % EVERY !== 0) return;

  const lab = L.labAt(cwd), now = path.join(lab ? L.labDir(lab) : L.ROOT, 'NOW.md');
  if (!fs.existsSync(now)) {
    console.log(`[director's nudge] ${turns} turns in and this folder has no NOW.md, so nothing here is kept for the next session. Say so in one line; if this is real work with no lab, ask the director whether to /recruit one.`);
    return;
  }
  if (kept || (startedAt && fs.statSync(now).mtimeMs > startedAt)) return;
  console.log(`[director's nudge] ${turns} turns, nothing kept, and NOW.md has not changed since this session began. Say this to the director in one plain line: this session is not landing anything; either they say what is wrong in one specific line, or they close it and start a smaller one. Then stop and wait.`);
}
try { main(); } catch { /* silent by design */ }
