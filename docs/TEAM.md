# The team

Who works at HQ, where each one lives, and how a new one joins. PROPOSED until the director keeps it.

## The team

| Name | Role | Lab | Recruited |
|---|---|---|---|
| Jarvis | the director's interface: talks with the director, shapes each job, hands it to the right lab | HQ (the root folder) | with HQ |

/recruit adds a row above for each role. Edit a row by hand only to rename or retire a role.

## An example team

What it might grow into (rename freely; nobody here is recruited until /recruit adds them to the table above):

| Name | Role | Lab |
|---|---|---|
| Tony Stark | the engineer: builds and runs the product's code | labs/engineering |
| Reed Richards | the scientist: research, experiments, the numbers behind a decision | labs/research |
| Pepper Potts | operations: money, suppliers, the calendar | labs/operations |
| Peter Parker | Tony's apprentice: one product inside engineering | labs/engineering/webapp |

## The idea

1. **A role is someone the director talks to.** A name, never an abstraction. The director opens a session in a lab and that lab's role answers.
2. **An expert is a folder, not a prompt.** No training, no hidden memory. A role is its lab: CLAUDE.md (who it is and how to run things), NOW.md (what is true today), DECISIONS.md (what the director kept, in their words), LESSONS.md (dated lines not to relearn), and the code. It gets better by the folder growing.
3. **A lab knows down, never up or sideways.** A lab's role reads its own lab and one NOW.md line from each lab below it. A child lab (labs/engineering/webapp) is worked by its parent's role until the director gives it a role of its own. What a lab needs from outside goes back to Jarvis at HQ.
4. **The director's keep is the only approval.** Everything a session writes is PROPOSED. A keep, said in chat or tapped on the desk, makes it DECIDED, with the director's meaning in two plain sentences.
5. **Small cards, one job per session.** A session is a job, not a home: it opens in one lab, does one thing, rewrites NOW.md, ends. Context lives in the files, never in a long chat. Twenty turns with nothing kept: stop, say why, start smaller.
6. **Few roles.** Recruit only for a job nobody on the team can do. A one-off task is a card on the board, not a new role.

## Recruiting (one role at a time)

1. **With the director, at HQ (Jarvis):** the name, the role in a few words, the lab (a path under labs/; a child lab under its parent), one line on what the lab is. Nothing else needs deciding yet.
2. **/recruit** `"<Name>" <lab-path> "<what the lab is>" --role "<the role>"`: the lab from templates, its private repo, the list line, the row above, the onboarding card on the desk, the check.
3. **The director does the card:** opens Claude Code in the lab; the role opens and the director says "onboard".
4. **Onboarding (the role's first session):** ONBOARDING.md, line by line: the code moves in, how to run it, key names (never values), the director's words into DECISIONS.md, NOW.md from live state. The check passes, ONBOARDING.md is deleted, the notes are pushed.
5. **The director taps Done on the card.** The lab's next session sees the answer, acts on it, and clears the card.

Refine this list after every recruit, so the next one is easier.
