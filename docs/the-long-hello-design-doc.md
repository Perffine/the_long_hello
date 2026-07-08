# THE LONG HELLO — Game Design Document

**Genre:** Minimalist ASCII narrative-incremental ("A Dark Room"-like)
**Platform:** Single-page HTML/JS, monospace terminal aesthetic, keyboard-first
**Session shape:** 45–90 minutes to the true ending; designed to be played in a few sittings
**Audience for this doc:** A coding agent. Everything here is intended to be implementable as written. Where numbers are given, treat them as starting values to tune, not sacred.

---

## 0. The one-paragraph pitch

Hundreds of thousands of alien objects appear on Earth overnight, each inscribed *"We wish you to know that you are not alone in the universe and we mean no harm."* Then: silence. You are a hospice night nurse. The game is your life — shifts, sleep, and the walk home past the egg in the canal park. It looks like an incremental game, but its central inversion is this: **almost every incremental game rewards doing; this one secretly rewards being still.** The player who frantically clicks gets a quiet, ordinary story. The player who learns — from sitting with the dying — that presence without demand is a skill, gets the second message. The game never explains this. Curiosity and patience are the only tutorial.

## 1. Design pillars

1. **Stillness is the verb.** The core hidden mechanic accrues progress only while the player does *nothing*. This must never be stated. It must be discovered.
2. **The world is bigger than the UI.** Like A Dark Room, the interface starts nearly empty and grows. New panels, locations, and verbs appear without announcement. Their appearance IS the storytelling.
3. **Repetition is content.** `You touch it. It is warm.` printed for the fortieth time means something different than the first time. Do not add variety for variety's sake; add it only when the world has actually changed.
4. **No numbers where a feeling will do.** Hidden stats drive everything. The player never sees a meter called "Trust." They see crocuses.
5. **The news is the antagonist.** There is no enemy. The tension comes from a world ticker of humanity panicking, monetizing, worshipping, and slowly, slowly calming down.

## 2. Aesthetic & tone

- Black background, single amber/off-white monospace color (match the vibe of the reference screenshot: dark bg, warm yellow text). One accent state only: text that appears via the egg renders in a slightly brighter/whiter shade, like frost.
- All prose lowercase except the egg's inscription and the news ticker. Terse, declarative sentences. Example register:
  - `the shift is over.`
  - `the coffee is going cold.`
  - `you touch it. it is warm.`
- No sound required. If trivially easy, a single low sine hum (barely audible) that plays ONLY during the "sitting" state at the park, weeks after first contact. It is the hum from the story. No other audio.
- No mouse required. Arrow keys / letter keys / enter. Clickable fallbacks are fine.

## 3. Screen layout

Three regions, all initially mostly empty:

```
+--------------------------------------------------------------+
| NIGHT 1                                        02:14          |   <- header: day counter, clock
+--------------------------------------------------------------+
|                                                               |
|  the ward is quiet.                                          |   <- LOG (center, scrolling,
|  mr. okafor is awake.                                        |      the heart of the game)
|                                                               |
|  > sit with him                                              |   <- verb list (grows over time)
|  > check the charts                                          |
|                                                               |
+--------------------------------------------------------------+
|                                                               |   <- WORLD TICKER (hidden until
|                                                               |      Night 4; then a single line
+--------------------------------------------------------------+      of slow marquee news)
```

- **Header:** `NIGHT n` and a clock that advances with actions. Later, `NIGHT` sometimes becomes `MORNING` (the walk home) and, much later, seasons appear: `SPRING, YEAR 2`.
- **Log:** scrolling text, most recent at bottom, old lines dim.
- **Verbs:** contextual choices under the log. Never more than 5 visible.
- **Ticker:** appears Night 4 (the eggs arrive between Night 3 and Night 4). One line, updates every ~45s real time or on scene change. ALL CAPS, newswire style.
- **Locations:** no map. Locations are scenes the game moves you through: `WARD → the walk → the park → the flat → sleep → WARD`. Later the player gains the choice to linger or skip.

## 4. Core loop

One in-game night = one loop:

1. **WARD (work).** 2–4 small scenes with patients. Teaches the sit mechanic (see §5). Emotional weight accumulates here (hidden stat: `weight`).
2. **THE WALK (dawn).** A connective scene. From Night 4 onward, the park — and the egg — is on the route. The player may `stop at the park` or `keep walking`.
3. **THE PARK (optional).** The centerpiece. Verbs grow over the weeks: `look`, `walk around it`, `touch it`, `sit on the bench`, and eventually just `sit`.
4. **THE FLAT / SLEEP.** One or two flavor beats (`the kettle. the window. the bed.`), then sleep advances the day. Ticker updates happen "overnight."

