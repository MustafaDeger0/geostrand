/**
 * ============================================================================
 *  GeoStrand — Çevrim İçi Sunucu
 * ============================================================================
 *  Tek bir Node.js programı iki iş yapar:
 *    1) Oyunun dosyalarını (index.html, js/, css/) sunar → oyun bu adreste açılır
 *    2) Socket.IO ile çevrim içi yarışları yönetir:
 *         • Hızlı eşleşme : dünyanın her yerinden rastgele rakiplerle yarış
 *         • Özel oda      : 4 harfli kodla arkadaşlarla yarış
 *
 *  Çalıştırma (bilgisayarında):   npm install   →   npm start   →  http://localhost:3000
 *  İnternette (Render.com):       README → "Çevrim içi yayın" adımları
 *
 *  GÜVENLİK (internete açık olduğu için)
 *    • Cevap, süre ve puan SUNUCUDA hesaplanır (RaceRoom.submitGuess)
 *    • Gelen her mesaj boyut ve tür olarak denetlenir, hatalı mesaj sunucuyu düşürmez
 *    • Oyuncu başına mesaj hızı sınırlıdır (sel/spam koruması)
 *    • Ad ve görünüm temizlenir; HTML olarak değil, metin olarak gösterilir
 *    • Yalnızca oyun dosyaları sunulur (server/, node_modules/, gizli dosyalar kapalı)
 * ============================================================================
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Server } = require('socket.io');
const { RaceRoom } = require('./RaceRoom.js');

const ROOT = path.resolve(__dirname, '..');
const CODE_LETTERS = 'ABCDEFGHJKLMNPRSTUVYZ';   // karışabilecek harfler (I, O, Q…) yok
const MAX_ROOMS = 2000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};
// Sunulmayacak klasör ve dosyalar
const BLOCKED = /^\/(server|node_modules|tests|scripts|android|ios|www|store|\.git|\.github)(\/|$)|\/\.|^\/(package(-lock)?\.json|render\.yaml|codemagic\.yaml|capacitor\.config\.json)$/;

// ====================================================================== //
//  1) Oyun dosyaları
// ====================================================================== //
function serveStatic(req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch (e) {
    res.writeHead(400).end();
    return;
  }
  if (urlPath === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok');
    return;
  }
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT + path.sep) || BLOCKED.test(urlPath)) {
    res.writeHead(403).end('Yasak');
    return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bulunamadı');
      return;
    }
    // Her açılışta güncel sürüm: tarayıcı değişip değişmediğini sorar (ETag)
    const etag = `"${st.size.toString(36)}-${st.mtimeMs.toString(36)}"`;
    const headers = {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      ETag: etag,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    };
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers).end();
      return;
    }
    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(file).pipe(res);
  });
}

// ====================================================================== //
//  2) Çevrim içi yarış
// ====================================================================== //
function createServer({ clock, rng, log = console.log } = {}) {
  const httpServer = http.createServer(serveStatic);
  const io = new Server(httpServer, {
    maxHttpBufferSize: 16 * 1024,       // büyük mesaj gönderilemez
    pingInterval: 20000,
    pingTimeout: 25000,
    cors: { origin: true },              // oyun başka bir adreste yayınlanırsa (ör. GitHub Pages)
  });

  const rooms = new Map();               // kod → RaceRoom
  const sockets = new Map();             // socket.id → {room, playerId}

  function newCode() {
    for (let tries = 0; tries < 1000; tries++) {
      let c = '';
      for (let i = 0; i < 4; i++) c += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
      if (!rooms.has(c)) return c;
    }
    throw new Error('Oda kodu üretilemedi');
  }

  function makeRoom(isPublic) {
    if (rooms.size >= MAX_ROOMS) return null;
    const code = newCode();
    const room = new RaceRoom({
      code,
      isPublic,
      clock,
      rng,
      emit: (event, payload) => io.to(`room:${code}`).emit(event, payload),
      onClosed: () => {
        rooms.delete(code);
        log(`[oda] ${code} kapandı (açık oda: ${rooms.size})`);
      },
    });
    rooms.set(code, room);
    log(`[oda] ${code} açıldı${isPublic ? ' (hızlı eşleşme)' : ''} (açık oda: ${rooms.size})`);
    return room;
  }

  /** Hızlı eşleşme: dolmamış, başlamamış bir herkese açık oda bul; yoksa aç */
  function findQuickRoom() {
    let best = null;
    rooms.forEach((r) => {
      if (r.acceptsQuickPlayers && (!best || r.connectedCount > best.connectedCount)) best = r;
    });
    return best || makeRoom(true);
  }

  io.on('connection', (socket) => {
    const limiter = rateLimiter();

    /** Odaya yerleştir ve ilk durumu gönder */
    function seat(room, player) {
      leaveCurrent(false);
      sockets.set(socket.id, { room, playerId: player.id });
      socket.join(`room:${room.code}`);
      // Yarış sürerken dönen oyuncu: mevcut turu da alsın
      // (Hızlı oda bu oyuncu gelince dolup başlamış olabilir: önce "başlıyor", sonra tur)
      if (room.phase === 'playing' && room.round) {
        socket.emit('game:starting', { code: room.code });
        socket.emit('round:start', room.roundPayload());
      }
      room.broadcastState();
      return { ok: true, code: room.code, token: player.token, playerId: player.id, isPublic: room.isPublic };
    }

    function leaveCurrent(explicit) {
      const s = sockets.get(socket.id);
      if (!s) return;
      sockets.delete(socket.id);
      socket.leave(`room:${s.room.code}`);
      if (explicit) s.room.leave(s.playerId);
      else s.room.disconnect(s.playerId);
    }

    /** Her olay: hız sınırı + hata yakalama + cevap fonksiyonu güvenliği */
    function on(event, cost, handler) {
      socket.on(event, (payload, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        if (!limiter(cost)) {
          reply({ error: 'Çok hızlı! Biraz yavaşla.' });
          return;
        }
        try {
          handler(payload && typeof payload === 'object' ? payload : {}, reply);
        } catch (e) {
          log('[hata]', event, e && e.message);
          reply({ error: 'Sunucu hatası.' });
        }
      });
    }

    on('quick:join', 3, (p, reply) => {
      const room = findQuickRoom();
      if (!room) return reply({ error: 'Sunucu şu an çok yoğun, birazdan tekrar dene.' });
      const { player, error } = room.addPlayer({ name: p.name, appearance: p.appearance });
      if (error) return reply({ error });
      reply(seat(room, player));
    });

    on('room:create', 3, (p, reply) => {
      const room = makeRoom(false);
      if (!room) return reply({ error: 'Sunucu şu an çok yoğun, birazdan tekrar dene.' });
      const { player, error } = room.addPlayer({ name: p.name, appearance: p.appearance });
      if (error) return reply({ error });
      reply(seat(room, player));
    });

    on('room:join', 2, (p, reply) => {
      const code = String(p.code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
      const room = rooms.get(code);
      if (!room || room.isPublic) return reply({ error: 'Bu kodla bir oda bulunamadı.' });
      const { player, error } = room.addPlayer({ name: p.name, appearance: p.appearance });
      if (error) return reply({ error });
      reply(seat(room, player));
    });

    on('room:rejoin', 2, (p, reply) => {
      const code = String(p.code || '').toUpperCase().slice(0, 4);
      const room = rooms.get(code);
      const player = room && typeof p.token === 'string' ? room.rejoin(p.token) : null;
      if (!player) return reply({ error: 'Oturum bulunamadı.' });
      reply(seat(room, player));
    });

    on('room:settings', 1, (p, reply) => {
      const s = sockets.get(socket.id);
      if (!s) return reply({ error: 'Odada değilsin.' });
      reply(s.room.updateSettings(s.playerId, p));
    });

    on('game:start', 2, (p, reply) => {
      const s = sockets.get(socket.id);
      if (!s) return reply({ error: 'Odada değilsin.' });
      reply(s.room.start(s.playerId));
    });

    on('guess:submit', 1, (p, reply) => {
      const s = sockets.get(socket.id);
      if (!s) return reply({ error: 'Odada değilsin.' });
      reply(s.room.submitGuess(s.playerId, p.guess));
    });

    on('player:progress', 1, (p) => {
      const s = sockets.get(socket.id);
      if (s) s.room.progress(s.playerId, p.found);
    });

    // Konum: yalnızca aynı odadakilere aktarılır (hafif, kaybolabilir mesaj)
    on('player:move', 0.1, (p) => {
      const s = sockets.get(socket.id);
      if (!s || s.room.phase !== 'playing') return;
      const x = Number(p.x);
      const y = Number(p.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const f = ['up', 'down', 'left', 'right'].includes(p.f) ? p.f : 'down';
      socket.volatile.to(`room:${s.room.code}`).emit('player:moved', {
        id: s.playerId, x: Math.round(x), y: Math.round(y), f, m: !!p.m,
      });
    });

    // Uygunsuz ad şikâyeti (App Store / Google Play kullanıcı içeriği kuralı)
    on('player:report', 2, (p, reply) => {
      const s = sockets.get(socket.id);
      if (!s) return reply({ error: 'Odada değilsin.' });
      const res = s.room.report(s.playerId, p.id);
      if (res.ok) log(`[şikâyet] oda ${s.room.code}: ${s.playerId} → ${p.id}${res.renamed ? ' (ad değiştirildi)' : ''}`);
      reply(res);
    });

    // Lobide "şu an X kâşif çevrim içi" bilgisi
    on('server:stats', 0.5, (p, reply) => {
      let racing = 0;
      let waiting = 0;
      rooms.forEach((r) => {
        if (r.phase === 'playing' || r.phase === 'roundEnd') racing += r.connectedCount;
        else if (r.isPublic && r.phase === 'lobby') waiting += r.connectedCount;
      });
      reply({ online: io.engine.clientsCount, racing, waiting });
    });

    on('room:leave', 1, (p, reply) => {
      leaveCurrent(true);
      reply({ ok: true });
    });

    socket.on('disconnect', () => leaveCurrent(false));
  });

  return {
    httpServer,
    io,
    rooms,
    listen(port, host) {
      return new Promise((resolve) => httpServer.listen(port, host, () => resolve(httpServer.address().port)));
    },
    close() {
      rooms.forEach((r) => r.close());
      io.close();
      return new Promise((resolve) => {
        httpServer.close(() => resolve());
        if (httpServer.closeAllConnections) httpServer.closeAllConnections();
      });
    },
  };
}

/**
 * Basit kova algoritması: saniyede 15 "jeton" dolar, en fazla 30 birikir.
 * Konum mesajı 0,1; tahmin 1; oda kurma 3 jeton harcar.
 */
function rateLimiter(perSecond = 15, burst = 30) {
  let tokens = burst;
  let last = Date.now();
  return (cost) => {
    const now = Date.now();
    tokens = Math.min(burst, tokens + ((now - last) / 1000) * perSecond);
    last = now;
    if (tokens < cost) return false;
    tokens -= cost;
    return true;
  };
}

// ====================================================================== //
//  Doğrudan çalıştırılınca (npm start)
// ====================================================================== //
if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const app = createServer();
  app.listen(port, '0.0.0.0').then((p) => {
    console.log('\n  🧭 GeoStrand çevrim içi sunucu çalışıyor');
    console.log(`  Bu bilgisayarda:  http://localhost:${p}`);
    Object.values(os.networkInterfaces()).flat()
      .filter((n) => n && n.family === 'IPv4' && !n.internal)
      .forEach((n) => console.log(`  Aynı ağda:        http://${n.address}:${p}`));
    console.log('  (İnternette yayınlamak için README → "Çevrim içi yayın")\n');
  });
  const stop = () => app.close().then(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

module.exports = { createServer, rateLimiter };
