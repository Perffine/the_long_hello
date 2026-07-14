# the_long_hello

built with Claude Code

a minimalist ascii narrative game. hundreds of thousands of alien objects appear
on earth overnight, inscribed *"we wish you to know that you are not alone in the
universe and we mean no harm."* then: silence. you are a hospice night nurse.

it looks like an incremental game. it isn't, quite. curiosity and patience are
the only tutorial.

## play

open `index.html` in a browser. no build, no dependencies, no server needed.
keyboard: arrow keys + enter (digits `1`–`5` also work). mouse works too.

progress autosaves to localStorage. a run to the true ending is 45–90 minutes,
comfortable in a few sittings.

## files

- `index.html` — layout and styling
- `content.js` — every line of prose, the patients, the news ticker, and a
  `TUNING` block with every gameplay threshold. writing is editable without
  touching the engine.
- `engine.js` — scene runner, hidden mechanics, save system, audio. no prose.
- `docs/` — the design document this was built from.

## dev mode

append `?dev=1` for a debug HUD and normal speed, or `?dev=N` to run all
timers N× faster (e.g. `?dev=8`). dev mode exposes a `DEV` object in the
console: `DEV.state()`, `DEV.goto(nightOrSeason)`, `DEV.grantMsg()`,
`DEV.wipe()`.

`dev/smoke.mjs` is a headless playthrough test (drives the real game through
every major beat). it needs playwright: `npm i playwright`, then
`node dev/smoke.mjs`.
