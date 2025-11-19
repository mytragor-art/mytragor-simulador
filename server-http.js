const express = require('express');
const path = require('path');
const app = express();
const PORT = 3002;

// Servir arquivos estáticos
app.use(express.static('.'));

// Rota customizada para /multiplayer
app.get('/multiplayer', (req, res) => {
  res.sendFile(path.join(__dirname, 'multiplayer.html'));
});

// Rota para o simulador com parâmetros
app.get('/simulator', (req, res) => {
  res.sendFile(path.join(__dirname, 'mytragor_simulador.html'));
});

app.listen(PORT, () => {
  console.log(`[HTTP] Servidor rodando em http://localhost:${PORT}`);
  console.log(`[HTTP] Multiplayer: http://localhost:${PORT}/multiplayer`);
  console.log(`[HTTP] Simulator: http://localhost:${PORT}/simulator`);
});