const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(express.json());
app.use(express.static(__dirname)); // Serve arquivos da pasta atual

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
  
  console.log('WebSocket conectado:', req.socket.remoteAddress, 'room:', ws.room);
  
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
      console.log('Mensagem recebida:', preview);
      
      // Parse JSON
      if (typeof data === 'string') {
        const obj = JSON.parse(data);
        
        // Handle join message
        if (obj && obj.type === 'join' && obj.room) {
          ws.room = obj.room.toUpperCase();
          if (obj.side) ws.side = obj.side.toLowerCase();
          console.log('Join:', ws.room, ws.side);
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
      console.error('Erro ao processar mensagem:', e);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket desconectado');
    ws.room = null;
    broadcastRooms();
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Rotas adicionais
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

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🎮 WebSocket disponível em ws://localhost:${PORT}`);
  console.log(`📊 Health check em http://localhost:${PORT}/health`);
  console.log(`📋 Salas em http://localhost:${PORT}/rooms`);
});

module.exports = { app, server, wss };