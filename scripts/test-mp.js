const WebSocket = require('ws');

function log(tag, msg){ process.stdout.write(`[${tag}] ${msg}\n`); }

function connect(url){ return new Promise((resolve)=>{ const ws = new WebSocket(url); ws.on('open', ()=> resolve(ws)); }); }

async function main(){ const url = process.env.MP_URL || 'ws://localhost:8081'; const matchId = 'TESTE123'; const p1 = await connect(url); const p2 = await connect(url);
  let lastSeq = 0;
  p1.on('message', (d)=>{ try{ const m=JSON.parse(d.toString()); if(m.type==='snapshot'){ lastSeq=m.serverSeq; log('p1','snapshot '+lastSeq); } if(m.type==='actionAccepted'){ lastSeq=m.serverSeq; log('p1','accepted '+m.actionType+' seq='+m.serverSeq); } if(m.type==='actionRejected'){ log('p1','rejected '+m.actionId+' reason='+m.reason); } }catch{} });
  p2.on('message', (d)=>{ try{ const m=JSON.parse(d.toString()); if(m.type==='snapshot'){ log('p2','snapshot '+m.serverSeq); } if(m.type==='actionAccepted'){ log('p2','accepted '+m.actionType+' seq='+m.serverSeq); } }catch{} });
  p1.send(JSON.stringify({ type:'join', matchId, playerId:'p1' })); p2.send(JSON.stringify({ type:'join', matchId, playerId:'p2' }));
  await new Promise(r=>setTimeout(r,300));
  const act1 = { type:'action', matchId, playerId:'p1', actionId:'a1', actionType:'PLAY_CARD', payload:{ index:0, side:'p1' } };
  p1.send(JSON.stringify(act1));
  await new Promise(r=>setTimeout(r,300));
  const bad = { type:'action', matchId, playerId:'p1', actionId:'a2', actionType:'PLAY_CARD', payload:{ index:999, side:'p1' } };
  p1.send(JSON.stringify(bad));
  await new Promise(r=>setTimeout(r,300));
  p2.close();
  await new Promise(r=>setTimeout(r,300));
  const p2b = await connect(url);
  p2b.on('message', (d)=>{ try{ const m=JSON.parse(d.toString()); if(m.type==='snapshot'){ log('p2b','snapshot '+m.serverSeq); } if(m.type==='replay'){ log('p2b','replay '+m.actions.length); } }catch{} });
  p2b.send(JSON.stringify({ type:'join', matchId, playerId:'p2', sinceSeq: lastSeq }));
  await new Promise(r=>setTimeout(r,500));
  process.stdout.write('done\n'); process.exit(0);
}

main().catch(e=>{ console.error(e); process.exit(1); });