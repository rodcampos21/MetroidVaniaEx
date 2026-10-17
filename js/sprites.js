// =============================================================
//  SPRITES FEITOS POR CÓDIGO (inimigos, itens, cenário)
//  Desenhados pixel a pixel, com sombra e contorno no mesmo estilo
//  do herói (contorno escuro + borda clara por fora).
// =============================================================

const SPR = {};   // cache: nome -> canvas (ou lista de canvas para animações)

// ---------- fogo (tochas, braseiro, velas) ----------
function flameFrames(W, H, n = 4, seed = 0) {
  const frames = [];
  const cols = ['#fff6c8', '#ffd25a', '#ff9a2a', '#e0521a', '#8a2410'].map(c => C(c));
  for (let f = 0; f < n; f++) {
    const b = new PixBuf(W, H), t = f * 1.7 + seed;
    for (let y = 0; y < H; y++) {
      const k = y / H;                                 // 0 = topo, 1 = base
      const half = Math.pow(k, 0.65) * W * 0.46 * (0.85 + 0.3 * noise(y * 0.35, t, 3));
      const off = Math.sin(y * 0.45 + t * 2) * (1 - k) * W * 0.12;
      for (let x = 0; x < W; x++) {
        const dx = Math.abs(x + 0.5 - W / 2 - off);
        if (dx > half) continue;
        const v = (dx / Math.max(half, 0.5)) * 0.7 + (1 - k) * 0.55 + (dither(x, y) - 0.5) * 0.25;
        b.set(x, y, cols[Math.max(0, Math.min(4, Math.floor(v * 3.2)))]);
      }
    }
    frames.push(b.canvas());
  }
  return frames;
}

// ---------- ESQUELETO ----------
function skeletonFrame(phase, hit) {
  const BONE = hit ? '#ffffff' : '#d6cfb6', BONE2 = hit ? '#eeeeee' : '#a69f86', BONE3 = '#6f6a58';
  const RAG = '#2e2420', IRON = '#5f6369', IRON2 = '#9aa0a6', RUST = '#7a3e22', WOOD = '#4a3222', WOOD2 = '#634530';
  return makeSprite(80, 106, b => {
    const cx = 34, fy = 101, s = Math.sin(phase);
    const leg = (hx, sw, col) => {
      const kx = hx + sw * 6, ky = fy - 21 - Math.abs(sw) * 1.5, fx = hx + sw * 9, fyy = fy - 3 - Math.max(0, -sw) * 3;
      b.line(hx, fy - 38, kx, ky, C(col), 4);
      b.line(kx, ky, fx, fyy, C(col), 3.4);
      b.rect(Math.round(fx) - 3, Math.round(fyy) - 1, 8, 3, C(col));
    };
    leg(cx - 3, -s, BONE3);
    // escudo (atrás)
    b.ellipse(cx - 12, fy - 57, 12, 14, C(IRON));
    b.ellipse(cx - 12, fy - 57, 10, 12, C(WOOD));
    for (let i = -6; i <= 6; i += 4) b.rect(cx - 12 + i, fy - 68, 1, 22, C(WOOD2));
    b.ellipse(cx - 12, fy - 57, 3, 3, C(IRON2));
    b.rect(cx - 15, fy - 50, 3, 2, C(RUST));
    leg(cx + 3, s, BONE2);
    // bacia e trapos
    b.ellipse(cx, fy - 40, 9, 4, C(BONE2));
    b.poly([[cx - 10, fy - 45], [cx + 11, fy - 45], [cx + 9, fy - 30], [cx + 5, fy - 34], [cx + 2, fy - 27], [cx - 3, fy - 33], [cx - 7, fy - 28], [cx - 11, fy - 36]], C(RAG));
    // coluna e costelas
    b.line(cx, fy - 44, cx + 1, fy - 68, C(BONE2), 3);
    b.ellipse(cx + 1, fy - 61, 11, 10, C(BONE));
    for (const y of [fy - 66, fy - 61, fy - 56]) { b.rect(cx - 9, y, 9, 1, C('#1a1412')); b.rect(cx + 3, y, 9, 1, C('#1a1412')); }
    b.rect(cx, fy - 70, 3, 18, C(BONE2));
    // braço da frente + espada enferrujada
    const hx = cx + 17, hy = fy - 53 + s * 2;
    b.line(cx + 5, fy - 70, cx + 11, fy - 59, C(BONE), 3);
    b.line(cx + 11, fy - 59, hx, hy, C(BONE), 3);
    b.line(hx + 1, hy, hx + 26, hy - 10, C(IRON), 3);
    b.line(hx + 2, hy - 1, hx + 25, hy - 11, C(IRON2), 1);
    for (const k of [6, 13, 19]) b.set(hx + k, hy - 3 - k * 0.4, C(RUST));
    b.line(hx - 1, hy - 4, hx + 2, hy + 4, C(WOOD2), 2);
    // crânio com elmo quebrado
    b.ellipse(cx + 4, fy - 82, 10, 10, C(BONE));
    b.rect(cx - 1, fy - 76, 12, 5, C(BONE2));
    for (let i = 0; i < 5; i++) b.set(cx + i * 2, fy - 74, C('#1a1412'));
    b.ellipse(cx + 2, fy - 82, 2.6, 3, C('#140c0c'));
    b.ellipse(cx + 9, fy - 82, 2.6, 3, C('#140c0c'));
    b.set(cx + 2, fy - 82, C('#ff3a2a')); b.set(cx + 9, fy - 82, C('#ff3a2a'));
    b.rect(cx + 5, fy - 78, 2, 2, C('#2a1e1a'));
    b.poly([[cx - 7, fy - 84], [cx - 4, fy - 92], [cx + 4, fy - 95], [cx + 12, fy - 92], [cx + 15, fy - 86], [cx + 6, fy - 88]], C(IRON));
    b.rect(cx - 2, fy - 91, 4, 2, C(RUST)); b.rect(cx + 7, fy - 93, 3, 1, C(IRON2));
  }, { shade: 0.22 });
}

