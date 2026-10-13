# HQ

A way to run your work through Claude Code: you are the director, Jarvis is who you talk to, and a small team of named roles (Tony Stark the engineer, Reed Richards the scientist) each work in their own lab. Anything that needs your decision lands on your desk as a card; you answer it on a plain dashboard, and the role that asked acts on your answer. Nothing is decided until you say "keep".

It is plain files, a few hooks and one small dashboard. No database, no packages, no accounts beyond Claude Code and (optionally) GitHub.

## The shape

| Piece | What it is | Where |
|---|---|---|
| **The director** | You. You decide; you never have to remember anything | `hq.json`, `CLAUDE.md` |
| **Jarvis** | Your interface. A session opened at the root is Jarvis: it talks with you, shapes each job, hands it to the right role | `CLAUDE.md` ("## Role") |
| **Roles and labs** | A role is a name you talk to; its lab is its folder (and its own git repo). A session opened in a lab is that role. A lab knows down, never up | `labs/<lab>/`, `docs/TEAM.md` |
| **The desk** | Decisions waiting on you, one card each, with a picture. You tap Keep, Wrong, Later (or Done, Problem on a task) | `desk/`, Desk tab |
| **The board** | The list of jobs: pinned, taken, done, needs you. Pin a job or answer one from the page | `board/`, Board tab |
| **The dashboard** | Home (Jarvis, the team, what needs you), Desk, Board. Restyle it in one file | `dashboard/` |
| **The hooks** | Start: who this session is, the next job, what you answered. End: save the notes. Nudge: twenty turns with nothing kept gets said out loud | `.claude/hooks/` |

Every lab has the same notes: `CLAUDE.md` (who works here, how to run it), `NOW.md` (what is true today, the one next step), `DECISIONS.md` (what you kept, in your words), `LESSONS.md` (dated lines not to relearn). The ideas behind it: `docs/TEAM.md`.

## Start

Needs: [Claude Code](https://claude.com/claude-code), Node 18 or newer, git. GitHub's `gh` CLI only if you want each lab backed up as a private repo.

```bash
git clone <this repo> hq
```

```bash
cd hq
```

```bash
node setup.mjs --director "Your Name" --owner your-github-user --runs "what you run, in one line"
```

Leave out `--owner` to keep every lab on your machine only. Setup unhooks this copy from the kit's repo, so your notes never go back to it.

## See it first

To see a full HQ before setting up your own, fill a throwaway copy with an example team (Tony Stark, Reed Richards, Peter Parker) and their cards:

```bash
node tools/demo.mjs
```

```bash
node dashboard/serve.mjs
```

Open http://localhost:4800. **Home** shows Jarvis, the team and what needs you; **Desk** holds the decisions; **Board** holds the jobs. Recruit a role or pin a job straight from the page.

## Make it look like yours

- **Colours, font, corners:** `dashboard/theme.css`, the block at the top.
- **The name in the header:** `"name"` in `hq.json` (or `node setup.mjs --name "Stark Tower"`).
- **A role's picture:** a square image at `dashboard/avatars/<name>.png` (`tony-stark.png`). Without one, the page shows initials.
- **The page itself:** `dashboard/index.html`, plain HTML and JavaScript, no build step.

## Five minutes, end to end

1. **Open the dashboard.** In one terminal, run `node dashboard/serve.mjs`, then open http://localhost:4800. The desk is empty.
2. **Talk to Jarvis.** Open Claude Code in the `hq` folder. It opens as Jarvis and states the next job: recruit the first role.
3. **Recruit Tony Stark.** Say: *recruit Tony Stark as the engineer, lab engineering, he builds and runs our app* (or press **Recruit** on the Home tab). Jarvis runs `/recruit`, which makes `labs/engineering/` from the templates (and its private repo if you set `--owner`), adds him to `docs/TEAM.md`, and puts a card on your desk: **Tony Stark's first day**.
4. **Do the card.** Refresh the dashboard. The card says: open Claude Code in `labs/engineering`, it opens as Tony Stark, say "onboard". Do that; he works through `ONBOARDING.md` with you.
5. **Answer it.** On the Desk tab tap **Done**, then **Confirm**. The card moves to Answered.
6. **Watch it get acted on.** The next session in `labs/engineering` is told first thing that you answered its card; it carries on, deletes the card and its reply, and the end hook commits. The card is gone from your desk.
7. **Check.** `node tools/check.mjs` says `HQ check: ok`.

From here: tell Jarvis what you want done. Decisions come back as cards; jobs go on the board.

## Day to day

- **Talk to Jarvis** at the root for anything new. Open a session **in a lab** to work with that role directly. One job per session.
- **Your desk is the only inbox.** Sessions never hand you a list in chat; they put a card on the desk. `desk/README.md` has the card kinds: look, try, choose, design, rule, do.
- **"Keep" is the only approval.** Say it in chat or tap it on a card; until then everything is PROPOSED.
- **On your phone:** `HOST=0.0.0.0 node dashboard/serve.mjs` opens the dashboard to your network (use a private one like Tailscale; anyone who can reach it can answer cards).
- **A second machine:** clone your HQ repo there; the start hook clones and pulls every lab listed in `.claude/labs.list`.

## What is not here yet

- **Taking board cards by itself.** Today you open a session in the lab and say "take <card>". The next build is a small taker that runs one headless session per card in its lab: `board/README.md` says how.
- **Messaging.** No chat bots, no notifications. The dashboard is the window.

## Files

```
CLAUDE.md          HQ: who the director is, Jarvis, the rules (cap 3 KB, loaded everywhere)
NOW.md             HQ's next job
hq.json            director, GitHub owner for lab repos, dashboard port
setup.mjs          one-time setup
.claude/
  labs.list        the labs, one path per line
  hooks/           start, end, nudge, clone (and lib.js they share)
  skills/recruit/  /recruit: a new role and its lab
templates/         a lab's notes, ONBOARDING.md, check-lab.mjs
desk/              cards/, replies/, pics/, README.md
board/             cards/, README.md
docs/TEAM.md       the team, the ideas, the recruiting checklist
dashboard/         serve.mjs, index.html (Home, Desk, Board), theme.css, avatars/
tools/check.mjs    checks all of HQ
tools/demo.mjs     an example team and cards, for a first look
labs/              your labs (each its own repo; ignored by HQ's repo)
```
