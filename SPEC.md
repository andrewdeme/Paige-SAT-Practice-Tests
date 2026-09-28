# SAT Rehearsal Trainer — Build Spec

Drop this file at the root of the repo. It is the brief for the build session.

---

## 1. What this is

A timed practice environment for a student who tests well on content and badly on
conditions. The goal is not score lift through instruction. The goal is **condition
tolerance**: making the 32-minute module feel routine before test day.

Bluebook already simulates the exam and is free. This app does not replace it. It sits
around it, doing the three things Bluebook does not:

1. Records **per-question timing** so you can see where time actually went.
2. Shows a **pacing rail** instead of a bare countdown, so "am I behind?" is answerable
   at a glance rather than guessed at.
3. Runs a **difficulty ramp** on two independent axes so conditions can be dialed up
   gradually instead of jumping straight to full pressure.

The six official Bluebook practice tests stay reserved as dress rehearsals. Do not burn
them on drills.

---

## 2. The two-axis difficulty model

This is the core of the product. The common mistake is treating "difficulty" as one
slider. It is two, and they move at different speeds.

### Axis A — Condition difficulty (how much pressure)

| Stage | Name | Timer | Environment |
|---|---|---|---|
| 1 | Open | none, hidden | one question at a time, back/forward free |
| 2 | Clocked | counts up, visible | no limit, timing recorded only |
| 3 | Generous | 150% (48 min RW / 53 min Math) | pacing rail on |
| 4 | Tight | 125% (40 min / 44 min) | pacing rail on, 5-min alert |
| 5 | Real | 100% (32 min / 35 min) | full Bluebook chrome, no pause |
| 6 | Room | 100% | ambient room audio, no pause, module auto-submits |

### Axis B — Content difficulty (how hard the questions are)

| Tier | Name | Composition |
|---|---|---|
| 1 | Foundation | easy only |
| 2 | Warm | 70% easy / 30% medium |
| 3 | Balanced | 30% easy / 45% medium / 25% hard — mirrors a real Module 1 |
| 4 | Adaptive | real routing: Module 1 balanced, Module 2 branches easy or hard on performance |
| 5 | Hard path | Module 2 forced to the hard set, to rehearse the difficulty jump |

**These move independently.** Her bottleneck is Axis A. Push Axis A hard and hold Axis B
at 2 or 3 until conditions are tolerable. A student who can sit calmly through a real-time
module at Tier 2 is in better shape than one who grinds Tier 5 untimed.

### Advancement rules — automatic, not manual

Advance **Axis A** one stage when, across 2 consecutive runs at the current stage:
- the module was completed (not abandoned), and
- panic markers ≤ 1 per run, and
- pacing deviation stayed within ±3 questions of target at every checkpoint.

Accuracy is deliberately **not** a gate on Axis A. Conditions and content are separate
problems; gating one on the other stalls the ramp.

Advance **Axis B** one tier when accuracy ≥ 70% at the current tier across 2 runs.

### Regression rule

Any run with ≥ 3 panic markers, or an abandonment, drops Axis A by one stage
automatically for the next session. Silently. No "you dropped a level" messaging anywhere
in the UI — the setting just changes.

### What the student sees

Never a level number, never a ladder graphic, never a streak she can break. One line on
the start screen: *"Today: 27 questions, 40 minutes."* The ramp is machinery, not a score.
Full ramp state is visible in the parent/coach view only.

---

## 3. Test format to mirror (current)

- Reading & Writing: 2 modules, 32 min each, 27 questions each (54 total)
- 10-minute break
- Math: 2 modules, 35 min each, 22 questions each (44 total)
- 2h14m, 98 questions
- Multistage adaptive — Module 1 performance routes Module 2 easy or hard. Module 1 sets
  the section ceiling; there is no recovering in Module 2. Build this into the drill
  weighting: Module 1 reps matter more.
- Calculator allowed on all Math questions; Desmos embedded
- Countdown is hideable; 5-minute warning fires
- ~25% of Math is student-produced response (free entry, no choices)

Question domains to tag against:

- **RW:** Information and Ideas · Craft and Structure · Expression of Ideas ·
  Standard English Conventions
- **Math:** Algebra · Advanced Math · Problem-Solving and Data Analysis ·
  Geometry and Trigonometry

---

## 4. How many tests

Not a fixed number — the engine assembles tests from a tagged pool at run time, so the
answer is a function of bank size.

- **Starter bank** (written for the repo): enough for module drills and reshuffles.
- **After importing College Board's Educator Question Bank** (~1,079 RW / ~938 Math real
  questions, exportable, with an "exclude active questions" filter that keeps you off
  items live in Bluebook): roughly **12–15 well-formed non-overlapping full-length
  tests**, and effectively unlimited single-module drills.
- Plus the 6 official Bluebook tests, untouched, as proctored rehearsals.

Build the importer early. It is what turns this from a demo into a system.

---

