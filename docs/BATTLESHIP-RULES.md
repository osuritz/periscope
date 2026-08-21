# Official Battleship rules — the authority for game mechanics

**Read this before changing anything about how the game is played.** Do not infer the rules
from the code, from memory, or from how you have seen Battleship played elsewhere. This project
has already shipped three rule errors that came from exactly that.

**Source:** Hasbro / Milton Bradley official instruction sheet, © 1990, item 4730 —
<https://www.hasbro.com/common/instruct/Battleship.PDF>

The rules below are a summary of game mechanics in our own words, for implementation reference.
The source PDF is the authority; consult it if anything here is ambiguous.

---

## The rules

**Object.** Be the first to sink all five of your opponent's ships.

**Board.** A 10×10 grid. **Letters A–J run down the left side and label the ROWS. Numbers 1–10
run across the top and label the COLUMNS.** A shot is called as letter-then-number, e.g.
"D-4" = row D, column 4. See the coordinate section below — we got this backwards once.

**The fleet.** Five ships per player:

| Ship | Length |
|---|---|
| Carrier | 5 |
| Battleship | 4 |
| Cruiser | 3 |
| Submarine | 3 |
| Destroyer | 2 |

**Placement.** Each ship goes horizontally or vertically — never diagonally. No part of a ship
may overlap another ship or run off the edge of the grid. Ships **may touch**; only overlap is
forbidden. Positions are fixed once the game begins.

**Turns.** Players alternate, taking **exactly one shot per turn**. The rules are explicit that
a turn ends after the shot resolves — *"After a hit or a miss, your turn is over."* A hit does
**not** earn another shot. See below.

**Calling a shot.** The firing player names a coordinate. The opponent must say whether it is a
hit or a miss.

**On a hit, the opponent names the ship.** Not just when it sinks — on every hit. The rules'
own worked example has one player call "D-4" and the other answer *"Hit. Cruiser."* This means
a player legitimately knows how much damage each enemy ship has taken, ship by ship, throughout
the game.

**Sinking.** When every hole in a ship is filled, it is sunk, and its owner must announce which
ship it was.

**Winning.** First player to sink the opponent's entire fleet of five.

**SALVO (official variant, not implemented).** Each turn you call five shots at once, and the
opponent then reports which were hits and on which ships. As your own ships sink you get
*fewer* shots per salvo, not more. Noted here so nobody mistakes our simplifications for SALVO.

---

## Where Periscope deliberately differs, and why

These are conscious product decisions for a five-year-old player, recorded so nobody "fixes"
them back. Everything not listed here follows the official rules.

| Deviation | Why |
|---|---|
| **"Little Captain" mode: 6×6 board, 3 ships of lengths 3, 2, 2.** | The official 10×10 / five-ship game runs 15–20 minutes and is too much board for a five-year-old. The official setup ships as "Admiral" mode, unchanged. |
| **Firing at an already-fired cell is a silent no-op and does NOT consume the turn.** | Double-tap protection. A small child taps twice; the real game has no rule for this because a physical peg board makes it obvious. Load-bearing for the UI — it relies on reference identity to detect it. |
| **Ships are auto-placed** (as of Plan 2). | The placement screen is a later plan. The official rule that positions are fixed once play begins is respected. |
| **Three named AI difficulty tiers** (Rookie / Sailor / Admiral). | Not a rules concept at all — the official game is two humans. The tiers are honest: no rubber-banding, no peeking at the opponent's board. |

---

## Mistakes already made — do not repeat these

Each of these shipped or nearly shipped because someone assumed instead of reading.

1. **"A hit lets you fire again."** Wrong — it is one shot per turn, always. This was implemented
   and merged before anyone checked the rules. It also silently created a difficulty cliff: a
   hunting AI chains hits down a ship while a child firing at random does not, which inflated
   Sailor's modest ~1.45× advantage in raw shot count into a ~93% loss rate for the player.
2. **"You can't know how damaged an enemy ship is until it sinks."** Wrong — the opponent names
   the ship on every hit. This nearly caused the enemy fleet display to hide information the
   player is entitled to, in the name of preventing a leak the real game does not have.
3. **Coordinate labels transposed** — letter taken from the column instead of the row. What this
   codebase once called "C7" a physical board calls "G-3". Matters especially because a later
   plan bakes one audio clip per coordinate label; getting this wrong would mean re-recording
   every one of them.

## If you are about to change game behaviour

- Check it against this file first.
- If this file does not cover it, check the source PDF before deciding.
- If you deliberately deviate from the official rules, add a row to the deviations table above
  with the reason — do not leave it for the next person to discover as a bug.