Time compresses as the game proceeds: Nights 1–14 are played one by one; Act II moves in weeks (`three weeks pass.`); Act III in seasons. This mirrors the story's structure — the miracle becoming furniture.

## 5. The core hidden mechanic: PRESENCE

The engine of the whole game. **Never surface this word or any meter for it.**

- While in a `sitting` state (with a patient, or on the park bench), a hidden timer accrues **presence**.
- **Any keypress pauses/breaks accrual** and prints a gentle deflection: `he stirs.` / `a jogger passes.` / `the moment thins.` Accrual resumes a few seconds after the player goes still again.
- Accrual rate: 1 presence per ~4 real seconds of stillness. A "good sit" (60–90s of genuine idle) yields ~15–25.
- The FIRST teaching moment is scripted at the ward, Night 1: the player chooses `sit with him`, the verbs disappear entirely for 20 seconds, and the log slowly prints, one line every ~6s:
  ```
  you sit.
  the machines tick.
  he doesn't need you to say anything.
  minutes pass.
  ```
  Then verbs return. This teaches, wordlessly: *sometimes the game takes the controls away and that is the point.* Every subsequent sit is voluntary and unscripted — the player must choose to keep their hands off the keyboard with no prompt telling them to.
- **Anti-idle guard:** presence accrual per sit caps at 90 seconds of stillness (`the cold gets into your coat. time to go.`), so walking away from the keyboard overnight doesn't cheese it. What matters is cumulative presence across many visits — exactly like the story: *once is not enough; it is the returning.*
- Hidden counters to track:
  - `presence_total` (lifetime)
  - `presence_egg` (accrued only at the park, only while within touch/bench range of the egg)
  - `visits_egg`, `touches_egg`, `patients_sat_with`, `demands` (times the player used interrogative verbs at the egg — see §7)

## 6. Hidden world-state: EASE vs FEAR

A single global scalar `ease` (0–100, starts 20) representing humanity's acclimatization. The player nudges it only slightly; mostly it moves on its own over time (the aliens' plan is working regardless — the player is a witness, not a savior; this is important to the story's tone).

