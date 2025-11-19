;(function(){
  const pending = new Map();
  let lastServerSeq = 0;
  let matchId = null;
  let playerId = null;
  let orig = {};
  let pendingById = {};

  function uuid(){ if(window.crypto && crypto.randomUUID) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16);}); }

  function setContext(opts){ matchId = String(opts.matchId||'TESTE123'); playerId = String(opts.playerId||'p1'); }

  function captureOriginals(){ if(typeof window.playFromHand==='function' && !orig.playFromHand) orig.playFromHand = window.playFromHand; if(typeof window.endTurn==='function' && !orig.endTurn) orig.endTurn = window.endTurn; }

  function applyLocal(actionType, payload){ 
    captureOriginals(); 
    // Capturar snapshot antes de aplicar para possível rollback
    const before = (window.Game && typeof Game.buildSnapshot === 'function') ? Game.buildSnapshot() : null;
    
    if(actionType==='PLAY_CARD' && orig.playFromHand){ 
      orig.playFromHand('you', payload.index); 
    } else if(actionType==='END_TURN' && orig.endTurn){ 
      orig.endTurn(); 
    }
    
    return before;
  }

  function applyRemote(actionType, payload){
    captureOriginals();
    try{ window.__APPLY_REMOTE = true;
      if(actionType==='PLAY_CARD' && orig.playFromHand){ orig.playFromHand('ai', payload.index); }
      else if(actionType==='END_TURN' && orig.endTurn){ orig.endTurn(); }
      else if(actionType==='SET_LEADER'){
        try{
          const mpSide = String(payload.side||'p1');
          const engineSide = (window.localSide === mpSide) ? 'you' : 'ai';
          const leader = payload.leader || {};
          if(window.STATE && window.STATE[engineSide]){
            window.STATE[engineSide].leader = { ...leader, kind:'leader', img: leader.img || (leader.key ? (window.CHOSEN_IMAGES && CHOSEN_IMAGES[leader.key]) : null) };
            renderSide(engineSide);
          }
        }catch(e){ console.warn('applyRemote SET_LEADER failed', e); }
      }
    } finally { window.__APPLY_REMOTE = false; }
  }

  function enqueueAndSend(actionType, payload){ 
    console.log('[syncManager] enqueueAndSend:', actionType, payload);
    const id = uuid(); 
    
    // Para ATTACK, END_TURN e START_MATCH, não aplicar otimisticamente
    if(actionType === 'ATTACK' || actionType === 'END_TURN' || actionType === 'START_MATCH') {
      pending.set(id, { actionType, payload, before: null }); 
      if(window.wsClient) wsClient.sendAction(matchId, playerId, id, actionType, payload); 
      return id; 
    }
    
    // Para outras ações, aplicar localmente e capturar snapshot para rollback
    const before = applyLocal(actionType, payload); 
    pending.set(id, { actionType, payload, before }); 
    if(window.wsClient) wsClient.sendAction(matchId, playerId, id, actionType, payload); 
    return id; 
  }

  function onActionAccepted(rec){ 
    try{ console.log('[MP] actionAccepted', rec); }catch(e){}
    if(typeof rec.serverSeq==='number' && rec.serverSeq <= lastServerSeq) return; 
    lastServerSeq = Number(rec.serverSeq)||lastServerSeq; 
    const id = String(rec.actionId||''); 
    
    if(pending.has(id)) {
      const pendingAction = pending.get(id);
      pending.delete(id); 
      
      // Para ATTACK, aplicar a resolução completa vinda do servidor
      if(pendingAction.actionType === 'ATTACK' && rec.actionType === 'ATTACK') {
        if(window.Game && typeof Game.applyResolvedAttack === 'function') {
          Game.applyResolvedAttack(rec.payload);
        }
        return;
      }
      // Para END_TURN, avançar turno pelo servidor
      if(pendingAction.actionType === 'END_TURN' && rec.actionType === 'END_TURN') {
        captureOriginals();
        try{ window.__APPLY_REMOTE = true; if(typeof orig.endTurn==='function') orig.endTurn(); } finally { window.__APPLY_REMOTE = false; }
        if(typeof window.beginTurn==='function') { try{ beginTurn(); }catch(e){} }
        return;
      }
      // Para START_MATCH, iniciar partida sincronizada
      if(pendingAction.actionType === 'START_MATCH' && rec.actionType === 'START_MATCH') {
        try{ if(typeof window.startMatch==='function') window.startMatch(); }catch(e){}
        return;
      }
      
      return; 
    } 
    
    // Ação de outro jogador - aplicar remotamente
    if(rec.actionType === 'ATTACK') {
      if(window.Game && typeof Game.applyResolvedAttack === 'function') {
        Game.applyResolvedAttack(rec.payload);
      }
    } else {
      if(rec.actionType === 'END_TURN'){
        captureOriginals();
        try{ window.__APPLY_REMOTE = true; if(typeof orig.endTurn==='function') orig.endTurn(); } finally { window.__APPLY_REMOTE = false; }
        if(typeof window.beginTurn==='function') { try{ beginTurn(); }catch(e){} }
      } else if(rec.actionType === 'START_MATCH'){
        try{ if(typeof window.startMatch==='function') window.startMatch(); }catch(e){}
      } else {
        applyRemote(rec.actionType, rec.payload||{}); 
      }
    }
  }

  function onActionRejected(id, reason){ 
    const idStr = String(id);
    if(pending.has(idStr)) {
      const pendingAction = pending.get(idStr);
      pending.delete(idStr); 
      
      // Fazer rollback para ações que foram aplicadas localmente
      if(pendingAction.before && window.Game && typeof Game.applySnapshot === 'function') {
        console.log('[syncManager] Rolling back action:', pendingAction.actionType, reason);
        Game.applySnapshot(pendingAction.before);
      }
    }
  }

  function onSnapshot(snap, seq){ lastServerSeq = Number(seq)||0; pending.clear(); }

  window.syncManager = { setContext, enqueueAndSend, onActionAccepted, onActionRejected, onSnapshot, getStatus: function(){ return { lastServerSeq, pending: Array.from(pending.keys()) }; } };
})();
