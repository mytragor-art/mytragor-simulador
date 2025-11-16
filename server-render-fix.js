const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Middleware para JSON
app.use(express.json());

// Servir arquivo de utilidade WebSocket
app.get('/websocket-auto-detector.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'websocket-auto-detector.js'));
});

// Servir página de teste avançada
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-domain-detection.html'));
});

// Servir página de teste de produção
app.get('/test-render', (req, res) => {
  res.sendFile(path.join(__dirname, 'teste-producao-render.html'));
});

// Função para verificar se arquivo existe
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (e) {
    return false;
  }
}

// Servir arquivos estáticos - tentar várias localizações
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'client')));
app.use(express.static(path.join(__dirname, 'client/dist')));

// Rota principal com detecção automática de domínio
app.get('/', (req, res) => {
  // Se existir arquivo de teste, servir ele
  const testFile = path.join(__dirname, 'websocket-test.html');
  if (fileExists(testFile)) {
    return res.sendFile(testFile);
  }
  
  // Se não, servir interface com detecção automática
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MyTragor Simulador - WebSocket</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          color: white;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          padding: 30px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h1 {
          text-align: center;
          margin-bottom: 10px;
          font-size: 2.5em;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }
        .subtitle {
          text-align: center;
          margin-top: -10px;
          margin-bottom: 30px;
          opacity: 0.8;
        }
        .status-card {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .status {
          font-size: 1.2em;
          font-weight: bold;
        }
        .connected { color: #4CAF50; }
        .disconnected { color: #f44336; }
        .controls {
          display: flex;
          gap: 10px;
          margin: 20px 0;
          flex-wrap: wrap;
        }
        input, button {
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
        }
        input {
          flex: 1;
          background: rgba(255, 255, 255, 0.9);
          color: #333;
        }
        button {
          background: #4CAF50;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 120px;
        }
        button:hover {
          background: #45a049;
          transform: translateY(-2px);
        }
        button:disabled {
          background: #666;
          cursor: not-allowed;
          transform: none;
        }
        .disconnect {
          background: #f44336;
        }
        .disconnect:hover {
          background: #da190b;
        }
        .messages {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
          max-height: 300px;
          overflow-y: auto;
        }
        .message {
          margin: 8px 0;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
        }
        .message.sent {
          background: rgba(76, 175, 80, 0.3);
          text-align: right;
        }
        .message.received {
          background: rgba(33, 150, 243, 0.3);
        }
        .message.system {
          background: rgba(255, 152, 0, 0.3);
          font-style: italic;
        }
        .info-panel {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 15px;
          margin: 20px 0;
        }
        .info-item {
          margin: 5px 0;
          display: flex;
          justify-content: space-between;
        }
        .room-list {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 15px;
          margin: 20px 0;
        }
        .room-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          margin: 5px 0;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 5px;
        }
        .url-info {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 5px;
          padding: 10px;
          margin: 10px 0;
          font-family: monospace;
          font-size: 0.9em;
          word-break: break-all;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎮 MyTragor Simulador</h1>
        <div class="subtitle">WebSocket Multiplayer - Domínio Automático</div>
        
        <div class="status-card">
          <div class="status disconnected" id="status">Desconectado</div>
          <div class="url-info" id="websocketUrl">Aguardando conexão...</div>
        </div>

        <div class="info-panel">
          <h3>📊 Informações</h3>
          <div class="info-item">
            <span>WebSocket URL:</span>
            <span id="currentUrl">-</span>
          </div>
          <div class="info-item">
            <span>Sala Atual:</span>
            <span id="currentRoom">-</span>
          </div>
          <div class="info-item">
            <span>Jogadores na Sala:</span>
            <span id="playersInRoom">-</span>
          </div>
        </div>

        <div class="controls">
          <input type="text" id="roomInput" placeholder="Nome da Sala" value="SALA1">
          <button id="connectBtn" onclick="toggleConnection()">Conectar</button>
        </div>

        <div class="room-list" id="roomList">
          <h3>🏠 Salas Ativas</h3>
          <div id="roomsContainer">Carregando...</div>
        </div>

        <div class="controls" style="margin-top: 20px;">
          <input type="text" id="messageInput" placeholder="Digite sua mensagem..." disabled>
          <button id="sendBtn" onclick="sendMessage()" disabled>Enviar</button>
          <button onclick="sendTestMessage()" disabled>Teste</button>
        </div>

        <div class="messages" id="messages">
          <div class="message system">🚀 Sistema WebSocket com detecção automática de domínio carregado!</div>
          <div class="message system">📍 Aguardando conexão...</div>
        </div>
      </div>

      <script>
        let ws = null;
        let isConnected = false;
        let currentRoom = null;

        function addMessage(content, type = 'system') {
          const messages = document.getElementById('messages');
          const message = document.createElement('div');
          message.className = \`message \${type}\`;
          message.innerHTML = \`<strong>\${new Date().toLocaleTimeString()}</strong> - \${content}\`;
          messages.appendChild(message);
          messages.scrollTop = messages.scrollHeight;
        }

        function updateStatus(connected, url = '') {
          isConnected = connected;
          const statusEl = document.getElementById('status');
          const connectBtn = document.getElementById('connectBtn');
          const messageInput = document.getElementById('messageInput');
          const sendBtn = document.getElementById('sendBtn');
          
          if (connected) {
            statusEl.textContent = 'Conectado';
            statusEl.className = 'status connected';
            connectBtn.textContent = 'Desconectar';
            connectBtn.className = 'disconnect';
            messageInput.disabled = false;
            sendBtn.disabled = false;
            document.querySelectorAll('button[onclick="sendTestMessage()"]').forEach(btn => btn.disabled = false);
          } else {
            statusEl.textContent = 'Desconectado';
            statusEl.className = 'status disconnected';
            connectBtn.textContent = 'Conectar';
            connectBtn.className = '';
            messageInput.disabled = true;
            sendBtn.disabled = true;
            document.querySelectorAll('button[onclick="sendTestMessage()"]').forEach(btn => btn.disabled = true);
          }
          
          if (url) {
            document.getElementById('websocketUrl').textContent = \`🔗 \${url}\`;
            document.getElementById('currentUrl').textContent = url;
          }
        }

        function toggleConnection() {
          if (isConnected) {
            disconnect();
          } else {
            connect();
          }
        }

        function connect() {
          const room = document.getElementById('roomInput').value || 'SALA1';
          currentRoom = room;
          
          addMessage(\`Conectando à sala: \${room}...\`, 'system');
          
          // Detectar URL automaticamente
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = window.location.hostname;
          const port = window.location.port ? ':' + window.location.port : '';
          const wsUrl = protocol + '//' + host + port + '?room=' + encodeURIComponent(room);
          
          addMessage(\`🔗 Conectando a: \${wsUrl}\`, 'system');
          
          ws = new WebSocket(wsUrl);
          
          ws.onopen = function(event) {
            updateStatus(true, wsUrl);
            addMessage(\`✅ Conectado à sala \${room}!\`, 'system');
            document.getElementById('currentRoom').textContent = room;
            updateRooms();
          };
          
          ws.onmessage = function(event) {
            addMessage(\`📨 \${event.data}\`, 'received');
          };
          
          ws.onclose = function(event) {
            updateStatus(false);
            addMessage('🔴 Desconectado do servidor', 'system');
            document.getElementById('currentRoom').textContent = '-';
            document.getElementById('playersInRoom').textContent = '-';
          };
          
          ws.onerror = function(error) {
            addMessage(\`❌ Erro de conexão: \${error}\`, 'system');
            updateStatus(false);
          };
        }

        function disconnect() {
          if (ws) {
            addMessage('Desconectando...', 'system');
            ws.close();
            ws = null;
          }
        }

        function sendMessage() {
          const input = document.getElementById('messageInput');
          const message = input.value.trim();
          
          if (message && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(message);
            addMessage(\`📤 \${message}\`, 'sent');
            input.value = '';
          }
        }

        function sendTestMessage() {
          if (ws && ws.readyState === WebSocket.OPEN) {
            const testData = {
              type: 'test',
              message: 'Mensagem de teste do WebSocket',
              timestamp: Date.now(),
              room: currentRoom
            };
            ws.send(JSON.stringify(testData));
            addMessage(\`📤 \${JSON.stringify(testData)}\`, 'sent');
          }
        }

        function updateRooms() {
          fetch('/rooms')
            .then(response => response.json())
            .then(data => {
              const container = document.getElementById('roomsContainer');
              if (data.rooms && data.rooms.length > 0) {
                container.innerHTML = data.rooms.map(room => 
                  \`<div class="room-item">
                    <span>🏠 \${room.room}</span>
                    <span>👥 \${room.count} jogador\${room.count !== 1 ? 'es' : ''}</span>
                  </div>\`
                ).join('');
              } else {
                container.innerHTML = '<div style="text-align: center; opacity: 0.7;">Nenhuma sala ativa</div>';
              }
              
              // Atualizar jogadores na sala atual
              if (currentRoom && data.rooms) {
                const currentRoomData = data.rooms.find(r => r.room === currentRoom.toUpperCase());
                document.getElementById('playersInRoom').textContent = currentRoomData ? currentRoomData.count : '0';
              }
            })
            .catch(err => {
              console.error('Erro ao buscar salas:', err);
              document.getElementById('roomsContainer').innerHTML = '<div style="text-align: center; color: #f44336;">Erro ao carregar salas</div>';
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

        // Atualizar salas a cada 3 segundos
        setInterval(updateRooms, 3000);
        
        // Carregar salas inicialmente
        updateRooms();

        // Adicionar mensagem inicial
        addMessage('🚀 Sistema WebSocket com detecção automática de domínio carregado!', 'system');
        addMessage(\`📍 URL detectada: \${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//\${window.location.host}\`, 'system');
      </script>
    </body>
    </html>
  `);
});

// WebSocket setup
const wss = new WebSocket.Server({ server });

// Armazenamento de salas
const rooms = new Map();

function getRooms() {
  const map = {};
  wss.clients.forEach(c => {
    if (c && c.readyState === WebSocket.OPEN && c.room) {
      const r = c.room.toUpperCase();
      map[r] = (map[r] || 0) + 1;
    }
  });
  return Object.keys(map).map(r => ({ room: r, count: map[r] }));
}

function broadcastRooms() {
  const list = { type: 'rooms', rooms: getRooms() };
  const s = JSON.stringify(list);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(s);
    }
  });
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const room = url.searchParams.get('room');
  const side = url.searchParams.get('side');
  
  ws.room = room ? room.toUpperCase() : null;
  ws.side = side ? side.toLowerCase() : null;
  
  console.log('🟢 WebSocket conectado:', req.socket.remoteAddress, 'room:', ws.room);
  
  if (ws.room) {
    broadcastRooms();
  }

  // Enviar mensagem de boas-vindas
  try {
    ws.send(JSON.stringify({ 
      type: 'hello', 
      room: ws.room, 
      side: ws.side,
      timestamp: Date.now()
    }));
  } catch (e) {}

  ws.on('message', data => {
    try {
      // Log da mensagem
      let preview = (typeof data === 'string' ? data.slice(0, 120) : '[binary]');
      console.log('📨 Mensagem recebida:', preview);
      
      // Parse JSON
      if (typeof data === 'string') {
        const obj = JSON.parse(data);
        
        // Handle join message
        if (obj && obj.type === 'join' && obj.room) {
          ws.room = obj.room.toUpperCase();
          if (obj.side) ws.side = obj.side.toLowerCase();
          console.log('📝 Join:', ws.room, ws.side);
          broadcastRooms();
          return;
        }
        
        // Handle list request
        if (obj && obj.type === 'list') {
          const rooms = getRooms();
          ws.send(JSON.stringify({ type: 'rooms', rooms: rooms }));
          return;
        }
        
        // Handle ping
        if (obj && obj.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', now: Date.now() }));
          return;
        }
      }
      
      // Broadcast para sala
      wss.clients.forEach(client => {
        if (client !== ws && 
            client.readyState === WebSocket.OPEN && 
            client.room && 
            ws.room && 
            client.room === ws.room) {
          client.send(data);
        }
      });
    } catch (e) {
      console.error('❌ Erro ao processar mensagem:', e);
    }
  });

  ws.on('close', () => {
    console.log('🔴 WebSocket desconectado');
    ws.room = null;
    broadcastRooms();
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Rotas API
app.get('/rooms', (req, res) => {
  const rooms = getRooms();
  res.json({
    time: new Date().toISOString(),
    rooms: rooms,
    connectedClients: wss.clients.size
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    websocketClients: wss.clients.size,
    rooms: getRooms().length
  });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🎮 WebSocket disponível em ws://localhost:${PORT}`);
  console.log(`📊 Health check em http://localhost:${PORT}/health`);
  console.log(`📋 Salas em http://localhost:${PORT}/rooms`);
  console.log(`🌐 Interface web em http://localhost:${PORT}/`);
});

module.exports = { app, server, wss };