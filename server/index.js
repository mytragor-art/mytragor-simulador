const http = require('http');
const WebSocket = require('ws');
const url = require('url');
const { MatchManager } = require('./matchManager');

const PORT = (process.env.PORT ? Number(process.env.PORT) : (process.env.MP_PORT ? Number(process.env.MP_PORT) : 8081));

const matchMgr = new MatchManager();

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url || '', true);
  if (req.method === 'GET' && parsed.pathname === '/debug/matches') {
    const data = matchMgr.debugList();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ time: Date.now(), matches: data }));
    return;
  }
  if (req.method === 'GET' && parsed.pathname && /^\/debug\/match\//.test(parsed.pathname)) {
    const id = parsed.pathname.split('/').pop();
    const data = matchMgr.debugMatch(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ time: Date.now(), match: data }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok');
});

const wss = new WebSocket.Server({ server, maxPayload: 1024 * 1024, perMessageDeflate: false });

function send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch {} }
function broadcast(match, obj, exclude) {
  const data = JSON.stringify(obj);
  match.players.forEach((sock) => { if (sock && sock.readyState === WebSocket.OPEN && sock !== exclude) { try { sock.send(data); } catch {} } });
}

function roomsList(){
  const list = matchMgr.debugList();
  return list.map(r => ({ room: String(r.matchId).toUpperCase(), count: Array.isArray(r.players)? r.players.length : 0, players: Array.isArray(r.players)? r.players.slice() : [] }));
}
function broadcastRooms(){
  const payload = JSON.stringify({ type:'rooms', rooms: roomsList() });
  wss.clients.forEach((c)=>{ if(c && c.readyState === WebSocket.OPEN){ try{ c.send(payload); }catch{} } });
}

wss.on('connection', (ws, req) => {
  let joined = null;
  ws.on('message', (buf) => {
    let msg = null; try { msg = JSON.parse(buf.toString()); } catch { return; }
    if (!msg || !msg.type) return;

    if (msg.type === 'ping') { send(ws, { type: 'pong', t: Date.now() }); return; }

    if (msg.type === 'list') { send(ws, { type:'rooms', rooms: roomsList() }); return; }

    if (msg.type === 'join') {
      const matchId = String(msg.matchId || '').trim();
      const playerId = String(msg.playerId || '').trim();
      if (!matchId || !playerId) { send(ws, { type: 'error', code: 'invalid_join' }); return; }
      const info = matchMgr.join(matchId, playerId, ws);
      joined = { matchId, playerId };
      send(ws, { type: 'snapshot', matchId, serverSeq: info.serverSeq, snapshot: info.snapshot });
      const since = typeof msg.sinceSeq === 'number' ? msg.sinceSeq : null;
      if (since !== null) {
        const actions = matchMgr.actionsSince(matchId, since);
        if (actions && actions.length) send(ws, { type: 'replay', matchId, fromSeq: since, toSeq: info.serverSeq, actions });
      }
      broadcastRooms();
      return;
    }

    if (msg.type === 'action') {
      if (!joined) { send(ws, { type: 'error', code: 'not_joined' }); return; }
      const matchId = joined.matchId;
      const playerId = joined.playerId;
      const action = { matchId, playerId, actionId: msg.actionId, actionType: msg.actionType, payload: msg.payload };
      const res = matchMgr.applyAction(matchId, action);
      if (!res.ok) { send(ws, { type: 'actionRejected', matchId, actionId: action.actionId, reason: res.reason }); return; }
      const m = matchMgr.getOrCreateMatch(matchId);
      const out = { type: 'actionAccepted', matchId, serverSeq: res.applied.serverSeq, actionId: res.applied.actionId, actionType: res.applied.actionType, payload: res.applied.payload, by: playerId };
      broadcast(m, out, null);
      return;
    }
  });

  ws.on('close', () => { if (joined) matchMgr.removePlayer(joined.matchId, joined.playerId); broadcastRooms(); });
});

server.listen(PORT, () => { console.log('[ws-server] listening', PORT); });
