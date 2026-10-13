# The board

The one list of work: one card per task, in `board/cards/<id>.json`. The dashboard's Board tab draws whatever is in the folder in four columns: **Needs you**, **Pinned**, **Taken**, **Done**. The desk is for decisions; the board is for jobs.

## A card

```json
{
  "task": "Make the login page pass its tests",
  "lab": "engineering",
  "role": "Tony Stark",
  "from": "director",
  "state": "pinned",
  "at": "2026-01-01T10:00:00Z",
  "tapped": "2026-01-01T10:05:00Z",
  "result": "One line: what came of it, or on needs-director the question"
}
```

| Field | What it is |
|---|---|
| `task` | One line, what is to be done. The director's own words, tidied |
| `lab` | The lab's path under labs/ (`engineering`, `engineering/webapp`) |
| `role` | Who takes it: the lab's role, else its parent's, else Jarvis |
| `from` | `director` (they asked for it), or the role that pinned it for itself |
| `state` | `pinned` (waiting), `taken` (being worked), `done` (`result` says what came of it), `needs-director` (`result` is the question; nothing happens until it is answered) |
| `at` | When it was pinned, ISO time |
| `tapped` | When the director tapped it (the dashboard writes it) |
| `result` | One line from whoever worked it |
| `answer`, `question` | The director's answer to a `needs-director` card, typed on the Board tab. The card goes back to `pinned` with the answer on it, and the question kept |

## The rules

1. **Jarvis pins.** When the director gives Jarvis a job for a lab, Jarvis writes the card with `from: "director"`. A role that finds work for itself pins it with its own name.
2. **The director's tap.** A card from the director needs no tap: asking was the tap. A card a role pinned for itself waits with a **Tap** button, and nothing takes it until the director taps.
3. **Clearing.** A `done` card stays until the director has seen it; then any session deletes it (git keeps the history).

## Taking a card: the next thing to build

Nothing takes cards by itself yet; today the director opens a session in the card's lab and says "take <id>". The next build is a taker, small and separate:

1. A script run every minute (cron, or Task Scheduler on Windows) at HQ, in its own process.
2. Each tick it picks the oldest card that may run: `pinned`, from the director or tapped, naming a lab, with no other card `taken` in that lab. It writes `taken` and commits **before** any work starts, so two ticks never take the same card.
3. It starts **one fresh headless session per card, in the lab's folder**: `claude -p "<the card as a brief: the task, one job, update NOW.md, end with one result line, or DIRECTOR: <question>>"`, with a turn limit and a time ceiling.
4. When the session exits it reads only the last line, never the transcript, and writes the card `done` with that line, or `needs-director` with the question, then commits.

Keep it one card per lab at a time until it has run clean for a while.