- Passive drift: +1/night after Night 20.
- Player contributions: small bumps for community-facing choices (talking to the widow, answering a stranger's question honestly, not filming).
- `ease` gates the ticker content (see §9) and ambient park descriptions (crowds → regulars → tai chi man → crocuses).
- There is no fail state. `ease` never decreases from player action. The world calms down with or without you. What the PLAYER can uniquely earn is private: the second message.

## 7. The egg: interaction design

Verbs at the park, in order of unlock:

| Verb | Unlock | Behavior |
|---|---|---|
| `look at it` | Night 4 | Static description. Repeating it yields the SAME text every time, forever. (`it is the color of wet pewter. there is no seam on it anywhere.`) The refusal to vary is deliberate. |
| `walk around it` | Night 4 | **Curiosity reward #1:** the inscription can only be read by circling it. Prints the message one clause at a time as you circle. First time this happens is the first time the full message appears in the game. |
| `touch it` | Night 5 | `you touch it. it is warm.` — Occasionally (10%): `blood-warm. the temperature of a held hand.` After ~Night 30, while touching: `somewhere under your palm: attention.` |
| `ask it` / `demand` | Night 8 (appears after ticker reports people demanding answers) | A trap, gently. `you ask it what it wants. / the metal says nothing. / it is not a refusal. it is patience.` Increments `demands`. High `demands` never punishes — but the second message requires a stretch of visits with zero demands (see §8). The player must *unlearn* the verb. |
| `sit on the bench` | Night 6 | Enters the sitting state (§5). This is where the game is actually played. |
| `leave something` | After the widow scene (~Night 25) | Player may leave one small item, once (a coffee, a button, a written line the player actually types). Cosmetic, permanent, referenced once much later: `the thing you left is gone. taken by weather, or a thief, or — you like to think — accepted.` |

**Curiosity rewards (never hinted, only findable):**
- Visiting at a different time: skipping sleep once (`stay up`) lets you visit at dusk; unique description.
- Visiting the morning after losing a patient (see §8): unique, tender scene.
- Touching it during rain: `the rain does not bead on it the way it should.`
- Circling it a second full time in one visit: `you notice: the crocuses' — wait. there are no crocuses yet.` (foreshadow; only fires in winter of Year 1).
- Doing literally nothing on the title screen for 60 seconds before pressing start: the title `THE LONG HELLO` gains one extra line beneath it: `there is no hurry.` (Sets a flag; tiny callback at the end.)

## 8. Progression & act structure

**ACT I — NIGHTS (Nights 1–14, played daily)**
- Nights 1–3: pure hospice-nurse life. No aliens. Establish the sit mechanic, meet 2–3 patients (see §10), learn the loop. The game looks like it's about being a nurse. It is.
- Between Night 3 and 4: the arrival. No cutscene. The player simply walks home and the log says: `there is something in the park.` Ticker turns on mid-walk: `OBJECTS REPORTED IN — PARIS. LAGOS. CHENNAI. EVERYWHERE.`
- Nights 4–14: the world convulses via ticker (counts rising, hoax claims, the desert footage — see §9). The park has crowds (`a man is filming it, narrating quietly, as if it might overhear.`). Player establishes (or doesn't) the visiting habit.

**ACT II — WEEKS (Nights 15–~60, time compresses)**
- The loop offers `weeks pass.` skips; the ward rotates new patients; the park crowd thins to regulars.
- ~Night 30: the hum. ONLY discoverable while sitting, ONLY after 20+ cumulative minutes of egg presence: `not a sound. a feeling in the teeth. the way a cathedral hums after the organ has stopped.`
- The widow scene (scripted, ~Night 25): she leaves the ring. Unlocks `leave something`.
- **THE SECOND MESSAGE** — the game's hidden climax. Fires the first time ALL are true:
  - `presence_egg ≥ 300` (≈ 20 minutes of cumulative genuine stillness at the egg)
  - `visits_egg ≥ 8`
  - the last 5 visits contain zero `demands`
  - `patients_sat_with ≥ 4` (the ward taught you this)
  - player is currently touching it OR sitting, still, for 45+ unbroken seconds
  - Presentation: log slows to one line per 5 seconds, frost-bright text:
    ```
    a second band of words rises under the first,
    the way frost grows on a window from the inside.
    it does not pass through language at all.

    THANK YOU FOR NOT FLINCHING.
    THERE IS NO HURRY.
    WE HAVE ALL THE TIME YOU NEED.

    then it fades.
    you will never see it again.
    ```
  - This is once per save, ever. If the player reloads to see it again: `it is warm. once is all anyone gets.` (Yes, detect this. It's the best line in the game to gate behind save-scumming.)

**ACT III — SEASONS (Year 1 winter → Year 4 spring)**
- Time in seasons. The ticker cools (see §9 arc). The Lagos teenager's video lands here — the story's thesis, delivered by the world, not the game: `"THEY'RE NOT WAITING FOR US TO FIGURE OUT THE MESSAGE. WE ARE THE MESSAGE."`
- The UI itself performs acclimatization: the ticker updates less often, then only on season change, then goes quiet entirely (the news has moved on). Crowd descriptions vanish. The egg's paragraph in the park scene gets SHORTER each season until it is one line: `the egg. the bench. the canal.` The most important object in human history becomes furniture — mechanically.
- Ending (Spring, Year 4): scripted final walk home after losing a patient. Tai chi man. Crocuses at the base. One last sit. If the player earned the second message, the final line is `you know what it would say.` If they never earned it, the final line is `you never did touch it for long. it stands there anyway. patient as weather.` — both endings are warm; one is intimate. Then:
  ```
  somewhere out past everything, the long hello continues.

  [title-screen flag set?] there was never any hurry.
  ```

## 9. The world ticker — content arc (~40 lines, sample)

Delivered in order, gated by night count and `ease`. Style: wire-service caps, no editorializing.

```
Night 4:   OBJECTS NOW CONFIRMED ON SIX CONTINENTS. COUNT UNKNOWN.
Night 5:   ESTIMATE REVISED: 400,000. NOT ONE IN A ROADWAY.
Night 6:   "IMPOSSIBLE TO FAKE" — MATERIALS PANEL. HOAX THEORIES COLLAPSE.
Night 8:   CROWDS DEMAND RESPONSE. OBJECTS SILENT.
Night 9:   LEAKED FOOTAGE: SOLDIER FIRES ON OBJECT. ROUND VANISHES. NO RESPONSE.
Night 10:  NO RETALIATION REPORTED ANYWHERE. ANALYSTS: "THERE IS NO FLOOR."
Night 12:  MARKETS STEADY. "AN EVENT WITH NO DEADLINE IS HARD TO PRICE."
Night 14:  OFFERINGS REPORTED AT OBJECT SITES: FLOWERS. LETTERS. A RING.
Week 4:    FIRST WEDDING HELD "BY THE EGG." THE WORD HAS STUCK.
Week 6:    TEENAGERS USING OBJECTS AS MEETING POINTS. OFFICIALS OBJECT TO "EGG."
Week 9:    LAGOS VIDEO PASSES ONE BILLION VIEWS: "WE ARE THE MESSAGE."
Season:    ONE YEAR ON: SCHOOLS REPORT CHILDREN "SIMPLY USED TO THEM."
Season:    (ticker updates grow rare)
Season:    (ticker is blank. it has been blank for a while.)
```

## 10. The ward — patient vignettes

3–4 line micro-stories, one patient active per stretch. They carry the emotional weight AND train the mechanic. Each patient has: a name, 2–3 scenes, and a death that happens off-screen between nights (`mr. okafor's bed is empty. the window is open. someone has opened it on purpose.`). Write ~6 patients; sample:

- **mr. okafor** (Nights 1–6): the teacher. Asks once: `"do you think we're alone? i always hoped."` He dies the night the eggs arrive. The player realizes the timing on their own or never does.
- **dee** (Act II): young, angry, demands things of everyone including you. Her arc teaches what `demands` costs and what stopping them gives. Her last scene: she asks you to just sit. You do. This can literally unlock the player's own behavior at the egg.
- **the quiet man** (Act III): no dialogue at all. Three sits. The game's final exam in stillness before the ending.

Rule: the ward is never about the aliens. Patients mention the eggs at most once each. The parallel (sitting with the dying / sitting with the egg — presence without demand at a threshold) must NEVER be stated by the game. The mechanic states it.

## 11. Technical notes

- **Stack:** single `index.html`, vanilla JS or minimal framework, monospace font (e.g. `IBM Plex Mono` or system mono), no build step preferred. All text content in one `content.js` data file (scenes, ticker lines, patients) so writing is editable without touching engine code.
- **State:** one JSON-serializable object; autosave to `localStorage` every scene change. Include `secondMessageSeen: true` permanently (see save-scum line, §8). *(Note for jam hosting: if the target environment disallows localStorage, fall back to in-memory state and say so on the title screen: `this cabinet forgets. finish your visit.`)*
- **Idle detection:** `keydown`/`pointerdown` listeners reset a stillness timer; presence accrues on `requestAnimationFrame` ticks while `now - lastInput > 3000ms` AND the sitting state is active AND the tab is visible (`document.visibilityState === 'visible'` — do not accrue in background tabs).
- **Text pacing:** all log lines print with a per-line delay (no typewriter effect per character — full lines, slow cadence, ~400–900ms between lines, 5000ms in ceremonial scenes). A `skip` key (space) that everyone will try should print: `there is no hurry.` — and not skip. (Once per session; after that space does nothing at the egg, works normally elsewhere.)
- **Accessibility:** everything keyboard-first already; ensure log region is `aria-live="polite"`; the stillness mechanic is inherently screen-reader-compatible (waiting is waiting).
- **Tuning hooks:** put every threshold from §5–§8 in one `TUNING` const at the top.

## 12. What NOT to build (scope guard)

- No inventory, no crafting, no map, no combat, no dialogue trees deeper than 2 choices.
- No graphics beyond text and at most ONE ascii art asset: the egg itself, shown once, at first sight, and never again:

```
        .------.
      /          \
     |            |
     |            |
      \          /
        '------'
```

  (Roughly this — a tall soft ellipse, ~7 lines. Showing it only once makes the point: after the first time, you don't need to see it. You know it's there.)

- No branching plot. One story, two textures of ending (intimate / distant), determined entirely by how the player *behaved*, never by what they *chose from a menu*.

## 13. Playtest checklist (definition of done)

1. A player who mashes through everything reaches the ending in ~40 min and it still lands as a melancholy short story.
2. A player who once, unprompted, leaves their hands off the keyboard at the bench for a full minute gets visibly rewarded within two more visits (the hum), confirming the hypothesis and teaching the whole game.
3. No screen ever tells the player to wait, be patient, or stay still. Grep the content file for "wait", "patience", "still" in instructional voice — must return zero.
4. The second message triggers for attentive players on nights 30–45 without a guide.
5. The ticker going silent in Act III is noticeable and lands as intended ("the world got used to it") for at least some testers.
```
