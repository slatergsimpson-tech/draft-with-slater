#!/usr/bin/env node
/* A relay for drafting with friends.
 *
 * It knows nothing about Magic. It keeps a list of rooms, and when someone in
 * a room says something it repeats it to everyone else in that room. That is
 * the entire job. Every rule — collation, bots, timers, who is holding which
 * pack — lives in the host's browser, where it already lived.
 *
 * Keeping it this dumb buys three things: it can be read in one sitting, it
 * cannot corrupt a draft because it has no idea what one is, and restarting it
 * loses nothing but the current connections.
 *
 * No dependencies on purpose. `node server.js` and you have a relay; there is
 * no install step to get wrong on a machine you are borrowing.
 *
 *   node server/server.js               # port 8787
 *   PORT=3000 node server/server.js     # somewhere else
 *
 * It also serves the app itself if it can find it, so one process is enough
 * for a draft on a laptop: open http://localhost:8787 on every device on the
 * same wi-fi and you are drafting.
 */
'use strict';

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 8787;
/* Which interface to listen on.
 *
 * The default reaches the whole local network, which is the point when
 * everyone is in the same room. If you are putting this behind a tunnel or a
 * reverse proxy, set HOST=127.0.0.1 — then the only way in is through the
 * thing you meant to expose, and nothing else on the wi-fi can see it. */
const HOST = process.env.HOST || '0.0.0.0';

const ROOM_TTL_MS = 6 * 60 * 60 * 1000;     // an abandoned room is forgotten
const MAX_ROOM = 16;                        // 8 seats, plus spectators and spares

/* Limits, because this is a thing you may point at the open internet.
 *
 * None of these is a security boundary — a room has no password, and anyone
 * who has the link can walk into one. What they do is stop one bored stranger
 * or one broken script from taking the process down, and make guessing room
 * codes impractical rather than merely unlikely. */
const MAX_MESSAGE = 1024 * 1024;            // a pack of cards is about 40KB
const MAX_ROOMS = 200;                      // rooms in existence at once
const MAX_CLIENTS = 400;                    // connections in total
const MAX_PER_IP = 24;                      // connections from one address
const NEW_PER_IP_PER_MIN = 40;              // handshakes from one address

/* ------------------------------------------------------------------ *
 * The WebSocket bits. RFC 6455 is long; the part a relay needs is not.
 * ------------------------------------------------------------------ */
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function acceptKey(key) {
  return crypto.createHash('sha1').update(key + GUID).digest('base64');
}

/* Encode one text frame. We never fragment: a message goes out whole or not
 * at all, which keeps the reader on the other side simple. */
function encodeFrame(str) {
  const body = Buffer.from(str, 'utf8');
  const len = body.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(len, 6);
  }
  header[0] = 0x81;                          // FIN + text
  return Buffer.concat([header, body]);
}

function controlFrame(opcode, payload) {
  const body = payload ? Buffer.from(payload) : Buffer.alloc(0);
  const header = Buffer.alloc(2);
  header[0] = 0x80 | opcode;
  header[1] = body.length;
  return Buffer.concat([header, body]);
}

/* Pull whole frames out of a growing buffer.
 *
 * Returns what it could decode and how many bytes it consumed. Anything left
 * over is a partial frame and stays in the buffer for next time — which is the
 * normal case for anything bigger than a network packet. */
function decodeFrames(buf, state) {
  const out = [];
  let offset = 0;

  while (true) {
    if (buf.length - offset < 2) break;
    const b0 = buf[offset], b1 = buf[offset + 1];
    const fin = (b0 & 0x80) !== 0;
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let p = offset + 2;

    if (len === 126) {
      if (buf.length - p < 2) break;
      len = buf.readUInt16BE(p); p += 2;
    } else if (len === 127) {
      if (buf.length - p < 8) break;
      const hi = buf.readUInt32BE(p), lo = buf.readUInt32BE(p + 4);
      len = hi * 4294967296 + lo;
      p += 8;
    }
    if (len > MAX_MESSAGE) return { out, offset: buf.length, fatal: 'message too large' };

    let mask = null;
    if (masked) {
      if (buf.length - p < 4) break;
      mask = buf.slice(p, p + 4); p += 4;
    }
    if (buf.length - p < len) break;

    let payload = buf.slice(p, p + len);
    if (mask) {
      // A copy, because slice() shares memory with the socket buffer.
      const un = Buffer.allocUnsafe(len);
      for (let i = 0; i < len; i++) un[i] = payload[i] ^ mask[i & 3];
      payload = un;
    }
    p += len;
    offset = p;

    if (opcode === 0x8) { out.push({ type: 'close' }); break; }
    if (opcode === 0x9) { out.push({ type: 'ping', payload }); continue; }
    if (opcode === 0xa) { out.push({ type: 'pong' }); continue; }

    // Text (0x1) and continuation (0x0) both accumulate into one message.
    if (opcode === 0x1 || opcode === 0x0) {
      state.parts.push(payload);
      state.size += payload.length;
      if (state.size > MAX_MESSAGE) return { out, offset, fatal: 'message too large' };
      if (fin) {
        out.push({ type: 'text', text: Buffer.concat(state.parts).toString('utf8') });
        state.parts = [];
        state.size = 0;
      }
      continue;
    }
    // Binary and anything else: not something a relay for JSON needs.
  }
  return { out, offset };
}

