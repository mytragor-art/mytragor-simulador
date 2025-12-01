// mp_runtime.js - lógica dedicada de partida multiplayer isolada
(function(){
  if(!window.IS_MULTIPLAYER){ return; }
  function startMatchMp(){
    console.log('[MP] startMatchMp chamado – checando pré-condições');
    // Guard: só inicia se ambos escolheram e líderes existem
    try{
      if(window.syncManager){
        var chosen = window.syncManager.playerChosen || {p1:false,p2:false};
        var haveBothLeaders = !!(window.STATE && STATE.you && STATE.ai && STATE.you.leader && STATE.ai.leader);
        var bothChosen = !!(chosen.p1 && chosen.p2);
        if(!haveBothLeaders || !bothChosen){
          console.warn('[MP] bloqueado: haveBothLeaders=', haveBothLeaders, 'bothChosen=', bothChosen, 'playerChosen=', chosen);
          try{ if(typeof renderHUD==='function') renderHUD(); }catch(e){}
          return;
        }
      }
    }catch(e){ console.warn('[MP] guard error', e); }

    // Marca início somente depois de todas as pré-condições atendidas
    try{ window.__MATCH_STARTED = true; }catch(e){}

    // Seed RNG (host apenas) para consistência
    try{
      if(window.STATE && window.STATE.isHost && !window.__RNG_MATCH_SEEDED){
        if(window.RNG && typeof window.RNG.setSeed==='function'){
          const rand32 = (function(){ try{ return Math.floor(Math.random()*0xFFFFFFFF)>>>0; }catch(e){ return 0; } })();
          const hostSeed = ((Date.now()>>>0) ^ rand32) >>> 0;
          window.RNG.setSeed(hostSeed);
          window.__RNG_MATCH_SEEDED = true;
          console.log('[MP] Host RNG seeded:', hostSeed);
        }
      }
    }catch(e){ console.warn('[MP] seeding error', e); }

    // Render vazio para iniciar (apenas host coordena estado inicial)
    try{ if(window.STATE && window.STATE.isHost){ Game.renderEmptyBoard('p1'); Game.renderEmptyBoard('p2'); } }catch(e){ console.warn('[MP] renderEmptyBoard error', e); }

    // Build decks a partir de customDeck: somente host constrói e publica via snapshot
    try{
      if(window.STATE && window.STATE.isHost){
        buildDeck('you');
        buildDeck('ai');
      }
    }catch(e){ console.warn('[MP] buildDeck error', e); }

    // Embaralhar: somente host
    try{ if(window.STATE && window.STATE.isHost){ Game.shuffle('you'); Game.shuffle('ai'); } }catch(e){ console.warn('[MP] shuffle error', e); }

    // Mãos iniciais: somente host distribui e depois snapshot sincroniza nos clientes
    try{
      if(window.STATE && window.STATE.isHost){
        if(!STATE.you.hand) STATE.you.hand = [];
        if(!STATE.ai.hand) STATE.ai.hand = [];
        for(let i=0;i<5;i++){
          if(STATE.you.deck.length) STATE.you.hand.push(STATE.you.deck.pop());
          if(STATE.ai.deck.length) STATE.ai.hand.push(STATE.ai.deck.pop());
        }
        console.log('[MP] [HOST] Decks construídos. you.hand=', STATE.you.hand.length, 'ai.hand=', STATE.ai.hand.length);
      }
    }catch(e){ console.warn('[MP] draw hands error', e); }

    // Handshake/snapshot: delegar ao syncManager (host publica após START_MATCH)
    try{
      if(window.STATE && window.STATE.isHost && window.syncManager && typeof syncManager.publishInitialSnapshot==='function'){
        syncManager.publishInitialSnapshot();
        console.log('[MP] Host publicou snapshot inicial');
      }
    }catch(e){ console.warn('[MP] snapshot publish failed', e); }
  }
  // Expor substituindo startMatch anterior quando em MP
  try{ window.startMatch = startMatchMp; window.start = startMatchMp; }catch(e){ console.warn('[MP] expose startMatch failed', e); }
})();
