;(function(){
  let installed = false;
  function install(){
    if(installed) return;
    if(!(window.IS_MP || window.__IS_MP)) return;
    installed = true;
    window.__WS_MP_INSTALLED = true;
    const params = new URLSearchParams(location.search);
    const matchId = params.get('match') || params.get('room') || 'TESTE123';
    const playerId = params.get('player') || params.get('side') || 'p1';
    console.log('[wrapDispatcherForMP] Installing MP wrapper for match:', matchId, 'player:', playerId);
    if(window.wsClient) wsClient.connect();
    if(window.syncManager) syncManager.setContext({ matchId, playerId });
    if(window.wsClient) wsClient.join(matchId, playerId, 0);
    const origPFH = window.playFromHand;
    const origET = window.endTurn;
    const origRAO = window.resolveAttackOn;
    const origSSM = window.safeStartMatch;
    
    if(typeof origPFH === 'function'){
      window.playFromHand = function(side, index){ 
        console.log('[wrapDispatcherForMP] playFromHand called:', side, index); 
        if(window.__APPLY_REMOTE){ return origPFH(side,index); } 
        // Aplicar OTIMISTICAMENTE — enviar e executar simultaneamente
        try { origPFH(side, index); } catch(e) { console.warn('[wrapDispatcherForMP] playFromHand apply failed', e); }
        // Enfileirar para confirmação do servidor
        syncManager.enqueueAndSend('PLAY_CARD', { side: String(side), index: Number(index) }); 
      };
    }
    if(typeof origET === 'function'){
      window.endTurn = function(){ 
        console.log('[wrapDispatcherForMP] endTurn called'); 
        if(window.__APPLY_REMOTE){ return origET(); } 
        syncManager.enqueueAndSend('END_TURN', {}); 
      };
    }
    if(typeof origRAO === 'function'){
      window.resolveAttackOn = function(target){ 
        console.log('[wrapDispatcherForMP] resolveAttackOn called:', target); 
        if(window.__APPLY_REMOTE){ return origRAO(target); } 
        
        // Extrair contexto do ataque
        const atk = window.ATTACK_CTX ? window.ATTACK_CTX.attacker : null;
        if(!atk) {
          console.warn('[wrapDispatcherForMP] No ATTACK_CTX found');
          return origRAO(target);
        }
        
        // Criar payload canônico para o servidor
        // NOTE: server expects global side ids (p1/p2) as fromSide — use URL's playerId
        // Normalize sides to server-side player ids (p1/p2)
        const remoteSide = (String(playerId) === 'p1') ? 'p2' : 'p1';
        const normalizedTargetSide = (function(ts){
          if(!ts) return ts;
          if(String(ts) === 'you') return String(playerId);
          if(String(ts) === 'ai') return remoteSide;
          return String(ts);
        })(target.side);

        const payload = {
          attacker: {
            leader: !!atk.leader,
            index: atk.leader ? undefined : atk.idx,
            side: String(playerId)
          },
          fromSide: String(playerId),
          target: {
            type: target.type,
            side: normalizedTargetSide,
            index: target.index
          }
        };
        
        // Enviar ação e não executar localmente (aguardar confirmação do servidor)
        syncManager.enqueueAndSend('ATTACK', payload);
      };
    }
    if(typeof origSSM === 'function'){
      window.safeStartMatch = function(){
        console.log('[wrapDispatcherForMP] safeStartMatch called');
        if(!window.IS_MULTIPLAYER){ return origSSM(); }
        // Enviar START_MATCH ao servidor e aguardar aceite
        syncManager.enqueueAndSend('START_MATCH', {});
      };
    }
  }
  setTimeout(install, 50);
})();
