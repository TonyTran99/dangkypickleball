const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const bundledHtml = require('./app-template.js');

const PORT = process.env.PORT || 3000;
const DIR = __dirname;
const LOCAL_DB_FILE = path.join(DIR, 'du_lieu_san.json');
const TMP_DB_FILE = path.join(os.tmpdir(), 'du_lieu_san_pickleball.json');
const HTML_FILE = path.join(DIR, 'QuanLySanPickleball.html');

function getDefaultData() {
  const today = '2026-10-26';
  return {
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
}

let memoryStore = null;

function readDB() {
  try {
    if (!process.env.VERCEL && fs.existsSync(LOCAL_DB_FILE)) {
      memoryStore = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
      return memoryStore;
    }
  } catch (e) {}
  try {
    if (fs.existsSync(TMP_DB_FILE)) {
      memoryStore = JSON.parse(fs.readFileSync(TMP_DB_FILE, 'utf8'));
      return memoryStore;
    }
  } catch (e) {}
  if (!memoryStore) {
    memoryStore = getDefaultData();
    writeDB(memoryStore);
  }
  return memoryStore;
}

function writeDB(payload) {
  memoryStore = payload;
  if (!process.env.VERCEL) {
    try {
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(payload, null, 2), 'utf8');
      return;
    } catch (e) {}
  }
  try {
    fs.writeFileSync(TMP_DB_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (e) {}
}

function getLocalIP() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
          return iface.address;
        }
      }
    }
  } catch (e) {}
  return 'localhost';
}

function requestHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const host = req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const urlObj = new URL(req.url || '/', `${proto}://${host}`);

  if (urlObj.pathname === '/api/data' && req.method === 'GET') {
    try {
      const data = readDB();
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.startsWith('192.168.');
      data.serverInfo = {
        localIp: getLocalIP(),
        port: PORT,
        publicUrl: isLocal ? null : `${proto}://${host}`
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
    if (req.body && typeof req.body === 'object') {
      const payload = {
        updatedAt: Date.now(),
        bookings: req.body.bookings || {}
      };
      writeDB(payload);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, updatedAt: payload.updatedAt }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body || '{}');
        const payload = {
          updatedAt: Date.now(),
          bookings: incoming.bookings || {}
        };
        writeDB(payload);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, updatedAt: payload.updatedAt }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Serve main HTML app for all root/page routes
  try {
    let html = bundledHtml;
    if (!process.env.VERCEL && fs.existsSync(HTML_FILE)) {
      html = fs.readFileSync(HTML_FILE, 'utf8');
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (e) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(bundledHtml);
  }
}

if (!process.env.VERCEL && require.main === module) {
  const server = http.createServer(requestHandler);
  server.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log('==========================================================');
    console.log('  HE THONG QUAN LY 2 SAN PICKLEBALL DA KHOI DONG!');
    console.log('==========================================================');
    console.log(`1. Truy cap tren may tinh nay: http://localhost:${PORT}`);
    console.log(`2. Truy cap tren DIEN THOAI (cung Wi-Fi): http://${ip}:${PORT}`);
    console.log('==========================================================');
  });
}

module.exports = requestHandler;
