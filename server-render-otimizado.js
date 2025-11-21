const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Configuração CORS para Render
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// WebSocket Server
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false,
  maxPayload: 1024 * 1024
});

// Armazenamento de salas e jogadores
const rooms = new Map();
const players = new Map();

// Funções utilitárias
function getRooms() {
  const roomData = {};
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.room) {
      const roomName = client.room.toUpperCase();
      if (!roomData[roomName]) {
        roomData[roomName] = { room: roomName, count: 0, players: [] };
      }
      roomData[roomName].count++;
      if (client.playerName) {
        roomData[roomName].players.push(client.playerName);
      }
    }
  });
  return Object.values(roomData);
}

function broadcastToRoom(room, message, excludeClient = null) {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client !== excludeClient && 
        client.readyState === WebSocket.OPEN && 
        client.room && 
        client.room.toUpperCase() === room.toUpperCase()) {
      try {
        client.send(data);
      } catch (e) {
        console.error('Erro ao enviar mensagem para sala:', e);
      }
    }
  });
}

function broadcastRooms() {
  const rooms = getRooms();
  const message = JSON.stringify({ type: 'rooms', rooms: rooms });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (e) {
        console.error('Erro ao enviar lista de salas:', e);
      }
    }
  });
}

// WebSocket Connection Handler
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const room = url.searchParams.get('room') || 'LOBBY';
  const playerName = url.searchParams.get('player') || `Jogador_${Math.floor(Math.random() * 1000)}`;
  
  ws.room = room.toUpperCase();
  ws.playerName = playerName;
  ws.isAlive = true;
  ws.joinTime = Date.now();
  
  console.log(`🟢 WebSocket conectado: ${playerName} na sala ${ws.room}`);
  console.log(`📊 Total de clientes: ${wss.clients.size}`);
  
  // Enviar mensagem de boas-vindas
  try {
    ws.send(JSON.stringify({ 
      type: 'welcome', 
      player: playerName,
      room: ws.room,
      timestamp: Date.now(),
      server: 'MyTragor Render Server'
    }));
  } catch (e) {
    console.error('Erro ao enviar welcome:', e);
  }
  
  // Notificar sala sobre novo jogador
  broadcastToRoom(ws.room, {
    type: 'player_joined',
    player: playerName,
    room: ws.room,
    timestamp: Date.now()
  }, ws);
  
  // Atualizar lista de salas
  broadcastRooms();

  ws.on('message', (data) => {
    try {
      const message = data.toString();
      console.log(`📨 Mensagem de ${playerName}: ${message.slice(0, 100)}`);
      
      // Comandos especiais
      if (message.startsWith('/')) {
        handleCommand(message, ws);
        return;
      }
      
      // Broadcast para sala
      broadcastToRoom(ws.room, {
        type: 'message',
        player: playerName,
        message: message,
        timestamp: Date.now()
      }, ws);
      
    } catch (e) {
      console.error('❌ Erro ao processar mensagem:', e);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Erro ao processar mensagem' 
      }));
    }
  });

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('close', () => {
    console.log(`🔴 WebSocket desconectado: ${playerName}`);
    console.log(`📊 Total de clientes: ${wss.clients.size}`);
    
    // Notificar sala sobre saída do jogador
    broadcastToRoom(ws.room, {
      type: 'player_left',
      player: playerName,
      room: ws.room,
      timestamp: Date.now()
    });
    
    broadcastRooms();
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

function handleCommand(command, ws) {
  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();
  
  switch(cmd) {
    case '/list':
      const rooms = getRooms();
      ws.send(JSON.stringify({ 
        type: 'command', 
        command: 'list',
        result: rooms 
      }));
      break;
      
    case '/players':
      const players = [];
      wss.clients.forEach(client => {
        if (client.room === ws.room) {
          players.push(client.playerName);
        }
      });
      ws.send(JSON.stringify({ 
        type: 'command', 
        command: 'players',
        result: players 
      }));
      break;
      
    case '/help':
      ws.send(JSON.stringify({ 
        type: 'command', 
        command: 'help',
        result: [
          'Comandos disponíveis:',
          '/list - Listar salas',
          '/players - Jogadores na sala',
          '/help - Ajuda',
          '/ping - Testar conexão'
        ]
      }));
      break;
      
    case '/ping':
      ws.send(JSON.stringify({ 
        type: 'pong', 
        timestamp: Date.now() 
      }));
      break;
      
    default:
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: `Comando desconhecido: ${cmd}` 
      }));
  }
}

