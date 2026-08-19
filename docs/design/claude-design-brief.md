# Claude Design prompt — Battleship for a 5-year-old

Design the UI for a free, web-playable Battleship game whose primary player is a
5-year-old, playing solo against the computer, usually on a tablet, usually with a
parent nearby but not driving. Give me **three visually distinct directions**, each as
its own row of artboards on the canvas, so I can compare them side by side.

## Who this is for

The player is five. Assume he recognizes numbers and some letters but does not read
fluently. **Nothing in the core loop may require reading.** Every action must be
discoverable from icon, color, motion, and a spoken line. Text on screen is a bonus
layer for the parent and for the kid a year from now — never the primary channel.

He plays on an iPad held in landscape, sometimes portrait, with imprecise fingers.
The same build must also work on a laptop with a mouse, and on a phone.

## The game

Standard Battleship against a computer opponent, with two board modes:

- **Little Captain** — 6x6 grid, 3 short ships. 3-5 minute games. The default.
- **Admiral** — 10x10 grid, 5 classic ships. For when he's older, or for a parent.

Three opponent difficulties the child picks **by picture, not by word**: Rookie,
Sailor, Admiral. Rookie is the default.

Every event is announced out loud by a pre-recorded AI voice ("B-4... HIT!",
"You sank my submarine!"). There are two selectable voice packs — a silly warm sea
captain, and a calm gentle narrator — chosen by a parent in settings. **Audio carries
the game; the visuals must carry the same information independently**, because the
tablet will sometimes be muted.

## Screens to design (one artboard each, per direction)

1. **Title / home.** Board mode, difficulty (as three character portraits), and a very
   large Play button. Must be navigable by a kid who can't read the labels.
2. **Ship placement.** He needs to put 3-5 ships on his own grid. Show me how — the
   default should be auto-placed ships with a big "shuffle" dice button, with
   drag-to-move as the advanced path. Ships must be grabbable with a fat fingertip.
3. **Main game screen.** The heart of it: his grid and the enemy grid, whose turn it
   is, what just happened, and which ships are still afloat. This is the hard one —
   two 10x10 grids plus status on a tablet in portrait is a real layout problem.
   Show me your answer for both board sizes if the solution differs.
4. **The hit moment.** A full-frame feedback state — the instant after he taps a
   square and it's a HIT. This is the payoff the whole game exists for; make it feel
   enormous. Also show the miss state and the ship-sunk state.
5. **Victory screen**, with an obvious play-again.
6. **Parent settings sheet.** Voice pack, volume, reduce motion, reset. Deliberately
   *less* fun and slightly harder to reach than everything else, so he doesn't end up
   in here by accident.

## Hard constraints

- Minimum tap target 64x64 CSS px for any control; grid cells no smaller than 44px
  even at 10x10 on a phone.
- Turn state must be unmistakable at a glance from across a room.
- Distinguish hit / miss / sunk / unknown by **shape and icon, not color alone** —
  roughly 1 in 12 boys is colorblind and I'd rather not find out the hard way.
- The child's own grid and the enemy grid must never be confusable. If he can't tell
  which one he's shooting at, the game is broken.
- Assume CSS and SVG only — no 3D, no photorealism, no engine. Chunky flat shapes,
  bold silhouettes, generous whitespace.
- It must not look like a default template or a corporate dashboard. This should feel
  like a toy.

## What I want from each direction

Give each direction a name and a one-line point of view, and vary something real
between them — the spatial metaphor, the level of representation (abstract grid vs.
literal ocean scene), the density, the emotional register. Don't give me the same
layout three times in different palettes.

For each, include the type scale, the palette with hexes, and the four cell states
drawn at actual size.
