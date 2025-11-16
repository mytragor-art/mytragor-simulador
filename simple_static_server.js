const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 5500;
const ROOT = path.resolve(__dirname);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  try {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(ROOT, reqPath.replace(/^\/+/, ''));

    if (!filePath.startsWith(ROOT)) {
      res.statusCode = 403; res.end('Forbidden'); return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err) { res.statusCode = 404; res.end('Not found'); return; }
      if (stats.isDirectory()) {
        // try index.html inside directory
        const idx = path.join(filePath, 'index.html');
        if (fs.existsSync(idx)) {
          sendFile(idx, res); return;
        }
        res.statusCode = 403; res.end('Forbidden'); return;
      }
      sendFile(filePath, res);
    });
  } catch (e) { res.statusCode = 500; res.end('Server error'); }
});

function sendFile(filePath, res){
  const ext = path.extname(filePath).toLowerCase();
  const ct = mime[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', ct);
  const stream = fs.createReadStream(filePath);
  stream.on('error', ()=>{ res.statusCode = 500; res.end('Read error'); });
  stream.pipe(res);
}

server.listen(PORT, '0.0.0.0', ()=>{
  console.log(`Static server started: http://localhost:${PORT}/ (root ${ROOT})`);
});

process.on('SIGINT', ()=>{ console.log('Stopping static server'); process.exit(); });

// Attach a WebSocket relay to the SAME HTTP server (fallback): allows ws://localhost:5500
// Rooms and message relay logic mirrors server.js so lobby and game can work even without :8080
function getQuery(url, key){ try{ const u = new URL(url, 'http://x'); return u.searchParams.get(key); }catch{ return null; } }
const wss = new WebSocket.Server({ server });
console.log(`WS relay (fallback) ON ws://localhost:${PORT}/`);

wss.on('connection', (ws, req) => {
  const rawRoom = getQuery(req.url, 'room');
  ws.room = rawRoom ? (''+rawRoom).toUpperCase() : null;
  ws.side = (getQuery(req.url, 'side')||'').toLowerCase() || null;
  console.log('WS(fallback) connected', req.socket.remoteAddress, 'room=', ws.room, 'side=', ws.side);
  if(ws.room) broadcastRooms();
  ws.on('message', data => {
    try{
      if(typeof data === 'string'){
        const obj = JSON.parse(data);
        if(obj && obj.type === 'join' && obj.room){ ws.room = (''+obj.room).toUpperCase(); if(obj.side) ws.side = (''+obj.side).toLowerCase(); broadcastRooms(); }
        if(obj && obj.room && !ws.room){ ws.room = (''+obj.room).toUpperCase(); broadcastRooms(); }
        if(obj && obj.type === 'list'){ try{ ws.send(JSON.stringify({ type:'rooms', rooms: getRooms() })); }catch(e){} }
        if(obj && obj.type === 'ping'){ try{ ws.send(JSON.stringify({ type:'pong', now: Date.now() })); }catch(e){} }
      }
    }catch(e){}
    wss.clients.forEach(client=>{ try{ if(client!==ws && client.readyState===WebSocket.OPEN && client.room && ws.room && client.room===ws.room){ client.send(data); } }catch(e){} });
  });
  ws.on('close', ()=>{
    try{
      wss.clients.forEach(client=>{ try{ if(client!==ws && client.readyState===WebSocket.OPEN && client.room && ws.room && client.room===ws.room){ client.send(JSON.stringify({ type:'peer-left', side: ws.side||null })); } }catch(e){} });
    }catch(e){}
    ws.room=null; broadcastRooms();
  });
});

function getRooms(){ const map={}; wss.clients.forEach(c=>{ try{ if(c && c.readyState===WebSocket.OPEN && c.room){ const r=(''+c.room).toUpperCase(); map[r]=(map[r]||0)+1; } }catch(e){} }); return Object.keys(map).map(r=>({room:r,count:map[r]})); }
function broadcastRooms(){ const s = JSON.stringify({ type:'rooms', rooms: getRooms() }); wss.clients.forEach(client=>{ try{ if(client.readyState===WebSocket.OPEN) client.send(s); }catch(e){} }); }
