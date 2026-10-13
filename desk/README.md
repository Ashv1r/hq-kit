# The desk

How every session puts a decision in front of the director. The director answers on the dashboard (Desk tab): taps Keep, Wrong or Later (Done, Problem or Later on a task, an option on a choice), adds a comment if they want, and presses Confirm. Never give the director a list in chat or a file to open: put a card on the desk.

## Put a card on the desk

1. One JSON file per decision: `desk/cards/<id>.json`. The id is short, lowercase, words joined by hyphens, unique, lab first: `engineering-login-page`.
2. `from` is the lab's folder name (the last part of its path), or `hq` for Jarvis. That is how the start hook knows whose answer it is.
3. Pictures go in `desk/pics/<id>/` (under 1 MB each): a screenshot, a still, a chart. Every card that can have a picture has one. Shapes before words.
4. The end hook commits and pushes `desk/`. Then say in one line: "N cards on your desk."

```json
{
  "from": "engineering",
  "kind": "look",
  "title": "The new login page",
  "text": "One or two plain sentences: what it is and what Keep means. `code` and **bold** work.",
  "at": "2026-01-01",
  "pictures": [{ "src": "login.png", "alt": "the login page on a phone" }],
  "steps": ["Open `http://localhost:3000/login`", "Sign in with the test account"],
  "options": [{ "k": "a", "t": "Option A", "s": "one line on it", "rec": true }],
  "quote": "The director's own words, if the card rests on them.",
  "session": "claude://... (optional: this session's link, for the Talk button)"
}
```

## The kinds

| kind | What it asks | Answers |
|---|---|---|
| `look` | Look at this, then keep or say what is wrong | Keep, Wrong, Later |
| `try` | Run these `steps`, then judge it | Keep, Wrong, Later |
| `choose` | Pick one of the `options` (`rec: true` marks the suggestion) | an option, Later |
| `design` | How something should work | Keep, Wrong, Later |
| `rule` | One line to agree, no picture needed | Keep, Wrong |
| `do` | A task for the director, not an update: `steps` they perform | Done, Problem, Later |

One decision per card. Never a card for something the director cannot see or try.

## Read the answers

`desk/replies/<id>.json`, written by the dashboard the moment the director confirms (and committed, and pushed if HQ has a remote): `{ "v": "keep" | "wrong" | "later" | "done" | "problem", "note", "choice", "label", "at" }`. `note` is the director's comment, always there on a `wrong` or a `problem` (the dashboard refuses either without it). `choice` is the option picked, `label` its words.

The start hook lists every answered card at the start of each session, and in the lab that sent a card it says so in red, first: act on it before anything else.

## Act, then clear

- A **keep**: the thing becomes DECIDED in the lab's DECISIONS.md, with a `Director:` line in their words and a `Seen:` line.
- A **wrong** or a **problem**: the comment is the next step in NOW.md, or gets done now.
- A **done**: the task is done; carry on from it.
- A **later**: the card stays on the desk, still waiting.

When the answer is acted on, delete the card, its reply and its pictures (`desk/cards/<id>.json`, `desk/replies/<id>.json`, `desk/pics/<id>/`). The end hook commits the deletion. Git keeps the history; the desk keeps only what is live. The dashboard never deletes a card: only the session that acted knows the answer was used. An answer nobody has acted on for a day shows in red on the Answered view.
