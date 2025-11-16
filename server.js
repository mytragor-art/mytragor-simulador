// server.js — relay WebSocket simples
let uWS = null;
if(uWS){
  const roomsMap = new Map();
  function addToRoom(ws, r){ r = String(r||'').toUpperCase(); if(!r) return; let set = roomsMap.get(r); if(!set){ set = new Set(); roomsMap.set(r, set); } set.add(ws); }
  function removeFromRoom(ws){ const r = String(ws.room||'').toUpperCase(); if(!r) return; const set = roomsMap.get(r); if(set){ set.delete(ws); if(set.size===0) roomsMap.delete(r); } }
  function getRooms(){ return Array.from(roomsMap.entries()).map(([room,set])=>({ room, count: set.size })); }
  const app = uWS.App();
  function getQueryParam(req, key){ try{ return req.getQuery(key)||null; }catch{ return null; } }
  app.ws('/*', {
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 32 * 1024,
    idleTimeout: 30,
    open(ws, req){
      const rawRoom = getQueryParam(req,'room');
      ws.room = rawRoom ? String(rawRoom).toUpperCase() : null;
      ws.side = (getQueryParam(req,'side')||'').toLowerCase() || null;
      if(ws.room){ ws.subscribe(ws.room); addToRoom(ws, ws.room); }
    },
    message(ws, message, isBinary){
      let data;
      try{ data = isBinary ? Buffer.from(message) : Buffer.from(message).toString('utf8'); }catch(e){ return; }
      try{
        const obj = typeof data === 'string' ? JSON.parse(data) : null;
        if(obj && obj.type === 'join' && obj.room){ ws.room = String(obj.room).toUpperCase(); ws.subscribe(ws.room); addToRoom(ws, ws.room); }
        if(obj && obj.type === 'list'){ try{ ws.send(JSON.stringify({ type:'rooms', rooms: getRooms() })); }catch(e){} return; }
        if(obj && obj.type === 'ping'){ try{ ws.send(JSON.stringify({ type:'pong', now: Date.now() })); }catch(e){} return; }
      }catch(e){ /* ignore */ }
      if(ws.room){ try{ app.publish(ws.room, data); }catch(e){} }
    },
    close(ws){ if(ws.room){ removeFromRoom(ws); ws.room=null; } }
  });
  app.get('/rooms', (res, req)=>{ try{ res.writeHeader('Content-Type','application/json; charset=utf-8').end(JSON.stringify({ time:new Date().toISOString(), rooms: getRooms() })); }catch(e){ try{ res.end('[]'); }catch(_){} } });
  app.listen(8080, (token)=>{ console.log(token ? 'uWS relay ON ws://localhost:8080' : 'uWS listen failed'); });
  // also print debug HTTP info
  console.log('Debug HTTP (uWS) ON http://localhost:8080/rooms');
} else {
  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ port: 8080 });
  console.log('WS relay ON ws://localhost:8080');

// Small debug HTTP endpoint to inspect rooms quickly while developing.
// Visit http://localhost:8081/rooms to get the current rooms list as JSON.
try{
  const http = require('http');
  const dbgPort = 8081;
  http.createServer((req,res)=>{
    if(req.url && req.url.indexOf('/rooms') === 0){
      const out = { time: new Date().toISOString(), rooms: getRooms(), clients: wss.clients ? wss.clients.length : 0 };
      res.setHeader('Content-Type','application/json; charset=utf-8');
      res.end(JSON.stringify(out,null,2));
      return;
    }
    res.statusCode = 404; res.end('Not found');
  }).listen(dbgPort, '127.0.0.1', ()=>{ console.log('Debug HTTP ON http://localhost:' + dbgPort + '/rooms'); });
}catch(e){ console.warn('Debug HTTP server failed to start', e); }

function getQuery(url, key) {
  try {
    const u = new URL(url, 'http://x');
    return u.searchParams.get(key);
  } catch { return null; }
}