// ---------- MORCEGO ----------
function batFrame(k, hit) {
  const dy = [-10, 0, 11][k];
  const W = hit ? '#ffffff' : '#2a1d24', BONE = hit ? '#ffffff' : '#4e3a44', BODY = hit ? '#ffffff' : '#3b2830';
  return makeSprite(80, 48, b => {
    const wing = (m) => {
      const X = x => m ? 80 - x : x;
      const pts = [[44, 20], [56, 10 + dy], [74, 13 + dy * 1.2], [68, 21 + dy * 0.6], [62, 19 + dy * 0.4], [57, 27 + dy * 0.3], [50, 24], [45, 28]];
      b.poly(pts.map(([x, y]) => [X(x), y]), C(W));
      b.line(X(44), 20, X(56), 10 + dy, C(BONE), 1.5);
      b.line(X(56), 10 + dy, X(74), 13 + dy * 1.2, C(BONE), 1);
      b.line(X(56), 10 + dy, X(62), 19 + dy * 0.4, C(BONE), 1);
    };
    wing(true); wing(false);
    b.ellipse(40, 25, 7, 8, C(BODY));
    b.ellipse(40, 28, 4, 4, C(hit ? '#fff' : '#57404a'));
    b.poly([[34, 20], [35, 12], [38, 18]], C(BODY)); b.poly([[46, 20], [45, 12], [42, 18]], C(BODY));
    b.set(37, 23, C('#ff3030')); b.set(43, 23, C('#ff3030'));
    b.set(39, 29, C('#ffffff')); b.set(41, 29, C('#ffffff'));
  }, { shade: 0.18 });
}

