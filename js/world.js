// =============================================================
//  PINTURA DAS SALAS EM PIXEL ART
//  Cada sala é pintada uma vez (blocos, musgo, tochas, correntes...)
//  e guardada. O fundo em camadas (parallax) também.
// =============================================================

const WOOD = ['#140d09', '#2a1d14', '#3f2c1f', '#57402d', '#73573e'];
const IRON = ['#121417', '#262a2f', '#3d424a', '#5e646d', '#8f97a1'];

function makeRoomData(id) {
  const def = ROOMS[id];
  const h = def.map.length, w = def.map[0].length;
  const tiles = [];
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    const c = def.map[ty][tx] || '.';
    tiles.push('#=^B'.includes(c) ? c : '.');
  }
  return { id, def, w, h, pw: w * TILE, ph: h * TILE, tiles };
}

function buildRoomArt(room) {
  const th = THEMES[room.def.theme], st = th.stone.map(c => C(c)), moss = th.moss.map(c => C(c));
  const T = TILE * AP;                         // 64 pixels de arte por bloco
  const W = room.pw * AP, H = room.ph * AP;
  const L = new PixBuf(W, H);
  const at = (tx, ty) => (tx < 0 || ty < 0 || tx >= room.w || ty >= room.h) ? 'X' : room.tiles[ty * room.w + tx];
  const solid = (tx, ty) => { const c = at(tx, ty); return c === '#' || c === 'X'; };
  const air = (tx, ty) => { const c = at(tx, ty); return c === '.' || c === '=' || c === 'B'; };
  const lights = [], flames = [];
  const seed = room.id.length * 31;

  // distância (em blocos) até o ar em cada direção
  const dist = (tx, ty, dx, dy) => { let n = 0; while (n < 6 && solid(tx + dx * (n + 1), ty + dy * (n + 1))) n++; return n; };

  // ---------------- 1) fundo: pilares com tochas, estandartes, correntes, teias ----------------
  const surfaces = [];
  for (let ty = 1; ty < room.h; ty++) for (let tx = 1; tx < room.w - 1; tx++)
    if (solid(tx, ty) && air(tx, ty - 1) && air(tx, ty - 2) && air(tx, ty - 3)) surfaces.push([tx, ty]);
  let lastPillar = -99;
  for (const [tx, ty] of surfaces) {
    if (tx - lastPillar < 6 || hash(tx, ty, seed) > th.torches) continue;
    if ((room.def.map[ty - 1][tx] || '.') !== '.') continue;
    lastPillar = tx;
    let top = ty - 1; while (top > 0 && !solid(tx, top - 1)) top--;
    const x0 = tx * T + 10, pw = 44, y1 = ty * T, y0 = top * T;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x0 + pw; x++) {
      const lx = x - x0, row = Math.floor(y / 14), lxx = (lx + (row & 1) * 11) % 22;
      let k = (y % 14 === 0 || lxx === 0) ? 0 : (hash(Math.floor((lx + (row & 1) * 11) / 22), row, 3) > 0.6 ? 2 : 1);
      if (lx < 2 || lx > pw - 3) k = 0;
      if (lx === 2 && k) k = 2;
      L.set(x, y, scaleCol(st[k], 0.62));
    }
    const win = th.windows && hash(tx, 5) > 0.45;
    if (win) {
      const ws = SPR.window || (SPR.window = windowSprite(th.stone));
      L.blit(ws, x0 + pw / 2 - ws.w / 2, y1 - 3.2 * T);
      lights.push({ x: (x0 + pw / 2) / AP, y: (y1 - 2.7 * T) / AP, r: 60, col: [140, 170, 230], flick: 0, a: 0.8 });
    }
    const sc = SPR.sconceBuf;
    const sx = x0 + pw / 2 - 9, sy = y1 - (win ? 1.2 : 1.6) * T;
    L.blit(sc, sx, sy);
    flames.push({ kind: 'flameTorch', x: sx + 3, y: sy - 10 });
    lights.push({ x: (sx + 9) / AP, y: (sy - 2) / AP, r: 78, col: [255, 150, 60], flick: 1, a: 1 });
  }
  // tochas presas nas paredes laterais
  for (let ty = 1; ty < room.h - 1; ty++) for (let tx = 0; tx < room.w; tx++) {
    if (!air(tx, ty) || !air(tx, ty + 1) || at(tx, ty) !== '.') continue;
    const wl = solid(tx - 1, ty) && tx > 0, wr = solid(tx + 1, ty) && tx < room.w - 1;
    if (!(wl || wr) || hash(tx, ty, seed + 60) > 0.22) continue;
    const lx = (tx + 0.5) * TILE, ly = (ty + 0.4) * TILE;
    if (lights.some(l => Math.hypot(l.x - lx, l.y - ly) < 110)) continue;
    const sx = wl ? tx * T + 2 : tx * T + T - 20, sy = ty * T + 20;
    L.rect(wl ? tx * T : sx + 10, sy + 14, 10, 4, C('#2a2a30'));
    L.blit(SPR.sconceBuf, sx, sy);
    flames.push({ kind: 'flameTorch', x: sx + 3, y: sy - 10 });
    lights.push({ x: (sx + 9) / AP, y: (sy - 2) / AP, r: 78, col: [255, 150, 60], flick: 1, a: 1 });
  }
  for (let ty = 1; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
    if (!(solid(tx, ty - 1) && air(tx, ty))) continue;
    const h = hash(tx, ty, seed + 7);
    if (th.banners && h < 0.12) {
      L.blit(bannerSprite(th.banners, tx * 7 + ty), tx * T + 17, ty * T);
    } else if ((th.chains ? 0.5 : 0.14) > hash(tx, ty, seed + 8)) {
      const cx = tx * T + 8 + Math.floor(hash(tx, ty, 2) * 46);
      const len = 30 + Math.floor(hash(ty, tx, 3) * (th.chains ? 220 : 110));
      drawChain(L, cx, ty * T, len);
    }
    if (hash(tx, ty, seed + 9) < 0.3 && (solid(tx - 1, ty) || solid(tx + 1, ty))) {
      const left = solid(tx - 1, ty), ox = left ? tx * T : tx * T + T - 1, sgn = left ? 1 : -1, oy = ty * T;
      const web = C('#9a9a94', 120);
      for (let a = 0; a < 5; a++) {
        const ang = a / 4 * Math.PI / 2;
        L.line(ox, oy, ox + sgn * Math.cos(ang) * 26, oy + Math.sin(ang) * 26, web);
      }
      for (let r = 7; r <= 25; r += 6)
        for (let a = 0; a <= 90; a += 3) L.set(ox + sgn * Math.cos(a * Math.PI / 180) * r, oy + Math.sin(a * Math.PI / 180) * r * (0.92 + 0.08 * Math.sin(a)), web);
    }
  }

  // ---------------- 2) blocos de pedra ----------------
  for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
    if (at(tx, ty) !== '#') continue;
    const du = dist(tx, ty, 0, -1), dd = dist(tx, ty, 0, 1), dl = dist(tx, ty, -1, 0), dr = dist(tx, ty, 1, 0);
    const big = 9999;
    const eU = ty === 0 ? big : du * T, eD = ty === room.h - 1 ? big : dd * T;
    const eL = tx === 0 ? big : dl * T, eR = tx === room.w - 1 ? big : dr * T;
    const openU = air(tx, ty - 1);
    for (let ly = 0; ly < T; ly++) for (let lx = 0; lx < T; lx++) {
      const X = tx * T + lx, Y = ty * T + ly;
      const d = Math.min(eU < big && du < 6 ? eU + ly : big, eD < big && dd < 6 ? eD + (T - 1 - ly) : big,
                         eL < big && dl < 6 ? eL + lx : big, eR < big && dr < 6 ? eR + (T - 1 - lx) : big);
      // borda gasta (pedaços faltando)
      if (d < 3 && !(openU && ly < 3) && noise(X * 0.35, Y * 0.35, 5) > 0.68) continue;
      const row = Math.floor(Y / 16), off = (row & 1) * 16 + Math.floor(hash(row, 1, seed) * 8);
      const bx = Math.floor((X + off) / 32), bl = (X + off) % 32, bly = Y % 16;
      let k;
      if (bl === 0 || bly === 0) k = 0;
      else {
        const tone = hash(bx, row, seed);
        k = tone < 0.25 ? 1 : tone < 0.85 ? 2 : 3;
        if (bly === 1) k++;
        else if (bly === 15 || bl === 31) k--;
        const n = noise(X * 0.11, Y * 0.11, bx + row);
        if (n > 0.72 + dither(X, Y) * 0.1) k++;
        else if (n < 0.22 + dither(X, Y) * 0.1) k--;
        if (hash(bx, row, 5) > 0.88 && bl > 5 && bl < 25 && Math.abs((bly - 3) - (bl - 6) * 0.45) < 0.55) k = 0;
        k -= Math.floor(d / 44 + dither(X, Y));       // mais fundo = mais escuro
      }
      if (d < 2) k = 0;
      L.set(X, Y, st[Math.max(0, Math.min(4, k))]);
    }
  }

  // ---------------- 3) musgo, grama e raízes ----------------
  for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
    if (at(tx, ty) !== '#') continue;
    if (ty > 0 && air(tx, ty - 1)) {
      for (let lx = 0; lx < T; lx++) {
        const X = tx * T + lx, Y0 = ty * T;
        let m = 3 + Math.floor(noise(X * 0.07, ty, 11) * 6);
        if (hash(X >> 1, ty, 12) < (th.roots ? 0.12 : 0.06)) m += 6 + Math.floor(hash(X, ty, 13) * 12);
        for (let y = 0; y < m; y++) {
          const k = y === 0 ? 2 : y < m - 2 ? (dither(X, Y0 + y) < 0.25 ? 2 : 1) : 0;
          L.set(X, Y0 + y, moss[k]);
        }
        if (hash(X, ty, 14) < 0.4) {
          const bh = 1 + Math.floor(hash(X, ty, 15) * (th.roots ? 7 : 5));
          for (let y = 1; y <= bh; y++) L.set(X, Y0 - y, moss[y === bh ? 2 : 1]);
        }
      }
    }
    if (ty < room.h - 1 && air(tx, ty + 1)) {
      for (let lx = 2; lx < T - 2; lx++) {
        const X = tx * T + lx;
        if (hash(X, ty, 21) > (th.roots ? 0.1 : 0.05)) continue;
        const len = 4 + Math.floor(hash(X, ty, 22) * (th.roots ? 34 : 18));
        for (let y = 0; y < len; y++) {
          const wob = Math.round(Math.sin((y + X) * 0.3) * 0.6);
          L.set(X + wob, (ty + 1) * T + y, y % 7 === 3 ? moss[2] : moss[0]);
        }
      }
    }
  }

  // ---------------- 4) plataformas de madeira e estacas ----------------
  const wd = WOOD.map(c => C(c)), ir = IRON.map(c => C(c));
  for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
    const c = at(tx, ty), x0 = tx * T, y0 = ty * T;
    if (c === '=') {
      const lj = at(tx - 1, ty) === '=', rj = at(tx + 1, ty) === '=';
      for (let ly = 0; ly < 15; ly++) for (let lx = 0; lx < T; lx++) {
        const X = x0 + lx, seam = X % 32 === 0;
        let k = ly === 0 ? 4 : ly === 1 ? 3 : ly > 12 ? 1 : 2;
        if (ly > 1 && ly < 13 && noise(X * 0.06, ly * 0.9 + (X >> 5) * 7, 31) > 0.66) k = 3;
        if (ly > 1 && ly < 13 && hash(X >> 2, ly, 32) < 0.06) k = 1;
        if (seam || ly === 14) k = 0;
        L.set(X, y0 + ly, wd[k]);
        if ((X % 32 === 3 || X % 32 === 29) && (ly === 4 || ly === 10)) L.set(X, y0 + ly, ir[4]);
      }
      for (const [end, isEnd] of [[0, !lj], [T - 8, !rj]]) {
        if (!isEnd) continue;
        L.rect(x0 + end, y0 - 1, 8, 17, ir[1]); L.rect(x0 + end + 1, y0, 6, 1, ir[3]);
        L.set(x0 + end + 3, y0 + 4, ir[4]); L.set(x0 + end + 3, y0 + 11, ir[4]);
        let top = ty - 1; while (top >= 0 && air(tx, top) && ty - top < 7) top--;
        if (top >= 0 && solid(tx, top)) drawChain(L, x0 + end + 3, (top + 1) * T, (ty - top - 1) * T);
      }
    } else if (c === '^') {
      for (let i = 0; i < 5; i++) {
        const sx = x0 + 2 + i * 12, hgt = 26 + Math.floor(hash(tx, i, 40) * 10);
        for (let y = 0; y < hgt; y++) {
          const half = Math.max(0.5, (y / hgt) * 5);
          for (let x = -Math.floor(half); x <= Math.floor(half); x++) {
            const k = x < -half / 2 ? 4 : x <= 0 ? 3 : x < half / 2 ? 2 : 1;
            L.set(sx + 5 + x, y0 + T - 6 - hgt + y, y < 5 && hash(tx, i, 41) > 0.4 ? C('#5a1a14') : ir[k]);
          }
        }
      }
      L.rect(x0, y0 + T - 7, T, 7, ir[1]); L.rect(x0, y0 + T - 7, T, 1, ir[3]);
      for (let x = 6; x < T; x += 14) L.set(x0 + x, y0 + T - 4, ir[4]);
    }
  }

  // ---------------- 5) objetos no chão ----------------
  const kinds = ['skull', 'bones', 'candles', 'urn', 'rubble', 'sword', 'cross', 'pillar'];
  const weights = { catacumbas: [3, 3, 2, 2, 2, 1, 2, 1], correntes: [2, 2, 1, 1, 3, 1, 0, 1], submersa: [1, 2, 1, 2, 3, 1, 0, 2],
                    torre: [1, 1, 3, 2, 3, 2, 1, 2], abismo: [2, 2, 1, 1, 3, 3, 2, 1] }[room.def.theme];
  const total = weights.reduce((a, b) => a + b, 0);
  for (const [tx, ty] of surfaces) {
    if ((room.def.map[ty - 1][tx] || '.') !== '.') continue;
    if (hash(tx, ty, seed + 50) > 0.34) continue;
    let r = hash(tx, ty, seed + 51) * total, kind = kinds[0];
    for (let i = 0; i < kinds.length; i++) { if (r < weights[i]) { kind = kinds[i]; break; } r -= weights[i]; }
    const spr = propSprite(kind, th.stone, tx * 13 + ty);
    const px = tx * T + 8 + Math.floor(hash(tx, ty, 52) * (T - 16 - spr.w)), py = ty * T - spr.h + 3;
    L.blit(spr, px, py, hash(tx, ty, 53) > 0.5);
    if (kind === 'candles') {
      for (const [ox, h] of [[5, 9], [12, 6], [19, 11]]) flames.push({ kind: 'flameCandle', x: px + ox, y: py + 20 - h - 7 });
      lights.push({ x: (px + 13) / AP, y: (py + 6) / AP, r: 36, col: [255, 170, 80], flick: 1, a: 0.7 });
    }
  }

  return { canvas: L.canvas(), lights, flames };
}

