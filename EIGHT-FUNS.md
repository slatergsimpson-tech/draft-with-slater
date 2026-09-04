# The eight funs, applied to this app

A working map of Marc LeBlanc's eight kinds of fun (from the MDA framework)
against what the app does today and what it could do next. The method for the
whole document: **each idea is an experiment, not a commitment.** Build the
smallest version, play a draft night with it, and keep it only if someone
mentions it without being asked. That last test is the whole measurement
apparatus — fun you have to point out isn't fun yet.

The order below is the working order: process first (is the *game* fun?),
sensation second (does it *feel* fun?), then the other six as deliberate
experiments.

---

## Where the app already stands, honestly

| Fun | Definition | Today | Grade |
|---|---|---|---|
| **Challenge** | game as obstacle course | learning bots, pick timer, 3 formats | B — bots exist but you can't tell if you outdrafted them |
| **Fellowship** | game as social framework | relay, lobby, seats, invite links | B+ — the plumbing is excellent; the *social moments* are thin |
| **Discovery** | game as uncharted territory | every set on Scryfall, chaos mode, bonus sheets, rules lookup | A− — genuinely strong; chaos mode is a discovery machine |
| **Expression** | game as self-creation | deck builder, sort piles, commander, cube import, export | B — you can build, but nothing celebrates *what* you built |
| **Sensation** | game as sense-pleasure | set-themed colors, card zoom, touch support | C — functional, not sensual; no motion, no ritual, no sound |
| **Fantasy** | game as make-believe | flavor-text greeting per set | C — one lovely touch, then the fiction stops |
| **Narrative** | game as drama | none deliberately | D — the draft *has* an arc (signals, the pivot, the rare you got passed) but the app never tells it |
| **Submission** | game as comfortable ritual | one-command launcher, low-friction joining | B+ — draft night is easy; *solo* has small frictions |

The grades point at the plan: Narrative and Sensation have the most headroom,
Challenge and Fellowship have the highest payoff per hour because they touch
every single draft.

---

## Phase 1 — Process overhaul (Challenge · Fellowship · Submission)

Goal: find the most fun way to *play*, before making anything prettier.
These change what happens during a draft, so they're testable in one evening.

### 1a. Two-player formats — Winston and/or Grid draft
The single biggest process gap. Real draft nights are most often **two or
three humans**, and pod-of-eight-with-bots is not the best game for two.
Winston (three growing piles, take-or-pass tension) and Grid (3×3 face-up
grid, take a row or column) are the classic head-to-head drafts and both are
mechanically small — no new card data, no new deck builder, just a new pick
loop. This is the experiment most likely to change how you actually play.

### 1b. Make the bots an opponent you can feel
`botLearn` already adapts, but Challenge-fun needs *legible* opposition:
- Bot difficulty tiers (greedy / archetype-loyal / reads-signals).
- **Post-draft pick review**: for each of your picks, what the bot rated
  highest and whether you agreed. Cheap to build — `rateCard` already exists —
  and it converts every draft into a skill loop.
- Name the bots and keep their names stable per draft (this is also
  Fantasy/Fellowship fuel — "Greta cut red again").

### 1c. Social moments inside the draft (Fellowship)
The relay carries picks; let it carry a little *life*:
- P1P1 reveal: after everyone's first pick, show the table what each seat took.
  One moment of shared reaction per pack, opt-in, host-controlled.
- End-of-draft deck showcase: a screen where every human's final deck fans out,
  one at a time. This is the trophy ceremony draft night currently lacks.
- Tiny reaction emotes in the lobby/draft (a handful, no chat box needed).

### 1d. Solo friction pass (Submission)
Count the clicks from opening the app to seeing pack 1. Get it to two:
a "Draft again" that reuses last night's settings, and a "Surprise me" that
picks set + format for you. Submission-fun is the app getting out of the way.

**Exit test for Phase 1:** run a draft night. If the two-player format gets
requested again, keep it. If nobody mentions the P1P1 reveal, cut it.

---

## Phase 2 — Sensation overhaul

