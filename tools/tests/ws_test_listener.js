const WebSocket = require('ws');
const url = 'ws://localhost:8080?room=123&side=p2';
const ws = new WebSocket(url);
ws.on('open', ()=>{ console.log('listener opened to', url); });
ws.on('message', (m)=>{ console.log('listener got:', m.toString()); });
ws.on('error', (e)=>{ console.error('listener error', e); });
ws.on('close', ()=>{ console.log('listener closed'); });
