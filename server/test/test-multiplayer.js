const WebSocket = require('ws');
const http = require('http');

// Configuração do teste
const SERVER_URL = 'ws://localhost:8081';
const TEST_MATCH = 'TESTE123';
const PLAYER1 = 'p1';
const PLAYER2 = 'p2';

class TestClient {
  constructor(playerId, matchId) {
    this.playerId = playerId;
    this.matchId = matchId;
    this.ws = null;
    this.connected = false;
    this.actionAccepted = 0;
    this.actionRejected = 0;
    this.serverSeq = 0;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(SERVER_URL);
      
      this.ws.on('open', () => {
        console.log(`[${this.playerId}] Connected`);
        this.connected = true;
        this.join();
      });
      
      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(msg);
        } catch (e) {
          console.error(`[${this.playerId}] Error parsing message:`, e);
        }
      });
      
      this.ws.on('close', () => {
        console.log(`[${this.playerId}] Disconnected`);
        this.connected = false;
      });
      
      this.ws.on('error', (err) => {
        console.error(`[${this.playerId}] WebSocket error:`, err);
        reject(err);
      });
      
      // Resolver após 2 segundos se conectou com sucesso
      setTimeout(() => {
        if (this.connected) resolve();
        else reject(new Error('Connection timeout'));
      }, 2000);
    });
  }

  join() {
    const msg = {
      type: 'join',
      matchId: this.matchId,
      playerId: this.playerId
    };
    this.send(msg);
  }

  sendAction(actionType, payload) {
    const actionId = `${this.playerId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const msg = {
      type: 'action',
      matchId: this.matchId,
      playerId: this.playerId,
      actionId: actionId,
      actionType: actionType,
      payload: payload || {}
    };
    this.send(msg);
    return actionId;
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'snapshot':
        console.log(`[${this.playerId}] Received snapshot, serverSeq:`, msg.serverSeq);
        this.serverSeq = msg.serverSeq || 0;
        break;
        
      case 'actionAccepted':
        console.log(`[${this.playerId}] Action accepted:`, msg.actionType, 'serverSeq:', msg.serverSeq);
        this.actionAccepted++;
        this.serverSeq = msg.serverSeq;
        break;
        
      case 'actionRejected':
        console.log(`[${this.playerId}] Action rejected:`, msg.actionId, 'reason:', msg.reason);
        this.actionRejected++;
        break;
        
      case 'replay':
        console.log(`[${this.playerId}] Received replay, actions:`, msg.actions?.length);
        break;
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runTests() {
  console.log('🧪 Starting multiplayer tests...\n');
  
  const client1 = new TestClient(PLAYER1, TEST_MATCH);
  const client2 = new TestClient(PLAYER2, TEST_MATCH);
  
  try {
    // Teste 1: Conectar ambos os jogadores
    console.log('📋 Test 1: Connecting both players...');
    await Promise.all([
      client1.connect(),
      client2.connect()
    ]);
    console.log('✅ Both players connected\n');
    
    // Aguardar um pouco para estabilizar
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Teste 2: Jogador 1 joga uma carta válida
    console.log('📋 Test 2: Player 1 plays a card (valid action)...');
    client1.sendAction('PLAY_CARD', { index: 0 });
    
    // Aguardar resposta
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (client1.actionAccepted > 0) {
      console.log('✅ Player 1 card play accepted\n');
    } else {
      console.log('❌ Player 1 card play not accepted\n');
    }
    
    // Teste 3: Jogador 2 joga uma carta válida
    console.log('📋 Test 3: Player 2 plays a card (valid action)...');
    client2.sendAction('PLAY_CARD', { index: 0 });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (client2.actionAccepted > 0) {
      console.log('✅ Player 2 card play accepted\n');
    } else {
      console.log('❌ Player 2 card play not accepted\n');
    }
    
    // Teste 4: Jogador 1 joga carta no turno errado (deve ser rejeitado)
    console.log('📋 Test 4: Player 1 plays card on wrong turn (should be rejected)...');
    const initialRejections = client1.actionRejected;
    client1.sendAction('PLAY_CARD', { index: 1 });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (client1.actionRejected > initialRejections) {
      console.log('✅ Player 1 card play correctly rejected\n');
    } else {
      console.log('❌ Player 1 card play should have been rejected\n');
    }
    
    // Teste 5: Jogador 1 termina turno
    console.log('📋 Test 5: Player 1 ends turn...');
    client1.sendAction('END_TURN', {});
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (client1.actionAccepted > 1) {
      console.log('✅ Player 1 end turn accepted\n');
    } else {
      console.log('❌ Player 1 end turn not accepted\n');
    }
    
    // Teste 6: Ataque
    console.log('📋 Test 6: Player 2 attacks (ATTACK action)...');
    client2.sendAction('ATTACK', {
      attacker: { leader: true },
      fromSide: 'p2',
      target: { type: 'leader', side: 'p1' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Estatísticas finais
    console.log('📊 Final Statistics:');
    console.log(`Player 1 - Accepted: ${client1.actionAccepted}, Rejected: ${client1.actionRejected}`);
    console.log(`Player 2 - Accepted: ${client2.actionAccepted}, Rejected: ${client2.actionRejected}`);
    
    // Teste de reconexão
    console.log('\n📋 Test 7: Reconnection test...');
    client1.close();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const client1Reconnected = new TestClient(PLAYER1, TEST_MATCH);
    await client1Reconnected.connect();
    console.log('✅ Player 1 reconnected successfully\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    client1.close();
    client2.close();
    if (typeof client1Reconnected !== 'undefined') {
      client1Reconnected.close();
    }
    console.log('\n🎉 Tests completed!');
    process.exit(0);
  }
}

// Verificar se o servidor está rodando antes de iniciar os testes
function checkServer() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:8081/debug/matches', (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error('Server responded with status: ' + res.statusCode));
      }
    });
    
    req.on('error', (err) => {
      reject(new Error('Server not available. Please start the server first with: node server/index.js'));
    });
    
    req.setTimeout(3000, () => {
      req.abort();
      reject(new Error('Server timeout'));
    });
  });
}

// Executar testes
console.log('🔍 Checking if server is running...');
checkServer()
  .then(() => {
    console.log('✅ Server is running\n');
    return runTests();
  })
  .catch((err) => {
    console.error('❌', err.message);
    process.exit(1);
  });