Goal: the same actions, but they *feel* like cracking cardboard.
Rule of the phase: motion serves meaning — every animation marks a real event
(a pack arriving, a rare appearing, a pick leaving), never decoration for its
own sake. Everything respects `prefers-reduced-motion`.

- **The pack-opening ritual.** Packs currently just render. Give pack 1 pick 1
  a beat: cards dealt into the fan with a stagger, rare last. This is the
  single highest-leverage sensory moment in all of Magic and the app skips it.
- **The pass.** When a pack leaves and a new one arrives, show it — a slide in
  the pass direction. Direction becomes something you *feel*, which is also
  quietly instructional.
- **Pick confirmation.** The chosen card should travel to your pool, not
  teleport.
- **Rarity as light.** A subtle foil sheen or glow treatment on rares/mythics
  at reveal. One shader-ish CSS trick, big payoff.
- **Sound, optional and off by default.** Three sounds maximum: pack rip,
  card pick, timer warning. A checkbox next to the timer setting.
- **Theme depth.** `applyTheme` already tints from the set; push it further —
  set icon watermark, era-appropriate frame accents — so drafting *Innistrad*
  looks different from drafting *Zendikar* at a glance.

**Exit test:** screen-record a pick cycle before and after. Show both to a
friend without commentary and ask which app they'd rather play tonight.

---

## Phase 3 — The other funs, one experiment each

Run these as small bets in whatever order appeals. Each is scoped to roughly
an evening of work.

### Narrative — "the story of your draft"
The draft already generates drama; capture it. Keep the full pick log (mostly
already in memory) and render a post-draft recap: a timeline of your 45 picks,
color commitment over time, the moment you pivoted, the card you took over
everything else. One screen, shareable. This is the experiment I'd run first —
it's the lowest grade with the cheapest fix, and it compounds with 1b's pick
review.

### Discovery — the draft log
A little local-storage record across sessions: sets you've drafted, decks
you've built, cards you've first-picked. Then surface gentle prompts —
"you've never opened anything from Kamigawa" — and let chaos mode bias toward
unexplored territory. Discovery-fun grows when the app remembers where you've
been.

### Expression — celebrate the deck
Let a finished deck be *named*, given a cover card, and exported as one clean
image (name, colors, curve, the 23 spells fanned). Suddenly decks are
shareable objects in the group chat, which feeds Fellowship for free.

