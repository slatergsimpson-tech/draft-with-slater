# Handing this over

Written for whoever picks this up next — most likely a fresh Claude Code
session with none of the conversation that produced it. Read this, then
`EIGHT-FUNS.md` for the design history and the keep/cut log.

Everything below is orientation and hard-won detail. It is deliberately not a
feature list; the code and the commit messages carry that.

---

## What this is

One HTML file that drafts any Magic set from Scryfall, plus a small
dependency-free Node relay for drafting with other people. Solo drafting needs
no server at all, which is what makes it work on a phone from a static host.

Live at **https://slatergsimpson-tech.github.io/draft-with-slater/** (GitHub
Pages, deploys on push to `main`).

## Whose project this is, and how he works

Slater. The thing that matters most: **he cuts.** Twice he has had a large,
polished feature built and then removed most of it after a single real draft,
and he was right both times. The design log records those decisions with
reasons — read them before proposing anything, because several obvious ideas
are already on it as CUT.

The method he chose: build the smallest version, play a real draft, keep only
what someone mentions unprompted. When in doubt, build less and ask.

He is also unusually good at spotting a *design* problem inside a feature
request. The table reveal was cut because he pointed out it hands away the
skill of reading the table. Take that kind of observation seriously.

---

## Layout of the file

`index.html` is ~10,600 lines and holds four `<script>` blocks:

| Lines | What |
|---|---|
| 1541–3717 | **Engine** — UMD, DOM-free. Collation, packs, bots, draft state, deckbuilding, playtest rules. Exposed to the app as `E`. |
| 3718–4379 | Offline rules reference (`RULES`). |
| 4380–4648 | Relay client — rooms, seats, websocket wrapper. Exposed as `N`. |
| 4649–end | The app: state `S`, all rendering, all event wiring. |

`S` is app state, `MP` is multiplayer state, `E` is the engine, `N` the relay
client. The engine never touches the DOM, on purpose.

`server/server.js` is the relay: one port, serves the app and `ratings/*.json`,
refuses every other path, no dependencies, no storage.

---

## Running and verifying it

**Never** open `index.html` as a file — the app itself will tell you why. Serve
it:

```bash
node server/server.js        # http://localhost:8787, serves app + relay
```

Then drive it in the browser preview. The workflow that has worked all along:

1. `node server/server.js` in the background.
2. `preview_start` on a `.claude/launch.json` entry pointing at
   `http://localhost:8787` (the file is gitignored; recreate it if missing).
3. Drive the app through the DOM with `javascript_tool`. **The page's own
   globals are not reachable** from that tool — it runs in an isolated world,
   so `S`, `E` and friends are undefined there. Everything must go through
   `document.getElementById(...)` and real clicks. This is a feature: it means
   every test is a test of what a person can actually do.

### Testing the engine directly

The engine is UMD and DOM-free, so it can be pulled out and required in Node.
This is how the chaos rotation bug was found and proved:

```bash
node -e "
const fs=require('fs');
const h=fs.readFileSync('index.html','utf8');
const b=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1])[0];
fs.writeFileSync('/tmp/engine.js', b);
"
# then require('/tmp/engine.js') and build drafts with fake cards
```

Worth doing for anything about collation, passing or pack maths — it is far
faster than clicking, and it can measure things the UI cannot.

### Always syntax-check before serving

```bash
node -e "
const fs=require('fs');
const h=fs.readFileSync('index.html','utf8');
[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{
  try{ new Function(m[1]); console.log('block',i,'ok'); }
  catch(e){ console.log('block',i,'ERROR:',e.message); }
});"
```

---

## Traps that have already cost time

- **The preview browser reports `prefers-reduced-motion: reduce`.** So does
  any Windows machine with *Show animations* switched off — which is where
  this bit twice. Animation code must be tested both ways; stub `matchMedia`
  to check the animated path. There is now a `motionOK()` function and a
  Motion control in the header; **use `motionOK()`, never the media query
  directly.**
- **Git Bash mangles URL paths.** `curl http://host/draft/` turns into
  `C:/Program Files/Git/draft/`. Prefix with `MSYS_NO_PATHCONV=1`.
- **Git Bash `/tmp` is not Node's `/tmp`.** Use absolute Windows paths when a
  shell command and a Node script share files.
- **`ratings/*.json` 404s are normal** and are the graceful fallback for sets
  with no 17Lands data. A chaos draft produces twenty of them. Judge failures
  with `performance.getEntriesByType('resource')` on the current page load,
  not the console, which keeps stale entries across navigations.
- **17Lands' live API is terms-prohibited for outside use.** Only the public
  datasets (CC BY 4.0) may be used — that is what `server/fetch-ratings.js`
  reads. Do not scrape the site.
- **CubeCobra serves lists with open CORS but its 404 page without one**, so a
  wrong cube ID is indistinguishable from being offline. The error message
  says so deliberately.
- Re-adding a CSS class that is already present **replays no animation**. Clear
  it first or the second run is silent. This caused a real bug in the roll.

---

## Where the redesign got to

Chaos Draft is now the main mode and the app opens on it; *Pack It Up* is
folded in behind **Pin a pack**. The roll is a three-reel slot machine that
settles one reel at a time.

He chose **the roll only** for the slot-machine treatment, explicitly holding
the rest in reserve: *"Please hold onto the others in case it's awesome."*
Those are, in the order I would do them:

1. **Pack opening** — cards dealing into the pack one at a time, rare last.
   Same visual language, and the moment that most wants it.
2. **Loading screens** — reels instead of a progress bar.
3. **Colour journey** — colours settling into place.

Do not build these unprompted. Ask whether the roll earned its keep first.

## Open and unfinished

- **Card size is not remembered between sessions.** He settles on L/XL on a
  phone and has to re-tap every visit. Offered, not yet built — small change.
- **Auto-build reaches outside its two colours** to fill 23 spells when the
  pool is short, which is very visible in Winston (small pools) and produced a
  four-colour deck in testing. Pre-existing, arguably correct since it must
  return a legal deck, but worth revisiting.
- **Grid draft** is the other two-player format; Winston shipped, Grid did not.
- Phase 1 of the roadmap still lists bot difficulty tiers, a post-draft pick
  review, and a P1P1 reveal. The pick review is interesting *only* if it does
  not leak information the way the table reveal did.

---

## Conventions worth keeping

- Comments explain **why**, especially why something is not the obvious way.
  Several comments in the file are the only record of a bug that was subtle
  enough to reintroduce. Do not tidy them away.
- Commit messages are prose, and say what was wrong and how it was measured.
- Docs live in `DRAFT-NIGHT.md` (for players, including his friends) and
  `EIGHT-FUNS.md` (design log with KEPT/CUT). Update them with the code.
- Fidelity to real Magic matters to him: real booster contents, real pack
  sizes, real rarities. When a shortcut is taken, say so in the UI — the
  Unsanctioned pack note is the model.
