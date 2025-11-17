const WebSocket = require('ws');

const SERVER = 'ws://localhost:8080';
const ROOM = 'SIM_TEST_ROOM';

function makeClient(side){
  return new Promise((resolve,reject)=>{
    const url = `${SERVER}?room=${encodeURIComponent(ROOM)}&side=${encodeURIComponent(side)}`;
    const ws = new WebSocket(url);
    ws.on('open', ()=>{
      console.log(`${side} open`);
      resolve(ws);
    });
    ws.on('error', (e)=>{ console.error(`${side} error`, e); reject(e); });
  });
}

(async ()=>{
  console.log('Starting MP simulate test');
  const p1 = await makeClient('p1');
  const p2 = await makeClient('p2');

  p1.on('message', data => {
    try{ const m = JSON.parse(data); console.log('p1 recv', m); }catch(e){ console.log('p1 recv raw', data.toString().slice(0,200)); }
  });
  p2.on('message', data => {
    try{ const m = JSON.parse(data); console.log('p2 recv', m); }catch(e){ console.log('p2 recv raw', data.toString().slice(0,200)); }
  });

  // wait a bit for any handshake messages
  await new Promise(r=>setTimeout(r,200));

  // p2 sends ready (Net does this), then p1 would normally publish state; simulate action send from p1
  const action = { tipo: 'TEST_ACTION', dados: { x: 1, y: 2 } };
  const msg = { type: 'action', action: action, from: 'p1', seq: 1 };
  console.log('p1 send action -> relay');
  p1.send(JSON.stringify(msg));

  // Wait for relay to forward
  await new Promise(r=>setTimeout(r,400));

  // Check results via console output; close
  p1.close(); p2.close();
  console.log('Test finished');
  process.exit(0);
})();
