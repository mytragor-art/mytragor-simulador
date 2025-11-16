const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Armazenamento de salas em memória
const ROOMS = new Map();

function getRoomsList() {
  const out = [];
  ROOMS.forEach((set, room) => { 
    out.push({ room, count: set.size }); 
  });
  return out;
}

function getRooms() {
  const map = {};
  wss.clients.forEach(c => {
    try {
      if (c && c.readyState === WebSocket.OPEN && c.room) {
        const r = c.room.toUpperCase();
        map[r] = (map[r] || 0) + 1;
      }
    } catch (e) {}
  });
  return Object.keys(map).map(r => ({ room: r, count: map[r] }));
}

function broadcastRooms() {
  const list = { type: 'rooms', rooms: getRooms() };
  const s = JSON.stringify(list);
  wss.clients.forEach(client => {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(s);
      }
    } catch (e) {}
  });
}

// Criar servidor HTTP para upgrade de WebSocket
const server = http.createServer((req, res) => {
  // Endpoint para listar salas (health check)
  if (req.url && req.url.indexOf('/rooms') === 0) {
    const out = {
      time: new Date().toISOString(),
      rooms: getRooms(),
      clients: wss.clients ? wss.clients.size : 0
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify(out, null, 2));
    return;
  }
  
  // Responder com 404 para outras rotas
  res.statusCode = 404;
  res.end('Not found');
});

// Criar servidor WebSocket
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  // Parse query parameters
  const query = url.parse(req.url, true).query;
  const room = query.room ? query.room.toUpperCase() : null;
  const side = query.side ? query.side.toLowerCase() : null;
  
  ws.room = room;
  ws.side = side;
  
  console.log('WebSocket conectado:', req.socket.remoteAddress, 'room:', room);
  
  // Se já tem sala, notificar sobre nova conexão
  if (ws.room) {
    try {
      broadcastRooms();
    } catch (e) {}
  }

  ws.on('message', data => {
    try {
      let preview = (typeof data === 'string' ? data.slice(0, 120) : '[binary]');
      console.log('Mensagem recebida:', req.socket.remoteAddress, 'room:', ws.room, '->', preview);
    } catch (e) {}
    
    // Parse JSON e handle mensagens especiais
    try {
      if (typeof data === 'string') {
        const obj = JSON.parse(data);
        
        // Handle join message
        if (obj && obj.type === 'join' && obj.room) {
          ws.room = obj.room.toUpperCase();
          if (obj.side) ws.side = obj.side.toLowerCase();
          console.log('Join message - room:', ws.room, 'side:', ws.side);
          broadcastRooms();
          return;
        }
        
        // Handle list request
        if (obj && obj.type === 'list') {
          const rooms = getRooms();
          console.log('List request - sending rooms:', rooms);
          try {
            ws.send(JSON.stringify({ type: 'rooms', rooms: rooms }));
          } catch (e) {
            console.warn('Failed to send rooms reply:', e);
          }
          return;
        }
        
        // Handle ping
        if (obj && obj.type === 'ping') {
          try {
            ws.send(JSON.stringify({ type: 'pong', now: Date.now() }));
          } catch (e) {}
          return;
        }
      }
    } catch (e) {
      // Ignorar erros de parse
    }
    
    // Broadcast para todos na mesma sala
    wss.clients.forEach(client => {
      try {
        if (client !== ws && 
            client.readyState === WebSocket.OPEN && 
            client.room && 
            ws.room && 
            client.room === ws.room) {
          client.send(data);
        }
      } catch (e) {}
    });
  });

  ws.on('close', () => {
    console.log('WebSocket desconectado:', req.socket.remoteAddress);
    ws.room = null;
    broadcastRooms();
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Exportar função para iniciar o servidor
function startServer(port) {
  const PORT = port || process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`🚀 Servidor WebSocket rodando na porta ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/rooms`);
  });
  return server;
}

module.exports = { startServer, server, wss };