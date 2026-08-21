# Carry-over into Plan 2 (Periscope UI)

Parked residuals from the Plan 1 final review (branch `feat/game-core-and-ai`, head `10632ce`).
None blocked that merge. Items 1 and 2 should be done **before** the first `.tsx` file exists.

## 1. `src/core/isolation.test.ts` skips `.tsx` — fix first

The purity guard reads every non-test `.ts` under `src/core` and `src/ai` and asserts no
`../ui`/`../audio` imports and no `Math.random`/`document.`/`window.` (sole exception:
`src/core/rng.ts`). The final reviewer verified it catches seven injected violations — but it
filters on `.ts`, so a `src/ai/evil.tsx` containing all three violations passes silently.

Plan 2 introduces `.tsx`. Accept `.tsx` and exclude `.test.tsx`, as the first change of the plan.

## 2. Nothing prevents a `core` → `ai` import cycle

The isolation test bans only `ui`/`audio` path segments. `src/core/game.ts` importing
`../ai/index` would pass — and since `src/ai/index.ts` already imports `src/core/game`, that
would be a genuine cycle. Spec §9's layering is `core` depends on nothing, `ai` depends on
`core`. Extend the guard to assert `src/core/**` never imports from `../ai`.

## 3. `startPlaying` throws on a second call — make READY idempotent in the UI

`startPlaying` now throws unless `phase === 'setup'`, which is what protects the DIVE AGAIN
path from resurrecting a finished game. But it is the **opposite** of `fire`/`applyShot`, which
deliberately no-op on a repeat so a five-year-old's double-tap is harmless.

So: the READY button must not be able to call `startPlaying` twice. Disable it on first press,
or guard on `phase === 'setup'` at the call site. Same for DIVE AGAIN, which must go through
`newGame`, not `startPlaying`.

## 4. `src/ai/play.test.ts:54-55` — two unfalsifiable assertions

`shots.length <= cells` cannot fail, because `fire` never appends a duplicate shot. Dead weight
rather than a false signal — the real deadlock detection is the preceding line. Delete when
next touching that file.

## 5. Engine API notes the UI will want

From the whole-branch review, not defects — shape observations for Plan 2:

- **There is no `canFire(g, by, at)` predicate**, and `applyShot` has several throw sites. To
  call it safely the UI must replicate `phase === 'playing'`, `turn === by`, `inBounds`, and
  `!alreadyFired` — only `alreadyFired` is exported. Note the asymmetry: a child tapping the
  same cell twice is carefully protected, but a child tapping *during the computer's turn*
  throws. That is backwards relative to which mis-input is likelier. Either export `canFire`
  or make `applyShot` no-op symmetrically on out-of-turn taps.
- **A repeat tap produces a completely inert state** — `applyShot` returns the identical `g`
  with `lastShot` unchanged, so the child gets no visual and no voice. Correct engine
  behaviour, but Plan 3's line table (spec §8.1) has no "you already tried there" entry. Add one.
- **Render from `cellState`, never from `shot.result`.** `fire` marks only a destroyed ship's
  final cell `'sunk'`; earlier cells keep `'hit'` forever. Documented on the `Shot` type.
- **`ShipId = string`** will make Plan 3's `result.sunk.<shipId>` table impossible to
  exhaustively typecheck. Deriving a union from `FLEETS` is cheap and worth doing.
- **No `DEFAULT_MODE` / `DEFAULT_TIER`.** Spec §4.1/§4.2 name Little Captain and Rookie as
  defaults; the engine encodes neither, so the UI will hardcode them away from `FLEETS`.
- **`coordLabel` has no uniqueness test** over the 100 labels. Plan 3 keys every audio asset off
  these strings; a collision is a silent missing-clip bug.
- Fonts: `src/index.css` sets `font-family: 'Space Grotesk'` with no font loaded, and Bungee
  (spec §5.1) is absent entirely. `tokens.css` covers colour only.

## 6. Open product decision — the difficulty ladder

Recorded in spec §4.4 with the measured table. Player win rates against a random-firing player:
Rookie 57.0% / 54.5%, Sailor 7.0% / 1.5%, Admiral 1.0% / 0.0%. Rookie is calibrated for the
child; Sailor and Admiral are adult tiers. The title screen shows three face cards with 1/2/3
pips, which reads as a gradient. Confirm that is intended before drawing them.

---

# Carry-over into Plan 3 (added at Plan 2 merge)

Parked residuals from Plan 2's final re-review. Neither blocked that merge.

## A. `playToTheEnd()` needs an iteration guard — do this first, it is one line

`src/ui/screens/GameScreen.test.tsx` — the helper loops `while (s().game.phase === 'playing')`
with no bound. Under a regression where a shot stops consuming the turn, it spins at 99% CPU
forever instead of failing: a synchronous, unyieldable JS loop that no Vitest timeout can
preempt. A reviewer hit this during mutation testing and had to `kill -9` the worker.

The analogous pre-existing loop in `src/ui/store/gameStore.test.ts` ("plays a whole game to a
winner without throwing") already guards with `guard++ < 500`. Match it.

Why it matters more than it looks: turn-passing is exactly what Plan 2 changed (the official
one-shot-per-turn rule), and Plan 3 splits `freshGame` so the placement screen can observe
`phase === 'setup'` — both touch the machinery this loop depends on. A regression there should
turn CI red, not hang it.

## B. iPhone SE (375×667) needs scrolling to see the whole board

Confirmed live: cell floored at 44px, gap 1px, 269px of grid content in a 95px panel, grid
top-aligned so row A is visible at `scrollTop: 0` and row F is reachable by scrolling
(`scrollHeight − clientHeight === 174`).

This is arithmetic, not a bug — it cannot be closed without breaking one of: the 44px tap floor
(a five-year-old's fingertip), the deck readout spec, or the announcement bar. iPad is the
stated target device and is clean at every measured size. **A product decision for Plan 3**, not
something to quietly "fix" by shrinking tap targets.

## C. Deferred item 9 becomes reachable the moment Plan 3 starts

`TurnBar` has no branch for `phase === 'setup'` and would silently read "THEIR TURN". It is
currently unreachable only because `freshGame` bundles `startPlaying(newGame(...))`. Plan 3's
placement screen must split those — and the instant it does, this surfaces on the placement
screen. Handle it in the same task that does the split.

## D. Two spec-conformance items to schedule

- `src/ui/fonts.css` loads Bungee and Space Grotesk from `fonts.googleapis.com`. Spec §11 says
  "no runtime third-party calls" and §8 wants the game offline-capable. Self-host before deploy.
- `announcementText` returns a whole English sentence, but spec §4.3 says the voice pack governs
  both audio and on-screen wording from one line table, and §8.1 composes clips by **line ID**
  (`coord.g3`, `result.hit`, `result.sunk.tug`), not by rendered sentence. Plan 4 will need
  `lines(pack, lineId)` with the sentence assembled from parts. `LastShot` already carries
  everything needed — this is a refactor of one function, not a redesign.
