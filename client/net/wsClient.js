;(function(){
  const isHttps = (function(){ try{ return location.protocol === 'https:'; }catch(e){ return false; } })();
  const params = new URLSearchParams(location.search);
  function computeDefaultServer(){
    try{
      const proto = isHttps ? 'wss' : 'ws';
      const host = location.hostname;
      const override = params.get('mpServer');
      if(override) return override;
      if(host === 'localhost' || host === '127.0.0.1' || /\.(local)$/i.test(host)){
        return `${proto}://localhost:8081`;
      }
      return `${proto}://${location.host}`;
    }catch(e){ return (isHttps? 'wss':'ws') + '://localhost:8081'; }
  }
  let SERVER = computeDefaultServer();
  let ws = null;
  let connected = false;
  let lastServerSeq = 0;
  let lastJoin = null;
  let seenActionIds = new Set();

  function log(){ try{ console.log.apply(console, ['[wsClient]'].concat([].slice.call(arguments))); }catch(e){} }
  function send(obj){ try{ if(ws && ws.readyState === WebSocket.OPEN){ ws.send(JSON.stringify(obj)); } }catch(e){} }

  function connect(){ if(ws && ws.readyState === WebSocket.OPEN) return; console.log('[wsClient] connecting to', SERVER); ws = new WebSocket(SERVER); bind(); }
  function bind(){
    ws.onopen = function(){ 
      connected = true; 
      log('open', SERVER); 
      console.log('[wsClient] connected'); 
      // Reenviar join se houver uma sessão anterior
      if(lastJoin) {
        console.log('[wsClient] re-sending join for reconnection');
        join(lastJoin.matchId, lastJoin.playerId, lastJoin.sinceSeq);
      }
    };
    ws.onclose = function(){ 
      connected = false; 
      log('close'); 
      console.log('[wsClient] disconnected, reconnecting...'); 
      setTimeout(connect, 1000); 
    };
    ws.onerror = function(e){ 
      log('error', e); 
      console.log('[wsClient] connection error:', e); 
    };
    ws.onmessage = function(ev){ 
      var msg=null; 
      try{ msg=JSON.parse(ev.data); }catch(e){ return; } 
      if(!msg||!msg.type) return; 
      handle(msg); 
    };
  }

  function handle(msg){
    if(msg.type === 'snapshot'){ lastServerSeq = Number(msg.serverSeq)||0; try{ if(window.syncManager && syncManager.onSnapshot) syncManager.onSnapshot(msg.snapshot, lastServerSeq); }catch(e){} return; }
    if(msg.type === 'replay'){ var arr = Array.isArray(msg.actions)?msg.actions:[]; arr.sort((a,b)=>a.serverSeq-b.serverSeq).forEach(function(r){ try{ if(window.syncManager && syncManager.onActionAccepted) syncManager.onActionAccepted(r); }catch(e){} }); lastServerSeq = Number(msg.toSeq)||lastServerSeq; return; }
    if(msg.type === 'actionAccepted'){ 
      // Ignorar ações duplicadas
      if(msg.actionId && seenActionIds.has(msg.actionId)) return;
      if(msg.actionId) seenActionIds.add(msg.actionId);
      
      if(typeof msg.serverSeq === 'number' && msg.serverSeq <= lastServerSeq) return; 
      lastServerSeq = Number(msg.serverSeq)||lastServerSeq; 
      try{ if(window.syncManager && syncManager.onActionAccepted) syncManager.onActionAccepted({ serverSeq: msg.serverSeq, actionId: msg.actionId, playerId: msg.by, actionType: msg.actionType, payload: msg.payload }); }catch(e){} 
      return; 
    }
    if(msg.type === 'actionRejected'){ try{ if(window.syncManager && syncManager.onActionRejected) syncManager.onActionRejected(msg.actionId, msg.reason); }catch(e){} return; }
    if(msg.type === 'playerJoined'){
      try{ if(typeof window.appendLogLine==='function') appendLogLine(`${msg.playerName||msg.playerId} entrou na sala ${msg.matchId}`,'effect'); else console.log('[MP] playerJoined', msg); }catch(e){}
      try{
        window.OPPONENT_NAME = msg.playerName || msg.playerId;
        const top = document.querySelector('.sideTitle'); if(top) top.textContent = `Oponente — ${window.OPPONENT_NAME}`;
        const bottom = document.querySelector('.sideTitle.bottom'); if(bottom) bottom.textContent = `Você — ${window.PLAYER_NAME || (lastJoin && lastJoin.playerId) || ''}`;
      }catch(e){}
      return;
    }
    if(msg.type === 'playerLeft'){
      try{ if(typeof window.appendLogLine==='function') appendLogLine(`${msg.playerName||msg.playerId} saiu da sala ${msg.matchId}`,'effect'); else console.log('[MP] playerLeft', msg); }catch(e){}
      return;
    }
    if(msg.type === 'pong'){ return; }
  }

  function join(matchId, playerId, sinceSeq){ 
    // Memorizar último join para reconexão
    lastJoin = { 
      matchId: String(matchId||'TESTE123'), 
      playerId: String(playerId||'p1'), 
      sinceSeq: typeof sinceSeq==='number'? sinceSeq : lastServerSeq 
    };
    // Opcional: enviar nome do jogador
    let playerName = null; 
    try{ playerName = params.get('name') || (lastJoin.playerId.toUpperCase()); }catch(e){}
    send({ type:'join', matchId: lastJoin.matchId, playerId: lastJoin.playerId, playerName: playerName, sinceSeq: lastJoin.sinceSeq }); 
  }
  function requestPing(){ send({ type:'ping' }); }
  function sendAction(matchId, playerId, actionId, actionType, payload){ send({ type:'action', matchId:String(matchId), playerId:String(playerId), actionId:String(actionId), actionType:String(actionType), payload: payload||{} }); }

  window.wsClient = { connect, join, requestPing, sendAction, getStatus: function(){ return { connected, server: SERVER, lastServerSeq }; } };
})();
