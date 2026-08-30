#!/usr/bin/env node
/* Build a card-ratings file from real games, for one set.
 *
 *   node server/fetch-ratings.js BLB
 *   node server/fetch-ratings.js BLB TradDraft
 *
 * Where the numbers come from: 17Lands publishes its game-level data as
 * public datasets under a CC BY 4.0 license (17lands.com/public_datasets) —
 * one row per game, with columns saying which cards were in the deck, the
 * opening hand, drawn, or tutored up, and whether the game was won. This
 * script streams one of those files (tens of MB, gzipped) and computes each
 * card's "games in hand" win rate: of the games where you actually held the
 * card, how many did you win? That is the community's standard measure of
 * what a card really does for you, and it bakes in the whole environment —
 * synergies, speed, how often the card is castable — which no card-by-card
 * heuristic can.
 *
 * The result is written to ratings/<SET>.json next to index.html. The relay
 * serves that folder, and the app picks the file up automatically the next
 * time someone drafts the set. Run it once per set you care about; there is
 * nothing to keep fresh unless you want newer data.
 *
 * Only sets that were draftable on Arena have datasets. For anything else
 * the app keeps using its built-in heuristic, which is the graceful state.
 */
'use strict';

const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const code = (process.argv[2] || '').toUpperCase();
const event = process.argv[3] || 'PremierDraft';
if (!/^[A-Z0-9]{2,6}$/.test(code)) {
  console.log('Usage: node server/fetch-ratings.js SET [event]');
  console.log('  e.g. node server/fetch-ratings.js BLB');
  console.log('       node server/fetch-ratings.js DSK TradDraft');
  process.exit(1);
}

const URL_ = 'https://17lands-public.s3.amazonaws.com/analysis_data/game_data/' +
  'game_data_public.' + code + '.' + event + '.csv.gz';
const OUT_DIR = path.join(__dirname, '..', 'ratings');
const OUT = path.join(OUT_DIR, code + '.json');

/* One line of CSV into fields. Card names contain commas ("Elesh Norn,
 * Mother of Machines"), so quoted fields are real; but most data rows are
 * pure numbers, so the quote-free fast path matters. */
function splitCsv(line) {
  if (line.indexOf('"') === -1) return line.split(',');
  const out = [];
  let field = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { out.push(field); field = ''; }
    else field += ch;
  }
  out.push(field);
  return out;
}

console.log('Fetching ' + URL_);
console.log('(a one-time download of a few tens of MB — the aggregate it');
console.log(' produces is a few KB)');

https.get(URL_, res => {
  if (res.statusCode !== 200) {
    console.log('');
    console.log('No dataset there (HTTP ' + res.statusCode + ').');
    console.log('Either ' + code + ' was never draftable on Arena, or the event name is');
    console.log('different — try TradDraft, or check 17lands.com/public_datasets.');
    process.exit(1);
  }

  const gunzip = zlib.createGunzip();
  res.pipe(gunzip);

  /* Columns arrive as opening_hand_X / drawn_X / tutored_X per card name X.
   * A card was "in hand" this game if any of its three counts is nonzero. */
  let header = null;
  let cards = [];            // { name, cols: [indices] }
  let games = null, wins = null, wonIdx = -1;
  let rows = 0;
  let carry = '';

  gunzip.on('data', chunk => {
    const text = carry + chunk.toString('utf8');
    const lines = text.split('\n');
    carry = lines.pop();
    for (const line of lines) handle(line);
  });
  gunzip.on('end', () => {
    if (carry.trim()) handle(carry);
    finish();
  });
  gunzip.on('error', e => { console.log('Download broke: ' + e.message); process.exit(1); });

  function handle(line) {
    if (!line) return;
    if (!header) {
      header = splitCsv(line);
      const byCard = new Map();
      header.forEach((h, i) => {
        if (h === 'won') { wonIdx = i; return; }
        const m = /^(opening_hand|drawn|tutored)_(.+)$/.exec(h);
        if (!m) return;
        let entry = byCard.get(m[2]);
        if (!entry) { entry = []; byCard.set(m[2], entry); }
        entry.push(i);
      });
      byCard.forEach((cols, name) => cards.push({ name, cols }));
      games = new Int32Array(cards.length);
      wins = new Int32Array(cards.length);
      if (wonIdx === -1) { console.log('No "won" column — not a game_data file?'); process.exit(1); }
      console.log('Streaming games for ' + cards.length + ' cards…');
      return;
    }
    const f = splitCsv(line);
    if (f.length < header.length - 2) return;   // ragged tail line
    const won = f[wonIdx] === 'True' || f[wonIdx] === 'true' || f[wonIdx] === '1';
    for (let c = 0; c < cards.length; c++) {
      const cols = cards[c].cols;
      let held = false;
      for (let k = 0; k < cols.length; k++) {
        const v = f[cols[k]];
        if (v && v !== '0' && v !== '0.0') { held = true; break; }
      }
      if (held) { games[c]++; if (won) wins[c]++; }
    }
    rows++;
    if (rows % 50000 === 0) console.log('  ' + rows + ' games…');
  }

  function finish() {
    const entries = [];
    for (let c = 0; c < cards.length; c++) {
      if (!games[c]) continue;
      entries.push({
        n: cards[c].name,
        w: Math.round((wins[c] / games[c]) * 10000) / 10000,
        g: games[c]
      });
    }
    entries.sort((a, b) => b.w - a.w);
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);
    fs.writeFileSync(OUT, JSON.stringify({
      set: code,
      event: event,
      source: '17Lands public dataset (CC BY 4.0)',
      url: URL_,
      games: rows,
      generated: new Date().toISOString().slice(0, 10),
      entries: entries
    }));
    console.log('');
    console.log(rows + ' games, ' + entries.length + ' cards → ' + path.relative(process.cwd(), OUT));
    const solid = entries.filter(e => e.g >= 500);
    console.log('Best performers (500+ games in hand):');
    solid.slice(0, 5).forEach(e =>
      console.log('  ' + (e.w * 100).toFixed(1) + '%  ' + e.n + '  (' + e.g + ' games)'));
    console.log('The app will use this automatically next time you draft ' + code + '.');
  }
}).on('error', e => { console.log('Could not reach the dataset: ' + e.message); process.exit(1); });
