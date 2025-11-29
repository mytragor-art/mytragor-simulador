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
      // Fallback heuristic: progress phases, play affordable card, attempt basic attack, then end turn
      const side = (this.side||'ai');
      try{
        const phase = (window.STATE && window.STATE.phase) || 'main';
        // In main phase: try play first affordable card from hand
        if(phase === 'main'){
          const hand = (window.STATE && window.STATE[side] && window.STATE[side].hand) || [];
          const pool = (window.STATE && window.STATE.pool && window.STATE.pool[side]) || 0;
          const idx = hand.findIndex(c => c && (Number(c.cost||0) <= pool));
          if(idx >= 0){
            const card = hand[idx];
            if(window.__AI_DEBUG) console.debug('AIController: playing card', card?.name, 'idx', idx);
            // Use existing play API
            try{ window.playFromHand && window.playFromHand(side, idx); }catch(e){ Dispatcher.apply({ kind:'PLAY_CARD_INDEX', side, index: idx }); }
            this._t=setTimeout(()=>this._loop(), 600);
            return;
          }
          // advance to battle if nothing to play
          if(typeof window.nextPhase === 'function'){ window.nextPhase(); this._t=setTimeout(()=>this._loop(), 500); return; }
        }
        // In battle phase: pick first untapped ally or leader and attack enemy leader
        if(phase === 'battle'){
          const allies = (window.STATE && window.STATE[side] && window.STATE[side].allies) || [];
          let attackerSel = allies.findIndex(a => a && !a.tapped);
          let attackerType = 'ally';
          if(attackerSel < 0 && window.STATE && window.STATE[side] && window.STATE[side].leader && !window.STATE[side].leader.tapped){ attackerSel = -1; attackerType = 'leader'; }
          if(attackerSel >= -1){
            if(window.__AI_DEBUG) console.debug('AIController: attempting attack', attackerType, attackerSel);
            try{
              if(typeof window.beginAttack === 'function'){
                window.beginAttack({ side, type: attackerType, index: attackerSel });
                window.finishAttack && window.finishAttack({ target: { side: (side==='ai'?'you':'ai'), type:'leader' } });
              } else {
                Dispatcher.apply({ kind:'ATTACK', from:{ side, type: attackerType, index: attackerSel }, target:{ side:(side==='ai'?'you':'ai'), type:'leader' } });
              }
            }catch(e){ console.warn('AIController attack heuristic failed', e); }
          }
          // advance to final
          if(typeof window.nextPhase === 'function'){ window.nextPhase(); this._t=setTimeout(()=>this._loop(), 500); return; }
        }
        // In final phase: end turn
        if(phase === 'final'){
          if(window.__AI_DEBUG) console.debug('AIController: ending turn');
          if(typeof window.endTurn === 'function'){ window.endTurn(); } else { Dispatcher.apply({ kind:'END_TURN' }); }
          return;
        }
      }catch(e){ console.warn('AIController basic heuristic failed', e); }
      // Legacy fallback: if inline aiMain exists, call it
      if(typeof aiMain === 'function'){
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