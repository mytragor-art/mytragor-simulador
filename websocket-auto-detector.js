/**
 * WebSocket URL Auto-Detector para Render
 * Detecta automaticamente o domínio correto para WebSocket
 */

(function() {
  'use strict';
  
  // Função para detectar a URL correta do WebSocket
  window.getWebSocketUrl = function(room, side) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port ? ':' + window.location.port : '';
    
    let wsUrl = protocol + '//' + host + port;
    
    // Se tiver room, adicionar ao query string
    if (room) {
      wsUrl += '?room=' + encodeURIComponent(room);
      if (side) {
        wsUrl += '&side=' + encodeURIComponent(side);
      }
    }
    
    console.log('🔍 WebSocket URL detectada:', wsUrl);
    return wsUrl;
  };
  
  // Função para conectar WebSocket com detecção automática
  window.connectWebSocket = function(room, side, onMessage, onOpen, onClose, onError) {
    const wsUrl = window.getWebSocketUrl(room, side);
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = function(event) {
        console.log('🟢 WebSocket conectado:', wsUrl);
        if (onOpen) onOpen(event);
      };
      
      ws.onmessage = function(event) {
        if (onMessage) onMessage(event);
      };
      
      ws.onclose = function(event) {
        console.log('🔴 WebSocket desconectado');
        if (onClose) onClose(event);
      };
      
      ws.onerror = function(error) {
        console.error('❌ WebSocket erro:', error);
        if (onError) onError(error);
      };
      
      return ws;
    } catch (error) {
      console.error('❌ Erro ao criar WebSocket:', error);
      if (onError) onError(error);
      return null;
    }
  };
  
  // Função auxiliar para testar conexão
  window.testWebSocketConnection = function(room) {
    const ws = window.connectWebSocket(room, 'test', 
      function(event) {
        console.log('📨 Mensagem recebida:', event.data);
      },
      function(event) {
        console.log('✅ Conectado! Enviando mensagem de teste...');
        ws.send(JSON.stringify({ type: 'ping' }));
      },
      function(event) {
        console.log('🔴 Desconectado');
      },
      function(error) {
        console.error('❌ Erro:', error);
      }
    );
    
    return ws;
  };
  
  console.log('🚀 WebSocket Auto-Detector carregado!');
  console.log('📍 Use window.getWebSocketUrl(room, side) para obter a URL correta');
  console.log('🔗 Use window.connectWebSocket(...) para conectar automaticamente');
  
})();