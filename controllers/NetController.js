(function(){
  function NetController(side,opts){
    this.side=side; this.ws=null; this.room=opts.room; this.url=opts.serverURL; this._orig=null;
  }
  NetController.prototype.onAttach=function(){
    // include room in the URL so the relay assigns the socket to the correct room
    const wsURL = this.url + (this.url.includes('?') ? '&' : '?') + 'room=' + encodeURIComponent(this.room);
    this.ws=new WebSocket(wsURL);
    this.ws.addEventListener('open',()=>{
      try{ this.ws.send(JSON.stringify({type:'join',room:this.room,side:this.side})); }catch(e){}
      // announce readiness after a short delay so the host can send an initial state
      try{ setTimeout(()=>{ this.ws.send(JSON.stringify({type:'ready',room:this.room,from:this.side})); }, 120); }catch(e){}
    });
    this.ws.addEventListener('message',(ev)=>{
      let m=null;
      try{ m = JSON.parse(ev.data); }catch(e){ return; }
      // server broadcasts 'action' objects and 'state-apply' when a host sends state-sync
      if(m.type === 'action'){
        const act = m.payload || m.action || null; if(!act) return; act._remote = true; try{ Dispatcher.apply(act); }catch(e){ console.warn('apply remote action failed', e); }
        return;
      }
      // when peer signals ready, host (p1) publishes an authoritative snapshot
      if(m.type === 'ready'){
        if(this.side === 'p1' && window.Game && typeof Game.buildSnapshot === 'function'){
          try{ const snap = Game.buildSnapshot(); this.sendSync(snap); }catch(e){ console.warn('send initial snapshot failed', e); }
        }
        return;
      }
      // seed synchronization (optional early RNG alignment)
      if(m.type === 'seed' && m.payload && window.RNG && typeof window.RNG.setSeed === 'function'){
        try{ window.RNG.setSeed(m.payload); }catch(e){}
        return;
      }
      // accept both legacy 'state-apply' and newer 'state-sync'
      if((m.type === 'state-apply' || m.type === 'state-sync') && Game.loadSnapshot){
        try{ Game.loadSnapshot(m.state || m.payload || m); }catch(e){ console.warn('Game.loadSnapshot failed', e); }
        return;
      }
      // optional: respond to server pings/hellos if needed
    });
    const orig=Dispatcher.apply.bind(Dispatcher); this._orig=orig;
    Dispatcher.apply=(action)=>{
      try{
        const isLocal = !action._remote;
        if(isLocal && this.ws && this.ws.readyState===1){
          this.ws.send(JSON.stringify({type:'action',room:this.room,payload:action}));
        }
      }catch(e){ /* ignore send errors */ }
      const ret = orig(action);
      try{
        if(isLocal && this.ws && this.ws.readyState===1 && window.Game && typeof Game.buildSnapshot==='function'){
          const snap = Game.buildSnapshot(); this.sendSync(snap);
        }
      }catch(e){ /* ignore */ }
      return ret;
    };
    // expose a global handle so the game can send sync/seed when needed
    try{ window.NetPeer=this; }catch(e){}
  };
  NetController.prototype.send=function(msg){
    try{ if(this.ws && this.ws.readyState===1) this.ws.send(JSON.stringify(msg)); }catch(e){}
  };
  NetController.prototype.sendSync=function(snapshot){
    // server expects 'state-sync' for authoritative state snapshots
    this.send({type:'state-sync',room:this.room,state:snapshot});
  };
  NetController.prototype.sendSeed=function(seed){
    this.send({type:'seed',room:this.room,payload:seed});
  };
  NetController.prototype.sendStart=function(deckSpec){
    try{ 
      console.log(`[NetController ${this.side}] Starting game with deck spec:`, deckSpec);
      this._start[this.side] = true; 
      this.send({type:'start',room:this.room,side:this.side,deck:deckSpec}); 
      this.logMessage('Iniciando jogo sincronizado...');
      
      // If we're p1 (host), immediately create decks and sync state
      if(this.side === 'p1'){
        setTimeout(() => {
          try {
            const me = 'p1'; 
            const opp = 'p2';
            console.log(`[NetController ${this.side}] Host creating game state`);
            // Create deck for host if not exists
            if(window.Game && typeof Game.createDeck==='function'){
              const lsMe = (me==='p1'?'you':'ai');
              if(!(window.STATE && window.STATE[lsMe] && Array.isArray(window.STATE[lsMe].deck) && window.STATE[lsMe].deck.length)){
                const specMe = (window.getDeckFor ? window.getDeckFor(me) : null);
                if(specMe) { 
                  Game.createDeck(me, specMe); 
                  Game.shuffle(me); 
                  Game.drawStartHand(me); 
                  console.log(`[NetController ${this.side}] Host deck created`);
                }
              }
              // Create deck for opponent
              const specOpp = deckSpec || (window.getDeckFor ? window.getDeckFor(opp) : null);
              if(specOpp) { 
                Game.createDeck(opp, specOpp); 
                Game.shuffle(opp); 
                Game.drawStartHand(opp); 
                console.log(`[NetController ${this.side}] Opponent deck created`);
              }
            }
            // Send synchronized state immediately
            if(window.Game && typeof Game.buildSnapshot==='function'){
              const snap = Game.buildSnapshot(); 
              this.sendSync(snap);
              this.logMessage('Jogo iniciado! Criando decks e distribuindo cartas...');
              console.log(`[NetController ${this.side}] Host sent initial state sync`);
            }
          } catch(e) { 
            console.warn(`[NetController ${this.side}] Host immediate sync failed`, e); 
          }
        }, 100);
      }
    } catch(e) {}
  };
  NetController.prototype.logMessage=function(message){
    // Add message to game log if available
    if(window.addGameLog) {
      window.addGameLog(message);
    } else {
      console.log(`[Game Log ${this.side}] ${message}`);
    }
  };
  NetController.prototype.onDetach=function(){
    if(this.ws) this.ws.close();
    if(this._orig) Dispatcher.apply=this._orig;
  };
  NetController.prototype.onEvent=function(evt){ if(this._aiActive && this.ai && this.ai.onEvent) try{ this.ai.onEvent(evt); }catch(e){} };
  NetController.prototype.dispose=function(){this.onDetach();};
  window.NetController=NetController;
})();