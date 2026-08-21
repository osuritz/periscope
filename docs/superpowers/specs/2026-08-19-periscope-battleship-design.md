# Periscope — Battleship for a five-year-old

**Date:** 2026-08-19
**Status:** Approved design, pending implementation plan
**Design source:** Claude Design project `e5735a55-a1c4-4bfe-90eb-826ac06e7fd6`,
direction `1b` (extracted to `docs/design/periscope-1b.dc-extract.html`)

## 1. What this is

A free, web-playable Battleship game whose primary player is a five-year-old
playing solo against the computer. It runs as a static site, costs nothing to
host, and speaks every move aloud in a natural voice.

The design concept, quoted from the source: *you are inside the sub — one lit
scope screen you shoot into, your own fleet is the instrument strip under your
hands.*

That concept is load-bearing, not decorative. The single hardest UI problem in
kid-facing Battleship is that the two grids look alike and a child fires at his
own fleet. Periscope makes the grids **asymmetric**: the enemy sea is a large,
lit, bordered panel; the player's fleet is a small passive readout. Only one of
them looks tappable. Preserve that asymmetry in every layout.

## 2. Goals

- A five-year-old can start and finish a game with no adult help and no reading.
- Every game event is announced in a natural-sounding voice, instantly.
- The game is fully legible with sound off.
- $0/month to run, forever.
- The game logic is pure, deterministic, and exhaustively testable.

## 3. Non-goals

- Multiplayer, online or local. Single player vs. computer only.
- Accounts, persistence beyond a single browser, analytics, or telemetry.
- Native app packaging.
- Runtime AI inference of any kind. See §8.

## 4. Product decisions

### 4.1 Board modes

| Mode | Grid | Fleet | Target length |
|---|---|---|---|
| **Little Captain** (default) | 6×6 | 3 ships: lengths 3, 2, 2 | 3–5 min |
| **Admiral** | 10×10 | 5 ships: lengths 5, 4, 3, 3, 2 | 15–20 min |

Board size is chosen on the title screen and rendered **as a dot-grid of that
size**, never as the text "6×6". Grid dimensions are a parameter throughout the
core; no code branches on mode.

### 4.2 Opponent difficulty

Three honest tiers, selected by face card and pip count, never by name:

- **Rookie** (default) — uniform random selection among untried cells. No
  adjacency reasoning at all. A hit teaches it nothing.
- **Sailor** — hunt/target. Random hunt; on a hit, queue the four orthogonal
  neighbours; on a second collinear hit, extend along that axis and drop the
  perpendicular candidates.
- **Admiral** — parity-restricted hunt plus a probability-density search: score
  every cell by how many legal placements of the remaining enemy fleet cover it,
  fire at the argmax. Falls back to targeting mode while any hit is unresolved.

No rubber-banding, no hidden difficulty adjustment. The child can genuinely win
and genuinely lose; that is what makes winning mean something.

### 4.3 Voice packs

Two packs, selectable by a parent in settings:

- **Silly Sea Captain** — warm, characterful, nautical. Default.
- **Calm Narrator** — gentle, even, no combat framing.

The pack governs both the audio **and the on-screen wording**, because both come
from the same line table (§8.1). The Captain pack says `FIRE`; the Narrator pack
says `LOOK HERE`. This is a data swap, not a code fork.

### 4.4 Turn rule

