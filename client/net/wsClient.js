;(function(){
  const isHttps = (function(){ try{ return location.protocol === 'https:'; }catch(e){ return false; } })();
  const params = new URLSearchParams(location.search);
  function computeDefaultServer(){
    try{
      const override = params.get('mpServer');
      if(override) return override;
      const host = location.hostname;
      if(host === 'localhost' || host === '127.0.0.1' || /\.(local)$/i.test(host)){
        return (isHttps? 'wss':'ws') + '://localhost:8081';
      }
      return 'wss://mytragor-simulador-1.onrender.com';
    }catch(e){ return (isHttps? 'wss':'ws') + '://localhost:8081'; }
  }
  let SERVER = computeDefaultServer();
  let ws = null;
  let connected = false;
  let lastServerSeq = 0;
  let lastJoin = null;
  let seenActionIds = new Set();
  let heartbeat = null;
  let lastPingTs = 0; let lastRTT = null;
  let retries = 0; let switchedToFallback = false;

  function sanitizeLeader(leader){
    try{
      if(!leader) return null;
      let src = leader;
      const out = {};
      if(typeof src === 'string'){
        const nm = String(src);
        let key = nm;
        try{ if(typeof window.getLeaderKey==='function') key = getLeaderKey(nm); }catch(e){}
        out.key = String(key);
        out.name = nm;
        try{ if(window.CHOSEN_IMAGES && CHOSEN_IMAGES[key]) out.img = String(CHOSEN_IMAGES[key]); }catch(e){}
      } else {
        if(src.key) out.key = String(src.key);
        if(src.name) out.name = String(src.name);
        if(src.img) out.img = String(src.img);
        if(typeof src.ac==='number') out.ac = src.ac;
        if(typeof src.hp==='number') out.hp = src.hp;
        if(typeof src.maxHp==='number') out.maxHp = src.maxHp;
        if(typeof src.atkBonus==='number') out.atkBonus = src.atkBonus;
        if(typeof src.damage==='number') out.damage = src.damage;
        if(src.filiacao) out.filiacao = String(src.filiacao);
      }
      out.kind = 'leader';
      return Object.keys(out).length? out : null;
    }catch(e){ return null; }
  }

  function validateActionPayload(type, payload){
    const t = String(type||'');
    const p = payload || {};
    if(t === 'SET_LEADER'){
      const side = String(p.side||'');
      const leader = sanitizeLeader(p.leader || (window.STATE && STATE.you && STATE.you.leader));
      const cards = Array.isArray(p.cards) ? p.cards.slice() : (window.STATE && STATE.you && Array.isArray(STATE.you.customDeck)? STATE.you.customDeck.slice() : null);
      const fragImg = (typeof p.fragImg==='string' && p.fragImg) ? p.fragImg : ((window.STATE && STATE.you && typeof STATE.you.fragImg==='string')? STATE.you.fragImg : null);
      if(!leader) return { ok:false, reason:'missing_leader' };
      return { ok:true, payload:{ side: side||String(lastJoin && lastJoin.playerId || 'p1'), leader, cards: cards||null, fragImg: fragImg||null } };
    }
    return { ok:true, payload:p };
  }

  function log(){ try{ console.log.apply(console, ['[wsClient]'].concat([].slice.call(arguments))); }catch(e){} }
  function send(obj){ try{ if(ws && ws.readyState === WebSocket.OPEN){ ws.send(JSON.stringify(obj)); } }catch(e){} }

  function connect(){ if(ws && ws.readyState === WebSocket.OPEN) return; console.log('[wsClient] connecting to', SERVER); ws = new WebSocket(SERVER); bind(); }
  function bind(){
    ws.onopen = function(){ 
      connected = true; 
      log('open', SERVER); 
      console.log('[wsClient] connected'); 
      try{ var s=document.getElementById('mpStatus'); if(s) s.textContent='Conectado ao servidor'; }catch(e){}
      try{ if(heartbeat) clearInterval(heartbeat); heartbeat = setInterval(()=>{ try{ requestPing(); }catch(e){} }, 8000); }catch(e){}
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
      try{ var s=document.getElementById('mpStatus'); if(s) s.textContent='Desconectado. Reconectando…'; }catch(e){}
      try{ if(window.syncManager && typeof syncManager.getHistory==='function'){ const h = syncManager.getHistory(); h.push({ t: Date.now(), type:'disconnect', server: SERVER }); localStorage.setItem('mp_hist_'+(lastJoin && lastJoin.matchId || 'TESTE123'), JSON.stringify(h)); } }catch(e){}
      try{ if(heartbeat) clearInterval(heartbeat); heartbeat=null; }catch(e){}
      try{ retries++; }catch(e){}
      try{
        const host = location.hostname;
        if(!switchedToFallback && retries>=2 && !(/localhost|127\.0\.0\.1|\.local$/i.test(host))){
          const fallback = 'wss://mytragor-simulador-1.onrender.com';
          console.log('[wsClient] switching to fallback server', fallback);
          SERVER = fallback; switchedToFallback = true; retries = 0;
        }
      }catch(e){}
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
    if(msg.type === 'snapshot'){ lastServerSeq = Number(msg.serverSeq)||0; try{ console.log('[wsClient] snapshot seq=', lastServerSeq, 'leaders=', msg.snapshot && msg.snapshot.leaders); }catch(e){} try{ if(typeof window.appendLogLine==='function'){ var ls = (msg.snapshot && msg.snapshot.leaders)||{}; appendLogLine(`[MP] Snapshot recebido — p1:${ls.p1?'ok':'—'} p2:${ls.p2?'ok':'—'}`,'effect'); } }catch(e){} try{ 
        var names = msg.snapshot && msg.snapshot.playerNames; 
        if(names){ 
          var me = lastJoin && lastJoin.playerId; 
          if(me==='p1'){ window.PLAYER_NAME = names.p1 || window.PLAYER_NAME; window.OPPONENT_NAME = names.p2 || window.OPPONENT_NAME; }
          else if(me==='p2'){ window.PLAYER_NAME = names.p2 || window.PLAYER_NAME; window.OPPONENT_NAME = names.p1 || window.OPPONENT_NAME; }
          const top = document.querySelector('.sideTitle'); if(top) top.textContent = `Oponente — ${window.OPPONENT_NAME||''}`;
          const bottom = document.querySelector('.sideTitle.bottom'); if(bottom) bottom.textContent = `Você — ${window.PLAYER_NAME||''}`;
        }
      }catch(e){} try{ if(window.syncManager && syncManager.onSnapshot) syncManager.onSnapshot(msg.snapshot, lastServerSeq); }catch(e){} return; }
    if(msg.type === 'replay'){ var arr = Array.isArray(msg.actions)?msg.actions:[]; try{ console.log('[wsClient] replay from', msg.fromSeq, 'to', msg.toSeq, 'count=', arr.length); }catch(e){} arr.sort((a,b)=>a.serverSeq-b.serverSeq).forEach(function(r){ try{ if(window.syncManager && syncManager.onActionAccepted) syncManager.onActionAccepted(r); }catch(e){} }); lastServerSeq = Number(msg.toSeq)||lastServerSeq; return; }
    if(msg.type === 'actionAccepted'){ 
      // Ignorar ações duplicadas
      if(msg.actionId && seenActionIds.has(msg.actionId)) return;
      if(msg.actionId) seenActionIds.add(msg.actionId);
      
      if(typeof msg.serverSeq === 'number' && msg.serverSeq <= lastServerSeq) return; 
      lastServerSeq = Number(msg.serverSeq)||lastServerSeq; 
      try{ console.log('[wsClient] actionAccepted', { seq: msg.serverSeq, by: msg.by, type: msg.actionType, keys: Object.keys(msg.payload||{}) }); }catch(e){}
      try{ if(typeof window.appendLogLine==='function'){ appendLogLine(`[MP] Aceito ${msg.actionType} por ${msg.by} (seq ${msg.serverSeq})`,'effect'); } }catch(e){}
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
    if(msg.type === 'pong'){ try{ lastRTT = Math.max(0, Date.now() - (lastPingTs||Date.now())); var s=document.getElementById('mpStatus'); if(s){ var base=s.textContent||''; if(/Conectado/.test(base)) s.textContent = 'Conectado ao servidor (' + lastRTT + ' ms)'; } }catch(e){} return; }
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
    try{ 
      var usersRaw = localStorage.getItem('mt_users');
      var curRaw = localStorage.getItem('mt_current_user');
      var users = []; try{ users = usersRaw ? (JSON.parse(usersRaw)||[]) : []; }catch(e){ users = []; }
      var curEmail = null; var curName = null;
      if(curRaw){ try{ var obj = JSON.parse(curRaw); if(obj){ curEmail = obj.email||null; curName = obj.username||obj.name||obj.email||null; } }catch(e){ curEmail = curRaw; curName = curRaw; } }
      var found = null; if(curEmail && Array.isArray(users)){ found = users.find(u=> String(u.email||'')===String(curEmail)); }
      if(found){ playerName = String(found.username||found.name||found.email||''); }
      if(!playerName && curName){ playerName = String(curName); }
      if(!playerName) playerName = params.get('name') || (lastJoin.playerId.toUpperCase());
    }catch(e){}
    send({ type:'join', matchId: lastJoin.matchId, playerId: lastJoin.playerId, playerName: playerName, sinceSeq: lastJoin.sinceSeq }); 
  }
  function requestPing(){ try{ lastPingTs = Date.now(); }catch(e){} send({ type:'ping' }); }
  function sendAction(matchId, playerId, actionId, actionType, payload){ 
    const v = validateActionPayload(actionType, payload||{});
    if(!v.ok){ try{ console.warn('[wsClient] invalid payload', actionType, v.reason); if(typeof window.appendLogLine==='function') appendLogLine(`Falha ao enviar ${actionType}: ${v.reason}`,'effect'); }catch(e){} return; }
    const out = { type:'action', matchId:String(matchId), playerId:String(playerId), actionId:String(actionId), actionType:String(actionType), payload: v.payload||{} };
    try{ console.log('[wsClient] send', out.actionType, { keys:Object.keys(out.payload||{}), side: out.payload && out.payload.side }); }catch(e){}
    send(out);
  }
  function sendClientSnapshot(snapshot){
    try{
      if(!lastJoin || !lastJoin.matchId || !lastJoin.playerId) return;
      const out = { type:'clientSnapshot', matchId: String(lastJoin.matchId), playerId: String(lastJoin.playerId), snapshot: snapshot };
      send(out);
    }catch(e){}
  }
  try{ const _origSendAction = sendAction; window.wsClientSendActionDebug = function(m,p,id,t,pl){ console.log('[wsClient] sendAction', { matchId:m, playerId:p, actionId:id, type:t, keys:Object.keys(pl||{}) }); return _origSendAction(m,p,id,t,pl); }; }catch(e){}

  window.wsClient = { connect, join, requestPing, sendAction, sendClientSnapshot, getStatus: function(){ return { connected, server: SERVER, lastServerSeq }; } };
})();