wss.on('connection', (ws, req) => {
  // Try to read the room from the connection URL first. If absent, we'll
  // fallback to the first JSON message (clients send a join message with room).
  const rawRoom = getQuery(req.url, 'room');
  const room = rawRoom ? (''+rawRoom).toUpperCase() : null;
  const rawSide = getQuery(req.url, 'side');
  ws.side = rawSide ? (''+rawSide).toLowerCase() : null; // p1/p2 opcional
  const rawSeed = getQuery(req.url, 'seed');
  ws.seed = rawSeed ? (''+rawSeed) : null;
  ws.room = room; // may be null for now
  console.log('WS connected from', req.socket.remoteAddress, 'req.url=', req.url, 'initialRoom=', room);
  // If the connection already included a room in the URL, notify watchers
  // immediately so lobby clients see the updated room list without waiting
  // for an explicit join message.
  if (ws.room) { try { broadcastRooms(); } catch (e) {} }

  ws.on('message', data => {
    // optional: log short preview for debugging
    try {
      let preview = (typeof data === 'string' ? data.slice(0,120) : '[binary]');
      console.log('recv', req.socket.remoteAddress, 'room=', ws.room, '->', preview);
    } catch(e){}
    // Try to parse incoming JSON once and handle known message types.
    try{
      if(typeof data === 'string'){
          const obj = JSON.parse(data);
          // If this message explicitly sets a room, adopt it and notify others.
          if(obj && obj.type === 'join' && obj.room){
            ws.room = (''+obj.room).toUpperCase();
            if(obj.side) ws.side = (''+obj.side).toLowerCase();
            if(obj.seed) ws.seed = (''+obj.seed);
            console.log('join message assigned room ->', ws.room, 'side=', ws.side, 'seed=', ws.seed);
            broadcastRooms();
          }
          // Some clients send a first message with { room: 'XXX' } (legacy). Handle that too.
          if(obj && obj.room && !ws.room){
            ws.room = (''+obj.room).toUpperCase();
            if(obj.side) ws.side = (''+obj.side).toLowerCase();
            if(obj.seed) ws.seed = (''+obj.seed);
            console.log('assigned room from join message ->', ws.room, 'side=', ws.side, 'seed=', ws.seed);
            broadcastRooms();
          }
          // Always respond to explicit list requests regardless of ws.room state.
          if(obj && obj.type === 'list'){
            const rooms = getRooms();
            console.log('received LIST request from', req.socket.remoteAddress, 'ws.room=', ws.room, '-> replying with', rooms);
            try{ ws.send(JSON.stringify({ type: 'rooms', rooms: rooms })); }catch(e){ console.warn('failed to send rooms reply', e); }
          }
          // Optional keep-alive: respond to ping
          if(obj && obj.type === 'ping'){
            try{ ws.send(JSON.stringify({ type: 'pong', now: Date.now() })); }catch(e){}
          }
          // Broadcast seed to peers if requested
          if(obj && obj.type === 'seed' && obj.seed){ ws.seed = (''+obj.seed); }
      }
    }catch(e){ /* ignore parse errors */ }
    // reenvia para todos da MESMA sala, menos o remetente
    wss.clients.forEach(client => {
      try{
        if (client !== ws && client.readyState === WebSocket.OPEN && client.room && ws.room && client.room === ws.room) {
          client.send(data);
        }
      }catch(e){}
    });
  });

  ws.on('close', () => {
    ws.room = null; broadcastRooms();
  });
});

function getRooms(){
  const map = {};
  wss.clients.forEach(c=>{
    try{
      if(c && c.readyState === WebSocket.OPEN && c.room){ const r = (''+c.room).toUpperCase(); map[r] = (map[r]||0) + 1; }
    }catch(e){}
  });
  return Object.keys(map).map(r=>({ room: r, count: map[r] }));
}

function broadcastRooms(){
  const list = { type: 'rooms', rooms: getRooms() };
  const s = JSON.stringify(list);
  wss.clients.forEach(client=>{ try{ if(client.readyState===WebSocket.OPEN) client.send(s); }catch(e){} });
}
}
