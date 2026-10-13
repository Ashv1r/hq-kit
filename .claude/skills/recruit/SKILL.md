---
name: recruit
description: Recruit a role onto the team, one command at HQ. Makes its lab from templates/, its private repo, the .claude/labs.list line, its row in docs/TEAM.md and the onboarding card on the director's desk, then runs the lab check. Use when Jarvis and the director have agreed a new role (its name, its lab, what it does). Invoked as /recruit "<Name>" <lab-path> "<what the lab is>" --role "<the role in a few words>".
argument-hint: "<Name>" <lab-path> "<what the lab is>" --role "<the role>"
---

# /recruit

The thinking half comes first and stays with the director: who the role is (a name they will talk to, Tony Stark, Reed Richards), what it does in one line, and its lab. Recruit a role only for a job nobody on the team can do (docs/TEAM.md).

## Run

1. At HQ (the root folder). Optional: this session's link for the card's "Talk to" button (`get_session` with `self`, field `link`).
2. Run, with the arguments as given:
   ```bash
   node .claude/skills/recruit/recruit.js $ARGUMENTS
   ```
   Add `--does "<one line>"` if the job is already clear, `--local` to keep the lab off GitHub, `--session "<link>"` for the card.
3. Show the director the printed steps as they are. A red line is a step not done: say which and why; running it again finishes it (every step already done is skipped and said).
4. Tell the director in one line: the onboarding card is on the desk.

## What it does, in order

1. labs/<lab>/ from templates/: CLAUDE.md (the Role line "<Name>, <role>. Recruited <date>"), NOW.md, DECISIONS.md with one PROPOSED entry, LESSONS.md, ONBOARDING.md, .gitignore, and .claude/settings.json pointing at HQ's hooks.
2. git init on main, the first commit.
3. `gh repo create <githubOwner>/<repoPrefix><last segment> --private`, pushed. Skipped with `--local` or with no githubOwner in hq.json. (3b, a child lab only: one line in its parent's .gitignore.)
4. The path appended to .claude/labs.list.
5. A row in the team table in docs/TEAM.md.
6. The `do` card desk/cards/<lab>-onboarding.json: the director opens a session in the lab and says "onboard".
7. HQ committed (and pushed if it has a remote): the list, the row, the card.
8. templates/check-lab.mjs on the lab, its result printed, then every TODO line left for onboarding.

`--root <dir>` points it at another HQ, for a dry run in a scratch copy.
