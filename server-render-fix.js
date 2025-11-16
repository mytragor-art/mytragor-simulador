const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Middleware para JSON
app.use(express.json());

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

// Rota principal com fallback para diferentes arquivos
app.get('/', (req, res) => {
  const possibleFiles = [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'client', 'index.html'),
    path.join(__dirname, 'client', 'dist', 'index.html'),
    path.join(__dirname, 'multiplayer.html'),
    path.join(__dirname, 'mytragor_simulador.html')
  ];
  
  for (const file of possibleFiles) {
    if (fileExists(file)) {
      return res.sendFile(file);
    }
  }
  
  // Se nenhum arquivo encontrado, criar HTML básico
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>MyTragor Simulador</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .status { padding: 20px; background: #f0f0f0; border-radius: 5px; margin: 20px 0; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎮 MyTragor Simulador</h1>
        <div class="status">
          <h3>Servidor WebSocket Online!</h3>
          <p>Status: <span id="status">Desconectado</span></p>
          <p>Salas: <span id="rooms">-</span></p>
        </div>
        <div>
          <input type="text" id="roomInput" placeholder="Nome da Sala" value="SALA1">
          <button onclick="connect()">Conectar</button>
          <button onclick="disconnect()">Desconectar</button>
        </div>
        <div>
          <input type="text" id="messageInput" placeholder="Mensagem">
          <button onclick="sendMessage()">Enviar</button>
        </div>
        <div id="messages" style="margin-top: 20px; padding: 10px; background: #f9f9f9; border-radius: 5px; min-height: 200px;"></div>
      </div>
      <script>
        let ws = null;
        
        function connect() {
          const room = document.getElementById('roomInput').value;
          ws = new WebSocket('ws://' + window.location.host + '?room=' + room);
          
          ws.onopen = () => {
            document.getElementById('status').textContent = 'Conectado';
            addMessage('✅ Conectado à sala ' + room);
          };
          
          ws.onmessage = (event) => {
            addMessage('📨 ' + event.data);
          };
          
          ws.onclose = () => {
            document.getElementById('status').textContent = 'Desconectado';
            addMessage('❌ Desconectado');
          };
          
          ws.onerror = (error) => {
            addMessage('❌ Erro: ' + error);
          };
        }
        
        function disconnect() {
          if (ws) {
            ws.close();
            ws = null;
          }
        }
        
        function sendMessage() {
          const message = document.getElementById('messageInput').value;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(message);
            addMessage('📤 Você: ' + message);
            document.getElementById('messageInput').value = '';
          }
        }
        
        function addMessage(msg) {
          const messages = document.getElementById('messages');
          messages.innerHTML += '<div>' + new Date().toLocaleTimeString() + ' - ' + msg + '</div>';
          messages.scrollTop = messages.scrollHeight;
        }
        
        // Atualizar lista de salas
        function updateRooms() {
          fetch('/rooms')
            .then(response => response.json())
            .then(data => {
              document.getElementById('rooms').textContent = JSON.stringify(data.rooms);
            })
            .catch(err => console.error('Erro ao buscar salas:', err));
        }
        
        // Atualizar a cada 5 segundos
        setInterval(updateRooms, 5000);
        updateRooms();
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