;(function(){
  const pending = new Map();
  let lastServerSeq = 0;
  let matchId = null;
  let playerId = null;
  let orig = {};
  let pendingById = {};
  let history = [];
  let storageKeyBase = 'mp_choice_';
  let playerChosen = { p1: false, p2: false }; // Unifica playerChosen
  let lastSnapshotSent = 0; // Rastrear última vez que enviou snapshot

  function syncPlayerChosen(){
    try{
      if(!window.STATE){
        window.STATE = {
          you: { allies: [null, null, null, null, null], spells: [null, null, null, null, null], deck: [], hand: [], grave: [], ban: [] },
          ai: { allies: [null, null, null, null, null], spells: [null, null, null, null, null], deck: [], hand: [], grave: [], ban: [] },
          playerChosen: playerChosen // Aponta diretamente para playerChosen
        };
      }
      window.STATE.playerChosen = playerChosen; // Sincroniza referência
      console.log('[syncManager] syncPlayerChosen updated STATE.playerChosen to', window.STATE.playerChosen);
    }catch(e){ console.warn('[syncManager] syncPlayerChosen error', e); }
  }

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
    try{
      window.__APPLY_REMOTE = true;
      if(actionType === 'SET_LEADER'){
        try{
          const side = payload.side || 'p1';
          playerChosen[side] = true; // Atualiza diretamente playerChosen
          syncPlayerChosen();
          console.log('[syncManager] SET_LEADER applyRemote, playerChosen =', playerChosen);
        }catch(e){ console.warn('[syncManager] Failed to apply SET_LEADER', e); }
      }
    } finally {
      window.__APPLY_REMOTE = false;
    }
  }

  function enqueueAndSend(actionType, payload){ 
    console.log('[syncManager] enqueueAndSend:', actionType, payload);
    const id = uuid(); 

    // Bloqueio extra para START_MATCH: exigir líderes e decks prontos em ambos os lados
    if(actionType === 'START_MATCH'){
      try{
        const isHost = !!(window.STATE && window.STATE.isHost);
        if(!isHost){
          console.warn('[syncManager] START_MATCH bloqueado (não é host)');
          try{ if(typeof window.appendLogLine==='function') appendLogLine('Aguardando host iniciar a partida…','effect'); }catch(e){}
          return null;
        }
        const leadersReady = !!(window.STATE && STATE.you && STATE.ai && STATE.you.leader && STATE.ai.leader);
        const youDeckOk = !!(STATE && STATE.you && Array.isArray(STATE.you.customDeck) && STATE.you.customDeck.length>0);
        const aiDeckOk  = !!(STATE && STATE.ai && Array.isArray(STATE.ai.customDeck) && STATE.ai.customDeck.length>0);
        if(!(leadersReady && youDeckOk && aiDeckOk)){
          console.warn('[syncManager] START_MATCH bloqueado: leadersReady=', leadersReady, 'youDeckOk=', youDeckOk, 'aiDeckOk=', aiDeckOk);
          try{ if(typeof window.appendLogLine==='function') appendLogLine('Aguardando ambos: líder e deck prontos para iniciar.','effect'); }catch(e){}
          // Atualiza status na UI se disponível
          try{ var s=document.getElementById('mpStatus'); if(s) s.textContent='Aguardando baralhos/líderes…'; }catch(e){}
          return null;
        }
      }catch(e){ console.warn('[syncManager] START_MATCH guard error', e); }
    }

    if(actionType === 'SET_LEADER'){
      try{
        const side = String((window.localSide||playerId||'p1'));
        const leader = (payload && payload.leader) || (window.STATE && STATE.you && STATE.you.leader) || null;
        const cards  = (payload && payload.cards) || (window.STATE && STATE.you && STATE.you.customDeck) || null;
        const fragImg= (payload && payload.fragImg) || (window.STATE && STATE.you && STATE.you.fragImg) || null;
        payload = { side, leader, cards: Array.isArray(cards)? cards.slice() : null, fragImg: (typeof fragImg==='string'&&fragImg)? String(fragImg) : null };
        try{ persistChoice('you'); pushHistory({ t: Date.now(), type:'SET_LEADER(send)', by: side, side:'you', leader }); }catch(e){}
        // Mark this player as having explicitly chosen
        playerChosen[side] = true;
        syncPlayerChosen();
        console.log('[MP] SET_LEADER enqueued locally, playerChosen =', playerChosen, 'STATE.playerChosen =', window.STATE && window.STATE.playerChosen);
      }catch(e){ console.warn('[syncManager] normalize SET_LEADER failed', e); }
    }
    
    // Para ATTACK, END_TURN e START_MATCH, não aplicar otimisticamente
    if(actionType === 'ATTACK' || actionType === 'END_TURN' || actionType === 'START_MATCH') {
      pending.set(id, { actionType, payload, before: null }); 
      if(window.wsClient) wsClient.sendAction(matchId, playerId, id, actionType, payload); 
      return id; 
    }
    
    // Para outras ações, aplicar localmente e capturar snapshot para rollback
    // const before = applyLocal(actionType, payload); 
    // pending.set(id, { actionType, payload, before }); 
    
    // Modelo não-otimista: sempre aguardar servidor
    pending.set(id, { actionType, payload, before: null }); 
    if(window.wsClient) wsClient.sendAction(matchId, playerId, id, actionType, payload); 
    return id; 
  }

  function applyRemoteAction(rec){
    captureOriginals();
    const { actionType, payload, playerId: senderId } = rec;
    const me = String(playerId || 'p1');
    const localSide = (String(senderId) === me) ? 'you' : 'ai';

    console.log(`[syncManager] Applying remote action ${actionType} for local side: ${localSide}`);

    try {
      window.__APPLY_REMOTE = true;
      if (actionType === 'PLAY_CARD') {
        if (typeof orig.playFromHand === 'function') {
          orig.playFromHand(localSide, payload.index);
        }
      } else if (actionType === 'END_TURN') {
        // Aplicar alternância de turno sempre em ambos os lados
        if (typeof orig.endTurn === 'function') {
          orig.endTurn();
        }
        // Autoridade: apenas o HOST roda o início de turno (pool/maxPool/draw)
        // O cliente aguarda o snapshot do host para refletir os fragmentos.
        if (window.STATE && window.STATE.isHost && typeof window.beginTurn === 'function') {
          try { beginTurn(); } catch(e) {}
          // Publicar snapshot após atualizar estado de turno para refletir fragments em todos os clientes
          try { if (typeof window.syncManager?.publishSnapshot === 'function') window.syncManager.publishSnapshot(); } catch(e) {}
        }
      } else if (actionType === 'ATTACK') {
        if (window.Game && typeof Game.applyResolvedAttack === 'function') {
          Game.applyResolvedAttack(payload);
        }
      } else if (actionType === 'START_MATCH') {
        if (typeof window.startMatch === 'function') {
          window.startMatch();
        }
      }
    } finally {
      window.__APPLY_REMOTE = false;
    }

    // Forçar renderização para garantir que a UI reflita o novo estado
    try {
      if (typeof window.render === 'function') {
        render();
        console.log('[syncManager] Render triggered after remote action.');
      }
    } catch(e) {
      console.warn('[syncManager] Render after remote action failed', e);
    }
  }

  function onActionAccepted(rec){ 
    try{ console.log('[MP] actionAccepted', rec); }catch(e){}
    try{ pushHistory({ t: Date.now(), type: String(rec.actionType||''), by: String(rec.playerId||''), serverSeq: Number(rec.serverSeq||0), payload: rec.payload||{} }); }catch(e){}
    if(typeof rec.serverSeq==='number' && rec.serverSeq <= lastServerSeq) return; 
    lastServerSeq = Number(rec.serverSeq)||lastServerSeq; 
    const id = String(rec.actionId||''); 
    
    // Se a ação estava pendente (era nossa), apenas a removemos da fila.
    // A aplicação real acontece abaixo, tratando-a como qualquer outra ação vinda do servidor.
    if(pending.has(id)) {
      pending.delete(id); 
    } 
    
    // Tratar todas as ações de jogo validadas da mesma forma, aplicando-as remotamente.
    const gameActions = ['PLAY_CARD', 'ATTACK', 'END_TURN', 'START_MATCH'];
    if (gameActions.includes(rec.actionType)) {
      applyRemoteAction(rec);
      return;
    }

    // Tratamento especial para ações que não são de jogo (como SET_LEADER)
    if(rec.actionType === 'SET_LEADER') {
      try{
        const side = rec.payload && rec.payload.side ? String(rec.payload.side) : null;
        if(side && (side === 'p1' || side === 'p2')) {
          playerChosen[side] = true;
          syncPlayerChosen();
          console.log('[syncManager] SET_LEADER remoto de', side, ', playerChosen agora =', playerChosen, 'STATE.playerChosen =', window.STATE && window.STATE.playerChosen);
        }
      }catch(e){ console.warn('[syncManager] Erro ao processar SET_LEADER remoto', e); }
      return;
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

  function reconcilePendingWithReplay(replayActions) {
    try {
      if (!Array.isArray(replayActions)) return;
      replayActions.forEach((action) => {
        const actionId = String(action.actionId || '');
        if (pending.has(actionId)) {
          console.log(`[syncManager] Reconciling pending action: ${actionId}`);
          pending.delete(actionId);
        }
      });
      console.log(`[syncManager] Pending actions after replay reconciliation:`, Array.from(pending.keys()));
    } catch (e) {
      console.warn('[syncManager] Error during pending reconciliation:', e);
    }
  }

  // Modify onSnapshot to call reconcilePendingWithReplay
  function onSnapshot(snap, seq, replayActions) {
    try {
      lastServerSeq = Number(seq) || 0;
      // pending.clear(); // Disabled to avoid dropping optimistic actions
      reconcilePendingWithReplay(replayActions);
      if (!window.STATE) {
        window.STATE = {
          you: { allies: [null, null, null, null, null], spells: [null, null, null, null, null], deck: [], hand: [], grave: [], ban: [] },
          ai: { allies: [null, null, null, null, null], spells: [null, null, null, null, null], deck: [], hand: [], grave: [], ban: [] },
          playerChosen: { p1: false, p2: false },
        };
      }
      if (!window.STATE.playerChosen) {
        window.STATE.playerChosen = { ...playerChosen };
      }
      if (snap && (snap.p1 || snap.p2)) {
        try {
          if (window.Game && typeof Game.applySnapshot === 'function') {
            Game.applySnapshot(snap, { remote: true });
          }
        } catch (e) {}
        try {
          if (typeof window.render === 'function') render();
        } catch (e) {}
        return;
      }
      if (snap && snap.leaders) {
        const mpYou = String(window.localSide || 'p1');
        const l1 = snap.leaders.p1 || null;
        const l2 = snap.leaders.p2 || null;
        if (l1) {
          const es = mpYou === 'p1' ? 'you' : 'ai';
          window.STATE[es] =
            window.STATE[es] || {
              allies: [null, null, null, null, null],
              spells: [null, null, null, null, null],
              deck: [],
              hand: [],
              grave: [],
              ban: [],
            };
          var k1 = l1.key || l1.name;
          var def1 =
            Array.isArray(window.CARD_DEFS)
              ? window.CARD_DEFS.find(
                  (d) => (d.key && d.key === k1) || (d.name && d.name === k1)
                )
              : null;
          var L1 = Object.assign({}, l1);
          if (def1) {
            if (L1.filiacao == null && def1.filiacao != null)
              L1.filiacao = def1.filiacao;
            if (L1.ac == null && def1.ac != null) L1.ac = def1.ac;
            if (L1.hp == null && def1.hp != null) {
              L1.hp = def1.hp;
              L1.maxHp = def1.maxHp != null ? def1.maxHp : def1.hp;
            }
            if (L1.damage == null && def1.damage != null) L1.damage = def1.damage;
            if (L1.atkBonus == null && def1.atkBonus != null)
              L1.atkBonus = def1.atkBonus;
          }
          window.STATE[es].leader = {
            ...L1,
            kind: 'leader',
            img:
              L1.img ||
              (L1.key
                ? window.CHOSEN_IMAGES && CHOSEN_IMAGES[L1.key]
                : null),
          };
          try {
            persistChoice(es);
          } catch (e) {}
        }
        if (l2) {
          const es = mpYou === 'p2' ? 'you' : 'ai';
          window.STATE[es] =
            window.STATE[es] || {
              allies: [null, null, null, null, null],
              spells: [null, null, null, null, null],
              deck: [],
              hand: [],
              grave: [],
              ban: [],
            };
          var k2 = l2.key || l2.name;
          var def2 =
            Array.isArray(window.CARD_DEFS)
              ? window.CARD_DEFS.find(
                  (d) => (d.key && d.key === k2) || (d.name && d.name === k2)
                )
              : null;
          var L2 = Object.assign({}, l2);
          if (def2) {
            if (L2.filiacao == null && def2.filiacao != null)
              L2.filiacao = def2.filiacao;
            if (L2.ac == null && def2.ac != null) L2.ac = def2.ac;
            if (L2.hp == null && def2.hp != null) {
              L2.hp = def2.hp;
              L2.maxHp = def2.maxHp != null ? def2.maxHp : def2.hp;
            }
            if (L2.damage == null && def2.damage != null) L2.damage = def2.damage;
            if (L2.atkBonus == null && def2.atkBonus != null)
              L2.atkBonus = def2.atkBonus;
          }
          window.STATE[es].leader = {
            ...L2,
            kind: 'leader',
            img:
              L2.img ||
              (L2.key
                ? window.CHOSEN_IMAGES && CHOSEN_IMAGES[L2.key]
                : null),
          };
          try {
            persistChoice(es);
          } catch (e) {}
        }
        try {
          if (typeof renderSide === 'function') {
            renderSide('you');
            renderSide('ai');
          }
        } catch (e) {}
        try {
          if (typeof window.render === 'function') render();
        } catch (e) {}
      } else {
        try {
          restoreChoices();
          if (typeof window.render === 'function') render();
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[syncManager] onSnapshot error', e);
    }
  }

  function persistChoice(side){ try{
    if(!window.STATE || !matchId) return;
    const key = storageKeyBase + matchId + '_' + side;
    let prev = null; try{ const raw=localStorage.getItem(key); if(raw) prev=JSON.parse(raw); }catch(e){}
    const dat = {
      leader: window.STATE[side] && window.STATE[side].leader ? { key: window.STATE[side].leader.key, name: window.STATE[side].leader.name, img: window.STATE[side].leader.img, filiacao: window.STATE[side].leader.filiacao } : (prev ? prev.leader || null : null),
      fragImg: (window.STATE[side] && window.STATE[side].fragImg) || (prev ? prev.fragImg || null : null),
      cards: (window.STATE[side] && Array.isArray(window.STATE[side].customDeck) ? window.STATE[side].customDeck.slice() : (prev && Array.isArray(prev.cards) ? prev.cards.slice() : null))
    };
    localStorage.setItem(key, JSON.stringify(dat));
  }catch(e){} }

  function persistAll(){ try{ persistChoice('you'); persistChoice('ai'); }catch(e){} }

  function restoreChoices(){ try{
    if(!matchId) return;
    // Only restore 'you' side — 'ai' side comes from remote player via SET_LEADER
    const raw = localStorage.getItem(storageKeyBase + matchId + '_you');
    if(!raw) return;
    try{
      const dat = JSON.parse(raw);
      if(!window.STATE) window.STATE = { you:{}, ai:{} };
      if(!window.STATE.you) window.STATE.you = { allies:[null,null,null,null,null], spells:[null,null,null,null,null], deck:[], hand:[], grave:[], ban:[] };
      if(dat.leader && !window.STATE.you.leader){ window.STATE.you.leader = { kind:'leader', key: dat.leader.key, name: dat.leader.name, img: dat.leader.img, filiacao: dat.leader.filiacao }; }
      if(dat.cards && !window.STATE.you.customDeck){ window.STATE.you.customDeck = dat.cards.slice(); }
      if(dat.fragImg && !window.STATE.you.fragImg){ window.STATE.you.fragImg = dat.fragImg; }
    }catch(e){}
  }catch(e){} }

  function pushHistory(entry){ try{
    history.push(entry);
    if(history.length>500) history.shift();
    if(matchId) localStorage.setItem('mp_hist_'+matchId, JSON.stringify(history));
  }catch(e){} }

  function publishSnapshot(){
    // Apenas host publica snapshots
    if(!window.STATE || !window.STATE.isHost) return;
    // Throttle: publicar no máximo a cada 200ms
    const now = Date.now();
    if(now - lastSnapshotSent < 200) return;
    lastSnapshotSent = now;
    try{
      if(window.Game && typeof Game.buildSnapshot === 'function' && window.wsClient && typeof wsClient.sendClientSnapshot === 'function'){
        const snap = Game.buildSnapshot();
        wsClient.sendClientSnapshot(snap);
        console.log('[syncManager] Host published snapshot, seq =', lastServerSeq);
      }
    }catch(e){
      console.warn('[syncManager] Error publishing snapshot:', e);
    }
  }

  window.syncManager = { setContext, enqueueAndSend, onActionAccepted, onActionRejected, onSnapshot, publishSnapshot, getStatus: function(){ return { lastServerSeq, pending: Array.from(pending.keys()) }; }, getHistory: function(){ return history.slice(); }, persistChoice, persistAll, restoreChoices, syncPlayerChosen, playerChosen };
})();
