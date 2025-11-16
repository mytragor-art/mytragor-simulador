export const config = { runtime: 'edge' };

const ROOMS = globalThis.__WS_ROOMS__ || (globalThis.__WS_ROOMS__ = new Map());

function getRoomsList(){
  const out = [];
  ROOMS.forEach((set, room)=>{ out.push({ room, count: set.size }); });
  return out;
}

export default function handler(req) {
  try{
    const upgrade = req.headers.get('upgrade') || '';
    if (upgrade.toLowerCase() !== 'websocket') {
      // Support simple GET to list rooms
      const url = new URL(req.url);
      if (url.pathname.endsWith('/api/ws') && url.searchParams.get('type') === 'rooms') {
        return new Response(JSON.stringify({ time: new Date().toISOString(), rooms: getRoomsList() }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      }
      return new Response('Expected a WebSocket upgrade', { status: 400 });
    }

    const url = new URL(req.url);
    const room = (url.searchParams.get('room') || '').toUpperCase();
    const side = (url.searchParams.get('side') || '').toLowerCase();
    const { 0: client, 1: server } = new WebSocketPair();
    server.accept();

    // join room
    const set = ROOMS.get(room) || new Set();
    ROOMS.set(room, set);
    set.add(server);

    function broadcast(data){
      try{
        set.forEach(ws => { if(ws !== server) { try{ ws.send(data); }catch(e){} } });
      }catch(e){}
    }

    server.addEventListener('message', (ev) => {
      const data = typeof ev.data === 'string' ? ev.data : '';
      // minimal control messages
      try{
        const obj = JSON.parse(data);
        if(obj && obj.type === 'list'){
          try{ server.send(JSON.stringify({ type:'rooms', rooms: getRoomsList() })); }catch(e){}
          return;
        }
        if(obj && obj.type === 'join' && obj.room){ /* already joined via query; ignore */ return; }
      }catch(e){ /* ignore */ }
      broadcast(data);
    });

    server.addEventListener('close', () => {
      try{ set.delete(server); if(set.size === 0) ROOMS.delete(room); }catch(e){}
    });

    // initial hello
    try{ server.send(JSON.stringify({ type:'hello', room, side })); }catch(e){}

    return new Response(null, { status: 101, webSocket: client });
  }catch(e){
    return new Response('ws error', { status: 500 });
  }
}