export default function handler(){
  try{
    const ROOMS = globalThis.__WS_ROOMS__ || new Map();
    const out = [];
    ROOMS.forEach((set, room)=>{ out.push({ room, count: set.size }); });
    return new Response(JSON.stringify({ time: new Date().toISOString(), rooms: out }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }catch(e){ return new Response(JSON.stringify({ rooms: [] }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } }); }
}