function drawChain(L, x, y, len) {
  const ir = ['#1a1c20', '#4a5058', '#6a727c', '#98a2ae', '#c0c8d0'].map(c => C(c));
  for (let i = 0; i < len; i += 6) {
    if ((i / 6) % 2 === 0) {
      L.set(x - 1, y + i, ir[1]); L.set(x + 1, y + i, ir[1]);
      for (let k = 1; k < 5; k++) { L.set(x - 2, y + i + k, ir[2]); L.set(x + 2, y + i + k, ir[1]); }
      L.set(x - 1, y + i + 5, ir[1]); L.set(x + 1, y + i + 5, ir[1]);
      L.set(x - 2, y + i + 1, ir[3]);
    } else {
      for (let k = 0; k < 6; k++) L.set(x, y + i + k, k < 2 ? ir[3] : ir[2]);
    }
  }
}

// transforma um canvas em PixBuf (para colar sprites prontos)
function PixBufFromCanvas(cv) {
  const b = new PixBuf(cv.width, cv.height);
  const id = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
  b.d.set(new Uint32Array(id.data.buffer));
  return b;
}

// ---------------- fundo em camadas (parallax) ----------------
function buildParallax(room) {
  const th = THEMES[room.def.theme];
  const make = (f, layer) => {
    const W = Math.ceil((VIEW_W + (room.pw - VIEW_W) * f) * AP), H = Math.ceil((VIEW_H + (room.ph - VIEW_H) * f) * AP);
    const b = new PixBuf(W, H), s = room.id.length * 17 + layer * 101;
    if (layer === 0) {
      const sky = [th.sky[0], mix(th.sky[0], th.sky[1], 0.33), mix(th.sky[0], th.sky[1], 0.66), th.sky[1]].map(c => C(c));
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const v = y / H * 3 + dither(x, y) - 0.5;
        b.set(x, y, sky[Math.max(0, Math.min(3, Math.round(v)))]);
      }
    }
    const body = C(layer === 0 ? th.far : th.mid), rim = C(mix(layer === 0 ? th.far : th.mid, th.rim, layer === 0 ? 0.35 : 0.6));
    const mask = new Uint8Array(W * H);
    // estalactites (de cima) e rochas pontudas (de baixo)
    const n = Math.ceil(W / (layer === 0 ? 70 : 110));
    for (let i = 0; i < n; i++) {
      const cx = (i + hash(i, 1, s) * 0.8) * W / n, w = (layer === 0 ? 18 : 30) + hash(i, 2, s) * (layer === 0 ? 30 : 45);
      const len = (layer === 0 ? 40 : 70) + hash(i, 3, s) * (layer === 0 ? 120 : 200);
      const blen = (layer === 0 ? 120 : 90) + hash(i, 4, s) * (layer === 0 ? 260 : 300);
      for (let x = Math.floor(cx - w); x < cx + w; x++) {
        if (x < 0 || x >= W) continue;
        const k = 1 - Math.abs(x - cx) / w;
        const jag = noise(x * 0.15, i, s) * 10;
        const t = Math.pow(k, 0.9) * len + jag;
        for (let y = 0; y < t && y < H; y++) mask[y * W + x] = 1;
        const bt = Math.pow(k, 0.7) * blen + jag;
        for (let y = H - 1; y > H - bt && y >= 0; y--) mask[y * W + x] = 1;
      }
    }
    // ruínas ao longe (arcos e colunas) na camada do meio
    if (layer === 1 && !th.embers) {
      for (let i = 0; i < Math.ceil(W / 520); i++) {
        const ax = i * 520 + 120 + hash(i, 9, s) * 200, base = H - 60 - hash(i, 10, s) * 80, aw = 140, ah = 190;
        for (let y = base - ah; y < base + 200; y++) for (let x = ax; x < ax + aw; x++) {
          if (x < 0 || x >= W || y < 0 || y >= H) continue;
          const lx = x - ax, inner = lx > 26 && lx < aw - 26 && (y > base - ah + 60 || Math.hypot(lx - aw / 2, y - (base - ah + 60)) < aw / 2 - 26);
          const outer = y > base - ah + 60 || Math.hypot(lx - aw / 2, y - (base - ah + 60)) < aw / 2;
          if (outer && !inner && !(hash(Math.floor(x / 12), Math.floor(y / 9), s) > 0.93)) mask[y * W + x] = 1;
        }
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!mask[y * W + x]) continue;
      const edge = (x > 1 && !mask[y * W + x - 2]) || (y < H - 2 && !mask[(y + 2) * W + x]);
      b.set(x, y, edge && dither(x, y) < 0.8 ? rim : body);
    }
    // névoa
    const fog = C(th.fog);
    for (let y = Math.floor(H * 0.55); y < H; y++) for (let x = 0; x < W; x++) {
      const v = (y - H * 0.55) / (H * 0.45) * (layer === 0 ? 0.5 : 0.3) + noise(x * 0.01, y * 0.02, s) * 0.25;
      if (dither(x, y) < v * 0.6) b.set(x, y, fog);
    }
    // brasas no abismo / montanhas iluminadas ao longe
    if (th.embers && layer === 0) {
      const glow = [C('#5a1a10'), C('#8a2a12'), C('#c04a1a')];
      for (let y = Math.floor(H * 0.7); y < H; y++) for (let x = 0; x < W; x++) {
        const v = (y - H * 0.7) / (H * 0.3);
        const d = dither(x, y);
        if (d < v * 0.9) b.set(x, y, glow[Math.min(2, Math.floor(v * 3 * (0.6 + d)))]);
      }
    }
    return b.canvas();
  };
  return { far: make(0.3, 0), mid: make(0.6, 1) };
}

// guarda as salas já pintadas
const ROOM_ART = {};
function getRoomArt(id) {
  if (!ROOM_ART[id]) {
    const room = makeRoomData(id);
    ROOM_ART[id] = { ...buildRoomArt(room), ...buildParallax(room) };
  }
  return ROOM_ART[id];
}