// Keep-alive para manter conexões ativas
const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      console.log('🔴 Terminando conexão inativa');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// Rotas HTTP
app.get('/rooms', (req, res) => {
  const rooms = getRooms();
  res.json({
    time: new Date().toISOString(),
    rooms: rooms,
    connectedClients: wss.clients.size,
    server: 'MyTragor Render Server'
  });
});

app.get('/health', (req, res) => {
  const memory = process.memoryUsage();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB'
    },
    websocketClients: wss.clients.size,
    rooms: getRooms().length,
    server: 'MyTragor Render Server'
  });
});

app.get('/status', (req, res) => {
  res.json({
    server: 'online',
    domain: 'https://mytragor-simulador-1.onrender.com',
    websocket: 'wss://mytragor-simulador-1.onrender.com',
    players: wss.clients.size,
    rooms: getRooms().length,
    timestamp: new Date().toISOString()
  });
});

// Cliente HTML otimizado para Render
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyTragor Simulador - Multiplayer Online</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            min-height: 100vh;
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 40px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 800px;
            width: 100%;
            text-align: center;
        }
        h1 {
            font-size: 2.8em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
            background: linear-gradient(45deg, #ffd700, #ffed4e);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .subtitle {
            font-size: 1.3em;
            margin-bottom: 30px;
            opacity: 0.9;
        }
        .status {
            padding: 15px;
            border-radius: 15px;
            margin: 20px 0;
            font-weight: bold;
            font-size: 1.1em;
            transition: all 0.3s ease;
        }
        .connected {
            background: rgba(76, 175, 80, 0.3);
            border: 2px solid #4CAF50;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }
        .disconnected {
            background: rgba(244, 67, 54, 0.3);
            border: 2px solid #f44336;
            box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
        }
        .connecting {
            background: rgba(255, 152, 0, 0.3);
            border: 2px solid #ff9800;
            box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
        .game-area {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 15px;
            padding: 30px;
            margin: 20px 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .player-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .info-card {
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .info-card h4 {
            color: #ffd700;
            margin-bottom: 5px;
        }
        input, button {
            padding: 12px 20px;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            margin: 8px;
            transition: all 0.3s ease;
        }
        input {
            background: rgba(255, 255, 255, 0.9);
            color: #333;
            width: 200px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        input:focus {
            outline: none;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            transform: translateY(-2px);
        }
        button {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            cursor: pointer;
            min-width: 140px;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
            font-weight: bold;
        }
        button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
        }
        button:disabled {
            background: #666;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        .disconnect {
            background: linear-gradient(45deg, #f44336, #da190b);
            box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
        }
        .disconnect:hover {
            box-shadow: 0 8px 25px rgba(244, 67, 54, 0.4);
        }
        .game-controls {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .messages {
            background: rgba(0, 0, 0, 0.4);
            border-radius: 15px;
            padding: 25px;
            margin: 20px 0;
            max-height: 250px;
            overflow-y: auto;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: inset 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        .message {
            margin: 10px 0;
            padding: 10px 15px;
            border-radius: 10px;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .message.sent {
            background: rgba(76, 175, 80, 0.3);
            text-align: right;
            border-left: 3px solid #4CAF50;
        }
        .message.received {
            background: rgba(33, 150, 243, 0.3);
            text-align: left;
            border-left: 3px solid #2196F3;
        }
        .message.system {
            background: rgba(255, 193, 7, 0.3);
            text-align: center;
            border-left: 3px solid #FFC107;
            font-style: italic;
        }
        .connection-info {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 15px;
            margin: 15px 0;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .url-display {
            background: rgba(0, 0, 0, 0.5);
            color: #00ff00;
            padding: 10px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            word-break: break-all;
            margin: 10px 0;
            border: 1px solid rgba(0, 255, 0, 0.3);
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin: 20px 0;
        }
        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 10px;
            border-radius: 8px;
            font-size: 0.9em;
        }
        @media (max-width: 600px) {
            .container {
                padding: 20px;
                margin: 10px;
            }
            h1 {
                font-size: 2.2em;
            }
            .game-controls {
                flex-direction: column;
            }
            input {
                width: 100%;
                max-width: 250px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 MyTragor Simulador</h1>
        <div class="subtitle">Multiplayer Online - Bata em Batalhas Épicas!</div>
        
        <div id="status" class="status disconnected">Desconectado do Servidor Online</div>
        <div id="websocketUrl" class="url-display">Aguardando conexão com o servidor...</div>
        
        <div class="connection-info">
            <div class="player-info">
                <div class="info-card">
                    <h4>🏠 Sala Atual</h4>
                    <div id="currentRoom">-</div>
                </div>
                <div class="info-card">
                    <h4>👥 Jogadores Online</h4>
                    <div id="playersInRoom">-</div>
                </div>
                <div class="info-card">
                    <h4>🌐 Servidor</h4>
                    <div>MyTragor Online</div>
                </div>
            </div>
        </div>

        <div class="game-area">
            <h3>🎯 Controles do Jogo</h3>
            <div class="game-controls">
                <input type="text" id="roomInput" placeholder="Nome da Sala de Batalha" value="SALA1">
                <button id="connectBtn" onclick="toggleConnection()">⚔️ Entrar na Batalha</button>
            </div>
            
            <div class="game-controls">
                <input type="text" id="messageInput" placeholder="Digite sua mensagem ou comando..." disabled>
                <button id="sendBtn" onclick="sendMessage()" disabled>📤 Enviar</button>
                <button onclick="sendTestMessage()" disabled>🎲 Testar</button>
            </div>
        </div>

        <div class="features">
            <div class="feature">⚡ Conexão em Tempo Real</div>
            <div class="feature">🎮 Multiplayer Online</div>
            <div class="feature">🏆 Salas Competitivas</div>
            <div class="feature">🔄 Auto-Reconexão</div>
        </div>
        
        <div class="messages" id="messages">
            <div class="message system">🚀 Bem-vindo ao MyTragor Simulador Online!</div>
            <div class="message system">🔗 Conectando ao servidor de batalhas...</div>
            <div class="message system">⚔️ Prepare-se para duelos épicos!</div>
        </div>
    </div>

    <script>
        // LÓGICA DE AUTO-DETECÇÃO DE PROTOCOLO WS/WSS
        function getWebSocketUrl(room = 'SALA1') {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = window.location.port ? ':' + window.location.port : '';
            return protocol + '//' + host + port + '?room=' + encodeURIComponent(room);
        }
        
        // PARA RENDER - USAR SEMPRE WSS
        function getRenderWebSocketUrl(room = 'SALA1') {
            return 'wss://mytragor-simulador-1.onrender.com?room=' + encodeURIComponent(room);
        }

        let ws = null;
        let isConnected = false;
        let currentRoom = null;
        let reconnectAttempts = 0;
        const MAX_RECONNECT_ATTEMPTS = 10;
        const RECONNECT_DELAY = 2000;

        function addMessage(content, type = 'system') {
            const messages = document.getElementById('messages');
            const message = document.createElement('div');
            message.className = 'message ' + type;
            message.innerHTML = '<strong>' + new Date().toLocaleTimeString('pt-BR') + '</strong> - ' + content;
            messages.appendChild(message);
            messages.scrollTop = messages.scrollHeight;
            
            if (messages.children.length > 50) {
                messages.removeChild(messages.firstChild);
            }
        }

        function updateStatus(connected, url = '') {
            isConnected = connected;
            const statusEl = document.getElementById('status');
            const connectBtn = document.getElementById('connectBtn');
            const messageInput = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendBtn');
            
            if (connected) {
                statusEl.textContent = '✅ Conectado ao Servidor Online';
                statusEl.className = 'status connected';
                connectBtn.textContent = '🚪 Sair da Batalha';
                connectBtn.className = 'disconnect';
                messageInput.disabled = false;
                sendBtn.disabled = false;
                document.querySelectorAll('button[onclick="sendTestMessage()"]').forEach(btn => btn.disabled = false);
                reconnectAttempts = 0;
            } else {
                statusEl.textContent = '❌ Desconectado do Servidor Online';
                statusEl.className = 'status disconnected';
                connectBtn.textContent = '⚔️ Entrar na Batalha';
                connectBtn.className = '';
                messageInput.disabled = true;
                sendBtn.disabled = true;
                document.querySelectorAll('button[onclick="sendTestMessage()"]').forEach(btn => btn.disabled = true);
            }
            
            if (url) {
                document.getElementById('websocketUrl').textContent = '🔗 ' + url;
            }
        }

        function connect() {
            const room = document.getElementById('roomInput').value.trim() || 'SALA1';
            currentRoom = room;
            
            addMessage('🎯 Conectando à sala de batalha: ' + room + '...', 'system');
            
            // USAR FUNÇÃO DE AUTO-DETECÇÃO
            let wsUrl;
            if (window.location.hostname === 'mytragor-simulador-1.onrender.com') {
                wsUrl = getRenderWebSocketUrl(room);
                addMessage('🌐 Usando conexão WSS para Render', 'system');
            } else {
                wsUrl = getWebSocketUrl(room);
                addMessage('🔍 Usando auto-detecção de protocolo', 'system');
            }
            
            addMessage('🔗 URL de conexão: ' + wsUrl, 'system');
            
            updateStatus(false);
            document.getElementById('status').textContent = '🔄 Conectando ao servidor online...';
            document.getElementById('status').className = 'status connecting';
            
            try {
                ws = new WebSocket(wsUrl);
                
                let connectionTimeout = setTimeout(() => {
                    if (ws.readyState !== WebSocket.OPEN) {
                        addMessage('⏰ Timeout na conexão - servidor pode estar ocupado', 'system');
                        ws.close();
                    }
                }, 15000);

                ws.onopen = function(event) {
                    clearTimeout(connectionTimeout);
                    updateStatus(true, wsUrl);
                    addMessage('✅ Conectado com sucesso à sala ' + room + '!', 'system');
                    addMessage('🎮 Prepare sua estratégia para o duelo!', 'system');
                    document.getElementById('currentRoom').textContent = room;
                    updateRooms();
                    reconnectAttempts = 0;
                };
                
                ws.onmessage = function(event) {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'welcome') {
                            addMessage('🎉 Bem-vindo ao servidor! Sala: ' + data.room, 'system');
                        } else if (data.type === 'player_joined') {
                            addMessage('👋 ' + data.player + ' entrou na sala!', 'system');
                        } else if (data.type === 'player_left') {
                            addMessage('👋 ' + data.player + ' saiu da sala!', 'system');
                        } else if (data.type === 'message') {
                            addMessage(data.player + ': ' + data.message, 'received');
                        } else {
                            addMessage('📨 ' + event.data, 'received');
                        }
                    } catch (e) {
                        addMessage('📨 ' + event.data, 'received');
                    }
                };
                
                ws.onclose = function(event) {
                    clearTimeout(connectionTimeout);
                    updateStatus(false);
                    addMessage('🔴 Desconectado do servidor online', 'system');
                    document.getElementById('currentRoom').textContent = '-';
                    document.getElementById('playersInRoom').textContent = '-';
                    
                    if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                        reconnectAttempts++;
                        addMessage('🔄 Tentando reconectar... (Tentativa ' + reconnectAttempts + '/' + MAX_RECONNECT_ATTEMPTS + ')', 'system');
                        setTimeout(connect, RECONNECT_DELAY * Math.min(reconnectAttempts, 5));
                    } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                        addMessage('❌ Máximo de tentativas de reconexão alcançado', 'system');
                        addMessage('🔄 Por favor, tente conectar novamente manualmente', 'system');
                    }
                };
                
                ws.onerror = function(error) {
                    clearTimeout(connectionTimeout);
                    addMessage('❌ Erro de conexão - verifique sua internet', 'system');
                    addMessage('🔍 Verificando se o servidor está online...', 'system');
                    updateStatus(false);
                };
                
            } catch (error) {
                clearTimeout(connectionTimeout);
                addMessage('❌ Erro ao criar conexão: ' + error.message, 'system');
                addMessage('📡 Verifique sua conexão com a internet', 'system');
                updateStatus(false);
            }
        }

        function disconnect() {
            if (ws) {
                addMessage('🚪 Saindo da sala de batalha...', 'system');
                ws.close(1000, 'Desconexão voluntária');
                ws = null;
            }
        }

        function toggleConnection() {
            if (isConnected) {
                disconnect();
            } else {
                connect();
            }
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (message && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(message);
                addMessage('📤 ' + message, 'sent');
                input.value = '';
                
                if (message.toLowerCase().includes('ataque') || message.toLowerCase().includes('attack')) {
                    addMessage('⚔️ Ataque enviado!', 'system');
                } else if (message.toLowerCase().includes('defesa') || message.toLowerCase().includes('defense')) {
                    addMessage('🛡️ Defesa ativada!', 'system');
                } else if (message.toLowerCase().includes('magia') || message.toLowerCase().includes('magic')) {
                    addMessage('✨ Magia lançada!', 'system');
                }
            }
        }

        function sendTestMessage() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                const testCommands = [
                    '⚔️ Ataque Básico!',
                    '🛡️ Defesa Total!',
                    '✨ Bola de Fogo!',
                    '🏃 Movimento Rápido!',
                    '🎯 Precisão Máxima!'
                ];
                
                const randomCommand = testCommands[Math.floor(Math.random() * testCommands.length)];
                ws.send(randomCommand);
                addMessage('🎲 ' + randomCommand, 'sent');
            }
        }

        function updateRooms() {
            fetch('/rooms')
                .then(response => response.json())
                .then(data => {
                    if (data.rooms && data.rooms.length > 0) {
                        const totalPlayers = data.rooms.reduce((sum, room) => sum + room.count, 0);
                        document.getElementById('playersInRoom').textContent = totalPlayers;
                        
                        if (currentRoom && data.rooms) {
                            const currentRoomData = data.rooms.find(r => r.room === currentRoom.toUpperCase());
                            if (currentRoomData) {
                                document.getElementById('playersInRoom').textContent = currentRoomData.count;
                            }
                        }
                    } else {
                        document.getElementById('playersInRoom').textContent = '0';
                    }
                })
                .catch(err => {
                    console.error('Erro ao buscar salas:', err);
                    document.getElementById('playersInRoom').textContent = 'Erro';
                });
        }

        // Event listeners
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        document.getElementById('roomInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                if (!isConnected) {
                    connect();
                }
            }
        });

        // Atualizar informações das salas periodicamente
        setInterval(updateRooms, 5000);
        
        // Conectar automaticamente ao carregar a página
        window.addEventListener('load', function() {
            setTimeout(connect, 2000);
        });

        // Limpar ao sair da página
        window.addEventListener('beforeunload', function() {
            if (ws) {
                ws.close(1001, 'Página sendo fechada');
            }
        });

        // Mensagens iniciais
        addMessage('🚀 MyTragor Simulador Online carregado!', 'system');
        addMessage('🌐 Servidor: ' + window.location.hostname, 'system');
        addMessage('⚔️ Preparando sistema de batalhas...', 'system');
        
        // Mostrar URL de conexão
        const showConnectionUrl = () => {
            const url = window.location.hostname === 'mytragor-simulador-1.onrender.com' 
                ? getRenderWebSocketUrl('LOBBY') 
                : getWebSocketUrl('LOBBY');
            document.getElementById('websocketUrl').textContent = '🔗 ' + url;
        };
        showConnectionUrl();
    </script>
</body>
</html>
  `);
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err.stack);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 MyTragor Server rodando na porta ${PORT}`);
  console.log(`🌐 Domínio: https://mytragor-simulador-1.onrender.com`);
  console.log(`🎮 WebSocket: wss://mytragor-simulador-1.onrender.com`);
  console.log(`📊 Health: https://mytragor-simulador-1.onrender.com/health`);
  console.log(`📋 Salas: https://mytragor-simulador-1.onrender.com/rooms`);
  console.log(`📈 Status: https://mytragor-simulador-1.onrender.com/status`);
});

module.exports = { app, server, wss };