/* ------------------------------------------------------------------ *
 * Rooms
 * ------------------------------------------------------------------ */
const rooms = new Map();       // code -> { code, clients:Set, created, lastSeen, locked }
const perIp = new Map();       // ip -> { open:number, recent:number[] }

function ipOf(req, socket) {
  /* Behind a proxy or a tunnel the socket address is the proxy's, so prefer
   * the forwarded header when there is one. It is spoofable; it is only used
   * for rate limiting, where the worst case is two strangers sharing a
   * bucket. */
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return socket.remoteAddress || 'unknown';
}

function ipBucket(ip) {
  let b = perIp.get(ip);
  if (!b) { b = { open: 0, recent: [] }; perIp.set(ip, b); }
  const cutoff = Date.now() - 60000;
  b.recent = b.recent.filter(t => t > cutoff);
  return b;
}

function totalClients() {
  let n = 0;
  rooms.forEach(r => { n += r.clients.size; });
  return n;
}

function roomFor(code) {
  let room = rooms.get(code);
  if (!room) {
    room = { code, clients: new Set(), created: Date.now(), lastSeen: Date.now() };
    rooms.set(code, room);
  }
  room.lastSeen = Date.now();
  return room;
}

function send(client, obj) {
  if (client.socket.destroyed) return;
  try { client.socket.write(encodeFrame(JSON.stringify(obj))); } catch (e) { /* gone */ }
}

function broadcast(room, obj, except) {
  room.clients.forEach(c => { if (c !== except) send(c, obj); });
}

/* Who is in the room, and who is in charge.
 *
 * The host is simply whoever arrived first and is still here. If they leave
 * mid-draft the draft cannot continue — their browser was holding it — so the
 * room is told rather than silently promoting someone into an empty chair. */
function roster(room) {
  return [...room.clients].map(c => ({ id: c.id, name: c.name, host: c.host }));
}

function announce(room) {
  broadcast(room, { t: 'peers', peers: roster(room), room: room.code });
}

function join(room, client) {
  client.host = room.clients.size === 0;
  room.clients.add(client);
  send(client, { t: 'welcome', id: client.id, host: client.host, room: room.code,
                 peers: roster(room), locked: !!room.locked });
  announce(room);
}

function leave(client) {
  const room = client.room;
  if (!room) return;
  room.clients.delete(client);
  if (!room.clients.size) {
    rooms.delete(room.code);
    return;
  }
  if (client.host) {
    /* The host's browser was the draft. Say so plainly instead of pretending
     * the room is fine. */
    broadcast(room, { t: 'hostgone', name: client.name });
  }
  announce(room);
}

/* ------------------------------------------------------------------ *
 * Serving the app, so one process is enough for a draft on a laptop
 * ------------------------------------------------------------------ */
const APP_CANDIDATES = [
  path.join(__dirname, '..', 'dist', 'index.html'),
  path.join(__dirname, '..', 'dist', 'draft-with-slater.html'),
  // The shapes the app actually arrives in: next to the server folder, or
  // beside the server file itself.
  path.join(__dirname, '..', 'index.html'),
  path.join(__dirname, '..', 'draft-with-slater.html'),
  path.join(__dirname, 'index.html'),
  path.join(__dirname, 'draft-with-slater.html')
];
function appFile() {
  for (const p of APP_CANDIDATES) { if (fs.existsSync(p)) return p; }
  return null;
}

