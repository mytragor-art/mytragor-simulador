const WebSocket = require('ws');
const url = 'ws://localhost:8080?room=123&side=p1';
const ws = new WebSocket(url);
ws.on('open', ()=>{
  console.log('sender opened to', url);
  // send a sample action message
  const msg = JSON.stringify({ type:'action', from:'p1', seq:1, action:{type:'TEST_ACTION', payload:{x:1}} });
  ws.send(msg);
  console.log('sender sent test message');
  setTimeout(()=>ws.close(), 1000);
});
ws.on('error', (e)=>{ console.error('sender error', e); });
ws.on('close', ()=>{ console.log('sender closed'); });
