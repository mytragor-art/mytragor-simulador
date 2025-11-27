// Script para monitorar estado do MP em tempo real
// Cole no console do navegador (F12)

(function() {
  const logs = [];
  
  function log(msg, level = 'info') {
    const ts = new Date().toLocaleTimeString();
    const entry = `[${ts}] ${msg}`;
    logs.push(entry);
    console.log(`%c${entry}`, `color: ${level === 'error' ? 'red' : level === 'warn' ? 'orange' : level === 'success' ? 'green' : 'blue'}`);
    return entry;
  }
  
  window.mpMonitor = {
    checkState: function() {
      const state = window.STATE;
      const sm = window.syncManager;
      const ws = window.wsClient;
      
      log('=== MP STATE MONITOR ===', 'warn');
      
      if (!state) {
        log('❌ STATE is null', 'error');
        return;
      }
      
      log(`✓ STATE exists`, 'success');
      
      // Verificar playerChosen
      if (sm && sm.playerChosen) {
        log(`playerChosen: p1=${sm.playerChosen.p1 ? '✓' : '✗'} p2=${sm.playerChosen.p2 ? '✓' : '✗'}`);
      }
      
      // Verificar leaders
      if (state.you && state.you.leader) {
        log(`✓ YOU leader: ${state.you.leader.name || state.you.leader.key}`);
      } else {
        log('❌ YOU leader is null');
      }
      
      if (state.ai && state.ai.leader) {
        log(`✓ AI leader: ${state.ai.leader.name || state.ai.leader.key}`);
      } else {
        log('❌ AI leader is null');
      }
      
      // Verificar isHost
      if (state.isHost !== undefined) {
        log(`isHost: ${state.isHost ? '✓ YES (HOST)' : '✗ NO (CLIENT)'}`);
      } else {
        log('⚠ isHost not defined');
      }
      
      // Verificar side
      if (state.side) {
        log(`side: ${state.side}`);
      }
      
      // Verificar active
      if (state.active) {
        log(`active: ${state.active === 'you' ? 'YOU (seu turno)' : 'OPPONENT'}`);
      }
      
      // Verificar syncManager
      if (sm) {
        const status = sm.getStatus ? sm.getStatus() : {};
        log(`syncManager pending: ${status.pending ? status.pending.length : 0} ações`);
      }
      
      // Verificar WebSocket
      if (ws) {
        const status = ws.getStatus ? ws.getStatus() : {};
        log(`wsClient connected: ${status.connected ? '✓' : '✗'}`);
        log(`wsClient lastServerSeq: ${status.lastServerSeq || 0}`);
      }
    },
    
    testPlayCard: function(index = 0) {
      log(`>>> Testando playFromHand(you, ${index})`, 'warn');
      try {
        if (window.playFromHand) {
          window.playFromHand('you', index);
          log('✓ playFromHand chamado', 'success');
        } else {
          log('❌ playFromHand não definida', 'error');
        }
      } catch (e) {
        log(`❌ Erro: ${e.message}`, 'error');
      }
    },
    
    testEndTurn: function() {
      log('>>> Testando endTurn()', 'warn');
      try {
        if (window.endTurn) {
          window.endTurn();
          log('✓ endTurn chamado', 'success');
        } else {
          log('❌ endTurn não definida', 'error');
        }
      } catch (e) {
        log(`❌ Erro: ${e.message}`, 'error');
      }
    },
    
    getLogs: function() {
      return logs;
    },
    
    clearLogs: function() {
      logs.length = 0;
      log('Logs limpos', 'info');
    }
  };
  
  log('✓ MP Monitor iniciado', 'success');
  log('Use: mpMonitor.checkState()', 'info');
  log('Use: mpMonitor.testPlayCard(0)', 'info');
  log('Use: mpMonitor.testEndTurn()', 'info');
})();