// ---------- itens ----------
function relicSprite(base, light, dark) {
  return makeSprite(36, 46, b => {
    b.poly([[18, 3], [31, 21], [18, 42], [5, 21]], C(base));
    b.poly([[18, 3], [18, 42], [5, 21]], C(light));
    b.poly([[18, 22], [31, 21], [18, 42]], C(dark));
    b.line(18, 12, 18, 32, C('#ffffff'), 1);
    b.line(13, 19, 23, 25, C('#ffffff'), 1);
    b.line(23, 17, 13, 27, C(mix(light, '#ffffff', 0.5)), 1);
    b.set(11, 15, C('#ffffff')); b.set(10, 16, C('#ffffff'));
  }, { light: '#d8d4cc' });
}
function lifeShardSprite() {
  return makeSprite(36, 44, b => {
    b.poly([[17, 2], [25, 18], [20, 40], [11, 40], [9, 16]], C('#b0182c'));
    b.poly([[17, 2], [15, 40], [11, 40], [9, 16]], C('#ff4a5e'));
    b.poly([[6, 22], [11, 30], [9, 41], [3, 40], [2, 28]], C('#8a1022'));
    b.poly([[28, 20], [33, 30], [30, 41], [22, 41], [24, 28]], C('#c4203a'));
    b.line(14, 10, 13, 30, C('#ffc0c8'), 1);
  }, { light: '#d8d4cc' });
}
function soulSprite() {
  return makeSprite(16, 16, b => {
    b.ellipse(8, 8, 5.5, 5.5, C('#c01830'));
    b.ellipse(7, 7, 3.5, 3.5, C('#ff4a5e'));
    b.rect(6, 5, 2, 2, C('#ffd0d8'));
  }, { light: null });
}
function brazierSprite() {
  return makeSprite(60, 74, b => {
    const ST = ['#1d2321', '#2e3835', '#455450', '#5f716b'];
    b.rect(10, 60, 40, 11, C(ST[1])); b.rect(10, 60, 40, 2, C(ST[3])); b.rect(12, 62, 36, 1, C(ST[2]));
    b.rect(18, 40, 24, 21, C(ST[2])); b.rect(18, 40, 3, 21, C(ST[3])); b.rect(38, 40, 4, 21, C(ST[1]));
    for (let y = 44; y < 60; y += 5) b.rect(21, y, 17, 1, C(ST[1]));
    b.poly([[6, 30], [54, 30], [48, 41], [12, 41]], C('#3a3a40'));
    b.rect(5, 28, 50, 3, C('#5c5e66')); b.rect(5, 28, 50, 1, C('#7c808a'));
    for (let x = 10; x < 52; x += 3) b.set(x, 27 - (x % 2), C(hash(x, 1) > 0.5 ? '#ff7a2a' : '#c03a10'));
    b.rect(14, 34, 3, 3, C('#26262c')); b.rect(43, 34, 3, 3, C('#26262c'));
  }, { light: '#bdbab2' });
}
function crackedBlock(st) {
  const b = new PixBuf(64, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const n = noise(x * 0.15, y * 0.15, 7);
    b.set(x, y, C(n > 0.62 ? st[3] : n > 0.35 ? st[2] : st[1]));
  }
  b.rect(0, 0, 64, 2, C(st[4])); b.rect(0, 62, 64, 2, C(st[0])); b.rect(0, 0, 2, 64, C(st[3])); b.rect(62, 0, 2, 64, C(st[0]));
  const cr = C('#0a0c0c');
  b.line(32, 4, 26, 20, cr, 2); b.line(26, 20, 34, 34, cr, 2); b.line(34, 34, 22, 50, cr, 2); b.line(34, 34, 48, 44, cr, 1.5);
  b.line(26, 20, 12, 24, cr, 1.5); b.line(48, 44, 56, 58, cr, 1);
  b.line(33, 5, 27, 20, C(st[4]), 1);
  return b.canvas();
}
function portalArch(st) {
  return makeSprite(100, 132, b => {
    b.rect(6, 30, 18, 100, C(st[2])); b.rect(76, 30, 18, 100, C(st[2]));
    b.rect(6, 30, 3, 100, C(st[3])); b.rect(91, 30, 3, 100, C(st[1]));
    for (let r = 44; r >= 32; r--) for (let a = 0; a <= 180; a += 0.6) {
      const x = 50 + Math.cos(a * Math.PI / 180) * r, y = 44 - Math.sin(a * Math.PI / 180) * r * 0.9;
      b.set(x, y, C(r > 41 ? st[3] : r < 34 ? st[1] : st[2]));
    }
    for (let y = 40; y < 130; y += 9) { b.rect(6, y, 18, 1, C(st[0])); b.rect(76, y, 18, 1, C(st[0])); }
    const rune = C('#7fd0ff');
    for (const [x, y] of [[13, 52], [14, 53], [13, 54], [85, 70], [86, 71], [85, 72], [14, 90], [15, 91], [86, 100], [85, 101], [50, 9], [49, 10], [51, 10]]) b.set(x, y, rune);
    b.rect(2, 126, 96, 6, C(st[1])); b.rect(2, 126, 96, 1, C(st[3]));
  }, { light: '#9a988f' });
}

