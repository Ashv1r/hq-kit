# <lab> · onboarding

The role's own first job, one session, in its new lab (docs/TEAM.md, "Onboarding"). Tick each line with the date it was done. Done when NOW.md is true, `node ../../templates/check-lab.mjs .` passes (more `../` for a child lab), and the notes are pushed. Then delete this file; the end hook commits the deletion.

## The work
- [ ] The lab's own code moves in (its own repo, nothing copied blind from elsewhere).
- [ ] Third-party repos it leans on cloned beside it and named as reference, never mixed in.
- [ ] A child lab that is its own repo gets one line in this lab's .gitignore (/recruit does this).

## Hands
- [ ] CLAUDE.md "How to run": the commands, tried once from a clean shell.
- [ ] CLAUDE.md "Role": Does, Reads, Writes and Model filled in with the director.

## Keys
- [ ] Every key the lab uses: its name and service written down, the value nowhere in the repo.
- [ ] Any secret found in plain text: a red line in NOW.md until it is rotated.

## Facts and decisions
- [ ] What older notes claim is re-checked against the thing as it is today; anything unchecked stays "claimed".
- [ ] Rules worth keeping to LESSONS.md as dated lines.
- [ ] The director's own words, with a Seen line, in DECISIONS.md. Nothing DECIDED without their keep.

## Now
- [ ] NOW.md rewritten from live state: status, the one next step, blocked on, questions for the director.