## 5. Stack

- **Vite + React + TypeScript.** Not Next.js — there is no server-side need yet, and
  fewer moving parts is the right call for a first build.
- **Deploy:** Vercel static. Connect the GitHub repo, framework preset Vite, done.
- **Storage:** IndexedDB via Dexie. No backend, no accounts, no PII leaves the device.
- **Calculator:** Desmos embeddable graphing calculator API. Free, but requires an API
  key request from Desmos before production use — check current terms. Feature-detect and
  degrade gracefully if absent.
- **Charts:** Recharts for the report view.
- **Audio:** Web Audio API, synthesized. Filtered pink noise plus randomized transients
  (chair creak, keyboard, footsteps). No audio files to host.

---

## 6. Data model

```ts
type Question = {
  id: string;                 // 'rw-cs-m-014'
  section: 'rw' | 'math';
  domain: string;
  skill: string;
  difficulty: 'E' | 'M' | 'H';
  stimulus?: string;          // passage, table, or figure caption
  figure?: string;            // inline SVG or data URI
  stem: string;
  type: 'mc' | 'spr';         // spr = student-produced response
  choices?: [string, string, string, string];
  answer: number | string;    // index for mc, accepted value(s) for spr
  rationale: string;
  source: 'original' | 'eqb'; // provenance — never mix official items into shipped builds
};

type QuestionEvent = {
  questionId: string;
  enteredAt: number;          // ms from module start
  leftAt: number;
  visits: number;             // returns count as separate visits
  selected: number | string | null;
  changedFrom: (number | string)[];  // full answer-change history
  markedForReview: boolean;
  eliminated: number[];       // choices crossed out
};

type PanicMarker = { atMs: number; questionId: string };

type Run = {
  id: string;
  startedAt: string;
  section: 'rw' | 'math' | 'full';
  moduleIndex: 1 | 2;
  conditionStage: 1|2|3|4|5|6;
  contentTier: 1|2|3|4|5;
  allottedMs: number;
  events: QuestionEvent[];
  panics: PanicMarker[];
  completed: boolean;         // false = abandoned
  routedTo?: 'easy' | 'hard';
};
```

Everything else in the app is derived from `Run[]`. Do not store computed scores.

---

## 7. Screens

**Start.** One line of plain text about today's session and a single button that says
*Start module*. Nothing else. No dashboard, no stats, no encouragement copy.

**Module.** Bluebook-faithful chrome:
- question number, mark-for-review flag, answer eliminator (cross out choices)
- question navigator grid, opens on click, shows answered / marked / unseen
- countdown with a hide toggle; 5-minute alert
- Desmos on every Math question; Math reference sheet panel
- **pacing rail**: a horizontal track with two markers — where she is, and where she
  should be. Ahead or on pace is neutral. Behind is ochre. Nothing on this screen is ever
  red.
- panic marker: `P` key or a small unlabeled button. Records and moves on. No modal, no
  "are you okay," no interruption.

**Break.** 10-minute countdown, skippable.

**Report.** The point of the whole thing:
- time-per-question bar chart, with panic markers overlaid as ticks
- pacing deviation curve against target
- **donated points**: easy-tier items answered wrong — the highest-leverage list
- answer-change analysis: changed-right vs. changed-wrong
- flagged-but-never-returned count
- estimated scaled score, labeled clearly as an estimate

**Coach view.** Route at `/coach`. Ramp state, run history, trend lines, JSON export.
Not linked from the student UI.

---

## 8. Build order

1. Repo scaffold, Vercel deploy on a hello-world. Confirm the pipeline works before
   writing features.
2. Question schema + starter bank as JSON + a validator script that fails the build on a
   malformed item.
3. Module runner at condition stage 5 only (real timing). Get one 27-question RW module
   working end to end.
4. Event capture and IndexedDB persistence.
5. Report screen.
6. Condition ladder stages 1–4 and 6, plus the advancement/regression engine.
7. Content tiers and adaptive routing.
8. Desmos, reference sheet, ambient audio.
9. Educator Question Bank importer.
10. Coach view.

Ship after step 5. Put it in front of her at step 5 and let the report tell you what to
build next.

---

## 9. Acceptance criteria

- A real-time module cannot be paused, and the timer running out submits the module.
- Every question records enter time, leave time, and visit count — including revisits
  through the navigator.
- Panic markers never trigger a UI interruption.
- No red anywhere in the module UI. No sound except the ambient layer at stage 6.
- The ramp adjusts without any student-facing announcement.
- Closing the tab mid-module and reopening resumes the run with the clock correct.
- Original and imported questions are tagged by provenance and never mixed in a
  distributed build.

---

## 10. Content constraint

Do not reproduce College Board questions in anything that leaves the device. The Educator
Question Bank is exportable for instructional use; keep imported items local to her
install, tagged `source: 'eqb'`, and out of the repo. Anything committed to GitHub is
original or nothing.