/* Tables that are open right now.
 *
 * Without this, everyone who opens the app sees the same blank "Open a table
 * / Join" panel, and whoever presses a button first becomes a host of their
 * own room. Two friends can end up drafting with each other while the person
 * who invited them stares at an empty screen — which is exactly what happens
 * if you share the relay's address rather than the invite link.
 *
 * So the relay answers one question: is anything going on here? Only rooms
 * that are still open to newcomers are listed; the moment a host locks the
 * table, or starts the draft, it stops being advertised. Set PRIVATE=1 to
 * turn the whole thing off. */
const PRIVATE = process.env.PRIVATE === '1';

function openTables() {
  if (PRIVATE) return [];
  const out = [];
  rooms.forEach(room => {
    if (room.locked || !room.clients.size) return;
    const host = [...room.clients].find(c => c.host);
    out.push({
      room: room.code,
      host: host ? host.name : 'somebody',
      people: room.clients.size,
      since: room.created
    });
  });
  return out.sort((a, b) => a.since - b.since);
}

const server = http.createServer((req, res) => {
  if (req.url === '/rooms') {
    res.writeHead(200, {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*'
    });
    res.end(JSON.stringify({ tables: openTables(), private: PRIVATE }));
    return;
  }
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      ok: true, rooms: rooms.size,
      clients: [...rooms.values()].reduce((n, r) => n + r.clients.size, 0),
      open: [...rooms.values()].map(r => ({ code: r.code, n: r.clients.size, locked: !!r.locked }))
    }));
    return;
  }
  /* Card-ratings files made by server/fetch-ratings.js. The pattern is the
   * whole security story: a set code and nothing else can be asked for, so
   * this cannot be talked into serving anything but its own folder. */
  const ratings = /^\/ratings\/([A-Za-z0-9_-]{2,10})\.json$/.exec(req.url.split('?')[0]);
  if (ratings) {
    const rFile = path.join(__dirname, '..', 'ratings', ratings[1].toUpperCase() + '.json');
    if (fs.existsSync(rFile)) {
      res.writeHead(200, { 'content-type': 'application/json',
                           'cache-control': 'no-cache' });
      res.end(fs.readFileSync(rFile));
    } else {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end('{"missing":true}');
    }
    return;
  }
  const file = appFile();
  if (file && (req.url === '/' || req.url.startsWith('/index.html') || req.url.startsWith('/?'))) {
    const body = fs.readFileSync(file);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8',
                         'cache-control': 'no-cache' });
    res.end(body);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Draft relay. Connect a WebSocket to /?room=CODE&name=YOU\n');
});

