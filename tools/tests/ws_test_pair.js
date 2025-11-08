const WebSocket = require('ws');
const url1 = 'ws://localhost:8080?room=123&side=p2';
const url2 = 'ws://localhost:8080?room=123&side=p1';

const c2 = new WebSocket(url1);
c2.on('open', ()=>{ console.log('client2(open) ->', url1); });
c2.on('message', (m)=>{ console.log('client2 got:', m.toString()); });

const c1 = new WebSocket(url2);
c1.on('open', ()=>{
  console.log('client1(open) ->', url2);
  const msg = JSON.stringify({ type:'action', from:'p1', seq:1, action:{type:'TEST_ACTION', payload:{x:1}} });
  c1.send(msg);
  console.log('client1 sent');
  setTimeout(()=>{ c1.close(); c2.close(); }, 500);
});

c1.on('close', ()=>{ console.log('client1 closed') });
c2.on('close', ()=>{ console.log('client2 closed') });