### Fantasy — thicken the fiction
Extend the flavor greeting into the draft itself: bots named after plane-
appropriate characters, round announcements in set voice ("The second pack
arrives from Eldraine…"), flavor text on loading screens. Cheap words, real
atmosphere.

### Submission (round 2) — the standing ritual
If draft night becomes weekly, add the tiny things rituals want: the app
remembers the table's usual settings, greets returning names, maybe a
"drafts together: 14" counter in the lobby. Ritual-fun is accumulated memory.

---

## The process itself

1. **Baseline night.** One draft night on the current build. Write down —
   during, not after — every moment someone laughs, leans in, or checks their
   phone. That list is the real backlog.
2. **Phase 1**, one experiment per session, tested at the next night.
3. **Phase 2** as a concentrated visual sprint once the process feels right —
   polishing a loop before it's fun is how you polish the wrong loop.
4. **Phase 3** interleaved afterward, one bet at a time, keep-or-kill.
5. Keep this file honest: mark experiments **KEPT** or **CUT** with a line on
   why. The document becomes the design history of the app.

---

*Status log — mark outcomes here as experiments land:*

- [x] 1a Winston draft — **BUILT** 2026-08-13. A new format in the Format
  dropdown (sets and cubes): six packs in one stack, three growing piles,
  take-or-pass, blind draws off the top. Solo plays against a bot that weighs
  a pile's average card against the stack's expected value (and uses real
  win-rate data when a ratings file exists); with exactly two humans seated
  at a table it becomes a proper head-to-head duel over the relay — each
  player sees only what a player across a real table would see. Both finish
  into their own deck builder and colour-journey celebration. Grid draft
  still open. Verdict at next draft night.
  *Polish pass:* face-down piles are drawn as real stacks — one card back per
  card, edges shadowed so they can be counted at a glance, with the number on
  a badge — because in Winston the size of a pile is the decision. Also: the
  closing sentence lost its "you flirted with" editorialising and now just
  states what happened, and the land suggestion tells the truth about what it
  is doing (add / recalculate for this deck / already matching), so a mana
  base can be rebalanced after the main deck changes.
- [ ] 1b Bot tiers + pick review —
- [ ] 1c P1P1 reveal + deck showcase —
- [ ] 1d Two-click solo draft —
- [~] 2 Sensation sprint — **STARTED** 2026-08-14 with the set-as-a-place
  layer. Three pieces, no new screens: **set symbols** in the set list (the
  data was always there, unused — a set is now a place rather than three
  letters); the **set's own symbol** ghosted behind the setup panel the
  moment you choose one, so the world arrives before its cards do; and a
  **band of art from the set itself** across the top of every screen, drawn
  from a rare's art crop, chosen deterministically so a set looks like itself
  every time. Over it sits a **wash whose warmth comes from the set's era** —
  1993 sits under a warm amber light, recent sets under a cooler one — which
  is the "across time" axis made visible. Design note worth keeping: the
  first version covered the whole viewport and was lovely on a full pack grid
  and awful on a sparse one (Arabian Nights' 8-card packs left body text
  sitting on a picture). Constraining it to a top band that fades to nothing
  fixed it — atmosphere above the work, ordinary page below. Zero extra
  network requests: the art comes from cards already fetched, the symbol from
  the set list already loaded.
  Still open in this phase: pack-opening ritual, the pass, pick travel,
  rarity-as-light, optional sound.

- [x] Sensation / Expression: **the mana base as a souvenir** — 2026-09-03.
  Basic land art was already drawn from the deck's own sets; three things
  were wrong with it and all three are fixed. **A set with no basics used to
  vanish** — the pool just quietly leaned on whatever else was in the deck.
  It now borrows from the nearest set that shares its flavour, moving
  outward and more macro: a sibling from its own block, then that era's core
  set, then Alpha. Modern Masters gets Magic 2014, Conspiracy gets Take the
  Crown, Antiquities gets Alpha. **Only one art per set was kept**; now every
  printing is, so a modern set contributes four pictures rather than one and
  a seventeen-land base measured in the browser comes out seventeen distinct
  paintings instead of three. Arts are dealt round-robin across sets so the
  first few Forests come from different worlds rather than all from the set
  that happened to contribute most cards. And **reprints and special
  treatments now lose to the original printing**: a picture in two of the
  deck's sets is credited to the earlier one (Revised's Forests are Alpha's
  Forests, measured — ten of fifteen), Unlimited/Revised/Fourth Edition are
  barred from standing in for anyone automatically, and showcase, borderless
  and promo frames are dropped wherever the set has a plain printing to use
  instead. That last rule is *relative* on purpose: Unfinity's lands are all
  marked as a special frame, and an absolute filter would have left the set
  whose whole selling point is its lands with none. A partial set keeps what
  it has — Arabian Nights' single Mountain still turns up in the deck, with
  Alpha filling the other four — and the note under the menu says which sets
  it used and why. Verdict at next draft night.

- [x] Agency: **the rolled packs can be rearranged** — 2026-09-04. The roll
  landed three sets and you were stuck with the order it dealt them in, which
  threw away a decision as large as which sets you got: pack one sets the tone
  of the draft and pack three decides what the deck actually becomes. Choosing
  that order was much of the point of *Pack It Up*, and it had quietly not
  survived the move to chaos. A reel can now be dragged sideways into another
  position, and the whole slot travels with it — the set, whether it is
  pinned, its filter box and its "Rolled X" note, because all of those belong
  to the pack rather than to the position. Pointer events rather than HTML5
  drag-and-drop, which has never worked on a touchscreen; `touch-action:pan-y`
  leaves a vertical swipe to the page, so only a sideways drag is a rearrange
  and scrolling a phone still scrolls. The reels renumber themselves as you
  drag, so the preview says what you would actually get, and the arrow keys do
  the same move without a pointer. Measured end to end: reorder, then start —
  the draft opens the pack that is now first. Verdict at next draft night.

