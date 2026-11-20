const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createDatabase } = require('./db');

const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function getLocalNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const ifaceList of Object.values(interfaces)) {
    if (!ifaceList) continue;
    for (const iface of ifaceList) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('Corpo da requisição muito grande'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function serveStaticFile(reqPath, res) {
  let cleanPath = reqPath === '/' ? '/index.html' : reqPath;
  cleanPath = decodeURIComponent(cleanPath.split('?')[0]);
  const safePath = path.normalize(cleanPath).replace(/^(\.\.[/\\])+/, '');
  let fullPath = path.join(PUBLIC_DIR, safePath);

  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Acesso negado');
    return;
  }

  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    fullPath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const content = fs.readFileSync(fullPath);

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache' : 'public, max-age=3600'
  });
  res.end(content);
}

function createAppServer({ dbPath, port = Number(process.env.PORT || 3000) } = {}) {
  const store = createDatabase(dbPath);
  const actualPortRef = { port };

  const server = http.createServer(async (req, res) => {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const method = req.method.toUpperCase();

    if (pathname.startsWith('/api/')) {
      try {
        const farmId = store.getActiveFarmId();

        if (method === 'GET' && pathname === '/api/bootstrap') {
          const summary = store.calculateFarmSummary(farmId);
          const ips = getLocalNetworkIPs();
          const portToUse = server.address()?.port || actualPortRef.port;
          const mobileUrls = ips.map((ip) => `http://${ip}:${portToUse}`);
          return sendJson(res, 200, {
            ok: true,
            serverTime: new Date().toISOString(),
            mobileUrls,
            ...summary
          });
        }

        if (method === 'PUT' && pathname === '/api/farm') {
          const body = await parseJsonBody(req);
          store.updateFarm(farmId, body);
          return sendJson(res, 200, { ok: true, data: store.calculateFarmSummary(farmId) });
        }

        if (method === 'POST' && pathname === '/api/animals') {
          const body = await parseJsonBody(req);
          const id = store.createAnimalGroup(farmId, body);
          return sendJson(res, 201, { ok: true, id, data: store.calculateFarmSummary(farmId) });
        }

        const animalMatch = pathname.match(/^\/api\/animals\/(\d+)$/);
        if (animalMatch) {
          const id = Number(animalMatch[1]);
          if (method === 'PUT') {
            const body = await parseJsonBody(req);
            store.updateAnimalGroup(id, body);
            return sendJson(res, 200, { ok: true, data: store.calculateFarmSummary(farmId) });
          }
          if (method === 'DELETE') {
            store.deleteAnimalGroup(id);
            return sendJson(res, 200, { ok: true, data: store.calculateFarmSummary(farmId) });
          }
        }

        const animalMovementMatch = pathname.match(/^\/api\/animals\/(\d+)\/movement$/);
        if (method === 'POST' && animalMovementMatch) {
          const id = Number(animalMovementMatch[1]);
          const body = await parseJsonBody(req);
          store.recordAnimalMovement(id, body);
          return sendJson(res, 200, { ok: true, data: store.calculateFarmSummary(farmId) });
        }

        if (method === 'POST' && pathname === '/api/feeds') {
          const body = await parseJsonBody(req);
          const id = store.createFeed(farmId, body);
          return sendJson(res, 201, { ok: true, id, data: store.calculateFarmSummary(farmId) });
        }

        if (method === 'POST' && pathname === '/api/feeds/serve-all') {
          const body = await parseJsonBody(req);
          const served = store.serveAllDailyFeeds(farmId, body);
          return sendJson(res, 200, { ok: true, served, data: store.calculateFarmSummary(farmId) });
        }

        const feedMatch = pathname.match(/^\/api\/feeds\/(\d+)$/);
        if (feedMatch) {
          const id = Number(feedMatch[1]);
          if (method === 'PUT') {
            const body = await parseJsonBody(req);
            store.updateFeed(id, body);
            return sendJson(res, 200, { ok: true, data: store.calculateFarmSummary(farmId) });
          }
          if (method === 'DELETE') {
            store.deleteFeed(id);
            return sendJson(res, 200, { ok: true, data: store.calculateFarmSummary(farmId) });
          }
        }

        const feedAdjustMatch = pathname.match(/^\/api\/feeds\/(\d+)\/adjust$/);
        if (method === 'POST' && feedAdjustMatch) {
          const id = Number(feedAdjustMatch[1]);
          const body = await parseJsonBody(req);
          store.adjustFeedStock(id, body);
          return sendJson(res, 200, { ok: true, data: store.calculateFarmSummary(farmId) });
        }

        if (method === 'POST' && pathname === '/api/water') {
          const body = await parseJsonBody(req);
          const id = store.createWaterStation(farmId, body);
          return sendJson(res, 201, { ok: true, id, data: store.calculateFarmSummary(farmId) });
        }

        const waterMatch = pathname.match(/^\/api\/water\/(\d+)$/);
        if (waterMatch) {
          const id = Number(waterMatch[1]);
          if (method === 'PUT') {
            const body = await parseJsonBody(req);
            store.updateWaterStation(id, body);
            return sendJson(res, 200, { ok: true, data: store.calculateFarmSummary(farmId) });
          }
          if (method === 'DELETE') {
            store.deleteWaterStation(id);
            return sendJson(res, 200, { ok: true, data: store.calculateFarmSummary(farmId) });
          }
        }

        const waterChangeMatch = pathname.match(/^\/api\/water\/(\d+)\/change$/);
        if (method === 'POST' && waterChangeMatch) {
          const id = Number(waterChangeMatch[1]);
          const body = await parseJsonBody(req);
          store.changeWaterStation(id, body);
          return sendJson(res, 200, { ok: true, data: store.calculateFarmSummary(farmId) });
        }

        if (method === 'POST' && pathname === '/api/vitamins') {
          const body = await parseJsonBody(req);
          const id = store.createVitaminSchedule(farmId, body);
          return sendJson(res, 201, { ok: true, id, data: store.calculateFarmSummary(farmId) });
        }

        const vitMatch = pathname.match(/^\/api\/vitamins\/(\d+)$/);
        if (vitMatch) {
          const id = Number(vitMatch[1]);
          if (method === 'PUT') {
            const body = await parseJsonBody(req);
            store.updateVitaminSchedule(id, body);
            return sendJson(res, 200, { ok: true, data: store.calculateFarmSummary(farmId) });
          }
          if (method === 'DELETE') {
            store.deleteVitaminSchedule(id);
            return sendJson(res, 200, { ok: true, data: store.calculateFarmSummary(farmId) });
          }
        }

        const vitApplyMatch = pathname.match(/^\/api\/vitamins\/(\d+)\/apply$/);
        if (method === 'POST' && vitApplyMatch) {
          const id = Number(vitApplyMatch[1]);
          const body = await parseJsonBody(req);
          store.applyVitaminSchedule(id, body);
          return sendJson(res, 200, { ok: true, data: store.calculateFarmSummary(farmId) });
        }

        if (method === 'POST' && pathname === '/api/sync-batch') {
          const body = await parseJsonBody(req);
          const results = store.processSyncBatch(farmId, body.actions || []);
          return sendJson(res, 200, { ok: true, results, data: store.calculateFarmSummary(farmId) });
        }

        if (method === 'POST' && pathname === '/api/reset') {
          store.resetFarmData(farmId);
          return sendJson(res, 200, { ok: true, data: store.calculateFarmSummary(farmId) });
        }

        return sendJson(res, 404, { ok: false, error: 'Endpoint não encontrado' });
      } catch (err) {
        const status = err.message && err.message.includes('não encontrad') ? 404 : 400;
        return sendJson(res, status, { ok: false, error: err.message || 'Erro interno' });
      }
    }

    serveStaticFile(pathname, res);
  });

  return { server, store };
}

if (require.main === module) {
  const desiredPort = Number(process.env.PORT || 3000);
  const { server } = createAppServer({ port: desiredPort });

  const startServer = (portToTry) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE' && portToTry < desiredPort + 10) {
        console.warn(`Porta ${portToTry} em uso, tentando porta ${portToTry + 1}...`);
        startServer(portToTry + 1);
      } else {
        console.error('Erro ao iniciar servidor:', err);
        process.exit(1);
      }
    });

    server.listen(portToTry, '0.0.0.0', () => {
      const ips = getLocalNetworkIPs();
      console.log('=======================================================');
      console.log('  AgroRancho SaaS - Sistema de Manejo Fazenda & Rancho ');
      console.log('=======================================================');
      console.log(`  Computador: http://localhost:${portToTry}`);
      if (ips.length > 0) {
        ips.forEach((ip) => {
          console.log(`  iPhone (Wi-Fi): http://${ip}:${portToTry}`);
        });
      }
      console.log('=======================================================');
    });
  };

  startServer(desiredPort);
}

module.exports = {
  createAppServer,
  getLocalNetworkIPs
};
