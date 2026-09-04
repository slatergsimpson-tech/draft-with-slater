# Draft night, step by step

The short version: **run one command, send one link.** Everything else is
detail. Below is the long version, with the two situations separated because
they genuinely differ.

You need [Node.js](https://nodejs.org) installed once. Nothing else — no
accounts, no `npm install`, no config files.

---

## The order, in nine steps

If you only read one thing, read this.

1. **Double-click the launcher.** `Start drafting.cmd` on Windows.
2. **Type 2** (people anywhere) and press Enter.
3. **Wait.** It prints an address, then waits for that address to come alive —
   a tunnel takes a few seconds to exist. It opens a browser for you once it
   does.
4. **Use the page it opened.** This is the important one. Do *not* open the
   `.html` file from your folder; that is a second copy of the app with no
   relay behind it, and any invite link you make there begins `file:///` and
   means nothing on anyone else's computer. The app will tell you if you do.
5. In that page: **Draft with friends → type your name → Open a table.**
6. **Copy the invite link** the lobby gives you and send it to your friends.
7. They open it, type a name, press **Join**, and click **Sit here** on a
   chair.
8. **You choose the set** on the tabs below the lobby — pick an era, then a
   set from it — and set a pick timer.
9. **Start the draft.**

Steps 8 and 9 can happen any time — the lobby sits above the setup controls,
so people can be arriving while you decide what to open.

---

## The short way: double-click it

Unzip the project, then double-click:

- **Windows:** `Start drafting.cmd`
- **Mac:** `start-drafting.command`

It asks one question — *people on this wi-fi*, or *people anywhere* — starts
the relay, opens your browser at it, and prints the address to send round. For
*anywhere* it also sets up a tunnel, offering to fetch the one small program
that needs (about 30MB, once).

Leave the window open; closing it ends the draft. That's the whole thing, and
you never type a command.

**Windows note:** the launcher is a `.cmd`, which runs in the old Command
Prompt rather than PowerShell. That matters because PowerShell refuses to run
npm's scripts under its default security policy — the
`running scripts is disabled on this system` error. Nothing in the launcher
uses npm, so the error cannot happen.

If you'd rather type it yourself: `node server/launch.js`, or
`node server/server.js` for the relay alone.

---

## A. Friends in the same house or on the same wi-fi, by hand

### 1. Unzip the project somewhere

You want a folder containing `index.html` and a `server` folder. (The web zip
is already this shape. In the full project zip it's `dist/index.html` plus
`server/`, which also works.)

### 2. Open a terminal in that folder and run:

```bash
node server/server.js
```

It prints something like:

```
  Draft relay listening on port 8787
  Serving the app too — open it at:

      http://localhost:8787
      http://192.168.1.20:8787   (for other devices on this network)

  Everyone opening one of those addresses can draft together.
```

**Leave this running.** Closing the terminal ends the draft.

### 3. Open the second address on your own machine

`http://192.168.1.20:8787` — the one with the numbers, not `localhost`. Use the
same address everyone else will, so the link you send them works.

### 4. Send that address to your friends

Text it, paste it in Discord, whatever. They open it on a laptop or a phone on
the same wi-fi. They see the app exactly as you do.

### 5. Open the table

On your screen, expand **Draft with friends**. The relay box has already filled
itself in — you don't need to touch it or know what it means. Type your name,
press **Open a table**.

You get a four-character room code (like `JP9Q`) and an invite link.

### 6. Your friends join

They expand **Draft with friends**, type a name, and press **Join** — the room
code is already there if they used your invite link, otherwise they type the
four characters.

You'll see them appear in the seat list as they arrive.

### 7. They pick seats

Everyone clicks **Sit here** on a chair. You're always seat one. **Any seat
nobody takes is drafted by a bot**, so four humans is a normal eight-person pod
with four bots — you don't need eight people.

### 8. Choose what you're drafting

Below the lobby, the usual tabs: Chaos Draft, a set, a cube. Pick one. The lobby
line updates to show what the table is about to open, and the Start button
unlocks.

### 9. Set a pick timer and press Start the draft

45 seconds is a good default. When it runs out for a seat, that seat takes its
bot's best card — so one person going to make tea doesn't stop everyone.

### 10. Draft

Everyone sees their own pack. When the last person picks — or the clock runs
out — the packs pass. When it's over, everyone keeps their own 45-card pool and
builds a deck in their own browser.

---

## B. Friends who aren't in your house

Same thing, except step 2 needs the relay to be reachable from the internet.
Pick one:

### The easy way, for one evening: a tunnel

Double-click the launcher and choose **2 — people anywhere**. It handles this
for you, including fetching cloudflared the first time.

By hand, in a **second** terminal with the relay still running in the first:

```bash
cloudflared tunnel --url http://localhost:8787
```

It prints a public `https://something-random.trycloudflare.com` address. **Send
that** instead of the `192.168.…` one. Everything else is identical — the relay
box still fills itself in, because they're loading the app from the same place.

The address dies when you stop the tunnel, which is usually what you want.

**If you're on Windows and reached for `npx cloudflared`:** PowerShell blocks
npm's script shims by default, which is the
`running scripts is disabled on this system` error. Three ways out, easiest
first — use the launcher, which does not touch npm; or type `npx.cmd` instead
of `npx`, since the `.cmd` shim is not a PowerShell script; or allow signed
scripts for your own account, permanently, with
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### Drafting from a phone with the computer switched off

The important thing first: **drafting on your own needs no server at all.**
The app is one HTML file, and the cards come from Scryfall. Put that file on a
free static host and it works on a phone forever, with nothing running at home
and nothing to switch on.

- **GitHub Pages** — put the repo on GitHub, Settings → Pages, deploy from
  the branch root. You get `https://you.github.io/draft/`.
- **Cloudflare Pages** or **Netlify** — drag the folder onto the dashboard.

Then open it on the phone and **Share → Add to Home Screen**. It gets an icon
and opens without the browser chrome. Every set, every cube, Winston against
the bot, sealed, the deck builder and the playtester all work there. What does
*not* work is drafting with other people, because that needs a relay — the app
will tell you so rather than leaving you waiting on a door that will not open.

**Is leaving the relay running at home worth it?** For power, no. An idle relay
costs nothing measurable — it is one small Node process doing nothing between
messages — but the computer around it draws tens of watts all year to keep it
company. If the reason to run it is "so I can draft on my phone", static
hosting does that better and costs nothing to leave on.

**If you want to draft with friends without your computer on**, put the relay
on a free host instead — that is the next section, and `render.yaml` in this
project configures it for you.

### The permanent way: a free host

Push this project to GitHub, then on [Render](https://render.com) go to
**New → Blueprint** and pick the repo. `render.yaml` in this project does the
configuring. Fly.io and Railway work the same way; the server reads the `PORT`
they set for it.

Render gives you `https://your-thing.onrender.com`, and it stays the same
forever, which is the entire reason to bother.

**Free-tier sleep.** Render's free plan spins a service down after 15 minutes
with no traffic and takes about a minute to wake it. So the first person to
open the link on draft night waits a minute; nobody after that does. The app
knows about this and keeps knocking for ninety seconds, saying so rather than
reporting a failure.

**Will it actually stay free?** The free plan gives 750 instance hours a month,
which is more than a month of wall-clock time, and sleeping means you use far
less than that. Bandwidth is the other meter, and a draft is tiny — three
guests × 45 picks × ~50KB is about 7MB for a whole evening. If you did somehow
exceed a limit with no card on file, Render suspends the service rather than
billing you.

### Which should you pick?

| | Static host | Local only | Local + tunnel | Render free |
|---|---|---|---|---|
| Costs | nothing | nothing | nothing | nothing |
| Draft on your own | yes | yes | yes | yes |
| Draft with friends | **no** | same wi-fi | anyone | anyone |
| Setup each time | none | start the server | start server + tunnel | none |
| The link | never changes | changes | changes | never changes |
| First connection | instant | instant | instant | ~1 min if asleep |
| Your computer must be on | **no** | yes | yes | **no** |
| Needs a terminal | no | yes | yes | no |

Two of these leave your computer out of it. **Static hosting** is the one to
pick if you mostly draft alone and want it on your phone — it is instant, the
link never changes, and there is nothing to start or leave running. **Render**
is the one to add when you want to draft with friends without switching a
computer on; the only cost is that first minute while it wakes.

If you're happy to run a command on the evening you draft, you need neither.

---

## Two links, and which one to send

There are two addresses in play and they do different jobs:

- **The relay address** — `https://…trycloudflare.com`, or
  `http://192.168.1.20:8787`. This is *the app*. Anyone who opens it gets the
  tool.
- **The invite link** — the one the lobby gives you after you press **Open a
  table**. It has `#room=…` on the end and puts someone straight into *your*
  room.

**Send the invite link.** If you send only the relay address, everyone lands on
a blank setup screen, and whoever presses "Open a table" first starts a draft
of their own — which is how two of your friends can end up drafting together
without you.

That's a bad way to lose an evening, so the app now guards against it: open
the relay address and any table already running is listed, with a Join button
and the host's name. Sending the bare address still works; the invite link is
just one less thing for anyone to get wrong.

A table stops being listed the moment you lock it or start the draft.
`PRIVATE=1 node server/server.js` turns the listing off entirely.

## "Can't reach this page" straight after starting

If the browser opens on `…trycloudflare.com` and says
`DNS_PROBE_FINISHED_NXDOMAIN` **immediately**, the address is real but the
world does not know about it yet. Wait ten seconds and refresh.

The launcher now waits for the address to answer before opening it, so this
should not happen — but a slow DNS resolver can still beat it. Refreshing is
always the right first move.

If it *keeps* saying that after a minute, the tunnel has stopped. Look at the
launcher window: if it says the tunnel exited, close it and start again, and
use the new address it prints.

## The tunnel address changes every time

Quick tunnels are disposable by design. **Every time you start the launcher you
get a brand-new address**, and the old one stops existing — that is what

```
DNS_PROBE_FINISHED_NXDOMAIN
```

means when you open it. It isn't a typo or a broken relay; that hostname is
simply gone.

So: send the address printed in the window you have open *right now*, and if
you restart the launcher, send the new one. If you want an address that never
changes, that's the one real argument for putting the relay on a host like
Render.

## The one thing that will trip you up

**Load the app from the relay.** If you host the app on GitHub Pages or Netlify
but run the relay somewhere else, the browser has an `https://` page trying to
open a `ws://` connection, and it refuses — silently, from your point of view.

You'll know because the relay box will *not* have filled itself in.

Everything above avoids this by serving the app and the relay from the same
address. Static hosting is for drafting alone and for share links; for drafting
together, use the relay's own address. The app checks which it is on: a static
host says so in the **Draft with friends** panel rather than pretending to be a
relay and leaving you waiting.

---

---

## Is it safe to run?

Short version: the risk is not to your machine, it's that **a room has no
password** — whoever has the link can walk into it.

**What the relay actually does.** It listens on one port. It serves exactly one
file (the app) and refuses every other path — it never takes a filename from a
request, so there's no way to ask it for anything else on your disk. It runs no
commands, stores nothing, has no database and no credentials. Stop the process
and every trace of it is gone.

**What it doesn't protect against.** Anyone who can reach the port can join a
room if they know the code. Codes are four characters, so someone determined
could guess. In practice they'd find a Magic draft and be able to see the packs
and, if they grabbed a seat before you started, make picks. That's the whole
blast radius — but it's a real one.

**What's there to stop trouble:**

- **Lock the table.** A checkbox in the lobby. Once locked, the relay turns away
  anyone else with the link — it enforces this itself, so a guest can't undo it.
  Locking happens automatically when you press Start.
- **Remove someone.** Each person in the lobby has a Remove button, host only,
  also enforced by the relay.
- **Rate limits.** Twenty-four connections per address, forty new ones a minute,
  four hundred connections and two hundred rooms overall, and a one-megabyte
  cap on any single message. These won't stop a determined attacker; they stop
  a bored one and a broken script.

**Sensible habits:**

- Prefer a **tunnel you start and stop** over a service that's up all week. The
  URL dies when you close the terminal.
- If you're behind a tunnel or a proxy, run it as
  `HOST=127.0.0.1 node server/server.js`. Then the only way in is the tunnel —
  nothing else on the café wi-fi can even see the port.
- Don't post the link publicly. Treat it like a video call link.
- On a permanent host (Render and friends), remember it's a service you're
  running: it'll be found by scanners eventually. They'll get a 404 and a room
  they can't guess, but if that bothers you, take it down between draft nights.

**What I would not do:** run this on a machine with other things on it that you
care about, and open the port on your router by hand. Use a tunnel instead —
same result, nothing permanently exposed.

---

---

## Using it on a phone

**You cannot open the .html file on a phone.** iOS and Android both refuse to
run a downloaded HTML file — the Files app shows a dead preview, Safari won't
open it, and third-party viewers report "file type not supported". That is the
operating system's rule, not a fault in the file, and there is no way round it
from inside the file.

Phones need a web address. Any of these gives you one:

- **The relay's address.** Run the launcher on a computer; every phone on the
  same wi-fi can open the `http://192.168.…:8787` address it prints. This is
  the one to use on draft night — it's also how they join your table.
- **A tunnel address**, for phones not on your wi-fi.
- **A permanent address of your own** — below. This is the one for drafting on
  your own whenever you feel like it, with no computer running.

Once it's open on the phone, **Share → Add to Home Screen**. It gets an icon
and opens without Safari's chrome, which is most of what makes it feel like an
app. It still needs a network connection — the cards come from Scryfall.

### Giving yourself a permanent address (about five minutes, once)

Drafting on your own needs **no relay and no computer running** — the app is
one file and the cards come from Scryfall. It only needs to live at an address
your phone can open. GitHub Pages is the sturdiest free way to do that:

This project already lives at
[github.com/slatergsimpson-tech/draft-with-slater](https://github.com/slatergsimpson-tech/draft-with-slater),
so only one step is left:

1. In the repo: **Settings → Pages → Build and deployment**, set *Source* to
   **Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
2. Wait a minute. The app appears at
   **https://slatergsimpson-tech.github.io/draft-with-slater/**
3. Open that on the phone, then **Share → Add to Home Screen**.

`index.html` sits at the repository root and the `ratings` folder travels with
it, so the phone gets the win-rate-trained bots too. Nothing else needs
configuring — there is no build step.

Starting from scratch elsewhere, the same three ideas apply: any repository
with `index.html` at its root, Pages pointed at that branch, and the address it
gives you.

That address never changes, costs nothing, and is up whether or not your
computer is. Every set, every cube, Winston against the bot, sealed, the deck
builder and the playtester all work there. Drag-and-drop hosts like
**Cloudflare Pages** or **Netlify** work the same way if you prefer them to
GitHub.

To update the app later, push to the repository — Pages redeploys itself.

### Making the address shorter

`…github.io/draft-with-slater/` works but is a mouthful. Three ways to improve
it, cheapest first:

- **Rename the repository** to `draft` (Settings → General → Repository name).
  You get `slatergsimpson-tech.github.io/draft/`, and GitHub redirects the old
  address so nothing breaks. Update the remote afterwards with
  `git remote set-url origin https://github.com/slatergsimpson-tech/draft.git`.
- **A user site.** A repository named exactly `slatergsimpson-tech.github.io`
  is served at `https://slatergsimpson-tech.github.io/` — no path at all. That
  is the shortest free address there is; the cost is that it uses up the one
  user site your account gets.
- **A domain you own.** `myskycoach.com` is yours, so a `CNAME` record for
  `draft.myskycoach.com` pointing at `slatergsimpson-tech.github.io`, plus that
  name entered under Settings → Pages → Custom domain, gives you
  **draft.myskycoach.com**. GitHub issues the certificate. This is the one to
  send people.

### Which address do I use for what?

Two different jobs, and it is worth being clear about which is which:

| | Pages address | Relay address |
|---|---|---|
| Draft on your own | **yes** — nothing else needed | yes |
| Draft with friends | only with a `wss://` relay, see below | **yes** |
| Computer must be on | no | yes |

**Drafting alone: use the Pages address.** That is the whole point of it.

**Drafting together: easiest is the relay's own address**, exactly as before —
the `http://192.168.…:8787` the launcher prints, or a tunnel address. The app
and the relay come from the same place and everything fills itself in.

You *can* also draft together from the Pages address, by pasting a relay into
the **Relay address** box: the invite link it then gives you carries that relay
inside it, so guests are pointed at the right place automatically. One rule
governs whether this works. The Pages address is `https://`, and **a secure
page is not allowed to open an insecure `ws://` socket** — the browser blocks
it before the relay hears anything. So:

- Pages + `wss://…` (a tunnel, or a relay on Render) — **works**
- Pages + `ws://192.168.…` (the relay at home) — **blocked by the browser**

The app now says so when you type such an address, rather than letting you
wait on a connection that was never attempted.

## Sharper card ratings (optional, once per set)

Out of the box the app rates cards with a built-in heuristic. If you run

```bash
node server/fetch-ratings.js BLB
```

once for a set (any set that was draftable on Arena), it downloads 17Lands'
public dataset for that set — hundreds of thousands of real games, CC BY 4.0
licensed — and computes each card's real win rate into a small file in
`ratings/`. From then on, anyone drafting that set from your relay gets bots
that draft the actual format, pick ratings that mean something, and a draft
story that knows a great common from a trap. Sets without a dataset (and
cubes) quietly keep the heuristic. There is also a paste-import under **Card
ratings from real games** on the setup screen, for ratings from anywhere else.

## Quick answers

**Do my friends need Node?** No. Only whoever runs the relay.

**I got "running scripts is disabled on this system".** That's PowerShell
refusing to run npm's shims — see the note above. Use the launcher and it
cannot come up.

**Do we all need to be on the same version?** Yes, and you will be — everyone
loads the app from your relay.

**Can they use phones?** Yes — from a web address, not from the file. Hold a
card to read it, tap to pick. Add to Home Screen makes it open like an app.

**What if someone's connection drops?** Their seat keeps drafting on its bot.
They can reload the page and rejoin the room.

**What if I close my tab?** The draft ends — it only ever lived in your
browser. Everyone is told, and keeps the pool they'd drafted. Don't close the
tab.

**Can I draft a cube or a chaos draft with friends?** Yes, all of it. Pick the
source before pressing Start.

**I want it on my phone but I turn my computer off.** Upload `index.html` to
GitHub Pages once and open that address on the phone — drafting alone needs no
server at all. Step-by-step in *Giving yourself a permanent address*. Add
Render only if you also want to draft *with friends* while the computer is off.

**What is Chaos Draft?** The mode the app opens on, and the one most worth
your time. Three packs, eight players, one pod — but every pack can come from
a different corner of thirty years. Pull the handle, watch three reels of set
symbols settle, and draft whatever they land on. The order they landed in is
not fixed: **drag a reel sideways** to move a pack, because opening a set
first is not the same as opening it last — pack one sets the tone and pack
three decides what your deck ends up being. (Arrow keys move a reel too.)
Open **Pin a pack** if you want to fix one of the three to a set you have been
meaning to try, or narrow a slot to an era; whatever you pin is left alone and
the rest are rolled.
**Who opens what** decides whether the whole table shares a set each round or
every seat opens its own — the second is the real thing.

**Can I draft the Un-sets?** Yes — Unglued, Unhinged, Unstable, Unsanctioned
and Unfinity are all in the set list, in their own eras. Pack sizes are the
real ones: Unglued deals 10, Unfinity 14, the rest 15. Unsanctioned never came
in boosters at all, so those packs are the app's invention, and it says so.
Their full-art lands are in the **Basic land artwork** menu too, so you can put
Unglued's lands in a Ravnica deck if you like.

**Why are my basic lands all different pictures?** Because they can be. The
default, *From the sets in your deck*, takes every printing of every basic
from every set the deck is made of, so seventeen lands usually means
seventeen different paintings — and in a chaos draft they come from all the
worlds you drafted at once, dealt round-robin rather than in blocks. Three
rules keep it honest. A set that prints no basics of its own borrows from the
nearest set that shares its flavour: a sibling from its own block first, then
that era's core set, then Alpha — so a Modern Masters deck gets Magic 2014's
lands rather than whatever else happened to be in the pool. A picture printed
in more than one of your sets is credited to the earliest of them, so Revised
never stands in for Alpha's art. And showcase frames, borderless treatments
and promos are skipped where the set has an ordinary printing to use instead,
unless — like Unfinity — the special treatment is all the set has. The line
under the menu says exactly which sets it used and why.

**Where do I get a cube?** The cube tab opens on **Find a cube**. The official
cubes — Vintage, Legacy, Modern, Arena and the rest of the ones Wizards runs —
load in one click, and their lists come from Scryfall, so they are current
rather than a snapshot. For anything else, paste the address of any public
**CubeCobra** cube and it loads straight from there; you do not need to export
anything. Private cubes cannot be read from outside CubeCobra. Pasting a list
by hand and building a cube card by card both still work, on the other two
tabs.

**My cube list has cards under their other name.** That is fine. A card
printed under one name and known by another — a Universes Beyond card
reprinted in-universe as Universes Within, a Secret Lair carrying an IP name
over an ordinary card, an Arena rebalanced `A-` card — resolves to the same
card. Anything matched under a different name is listed after the import, so
a rename you wanted and a typo you did not look different from each other.

**What if only one friend shows up?** Pick **Winston** in the Format dropdown —
a proper two-player duel. Six packs go into one face-down stack with three
piles; on your turn you look at a pile and take it or pass (passing grows it
by a face-down card), and declining all three draws you the top of the stack
blind. With exactly two people seated at the table it runs head to head over
the relay; solo, you play it against the bot for practice.

**How many people can join?** Up to eight, including you. Bots fill the rest.

**Can a stranger wander in?** Only if they have the link and guess the room
code, and only before you lock the table. Lock it once your friends are in;
pressing Start locks it for you.