let nextId = 1;

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }

  const url = new URL(req.url, 'http://localhost');
  const code = (url.searchParams.get('room') || '').toUpperCase().slice(0, 12);
  const name = (url.searchParams.get('name') || 'Player').slice(0, 24);
  if (!/^[A-Z0-9]{3,12}$/.test(code)) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  const ip = ipOf(req, socket);
  const bucket = ipBucket(ip);
  const refuse = (status, why) => {
    socket.write('HTTP/1.1 ' + status + '\r\n\r\n');
    socket.destroy();
    console.log('  refused ' + ip + ': ' + why);
  };
  if (bucket.open >= MAX_PER_IP) return refuse('429 Too Many Requests', 'too many connections');
  if (bucket.recent.length >= NEW_PER_IP_PER_MIN) return refuse('429 Too Many Requests', 'connecting too fast');
  if (totalClients() >= MAX_CLIENTS) return refuse('503 Service Unavailable', 'relay full');
  if (!rooms.has(code) && rooms.size >= MAX_ROOMS) return refuse('503 Service Unavailable', 'too many rooms');

  const room = roomFor(code);
  if (room.clients.size >= MAX_ROOM) return refuse('503 Service Unavailable', 'room full');
  /* A locked room is one the host has closed to newcomers: the draft is under
   * way, or everyone who was invited has arrived. */
  if (room.locked) return refuse('423 Locked', 'room locked');

  bucket.open++;
  bucket.recent.push(Date.now());

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + acceptKey(key) + '\r\n\r\n');

  socket.setNoDelay(true);

  const client = {
    id: 'p' + (nextId++), name, socket, room, host: false, alive: true,
    ip: ip, parts: [], size: 0
  };
  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = buffer.length ? Buffer.concat([buffer, chunk]) : chunk;
    const { out, offset, fatal } = decodeFrames(buffer, client);
    buffer = offset ? buffer.slice(offset) : buffer;
    if (fatal) { socket.destroy(); return; }

    for (const frame of out) {
      if (frame.type === 'close') { socket.end(); return; }
      if (frame.type === 'ping') { socket.write(controlFrame(0xa, frame.payload)); continue; }
      if (frame.type === 'pong') { client.alive = true; continue; }
      if (frame.type !== 'text') continue;

      let msg;
      try { msg = JSON.parse(frame.text); } catch (e) { continue; }
      if (!msg || typeof msg !== 'object') continue;

      client.alive = true;
      room.lastSeen = Date.now();
      if (process.env.RELAY_DEBUG) console.log('  msg ' + msg.t + ' from ' + client.id + ' host=' + client.host);

      // A name can be set after connecting, which is how the lobby works.
      if (msg.t === 'name' && typeof msg.name === 'string') {
        client.name = msg.name.slice(0, 24);
        announce(room);
        continue;
      }
      if (msg.t === 'ping') { send(client, { t: 'pong' }); continue; }

      /* Two things the relay does enforce, because only it can: shutting the
       * door, and showing someone out. Both belong to the host alone — the
       * relay knows which connection that is, so a guest cannot ask for
       * either. */
      if (msg.t === 'lock' && client.host) {
        room.locked = !!msg.locked;
        broadcast(room, { t: 'locked', locked: room.locked });
        send(client, { t: 'locked', locked: room.locked });
        continue;
      }
      if (msg.t === 'kick' && client.host && msg.to) {
        const target = [...room.clients].find(c => c.id === msg.to && c !== client);
        if (target) {
          send(target, { t: 'kicked' });
          setTimeout(() => { try { target.socket.destroy(); } catch (e) {} }, 60);
        }
        continue;
      }

      /* Everything else is somebody else's business, not ours. Stamp who it
       * came from — a client cannot forge that — and pass it on. */
      msg.from = client.id;
      if (msg.to) {
        const target = [...room.clients].find(c => c.id === msg.to);
        if (target) send(target, msg);
      } else {
        broadcast(room, msg, client);
      }
    }
  });

  const cleanup = () => {
    const b = perIp.get(client.ip);
    if (b && b.open > 0) b.open--;
    leave(client);
  };
  socket.on('close', cleanup);
  socket.on('error', cleanup);
  socket.on('end', cleanup);

  join(room, client);
});

/* Drop connections that have stopped answering, and forget stale rooms. */
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, code) => {
    room.clients.forEach(c => {
      if (!c.alive) { c.socket.destroy(); leave(c); return; }
      c.alive = false;
      try { c.socket.write(controlFrame(0x9)); } catch (e) { /* gone */ }
    });
    if (!room.clients.size && now - room.lastSeen > ROOM_TTL_MS) rooms.delete(code);
  });
  // Forget rate-limit buckets nobody is using.
  perIp.forEach((b, ip) => {
    const idle = !b.recent.length || b.recent[b.recent.length - 1] < now - 120000;
    if (!b.open && idle) perIp.delete(ip);
  });
}, 30000).unref();

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  Draft relay listening on port ' + PORT);
  if (appFile()) {
    console.log('  Serving the app too — open it at:');
    console.log('');
    console.log('      http://localhost:' + PORT);
    localAddresses().forEach(ip => console.log('      http://' + ip + ':' + PORT +
      '   (for other devices on this network)'));
    console.log('');
    console.log('  Everyone opening one of those addresses can draft together.');
    console.log('  The relay box on the setup screen fills itself in.');
    console.log('');
    console.log('  A room has no password: whoever has the link can join it.');
    console.log('  Lock the table once your friends are in.');
  } else {
    console.log('  (No copy of the app found next to this file, so it is');
    console.log('   relaying only. Put index.html beside server/ to serve it.)');
  }
  console.log('');
});

/* The addresses other machines on this network can actually reach, so the
 * first thing anyone running this sees is the URL to send round the room. */
function localAddresses() {
  const nets = require('os').networkInterfaces();
  const out = [];
  Object.keys(nets).forEach(name => {
    (nets[name] || []).forEach(net => {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    });
  });
  return out;
}

module.exports = { server, rooms, encodeFrame, decodeFrames, acceptKey };