- [x] Flow: **era first, then set** — 2026-08-14. The setup screen was one
  long configuration form; it now asks the question this app exists to ask.
  Step one is a shelf of six era cards, each with its years, a line about
  what that stretch of Magic was like, a sample of real set symbols drawn
  from across the period, and a count of draftable sets. Step two is that
  era's sets, with a back button, and everything else — format, seed, bonus
  sheet, ratings — folded into a single **Options** disclosure. "Any era"
  keeps the fast path for anyone who just wants to search. Two pre-existing
  bugs fell out of the refactor: a shared set-link never enabled the Start
  button (the enabling lived only in the row's click handler, so links left
  it reading "Select a set to begin"), and a link pasted into an open page
  could be hidden by a leftover search filter. Both fixed by giving link and
  click one shared `chooseSet`.
- [x] 3 Narrative recap — **BUILT** 2026-08-13. "The story of your draft" opens
  automatically when a draft ends (solo, multiplayer host, and guest — guests
  keep their own pick diary by watching pool updates). Colour-journey chart
  with the pivot marked, up to five "moments" (bomb, windmill slam, hard call,
  discipline/road-not-taken, wheel), full pick timeline. Reopen anytime from
  the deck screen's "Draft story" button. Verdict at next draft night.
  *Refined same day:* card ratings can now come from real games instead of the
  heuristic — `node server/fetch-ratings.js SET` builds a per-set win-rate
  file from 17Lands' CC-BY public datasets (931k games for BLB), the relay
  serves it, and bots/badges/story all use it automatically, falling back to
  the heuristic for cubes and uncovered sets. A paste-import in setup covers
  any other ratings source. The story's single "bomb" became "the spine of
  the deck": the top on-colour cards plus a synergy read (tribe with payoffs,
  or a mechanic running through the picks). The story footnote says which
  ratings told it.
  *Round three, same week:* bombs are highlighted again — set-review letter
  grades pinned on every spine/moment/prize card, "The bomb — A+" moment
  restored. The story's prose now channels the game's voices indirectly: a
  rotating pool of moment lines and a closing "table wisdom" aphorism in the
  spirit of the professor, the head designer, the set reviewers, and the mana
  mathematicians — nods, not quotes; deterministic per draft. And the story
  grew its second half: **The table** — every seat's colours, guild, pivot,
  and graded prize (bots now named for the hall of greats), bomb of the
  table, "the ones that got away" (your passes that became someone else's
  cards), and colour economics. Host broadcasts the summary so guests get the
  same gossip. This is Narrative and Fellowship shaking hands.
  *Round four — the verdict from a real solo draft:* **CUT** the voice
  commentary (stale on second reading), **CUT** the grades and bomb callouts
  (ratings disagreements pull the player out of the story), **CUT** the
  moments (redundant minutes after the draft — the player was there), **CUT**
  the pick timeline, and **CUT** the table reveal — for a design reason worth
  keeping: knowing what every seat drafted is free information that
  substitutes for the skill of reading the table. Challenge-fun beat
  Narrative-fun in a fair fight. **KEPT**: the colour journey — the one part
  that showed the drafter something they could not already feel — now rebuilt
  as a celebration: the lines draw themselves across the draft (deepest
  colours first), pack marks light up as the drawing passes, the pivot pings
  at the end, and the story lands as a single closing sentence. Reopening the
  story replays it. Lesson recorded: right after a draft, the player needs
  almost no words — they need one image that makes the evening feel earned.
  (The engine still keeps the full pick history and table log, and the
  ratings pipeline still powers the bots — the data outlived its displays.)
- [ ] 3 Discovery log —
- [ ] 3 Deck card export —
- [ ] 3 Fantasy dressing —
- [ ] 3 Ritual memory —
