const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5500;
const ROOT = path.resolve(__dirname);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  try {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(ROOT, reqPath.replace(/^\/+/, ''));

    if (!filePath.startsWith(ROOT)) {
      res.statusCode = 403; res.end('Forbidden'); return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err) { res.statusCode = 404; res.end('Not found'); return; }
      if (stats.isDirectory()) {
        // try index.html inside directory
        const idx = path.join(filePath, 'index.html');
        if (fs.existsSync(idx)) {
          sendFile(idx, res); return;
        }
        res.statusCode = 403; res.end('Forbidden'); return;
      }
      sendFile(filePath, res);
    });
  } catch (e) { res.statusCode = 500; res.end('Server error'); }
});

function sendFile(filePath, res){
  const ext = path.extname(filePath).toLowerCase();
  const ct = mime[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', ct);
  const stream = fs.createReadStream(filePath);
  stream.on('error', ()=>{ res.statusCode = 500; res.end('Read error'); });
  stream.pipe(res);
}

server.listen(PORT, '0.0.0.0', ()=>{
  console.log(`Static server started: http://localhost:${PORT}/ (root ${ROOT})`);
});

process.on('SIGINT', ()=>{ console.log('Stopping static server'); process.exit(); });
