// Vercel Serverless Function cho /api/data
const fs = require('fs');
const path = require('path');

const TMP_FILE = '/tmp/du_lieu_san_pickleball.json';

function getInitialData() {
  try {
    const bundled = path.join(process.cwd(), 'du_lieu_san.json');
    if (fs.existsSync(bundled)) {
      return JSON.parse(fs.readFileSync(bundled, 'utf8'));
    }
  } catch (e) {}
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

function readStore() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      memoryStore = JSON.parse(fs.readFileSync(TMP_FILE, 'utf8'));
      return memoryStore;
    }
  } catch (e) {}
  if (!memoryStore) {
    memoryStore = getInitialData();
  }
  return memoryStore;
}

function writeStore(payload) {
  memoryStore = payload;
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (e) {}
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    const data = readStore();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const payload = {
      updatedAt: Date.now(),
      bookings: body.bookings || {}
    };
    writeStore(payload);
    return res.status(200).json({ ok: true, updatedAt: payload.updatedAt });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
