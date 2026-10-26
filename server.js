const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const DIR = __dirname;
const DB_FILE = path.join(DIR, 'du_lieu_san.json');
const HTML_FILE = path.join(DIR, 'QuanLySanPickleball.html');

// Khởi tạo dữ liệu mặc định nếu chưa có file du_lieu_san.json
if (!fs.existsSync(DB_FILE)) {
  const today = '2026-10-26';
  const initialData = {
    updatedAt: Date.now(),
    bookings: {
      [`${today}_1_1`]: {
        customer: 'CLB Sáng Sớm', phone: '0903111222', type: 'regular',
        status: 'paid', courtPrice: 100, extraPrice: 30, note: '2 Nước suối, 1 Revive'
      },
      [`${today}_1_7`]: {
        customer: 'Thầy Hùng', phone: '0918222333', type: 'coach_tx',
        status: 'playing', courtPrice: 50, extraPrice: 15, note: 'Thầy dạy thường xuyên + 1 Revive'
      },
      [`${today}_1_9`]: {
        customer: 'Anh Tuấn', phone: '0909888777', type: 'regular',
        status: 'confirmed', courtPrice: 100, extraPrice: 0, note: 'Khách quen T2-4-6'
      },
      [`${today}_2_2`]: {
        customer: 'Chị Lan', phone: '0988777666', type: 'regular',
        status: 'paid', courtPrice: 100, extraPrice: 40, note: 'Thuê 2 vợt'
      },
      [`${today}_2_10`]: {
        customer: 'Thầy Nam', phone: '0977555444', type: 'coach_ktx',
        status: 'pending', courtPrice: 100, extraPrice: 0, note: 'Thầy dạy vãng lai'
      }
    }
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

let publicTunnelUrl = null;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (urlObj.pathname === '/api/data' && req.method === 'GET') {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const data = JSON.parse(raw);
      data.serverInfo = {
        localIp: getLocalIP(),
        port: PORT,
        publicUrl: publicTunnelUrl
      };
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (urlObj.pathname === '/api/data' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        const payload = {
          updatedAt: Date.now(),
          bookings: incoming.bookings || {}
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, updatedAt: payload.updatedAt }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Serve main HTML app
  if (urlObj.pathname === '/' || urlObj.pathname === '/index.html' || urlObj.pathname === '/QuanLySanPickleball.html') {
    try {
      const html = fs.readFileSync(HTML_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (e) {
      res.writeHead(500);
      res.end('Error loading HTML: ' + e.message);
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('==========================================================');
  console.log('  HE THONG QUAN LY 2 SAN PICKLEBALL DA KHOI DONG!');
  console.log('==========================================================');
  console.log(`1. Truy cap tren may tinh nay: http://localhost:${PORT}`);
  console.log(`2. Truy cap tren DIEN THOAI (cung Wi-Fi): http://${ip}:${PORT}`);
  console.log(`3. Link cho KHACH XEM LICH TRONG: http://${ip}:${PORT}/?mode=view`);
  console.log('==========================================================');
});