// ---------- cenário ----------
function propSprite(kind, st, seed) {
  const r = (i) => hash(seed, i, 99);
  switch (kind) {
    case 'skull': return makeSprite(20, 16, b => {
      b.ellipse(9, 7, 7, 6, C('#cfc8b0')); b.rect(5, 10, 8, 4, C('#a69f86'));
      b.ellipse(6, 7, 1.6, 2, C('#1a1412')); b.ellipse(11, 7, 1.6, 2, C('#1a1412')); b.set(8, 10, C('#1a1412'));
    }, { shade: 0.2, light: null });
    case 'bones': return makeSprite(44, 18, b => {
      for (let i = 0; i < 5; i++) {
        const x = 4 + r(i) * 30, y = 6 + r(i + 9) * 8, a = r(i + 3) * 3;
        b.line(x, y, x + Math.cos(a) * 12, y + Math.sin(a) * 4, C(i % 2 ? '#bdb59c' : '#a39b82'), 2.4);
      }
      b.ellipse(30, 9, 6, 5, C('#cfc8b0')); b.ellipse(28, 9, 1.4, 1.8, C('#1a1412')); b.ellipse(32, 9, 1.4, 1.8, C('#1a1412'));
    }, { shade: 0.2, light: null });
    case 'candles': return makeSprite(26, 22, b => {
      b.ellipse(13, 19, 11, 3, C('#5a4a3a'));
      [[5, 9], [12, 6], [19, 11]].forEach(([x, h]) => {
        b.rect(x, 20 - h, 4, h, C('#d8ccb0')); b.rect(x, 20 - h, 1, h, C('#f0e8d8'));
        b.rect(x + 1, 21 - h, 2, 3, C('#c8b898'));
      });
    }, { shade: 0, light: null });
    case 'urn': return makeSprite(22, 30, b => {
      b.ellipse(11, 17, 8, 10, C('#5a3a2a')); b.rect(7, 4, 8, 4, C('#4a2e20')); b.rect(5, 3, 12, 2, C('#6a4632'));
      b.rect(4, 15, 14, 2, C('#8a6a3a'));
      if (r(1) > 0.5) b.poly([[13, 8], [19, 12], [16, 17]], 0);
    }, { shade: 0.25, light: null });
    case 'rubble': return makeSprite(34, 14, b => {
      for (let i = 0; i < 5; i++) b.ellipse(5 + r(i) * 24, 9 - r(i + 5) * 2, 3 + r(i + 2) * 3, 2.5 + r(i + 7) * 2, C(st[2 + (i % 2)]));
    }, { shade: 0.25, light: null });
    case 'sword': return makeSprite(18, 44, b => {
      b.rect(8, 12, 3, 30, C('#6a7078')); b.rect(8, 12, 1, 30, C('#a0a8b0'));
      b.rect(3, 9, 13, 3, C('#5a4026')); b.rect(8, 2, 3, 7, C('#3a2a1a')); b.ellipse(9.5, 2, 2.5, 2, C('#8a7a4a'));
      b.set(10, 20, C('#7a3e22')); b.set(9, 28, C('#7a3e22'));
    }, { shade: 0, light: null });
    case 'cross': return makeSprite(28, 40, b => {
      b.rect(11, 2, 6, 36, C(st[2])); b.rect(3, 10, 22, 6, C(st[2]));
      b.rect(11, 2, 2, 36, C(st[3])); b.rect(3, 10, 22, 2, C(st[3]));
      b.rect(16, 22, 2, 4, C(st[0])); b.ellipse(14, 38, 12, 3, C(st[1]));
    }, { shade: 0.15, light: null });
    case 'pillar': return makeSprite(30, 46, b => {
      b.rect(4, 38, 22, 7, C(st[2])); b.rect(7, 12, 16, 27, C(st[2]));
      b.rect(7, 12, 3, 27, C(st[3])); b.rect(20, 12, 3, 27, C(st[1]));
      b.poly([[7, 12], [12, 6], [16, 10], [20, 3], [23, 12]], C(st[2]));
      for (let x = 12; x < 20; x += 4) b.rect(x, 14, 1, 24, C(st[1]));
    }, { shade: 0.1, light: null });
  }
}
function sconceSprite() {
  return makeSprite(18, 30, b => {
    b.rect(7, 12, 4, 16, C('#3a3a40')); b.rect(4, 26, 10, 3, C('#2a2a30'));
    b.poly([[2, 8], [16, 8], [13, 14], [5, 14]], C('#4a4a52')); b.rect(2, 8, 14, 1, C('#7a7e88'));
  }, { light: null });
}
function bannerSprite(col, seed) {
  return makeSprite(30, 64, b => {
    b.rect(1, 2, 28, 3, C('#3a2a1a'));
    const pts = [[4, 5], [26, 5], [26, 48]];
    for (let x = 26; x >= 4; x -= 3) pts.push([x, 52 + hash(seed, x) * 9]);
    pts.push([4, 50]);
    b.poly(pts, C(col));
    b.rect(4, 5, 2, 45, C(mix(col, '#ffffff', 0.12)));
    b.ellipse(15, 22, 6, 7, C(mix(col, '#d0b070', 0.6)));
    b.ellipse(15, 22, 3.5, 4.5, C(col)); b.rect(14, 16, 2, 13, C(mix(col, '#d0b070', 0.6)));
    for (let i = 0; i < 4; i++) b.set(8 + hash(seed, i) * 14, 30 + hash(i, seed) * 18, 0);
  }, { shade: 0.15, light: null });
}
function windowSprite(st) {
  return makeSprite(44, 60, b => {
    b.rect(4, 14, 36, 44, C(st[2]));
    b.ellipse(22, 16, 18, 14, C(st[2]));
    b.rect(9, 18, 26, 36, C('#3a4a6a')); b.ellipse(22, 18, 13, 11, C('#3a4a6a'));
    b.rect(9, 30, 26, 24, C('#2a3550'));
    b.ellipse(27, 14, 3, 3, C('#d8e4f0'));
    for (let x = 13; x < 34; x += 6) b.rect(x, 8, 2, 46, C('#1a1a20'));
    b.rect(9, 32, 26, 2, C('#1a1a20'));
  }, { shade: 0.1, light: null });
}

function buildSprites() {
  SPR.skeleton = [0, 1, 2, 3].map(i => skeletonFrame(i / 4 * Math.PI * 2, false).canvas());
  SPR.skeletonHit = skeletonFrame(0, true).canvas();
  SPR.bat = [0, 1, 2].map(k => batFrame(k, false).canvas());
  SPR.batHit = batFrame(1, true).canvas();
  SPR.relicD = relicSprite('#3ab0d8', '#9ff0ff', '#1c6a8a').canvas();
  SPR.relicH = relicSprite('#e08a2a', '#ffd28a', '#8a4a14').canvas();
  SPR.relicG = relicSprite('#8a5ae0', '#d0b8ff', '#4a2a8a').canvas();
  SPR.life = lifeShardSprite().canvas();
  SPR.soul = soulSprite().canvas();
  SPR.brazier = brazierSprite().canvas();
  SPR.sconceBuf = sconceSprite();
  SPR.flameBig = flameFrames(26, 34, 6, 1);
  SPR.flameTorch = flameFrames(12, 18, 6, 4);
  SPR.flameCandle = flameFrames(4, 7, 4, 9);
}