**One shot per turn.** After a hit, a miss, or a shot that sinks a ship, the
turn always passes to the other side — this matches official Hasbro Battleship
rules ("You and your opponent will alternate turns, calling out one shot per
turn... After a hit or a miss, your turn is over.") An earlier revision of this
game gave the shooter another go on a hit or a sunk ship; that was a house
rule, not Battleship, and has been corrected to match the official rules.
Firing at a cell that has already been fired at is still a no-op that does not
consume the turn, so a double-tap cannot cost a child their go — that part was
never a rules question, only a UI protection, and is unaffected by this
correction.

Measured head-to-head win rates for a player firing uniformly at random among
untried cells — the code's own model of a five-year-old, per the comment on
`rookie.ts` — over 400 seeded games per cell, player moving first, under the
one-shot-per-turn rule:

| Board / tier | Player wins |
|---|---|
| Little Captain / Rookie | 57.0% |
| Little Captain / Sailor | 10.3% |
| Little Captain / Admiral | 1.0% |
| Admiral / Rookie | 52.8% |
| Admiral / Sailor | 1.5% |
| Admiral / Admiral | 0.0% |

These were re-measured after the turn-rule correction above, replacing an
earlier table produced under the old "hit keeps the turn" house rule. **The
numbers barely moved.** Little Captain / Rookie is identical to three
significant figures (57.0%, since Rookie never benefits from a streak — it
picks blind whether it just fired one shot or five); Admiral / Rookie, Little
/ Admiral, Admiral / Sailor, and Admiral / Admiral are all within noise of
their old values. The one real shift is Little Captain / Sailor, which rose
from 7.0% to 10.3% — a genuine change (well outside the ~1.3-point sampling
error at n=400) but still a long way from "largely dissolved": the child still
loses to Sailor roughly nine games in ten.

This is worth stating plainly because it contradicts the working theory that
motivated re-measuring. Sailor's raw efficiency edge is real but modest —
clearing a 6x6 board averages 22.2 shots for Sailor against 32.1 for a random
player, a 1.45x advantage — and the theory was that the old streak rule was
what inflated that modest edge into a 93% loss rate. If that were the whole
story, removing the streak should have pulled the cliff back toward 50%. It
did not. The better explanation is structural, not rule-specific: this is a
strict alternating race to sink the other fleet first, and whichever side
needs fewer shots to clear the board will very reliably finish those fewer
shots before the slower side finishes its larger number — regardless of
whether either side ever got two shots in a row. A 1.45x gap in shots-needed
is enough on its own to produce a lopsided win rate in a race structured this
way, streak or no streak.

**Rookie remains the default, and the tier calibrated for the child** — a
random player still beats it slightly more often than not on both boards.
Sailor and Admiral remain adult tiers, now for a better-understood reason: the
gap is inherent to how much more efficiently they search, not an artifact of
a house rule that has since been removed.

None of this is rubber-banding and none of it qualifies §4.2. The tiers stay
honest and no hidden adjustment is made; this subsection records what the
existing ladder measures.

## 5. Visual design system

### 5.1 Type

- **Display:** Bungee. Used for the wordmark, turn state, result words, and
  primary button labels. Always uppercase, `line-height: 1`.
- **UI:** Space Grotesk, weights 500 and 700.

Scale as drawn: result word 132px (feedback takeover) / 56px (inline), section
headings 24–38px, primary status 22px/700, parent-facing labels 15px/500.

### 5.2 Palette

| Token | Hex | Role |
|---|---|---|
| `--hull` | `#0E1726` | page ground, miss fill |
| `--panel` | `#16233A` | surfaces, unknown cell fill |
| `--line` | `#2B3D5C` | borders, inactive |
| `--muted` | `#4C6A99` | dim strokes, tertiary text |
| `--ink-2` | `#8FB4E8` | secondary text, miss glyph |
| `--scope` | `#33E1C4` | primary: own fleet, ready, victory |
| `--amber` | `#FFC24B` | your turn, hit, primary CTA |
| `--sunk` | `#FF5B5B` | destroyed |
| `--paper` | `#F2F7FF` | primary text |

Deep-shade partners for text/iconography on saturated fields:
`--on-scope: #03332B`, `--on-amber: #3A2600`, `--on-sunk: #2A0000`.
Border shades: `--amber-edge: #C98A16`, `--sunk-edge: #B02A2A`.

This is a committed dark theme. There is no light mode.

### 5.3 Cell states

Distinguished by **glyph and border-radius**, not colour alone — the board stays
readable in grayscale and to a colourblind player.

| State | Fill | Border (3px) | Glyph | Radius |
|---|---|---|---|---|
| Unknown | `--panel` | `--line` | — | 14px |
| Miss | `--hull` | `--muted` | `○` in `--ink-2` | 14px |
| Hit | `--amber` | `--amber-edge` | `✕` in `--on-amber` | 14px |
| Sunk | `--sunk` | `--sunk-edge` | `☠` in `--on-sunk` | **4px** |

The radius change on sunk is a silhouette change and is required, not cosmetic.

Unknown cells additionally carry `box-shadow: inset 0 0 0 8px rgba(0,0,0,.25)`
to read as unlit depth.

### 5.4 Turn state is the bezel

When it is the player's turn, the entire viewport carries
`box-shadow: inset 0 0 0 12px var(--amber)` (8px on phone). Not a badge, not a
label — the whole frame changes colour. This is the across-the-room readability
requirement and it is the single most important visual rule in the system.

### 5.5 Cell sizing

| Context | Cell | Gap |
|---|---|---|
| Enemy scope, Admiral 10×10, tablet | 52px | 5px |
| Enemy scope, Little Captain 6×6, tablet | 72px | 8px |
| Enemy scope, 6×6, phone | 46px | 4px |
| Own deck readout, 10×10 | 14px | 2px |
| Own deck readout, 6×6, phone | 28px | 3px |

The own-deck readout is **never interactive** and is therefore exempt from tap
target minimums. Every enemy-scope cell is at or above the 44px floor.

## 6. Screens

1. **Title** — `◎` + PERISCOPE wordmark; settings gear top-right; board-size
   selector rendered as dot-grids; three difficulty face cards (150×186, 5px
   border, teal when selected, 50% opacity when not) each showing a portrait and
   three pips; volume toggle; a 132px-tall amber **DIVE** button.
2. **Ship placement** — MY DECK grid at 72px in a teal-bordered panel; a 196px
   amber **SHUFFLE** die as the primary action; a dashed hint card explaining
   drag-to-move and two-finger-tap-to-rotate; a 130px teal **READY** bar.
3. **Game** — see §7 for the three layouts.
4. **Feedback takeover** — full-frame, 26px inset border in the deep-shade
   partner colour, with a **translucent** field (~80% opacity via
   `color-mix(in srgb, <field colour> 80%, transparent)`) plus a light
   `backdrop-filter: blur(6px)`, so the board reads through it instead of
   vanishing. Only the field background is translucent — the glyph, `WORD`,
   and caption stay on solid ink/field colours so nothing about the text
   fades:
   - *Hit:* amber field, radial rings, `✕` at 210px inside a 300px tile, `HIT`
     at 132px, chip reading `B4 · fire again`.
   - *Miss:* hull field, concentric rings, `○` in a 280px 20px-stroke circle,
     `MISS` at 104px, chip reading `E7 · water only`.
   - *Sunk:* sunk field, 45° hatching, `☠` at 200px rotated −8°, `SUNK` at 96px,
     fleet pips below.
5. **Victory** — teal field, conic ray burst, `SURFACED!` at 118px, one `☠`
   trophy tile per enemy ship, home button plus amber **DIVE AGAIN**.
6. **Parent settings** — dark sheet, reached by **holding the gear for 3
   seconds**. Voice pack, volume, reduce motion, speak-every-move, reset
   progress. Deliberately plainer than the rest of the game.

### 6.1 Feedback timing

Takeovers auto-advance after **1400ms** and are tap-to-skip. Under *reduce
motion* they are suppressed entirely and replaced by an inline announcement bar
update. This was not specified by the design; it is a decision recorded here.

Originally 900ms and fully opaque. Changed 2026-08-20 after the user watched
his five-year-old play: 900ms didn't give the boy enough time to register the
result word, and the opaque field hid the board entirely, which threw away
information — seeing *where* the shot landed while the word is up tells a
child more than a blank field does. The duration moved to 1400ms and the field
became translucent (§6 item 4) so the board stays visible underneath. Both
changes keep tap-to-skip, so an impatient child is never blocked by either.

## 7. Responsive layout

One component tree, three layouts, selected by media query. The scope/deck
asymmetry is invariant across all three.

- **Portrait tablet (768×1024)** — vertical stack: amber turn bar (92px) →
  scope panel (flex 1, 10×10 @52px, "last shot" chip, enemy fleet pips) → own
  deck strip (170px, mini-grid plus own fleet pips).
- **Landscape tablet (1024×768)** — turn bar stays full-width across the top;
  below it a two-column grid: scope panel on the left (~62%), own deck as a
  vertical instrument column on the right. *This layout is not in the source
  design; it was specified during brainstorming to cover the most common iPad
  posture.*
- **Phone (390×844)** — portrait stack compressed: 74px turn bar, 6×6 @46px
  scope, 28px own-deck readout, and a persistent bottom announcement bar showing
  the spoken line as text (`🔊  "C-7… HIT!"`).

## 8. Audio architecture

**There is no AI inference at runtime.** Every line is synthesised once at build
time by a high-quality TTS model and committed as a static asset. This is what
makes the game free, instant, offline-capable, and free of exposed API keys.

### 8.1 The line table

A single typed table (`src/audio/lines.ts`) is the source of truth for both the
spoken clip and the on-screen text, keyed by line ID and voice pack:

- **Coordinates** — `coord.a1` … `coord.j10`, 100 entries. Orientation matches
  the physical Hasbro board (Figure 5 of the official rules): the letter names
  the **row**, the number names the **column** — `coordLabel({x, y})` in
  `src/core/coords.ts` is `LETTERS[y] + (x + 1)`. This is a correction from an
  earlier revision that had the axes swapped; get it right before baking any
  clips, since each key is a committed audio asset and a swapped axis would be
  a wrong spoken coordinate that this table would not itself catch.
- **Results** — `result.hit`, `result.miss`, `result.sunk.<shipId>`,
  `result.allSunk`.
- **Turn** — `turn.yours`, `turn.mine`, `turn.thinking`.
- **Outcome** — `game.win`, `game.lose`.
- **Encouragement** — a small pool sampled without immediate repetition.

An announcement plays as **coordinate clip → 120ms gap → result clip**. Composing
two clips rather than baking `coord × result` phrases keeps the pack at roughly
135 clips instead of several hundred, at the cost of slightly less natural
prosody across the join. That trade is deliberate.

### 8.2 The bake script

`scripts/bake-voice.mjs` reads the line table, calls the TTS API once per
(pack, line), and writes `public/audio/<pack>/<lineId>.mp3` plus a manifest with
durations. It requires an API key **in the developer's environment at build
time only**. Generated audio is committed, so cloning and running the game
requires no key and no network.

### 8.3 Playback

Clips are preloaded per mode — Little Captain loads only its 36 coordinates —
and played through a small scheduler that queues announcements so they never
overlap. `speak every move` off mutes coordinate clips but keeps result clips.

## 9. Code architecture

The game core is pure and framework-free. React never owns game state.

```
src/
  core/          # pure, no imports from ui/ or audio/
    coords.ts      Coord type, index<->coord, "C7" labels
    fleet.ts       fleet definitions per board mode
    placement.ts   canPlace, place, randomFleet, shuffle, rotate
    shot.ts        fire(board, coord) -> {result, ship?}
    game.ts        state machine: setup -> playing -> over
  ai/
    rookie.ts  sailor.ts  admiral.ts   # each: (view) => Coord
    index.ts       strategy registry
  audio/
    lines.ts  player.ts  manifest.ts
  ui/
    screens/  components/  layout/
    tokens.css     the §5.2 palette as custom properties
```

Each AI strategy is a single pure function from an opponent's-eye view of the
board to a coordinate. They share no state, and swapping tiers swaps a function
reference. This is what makes them testable in isolation and simulatable against
each other.

**Stack:** React 19, Vite, TypeScript, Tailwind 4, Zustand for UI-only state,
Vitest plus Testing Library — matching the working setup in `~/dev/fencepix`.
No WASM: the heaviest computation in the game is Admiral's density map over 100
cells, which is microseconds of JavaScript.

## 10. Testing

- **Core** — exhaustive unit tests. Placement legality including edges and
  overlaps, shot resolution, sunk detection, win detection, and the invariant
  that a fleet placed by `randomFleet` is always legal (property test over many
  seeds).
- **AI** — each strategy must satisfy: never fires at a cell it has already
  fired at; always returns a legal in-bounds coordinate; terminates on a full
  board. Plus a strength-ordering test: over simulated games, Admiral finishes in
  strictly fewer shots on average than Sailor, and Sailor than Rookie.
- **UI** — Testing Library coverage of the flows a child actually performs: pick
  a mode, shuffle, ready, fire, see feedback, win.
- **Determinism** — the RNG is injectable so every game is reproducible from a
  seed.

## 11. Build and deploy

`vite build` to a static bundle; deploy to GitHub Pages or Cloudflare Pages.
No server, no secrets in the deployed artifact, no runtime third-party calls.

## 12. Deferred

- Syncing the finished component library back to Claude Design via
  `/design-sync`, so future design iterations compose real components. Worth
  doing once `ui/components/` has stabilised; explicitly out of scope now.
- A third voice pack, or per-child voice selection.
- Persisting difficulty and voice preference across sessions beyond
  `localStorage`.
