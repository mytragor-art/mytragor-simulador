const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Parse URL
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  
  // Route handling
  if (pathname === '/') {
    pathname = '/index.html';
  } else if (pathname === '/multiplayer') {
    pathname = '/multiplayer.html';
  }
  
  // Remove leading slash for file path
  const filePath = path.join(__dirname, pathname.substring(1));
  
  // Security check - prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, {'Content-Type': 'text/plain'});
    res.end('Access denied');
    return;
  }
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.log(`File not found: ${filePath}`);
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('File not found');
      return;
    }
    
    // Read and serve file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.log(`Error reading file: ${filePath}`, err);
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end('Internal server error');
        return;
      }
      
      // Determine content type
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      res.writeHead(200, {'Content-Type': contentType});
      res.end(data);
      console.log(`Served: ${filePath} (${contentType})`);
    });
  });
});

server.listen(PORT, () => {
  console.log(`[HTTP] Servidor rodando em http://localhost:${PORT}`);
  console.log(`[HTTP] Acesse: http://localhost:${PORT}/`);
  console.log(`[HTTP] Multiplayer: http://localhost:${PORT}/multiplayer`);
  console.log(`[HTTP] WebSocket Server: ws://localhost:8081`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Porta ${PORT} já está em uso. Tente outra porta.`);
  } else {
    console.error('Erro no servidor:', err);
  }
});