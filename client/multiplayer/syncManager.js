;(function(){
  const pending = new Map();
  let lastServerSeq = 0;
  let matchId = null;
  let playerId = null;
  let orig = {};
  let pendingById = {};
  let history = [];
  let storageKeyBase = 'mp_choice_';

  function uuid(){ if(window.crypto && crypto.randomUUID) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16);}); }

  function setContext(opts){ 
    matchId = String(opts.matchId||'TESTE123'); 
    playerId = String(opts.playerId||'p1'); 
    try{ restoreChoices(); }catch(e){}
  }

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
          const cards = Array.isArray(payload.cards) ? payload.cards.slice() : null;
          const fragImg = payload.fragImg || null;
          function ensureFiliacao(obj){ try{ if(!obj) return obj; if(obj.filiacao) return obj; const k = obj.key || obj.name; if(k && Array.isArray(window.CARD_DEFS)){ const def = window.CARD_DEFS.find(d=> (d.key && d.key===k) || (d.name && d.name===k)); if(def && def.filiacao) obj.filiacao = def.filiacao; } return obj; }catch(e){ return obj; } }
          if(window.STATE){
            if(!window.STATE[engineSide]){
              window.STATE[engineSide] = { allies:[null,null,null,null,null], spells:[null,null,null,null,null], deck:[], hand:[], grave:[], ban:[] };
            }
            if(window.STATE && window.STATE[engineSide]){
              const withAff = ensureFiliacao(Object.assign({}, leader));
              window.STATE[engineSide].leader = { ...withAff, kind:'leader', img: withAff.img || (withAff.key ? (window.CHOSEN_IMAGES && CHOSEN_IMAGES[withAff.key]) : null) };
              if(cards) window.STATE[engineSide].customDeck = cards;
              if(fragImg) window.STATE[engineSide].fragImg = fragImg;
              try{ persistChoice(engineSide); }catch(e){}
            try{ renderSide(engineSide); }catch(e){}
            try{ if(typeof updateArenaTheme==='function') updateArenaTheme(); }catch(e){}
            try{ if(typeof updateEnvArenaBackgrounds==='function') updateEnvArenaBackgrounds(); }catch(e){}
            try{ if(typeof renderFrags==='function'){ renderFrags('you'); renderFrags('ai'); } }catch(e){}
            try{ if(typeof window.render==='function') render(); }catch(e){}
            try{ console.log('[syncManager] leaders now', { you: !!(window.STATE && STATE.you && STATE.you.leader), ai: !!(window.STATE && STATE.ai && STATE.ai.leader) }); }catch(e){}
            try{
              var slot = document.querySelector('#'+engineSide+'-leader');
              if(slot && slot.children && slot.children.length===0 && window.STATE[engineSide].leader){
                slot.appendChild(cardEl(window.STATE[engineSide].leader,{}));
              }
            }catch(e){}
              try{ if(typeof window.tryStart==='function') tryStart(); }catch(e){}
              try{ if(typeof window.appendLogLine==='function'){ var who = (engineSide==='you'?'Você':'Oponente'); var name = (leader&& (leader.name||leader.key)) || ''; appendLogLine(`${who} definiu líder: ${name}`,'effect'); } }catch(e){}
              try{ pushHistory({ t: Date.now(), type:'SET_LEADER', by: payload.side||'', side: engineSide, leader: withAff }); }catch(e){}
            }
          }
        }catch(e){ console.warn('applyRemote SET_LEADER failed', e); }
      }
    } finally { window.__APPLY_REMOTE = false; }
  }

  function enqueueAndSend(actionType, payload){ 
    console.log('[syncManager] enqueueAndSend:', actionType, payload);
    const id = uuid(); 

    if(actionType === 'SET_LEADER'){
      try{
        const side = String((window.localSide||playerId||'p1'));
        const leader = (payload && payload.leader) || (window.STATE && STATE.you && STATE.you.leader) || null;
        const cards  = (payload && payload.cards) || (window.STATE && STATE.you && STATE.you.customDeck) || null;
        const fragImg= (payload && payload.fragImg) || (window.STATE && STATE.you && STATE.you.fragImg) || null;
        payload = { side, leader, cards: Array.isArray(cards)? cards.slice() : null, fragImg: (typeof fragImg==='string'&&fragImg)? String(fragImg) : null };
      }catch(e){ console.warn('[syncManager] normalize SET_LEADER failed', e); }
    }
    
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
    try{ pushHistory({ t: Date.now(), type: String(rec.actionType||''), by: String(rec.playerId||''), serverSeq: Number(rec.serverSeq||0), payload: rec.payload||{} }); }catch(e){}
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
        try{ if(typeof window.appendLogLine==='function'){ var rp=rec.payload||{}; var tgt=rp.target||{}; window.appendLogLine(`Ataque aceito: ${rp.fromSide} contra ${tgt.type||''}/${tgt.side||''} — dano ${rp.damage||0}`,'effect'); } }catch(e){}
        return;
      }
      // Para END_TURN, avançar turno pelo servidor
      if(pendingAction.actionType === 'END_TURN' && rec.actionType === 'END_TURN') {
        captureOriginals();
        try{ window.__APPLY_REMOTE = true; if(typeof orig.endTurn==='function') orig.endTurn(); } finally { window.__APPLY_REMOTE = false; }
        if(typeof window.beginTurn==='function') { try{ beginTurn(); }catch(e){} }
        try{ if(typeof window.appendLogLine==='function') window.appendLogLine(`Turno encerrado por ${rec.playerId||''}`,'effect'); }catch(e){}
        return;
      }
      // Para START_MATCH, iniciar partida sincronizada
      if(pendingAction.actionType === 'START_MATCH' && rec.actionType === 'START_MATCH') {
        try{ if(typeof window.startMatch==='function') window.startMatch(); }catch(e){}
        try{ if(typeof window.appendLogLine==='function') window.appendLogLine('Partida iniciada (autoritativa)','effect'); }catch(e){}
        return;
      }
      
      return; 
    } 
    
    // Ação de outro jogador - aplicar remotamente
    if(rec.actionType === 'ATTACK') {
      if(window.Game && typeof Game.applyResolvedAttack === 'function') {
        Game.applyResolvedAttack(rec.payload);
      }
      try{ if(typeof window.appendLogLine==='function'){ var rp=rec.payload||{}; var tgt=rp.target||{}; window.appendLogLine(`Oponente atacou: ${rp.fromSide} contra ${tgt.type||''}/${tgt.side||''} — dano ${rp.damage||0}`,'effect'); } }catch(e){}
    } else {
      if(rec.actionType === 'END_TURN'){
        captureOriginals();
        try{ window.__APPLY_REMOTE = true; if(typeof orig.endTurn==='function') orig.endTurn(); } finally { window.__APPLY_REMOTE = false; }
        if(typeof window.beginTurn==='function') { try{ beginTurn(); }catch(e){} }
        try{ if(typeof window.appendLogLine==='function') window.appendLogLine(`Oponente encerrou turno`,'effect'); }catch(e){}
      } else if(rec.actionType === 'START_MATCH'){
        try{ if(typeof window.startMatch==='function') window.startMatch(); }catch(e){}
        try{ if(typeof window.appendLogLine==='function') window.appendLogLine('Partida iniciada (autoridade do servidor)','effect'); }catch(e){}
      } else {
        applyRemote(rec.actionType, rec.payload||{}); 
        try{ if(typeof renderSide==='function'){ renderSide('you'); renderSide('ai'); } }catch(e){}
        try{ if(typeof window.render==='function') render(); }catch(e){}
        try{ if(typeof window.appendLogLine==='function') window.appendLogLine(`Ação remota aplicada: ${rec.actionType}`,'effect'); }catch(e){}
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
      try{ if(typeof window.appendLogLine==='function') window.appendLogLine(`Ação rejeitada: ${pendingAction.actionType} — ${reason||''}`,'effect'); }catch(e){}
    }
  }

  function onSnapshot(snap, seq){ 
    try{
      lastServerSeq = Number(seq)||0; pending.clear();
      if(!window.STATE){ window.STATE = { you:{ allies:[null,null,null,null,null], spells:[null,null,null,null,null], deck:[], hand:[], grave:[], ban:[] }, ai:{ allies:[null,null,null,null,null], spells:[null,null,null,null,null], deck:[], hand:[], grave:[], ban:[] } }; }
      if(snap && snap.leaders){
        const mpYou = String(window.localSide||'p1');
        const l1 = snap.leaders.p1 || null; const l2 = snap.leaders.p2 || null;
        if(l1){ const es = (mpYou==='p1')?'you':'ai'; window.STATE[es] = window.STATE[es]||{ allies:[null,null,null,null,null], spells:[null,null,null,null,null], deck:[], hand:[], grave:[], ban:[] }; window.STATE[es].leader = { ...l1, kind:'leader', img: l1.img || (l1.key ? (window.CHOSEN_IMAGES && CHOSEN_IMAGES[l1.key]) : null) }; }
        if(l2){ const es = (mpYou==='p2')?'you':'ai'; window.STATE[es] = window.STATE[es]||{ allies:[null,null,null,null,null], spells:[null,null,null,null,null], deck:[], hand:[], grave:[], ban:[] }; window.STATE[es].leader = { ...l2, kind:'leader', img: l2.img || (l2.key ? (window.CHOSEN_IMAGES && CHOSEN_IMAGES[l2.key]) : null) }; }
        try{ persistChoice('you'); persistChoice('ai'); }catch(e){}
        try{ if(typeof renderSide==='function'){ renderSide('you'); renderSide('ai'); } }catch(e){}
        try{ if(typeof window.render==='function') render(); }catch(e){}
      }
      else { try{ restoreChoices(); if(typeof window.render==='function') render(); }catch(e){} }
    }catch(e){ console.warn('[syncManager] onSnapshot error', e); }
  }

  function persistChoice(side){ try{
    if(!window.STATE || !matchId) return;
    const dat = {
      leader: window.STATE[side] && window.STATE[side].leader ? { key: window.STATE[side].leader.key, name: window.STATE[side].leader.name, img: window.STATE[side].leader.img, filiacao: window.STATE[side].leader.filiacao } : null,
      fragImg: window.STATE[side] && window.STATE[side].fragImg || null,
      cards: window.STATE[side] && Array.isArray(window.STATE[side].customDeck) ? window.STATE[side].customDeck.slice() : null
    };
    localStorage.setItem(storageKeyBase + matchId + '_' + side, JSON.stringify(dat));
  }catch(e){} }

  function restoreChoices(){ try{
    if(!matchId) return;
    ['you','ai'].forEach(function(side){
      const raw = localStorage.getItem(storageKeyBase + matchId + '_' + side);
      if(!raw) return;
      try{
        const dat = JSON.parse(raw);
        if(!window.STATE) window.STATE = { you:{}, ai:{} };
        if(!window.STATE[side]) window.STATE[side] = { allies:[null,null,null,null,null], spells:[null,null,null,null,null], deck:[], hand:[], grave:[], ban:[] };
        if(dat.leader && !window.STATE[side].leader){ window.STATE[side].leader = { kind:'leader', key: dat.leader.key, name: dat.leader.name, img: dat.leader.img, filiacao: dat.leader.filiacao }; }
        if(dat.cards && !window.STATE[side].customDeck){ window.STATE[side].customDeck = dat.cards.slice(); }
        if(dat.fragImg && !window.STATE[side].fragImg){ window.STATE[side].fragImg = dat.fragImg; }
      }catch(e){}
    });
  }catch(e){} }

  function pushHistory(entry){ try{
    history.push(entry);
    if(history.length>500) history.shift();
    if(matchId) localStorage.setItem('mp_hist_'+matchId, JSON.stringify(history));
  }catch(e){} }

  window.syncManager = { setContext, enqueueAndSend, onActionAccepted, onActionRejected, onSnapshot, getStatus: function(){ return { lastServerSeq, pending: Array.from(pending.keys()) }; }, getHistory: function(){ return history.slice(); } };
})();
