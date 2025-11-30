// mp_runtime.js - lógica dedicada de partida multiplayer isolada
(function(){
  if(!window.IS_MULTIPLAYER){ return; }
  function startMatchMp(){
    console.log('[MP] startMatchMp chamado – aguardando pré-condições');
    try{ window.__MATCH_STARTED = true; }catch(e){}
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

    // Render vazio para iniciar
    try{ Game.renderEmptyBoard('p1'); Game.renderEmptyBoard('p2'); }catch(e){ console.warn('[MP] renderEmptyBoard error', e); }

    // Build decks a partir de customDeck (já definidos ao escolher líder)
    try{ buildDeck('you'); buildDeck('ai'); }catch(e){ console.warn('[MP] buildDeck error', e); }

    // Embaralhar
    try{ Game.shuffle('you'); Game.shuffle('ai'); }catch(e){ console.warn('[MP] shuffle error', e); }

    // Mãos iniciais (5 cartas cada) – local, serão refletidas via snapshot posterior
    try{
      if(!STATE.you.hand) STATE.you.hand = [];
      if(!STATE.ai.hand) STATE.ai.hand = [];
      for(let i=0;i<5;i++){
        if(STATE.you.deck.length) STATE.you.hand.push(STATE.you.deck.pop());
        if(STATE.ai.deck.length) STATE.ai.hand.push(STATE.ai.deck.pop());
      }
      console.log('[MP] Decks construídos. you.hand=', STATE.you.hand.length, 'ai.hand=', STATE.ai.hand.length);
    }catch(e){ console.warn('[MP] draw hands error', e); }

    // Handshake de início
    try{
      if(window.NetPeer && typeof window.NetPeer.sendStart==='function'){
        const ls = (window.MY_SIDE==='p1'?'you':'ai');
        const spec = (STATE[ls] && STATE[ls].customDeck) ? STATE[ls].customDeck : (typeof getDeckFor==='function'?getDeckFor(window.MY_SIDE):null);
        window.NetPeer.sendStart(spec);
        console.log('[MP] Start handshake enviado');
      }
    }catch(e){ console.warn('[MP] sendStart failed', e); }
  }
  // Expor substituindo startMatch anterior quando em MP
  try{ window.startMatch = startMatchMp; window.start = startMatchMp; }catch(e){ console.warn('[MP] expose startMatch failed', e); }
})();
