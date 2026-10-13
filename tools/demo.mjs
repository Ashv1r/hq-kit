#!/usr/bin/env node
// Fills an empty HQ with an example team and work, so the dashboard has something to show:
//   node tools/demo.mjs
// Recruits Tony Stark (engineering), Reed Richards (research) and Peter Parker (engineering/webapp), all local, then puts
// a few cards on the desk and the board. Run it in a copy you will throw away, or before your real first recruit:
// it refuses once anyone is recruited.
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import L from '../.claude/hooks/lib.js';

const ROOT = L.ROOT;
if (L.labs().length) { console.error('demo refused: HQ already has a team (.claude/labs.list). Run it in a fresh copy.'); process.exit(1); }
const recruit = (...a) => execFileSync(process.execPath, [path.join(ROOT, '.claude/skills/recruit/recruit.js'), ...a, '--local'], { cwd: ROOT, encoding: 'utf8' });
const json = (rel, o) => { mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true }); writeFileSync(path.join(ROOT, rel), JSON.stringify(o, null, 1) + '\n'); };
const today = L.today(), now = Date.now(), iso = (minAgo) => new Date(now - minAgo * 60000).toISOString();

recruit('Tony Stark', 'engineering', 'The app: its code, its tests, its deploys', '--role', 'the engineer', '--does', 'Builds and runs the app');
recruit('Reed Richards', 'research', 'Experiments, numbers and the reasons behind a decision', '--role', 'the scientist', '--does', 'Tests ideas before anyone builds them');
recruit('Peter Parker', 'engineering/webapp', 'The web app, inside engineering', '--role', "Tony's apprentice", '--does', 'Builds the web app');
console.log('recruited Tony Stark, Reed Richards, Peter Parker (local only)');

// Reed and Peter are past their first day: their onboarding cards and checklists go, and their NOW.md says what is next.
for (const [lab, seg, status, next] of [
  ['research', 'research', 'Onboarded. Testing which sign-up page converts better.', 'Run the sign-up test for one more week, then bring the result to the desk.'],
  ['engineering/webapp', 'webapp', 'Onboarded. Building the new sign-in page.', 'Finish the sign-in page and put it on the desk to look at.'],
]) {
  rmSync(path.join(ROOT, 'desk/cards', `${seg}-onboarding.json`), { force: true });
  rmSync(path.join(L.labDir(lab), 'ONBOARDING.md'), { force: true });
  const f = path.join(L.labDir(lab), 'NOW.md');
  writeFileSync(f, readFileSync(f, 'utf8').replace(/(## Status\n).*/, `$1${status}`).replace(/(## Next step\n).*/, `$1${next}`));
}

// The desk: one of each common kind.
const pic = (id, name, svg) => { mkdirSync(path.join(ROOT, 'desk/pics', id), { recursive: true }); writeFileSync(path.join(ROOT, 'desk/pics', id, name), svg); };
pic('webapp-sign-in-page', 'sign-in.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="#eef1f6"/><rect x="90" y="24" width="140" height="152" rx="10" fill="#fff" stroke="#d5dae3"/><circle cx="160" cy="54" r="12" fill="#c8102e"/><rect x="106" y="78" width="108" height="14" rx="4" fill="#eef1f6" stroke="#d5dae3"/><rect x="106" y="100" width="108" height="14" rx="4" fill="#eef1f6" stroke="#d5dae3"/><rect x="106" y="126" width="108" height="20" rx="6" fill="#c8102e"/><text x="160" y="140" font-family="sans-serif" font-size="10" fill="#fff" text-anchor="middle">Sign in</text><text x="160" y="166" font-family="sans-serif" font-size="8" fill="#677084" text-anchor="middle">Forgot password?</text></svg>\n`);
json('desk/cards/webapp-sign-in-page.json', { from: 'webapp', kind: 'look', title: 'The new sign-in page', text: 'Two fields and one button, the logo above. **Keep** and it goes live on Friday; **Wrong** and say what to change.', at: today, pictures: [{ src: 'sign-in.svg', alt: 'the sign-in page: logo, email, password, a red Sign in button' }] });
pic('research-pricing', 'test.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160"><rect width="320" height="160" fill="#eef1f6"/><text x="20" y="24" font-family="sans-serif" font-size="11" fill="#677084">Sign-ups per 100 visitors, two weeks</text><rect x="40" y="58" width="80" height="82" fill="#1f5fbf"/><rect x="190" y="38" width="80" height="102" fill="#12805c"/><text x="80" y="52" font-family="sans-serif" font-size="12" text-anchor="middle">4.1</text><text x="230" y="32" font-family="sans-serif" font-size="12" text-anchor="middle">5.2</text><text x="80" y="154" font-family="sans-serif" font-size="10" fill="#677084" text-anchor="middle">Monthly first</text><text x="230" y="154" font-family="sans-serif" font-size="10" fill="#677084" text-anchor="middle">Yearly first</text></svg>\n`);
json('desk/cards/research-pricing.json', { from: 'research', kind: 'choose', title: 'Which price to show first', text: 'Two weeks of the sign-up test. Showing the yearly price first got more sign-ups.', at: today, pictures: [{ src: 'test.svg', alt: 'bar chart: 4.1 sign-ups per 100 with monthly first, 5.2 with yearly first' }], options: [{ k: 'yearly', t: 'Yearly first', s: '5.2 per 100 visitors', rec: true }, { k: 'monthly', t: 'Monthly first', s: '4.1 per 100 visitors' }] });
json('desk/cards/hq-friday-releases.json', { from: 'hq', kind: 'rule', title: 'Nothing goes live on a Friday afternoon', text: 'A rule for every lab: releases happen before Friday 12:00, so a problem is never left for the weekend.', at: today });

// The board: one card in each state.
json('board/cards/webapp-sign-in-tests.json', { task: 'Make the sign-in page pass its tests', lab: 'engineering/webapp', role: 'Peter Parker', from: 'director', state: 'taken', at: iso(50) });
json('board/cards/engineering-upgrade-node.json', { task: 'Upgrade the app to the latest Node', lab: 'engineering', role: 'Tony Stark', from: 'Tony Stark', state: 'pinned', at: iso(30) });
json('board/cards/research-competitor-prices.json', { task: "Collect three competitors' prices", lab: 'research', role: 'Reed Richards', from: 'director', state: 'done', at: iso(600), result: 'Three found, all charge yearly first. Notes in labs/research/NOW.md.' });
json('board/cards/engineering-domain.json', { task: 'Point the domain at the new server', lab: 'engineering', role: 'Tony Stark', from: 'director', state: 'needs-director', at: iso(120), result: 'Which domain registrar holds the domain? I need you to log in there once.' });

execFileSync(process.execPath, [path.join(ROOT, '.claude/hooks/end.js')], { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] });
console.log('desk: 4 cards · board: 4 cards. Open the dashboard: node dashboard/serve.mjs');
