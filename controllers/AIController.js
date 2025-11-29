(function(){
  function AIController(side){this.side=side;this._t=null;}
  AIController.prototype.onAttach=function(){};
  AIController.prototype.onEvent=function(evt){
    if(window.IS_MULTIPLAYER || window.__IS_MP) return;
    try{
      if(window.__AI_DEBUG) console.debug('AIController.onEvent', evt, 'for side', this.side);
      if(evt && evt.type==='TURN_START' && evt.side===this.side){ this._loop(); }
    }catch(e){ console.warn('AIController.onEvent error', e); }
  };
  AIController.prototype._loop=function(){
    if(window.IS_MULTIPLAYER || window.__IS_MP) return;
    clearTimeout(this._t);
    const state=Game.viewFor?Game.viewFor(this.side):{};
    try{
      const hasBrain = (window.AIBrain && typeof AIBrain.next === 'function');
      const action = hasBrain ? AIBrain.next(state) : null;
      if(window.__AI_DEBUG) console.debug('AIController._loop', {side:this.side, hasBrain, action});
      if(action){
        this._t=setTimeout(()=>{ Dispatcher.apply(action); this._loop(); }, 350);
        return;
      }
      // Fallback: if no brain is present but inline aiMain exists, call it (legacy behavior)
      if(!action && typeof aiMain === 'function'){
        try{ if(window.__AI_DEBUG) console.debug('AIController: falling back to aiMain for side', this.side); aiMain(); }catch(e){ console.warn('AIController aiMain fallback failed', e); }
        return;
      }
      // Default: end turn
      this._t=setTimeout(()=>Dispatcher.apply({kind:'END_TURN'}),250);
    }catch(e){ console.warn('AIController._loop error', e); }
  };
  AIController.prototype.dispose=function(){clearTimeout(this._t);};
  window.AIController=AIController;
})();