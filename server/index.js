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

function validateAction(action){
  try{
    const type = String(action.actionType||'');
    const payload = action.payload || {};
    if(type === 'SET_LEADER'){
      const leader = payload.leader;
      if(!leader || (typeof leader !== 'object')) return { ok:false, reason:'missing_leader' };
      const hasKeyOrName = !!(leader.key || leader.name);
      if(!hasKeyOrName) return { ok:false, reason:'leader_id_missing' };
      const map = {
        katsu: { name:'Katsu, o Vingador', ac:12, hp:20, maxHp:20, atkBonus:4, damage:4, filiacao:'Marcial' },
        valbrak: { name:'Valbrak, Herói do Povo', ac:10, hp:20, maxHp:20, atkBonus:2, damage:2, filiacao:'Arcana' },
        leafae: { name:'Leafae, Guardião', ac:10, hp:20, maxHp:20, atkBonus:2, damage:1, filiacao:'Religioso' },
        ademais: { name:'Ademais, Aranha Negra', ac:11, hp:20, maxHp:20, atkBonus:3, damage:3, filiacao:'Sombras' }
      };
      const k = String(leader.key||leader.name||'').toLowerCase();
      const base = map[k] || {};
      const out = { side: String(payload.side||action.playerId||''), leader: { key: leader.key||undefined, name: leader.name||base.name||undefined, img: leader.img||undefined, kind:'leader', ac: leader.ac!=null?leader.ac:base.ac, hp: leader.hp!=null?leader.hp:base.hp, maxHp: leader.maxHp!=null?leader.maxHp:base.maxHp, atkBonus: leader.atkBonus!=null?leader.atkBonus:base.atkBonus, damage: leader.damage!=null?leader.damage:base.damage, filiacao: leader.filiacao||base.filiacao }, cards: Array.isArray(payload.cards)? payload.cards.slice() : null, fragImg: (typeof payload.fragImg==='string' && payload.fragImg) ? String(payload.fragImg) : null };
      return { ok:true, payload: out };
    }
    return { ok:true, payload };
  }catch(e){ return { ok:false, reason:'validation_error' }; }
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
    try{ ws.playerId = playerId; ws.playerName = (typeof msg.playerName==='string' && msg.playerName.trim().length)? String(msg.playerName).trim() : playerId; }catch{}
    const info = matchMgr.join(matchId, playerId, ws);
    joined = { matchId, playerId };
    send(ws, { type: 'snapshot', matchId, serverSeq: info.serverSeq, snapshot: info.snapshot });
    const since = typeof msg.sinceSeq === 'number' ? msg.sinceSeq : null;
    if (since !== null) {
      const actions = matchMgr.actionsSince(matchId, since);
      if (actions && actions.length) send(ws, { type: 'replay', matchId, fromSeq: since, toSeq: info.serverSeq, actions });
    }
    // Informar jogadores da partida sobre novo participante
    try {
      const m = matchMgr.getOrCreateMatch(matchId);
      const notice = { type: 'playerJoined', matchId, playerId, playerName: ws.playerName, timestamp: Date.now() };
      broadcast(m, notice, ws);
    } catch {}
    broadcastRooms();
    return;
  }

  if (msg.type === 'action') {
    if (!joined) { send(ws, { type: 'error', code: 'not_joined' }); return; }
    const matchId = joined.matchId;
    const playerId = joined.playerId;
    const action = { matchId, playerId, actionId: msg.actionId, actionType: msg.actionType, payload: msg.payload };
    const v = validateAction(action);
    if(!v.ok){ send(ws, { type:'actionRejected', matchId, actionId: action.actionId, reason: v.reason||'invalid_payload' }); return; }
    action.payload = v.payload;
    try{ console.log('[ws-server] apply', matchId, playerId, action.actionType, Object.keys(action.payload||{})); }catch{}
    const res = matchMgr.applyAction(matchId, action);
    if (!res.ok) { send(ws, { type: 'actionRejected', matchId, actionId: action.actionId, reason: res.reason }); return; }
    const m = matchMgr.getOrCreateMatch(matchId);
    const out = { type: 'actionAccepted', matchId, serverSeq: res.applied.serverSeq, actionId: res.applied.actionId, actionType: res.applied.actionType, payload: res.applied.payload, by: playerId };
    try{ console.log('[ws-server] accepted', matchId, 'seq=', res.applied.serverSeq, 'type=', res.applied.actionType); }catch{}
    broadcast(m, out, null);
    // START_MATCH será solicitado pelo cliente MP quando ambos escolherem
    return;
  }

  if (msg.type === 'clientSnapshot') {
    if (!joined) { send(ws, { type: 'error', code: 'not_joined' }); return; }
    const m = matchMgr.getOrCreateMatch(joined.matchId);
    const snap = msg.snapshot || null;
    if (!snap) return;
    const out = { type: 'snapshot', matchId: joined.matchId, serverSeq: m.serverSeq, snapshot: snap };
    broadcast(m, out, null);
    return;
  }
  });

  ws.on('close', () => { 
    if (joined) {
      const mid = joined.matchId; const pid = joined.playerId;
      matchMgr.removePlayer(mid, pid);
      try {
        const m = matchMgr.getOrCreateMatch(mid);
        const notice = { type: 'playerLeft', matchId: mid, playerId: pid, playerName: ws.playerName || pid, timestamp: Date.now() };
        broadcast(m, notice, null);
      } catch {}
    }
    broadcastRooms(); 
  });
});

server.listen(PORT, () => { console.log('[ws-server] listening', PORT); });
