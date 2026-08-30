#!/usr/bin/env node
/* Double-click this project and start drafting.
 *
 * Everything here is convenience: it starts the relay, opens a browser at it,
 * and — if you want people outside your house to join — puts a tunnel in front
 * of it and tells you the address to send. None of it is required;
 * `node server/server.js` is still the whole product.
 *
 * It lives in Node rather than in a .cmd or a .sh because those are three
 * lines of "run this" and this is the part with decisions in it. Windows has
 * a particular reason to want that: PowerShell refuses to run npm's shims
 * under its default execution policy, so anything that leans on `npx` fails
 * before it starts. Nothing here uses npx.
 *
 *   node server/launch.js              ask what kind of draft
 *   node server/launch.js --local      this network only
 *   node server/launch.js --online     start a tunnel as well
 */
'use strict';

const { spawn, spawnSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PORT = parseInt(process.env.PORT, 10) || 8787;
const HERE = __dirname;
const CF_BIN = path.join(HERE, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');

const args = process.argv.slice(2);
const wants = args.includes('--online') ? 'online'
  : (args.includes('--local') ? 'local' : null);

function say(line) { console.log(line === undefined ? '' : line); }

/* The addresses other machines on this network can reach. */
function localAddresses() {
  const nets = os.networkInterfaces();
  const out = [];
  Object.keys(nets).forEach(name => {
    (nets[name] || []).forEach(net => {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    });
  });
  return out;
}

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      // The empty string is the window title; without it, a quoted URL is
      // mistaken for one and nothing opens.
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch (e) {
    say('  (Could not open a browser for you — go to ' + url + ' yourself.)');
  }
}

/* One reader for the whole run.
 *
 * Creating a fresh readline interface per question and closing it looks
 * tidier and is wrong: closing one can end stdin, so the *second* question
 * never gets an answer and the program sits there looking crashed. */
let reader = null;
let noOneThere = false;
function ask(question) {
  /* If there is nobody at the keyboard, take the default rather than waiting
   * forever. That happens when the input is a pipe that has run dry or a
   * script running this unattended — a double-clicked window has a real
   * console and never gets here. */
  if (noOneThere) { say(question + '(no answer — taking the default)'); return Promise.resolve(''); }
  if (!reader) {
    reader = readline.createInterface({ input: process.stdin, output: process.stdout });
    reader.on('close', () => { noOneThere = true; reader = null; });
  }
  return new Promise(resolve => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(String(v || '').trim()); } };
    reader.once('close', () => finish(''));
    try { reader.question(question, finish); }
    catch (e) { finish(''); }
  });
}
function doneAsking() {
  if (reader) { reader.close(); reader = null; }
}

/* ---------------- the tunnel ----------------
 *
 * cloudflared is a single binary and Cloudflare publishes it at a stable URL,
 * so if it is not installed we can fetch that one file next to this script
 * rather than asking anyone to install a package manager. */
function findCloudflared() {
  if (fs.existsSync(CF_BIN)) return CF_BIN;
  const probe = spawnSync(process.platform === 'win32' ? 'where' : 'which',
    ['cloudflared'], { encoding: 'utf8' });
  if (probe.status === 0) {
    const first = String(probe.stdout || '').split(/\r?\n/)[0].trim();
    if (first) return first;
  }
  return null;
}

function downloadUrl() {
  const base = 'https://github.com/cloudflare/cloudflared/releases/latest/download/';
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  if (process.platform === 'win32') return base + 'cloudflared-windows-' + arch + '.exe';
  if (process.platform === 'darwin') return base + 'cloudflared-darwin-' + arch + '.tgz';
  return base + 'cloudflared-linux-' + arch;
}

async function fetchCloudflared() {
  const url = downloadUrl();
  if (/\.tgz$/.test(url)) {
    say('  On a Mac the download is an archive, so this is the one case where');
    say('  it is easier to let Homebrew do it:');
    say('');
    say('      brew install cloudflared');
    say('');
    return null;
  }
  say('  Fetching cloudflared (about 30MB, once)…');
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error('the download returned ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(CF_BIN, buf);
    if (process.platform !== 'win32') fs.chmodSync(CF_BIN, 0o755);
    say('  Saved it next to the server, so this only happens once.');
    return CF_BIN;
  } catch (e) {
    say('  Could not download it: ' + e.message);
    say('  You can fetch it yourself from ' + url);
    return null;
  }
}

