const express = require('express');
const router = express.Router();

// Mock do sistema de salas (em produção, usar Redis ou banco)
const rooms = new Map();

// GET /api/rooms - Listar salas ativas
router.get('/rooms', (req, res) => {
  try {
    const roomsList = [];
    rooms.forEach((players, roomName) => {
      roomsList.push({
        room: roomName,
        count: players.size,
        players: Array.from(players)
      });
    });

    res.json({
      time: new Date().toISOString(),
      rooms: roomsList,
      totalRooms: roomsList.length
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao listar salas',
      rooms: [] 
    });
  }
});

// POST /api/rooms/:room/join - Jogador entrar na sala
router.post('/rooms/:room/join', (req, res) => {
  try {
    const { room } = req.params;
    const { playerId, playerName } = req.body;
    
    if (!room || !playerId) {
      return res.status(400).json({ 
        error: 'Room e playerId são obrigatórios' 
      });
    }

    const roomName = room.toUpperCase();
    
    if (!rooms.has(roomName)) {
      rooms.set(roomName, new Set());
    }
    
    rooms.get(roomName).add(playerId);
    
    res.json({
      success: true,
      room: roomName,
      playerId,
      message: `Jogador ${playerId} entrou na sala ${roomName}`,
      playersInRoom: rooms.get(roomName).size
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao entrar na sala' 
    });
  }
});

// DELETE /api/rooms/:room/leave - Jogador sair da sala
router.delete('/rooms/:room/leave/:playerId', (req, res) => {
  try {
    const { room, playerId } = req.params;
    const roomName = room.toUpperCase();
    
    if (rooms.has(roomName)) {
      rooms.get(roomName).delete(playerId);
      
      // Remover sala se estiver vazia
      if (rooms.get(roomName).size === 0) {
        rooms.delete(roomName);
      }
    }
    
    res.json({
      success: true,
      room: roomName,
      playerId,
      message: `Jogador ${playerId} saiu da sala ${roomName}`
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao sair da sala' 
    });
  }
});

// GET /api/health - Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

module.exports = router;