/* Wait until an address actually answers.
 *
 * cloudflared prints the hostname the moment it is assigned, which is several
 * seconds before DNS knows about it. Opening a browser at that instant gets
 * you DNS_PROBE_FINISHED_NXDOMAIN and the entirely reasonable conclusion that
 * the thing is broken. It is not; it is just early. */
async function waitForUrl(url, maxMs) {
  const deadline = Date.now() + (maxMs || 45000);
  let checked = false;
  while (Date.now() < deadline) {
    try {
      // Any answer at all means the name resolves and the tunnel is up.
      await fetch(url, { method: 'GET', redirect: 'manual' });
      return true;
    } catch (e) {
      checked = true;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return !checked ? true : false;
}

function startTunnel(bin) {
  say('');
  say('  Starting a tunnel. This can take a few seconds…');
  const child = spawn(bin, ['tunnel', '--url', 'http://localhost:' + PORT],
    { stdio: ['ignore', 'pipe', 'pipe'] });

  let announced = false;
  const watch = (chunk) => {
    const text = String(chunk);
    const hit = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (hit && !announced) {
      announced = true;
      const url = hit[0];
      say('');
      say('   Address assigned: ' + url);
      say('   Waiting for it to come alive (this takes a few seconds)…');
      waitForUrl(url).then(live => {
        say('');
        say('  ============================================================');
        say('   Your table is at:');
        say('');
        say('       ' + url);
        say('');
        if (!live) {
          say('   It has not answered yet. Opening it anyway — if you get');
          say('   "can\'t reach this page", wait ten seconds and refresh.');
          say('');
        }
        say('   Use THIS page yourself. Then:');
        say('');
        say('     1. Draft with friends  ->  Open a table');
        say('     2. Copy the invite link it gives you');
        say('     3. Send that to your friends');
        say('');
        say('   Do not open the .html file directly — an invite link made');
        say('   from a file on your disk means nothing to anyone else.');
        say('');
        say('   This address is new every time you start the launcher, and');
        say('   it dies when you close this window.');
        say('  ============================================================');
        say('');
        openBrowser(url);
      });
    }
  };
  child.stdout.on('data', watch);
  child.stderr.on('data', watch);          // cloudflared prints the URL here
  child.on('error', (e) => {
    say('  The tunnel would not start: ' + e.message);
    say('  Everyone on your own network can still use the addresses above.');
  });
  child.on('exit', (code) => {
    if (!announced) say('  The tunnel stopped (code ' + code + ').');
  });
  return child;
}

/* ---------------- go ---------------- */
(async () => {
  say('');
  say('  Draft with Slater');
  say('  =================');
  say('');

  let mode = wants;
  if (!mode) {
    say('  Who is drafting?');
    say('');
    say('    1  People on this wi-fi  (fastest, nothing else needed)');
    say('    2  People anywhere       (starts a tunnel, takes a few more seconds)');
    say('');
    const answer = await ask('  Type 1 or 2 and press Enter [1]: ');
    mode = answer.trim() === '2' ? 'online' : 'local';
    say('');
  }

  // Starting the relay is just requiring it; it listens on load.
  process.env.PORT = String(PORT);
  require('./server.js');

  // Give it a moment to bind before pointing a browser at it.
  await new Promise(r => setTimeout(r, 400));

  const lan = localAddresses()[0];
  // In online mode the tunnel opens its own window once it has an address;
  // opening one here as well would leave two tabs and a decision to make.
  if (mode !== 'online') openBrowser('http://localhost:' + PORT);

  let tunnel = null;
  if (mode === 'online') {
    let bin = findCloudflared();
    if (!bin) {
      say('  A tunnel needs a small program called cloudflared, which you do');
      say('  not have yet.');
      const yes = await ask('  Download it now? [Y/n]: ');
      if (!/^n/i.test(yes.trim())) bin = await fetchCloudflared();
    }
    if (bin) tunnel = startTunnel(bin);
    else {
      say('');
      say('  Carrying on without a tunnel. Anyone on your own network can');
      say('  still join at http://' + (lan || 'localhost') + ':' + PORT);
    }
  }

  doneAsking();
  if (mode !== 'online') {
    say('');
    say('  Open a table in your browser, then send your friends either the');
    say('  invite link it gives you, or just this address:');
    say('');
    say('      http://' + (lan || 'localhost') + ':' + PORT);
    say('');
  }
  say('  Leave this window open. Closing it ends the draft.');
  say('');

  const stop = () => {
    if (tunnel) { try { tunnel.kill(); } catch (e) {} }
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
})();
