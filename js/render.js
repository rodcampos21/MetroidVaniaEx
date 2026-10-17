// =============================================================
//  DESENHO: fundo, sala, personagens, luz e interface
//  A tela tem 1280x720... (320x192 unidades x 4) e cada pixel da tela
//  é um pixel de arte — por isso tudo fica nítido como na folha de sprites.
// =============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W * SCALE;
canvas.height = VIEW_H * SCALE;
const CW = canvas.width, CH = canvas.height;

const FONT_T = '"Cinzel", "Times New Roman", serif';
const FONT_B = '"Alegreya Sans", "Trebuchet MS", sans-serif';
const theme = () => THEMES[G.room.def.theme];

// pixel nítido ao ampliar; suave quando a tela é menor que o jogo
function fitCanvas() {
  const r = canvas.getBoundingClientRect();
  canvas.style.imageRendering = r.width * (window.devicePixelRatio || 1) >= CW * 0.98 ? 'pixelated' : 'auto';
}
addEventListener('resize', fitCanvas);
setTimeout(fitCanvas, 50);

function text(str, x, y, { size = 22, color = '#fff', align = 'left', alpha = 1, font = FONT_B, weight = 700, shadow = true, spacing = 0 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  if (spacing && 'letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
  ctx.textAlign = align; ctx.textBaseline = 'top';
  if (shadow) { ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillText(str, x + 2, y + 2); }
  ctx.fillStyle = color; ctx.fillText(str, x, y);
  ctx.restore();
}
function wrapText(str, maxW, size, font = FONT_B) {
  ctx.save(); ctx.font = `500 ${size}px ${font}`;
  const words = str.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  ctx.restore();
  return lines;
}

// ---------------- partículas de ambiente ----------------
let lastCam = { x: 0, y: 0 };
function updateAmbient(dt) {
  if (!G.room) return;
  const th = theme();
  const kind = th.embers ? 'ember' : th.chains ? 'drip' : th.roots ? 'spore' : 'dust';
  const dx = (G.cam.x - lastCam.x) * AP, dy = (G.cam.y - lastCam.y) * AP;
  lastCam = { x: G.cam.x, y: G.cam.y };
  const jump = Math.abs(dx) > 300 || Math.abs(dy) > 300;
  if (G.ambient.length < 50 && Math.random() < 8 * dt) {
    const a = { kind, t: 0, life: 6 + Math.random() * 4 };
    a.x = Math.random() * CW;
    if (kind === 'ember') { a.y = CH + 4; a.vx = (Math.random() - 0.3) * 30; a.vy = -40 - Math.random() * 50; }
    else if (kind === 'drip') { a.y = -4; a.vx = 0; a.vy = 260 + Math.random() * 120; a.life = 4; }
    else { a.y = Math.random() * CH; a.vx = (Math.random() - 0.5) * 12; a.vy = (Math.random() - 0.6) * 10; }
    G.ambient.push(a);
  }
  for (const a of G.ambient) {
    a.t += dt; a.life -= dt;
    if (!jump) { a.x -= dx * 0.9; a.y -= dy * 0.9; }
    a.x += (a.vx + (a.kind === 'ember' ? Math.sin(a.t * 3 + a.x) * 20 : 0)) * dt;
    a.y += a.vy * dt;
  }
  G.ambient = G.ambient.filter(a => a.life > 0 && a.y > -20 && a.y < CH + 20 && a.x > -40 && a.x < CW + 40);
}
function drawAmbient() {
  for (const a of G.ambient) {
    const f = Math.min(1, a.life, a.t * 2);
    const x = Math.round(a.x), y = Math.round(a.y);
    if (a.kind === 'ember') { ctx.fillStyle = `rgba(255,${120 + Math.floor(Math.sin(a.t * 9) * 60)},40,${f})`; ctx.fillRect(x, y, 3, 3); }
    else if (a.kind === 'drip') { ctx.fillStyle = `rgba(150,190,220,${0.5 * f})`; ctx.fillRect(x, y, 2, 7); }
    else if (a.kind === 'spore') { ctx.fillStyle = `rgba(170,240,150,${0.55 * f * (0.6 + 0.4 * Math.sin(a.t * 4))})`; ctx.fillRect(x, y, 3, 3); }
    else { ctx.fillStyle = `rgba(200,210,200,${0.22 * f})`; ctx.fillRect(x, y, 2, 2); }
  }
}

// ---------------- luz ----------------
const lightCv = document.createElement('canvas');
lightCv.width = VIEW_W; lightCv.height = VIEW_H;
const lctx = lightCv.getContext('2d');

function gatherLights() {
  const L = [], p = G.player, art = G.room.art;
  if (G.state !== 'dead') L.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, r: 80, a: 0.9, col: null });
  for (const l of art.lights) L.push(l);
  for (const it of G.items) {
    if (it.type === 'save') L.push({ x: it.x + 8, y: it.y + 2, r: 90, a: 1, col: [255, 140, 50], flick: 1 });
    else if (it.type === 'D') L.push({ x: it.x + 5, y: it.y + 5, r: 46, a: 0.9, col: [120, 220, 255] });
    else if (it.type === 'H') L.push({ x: it.x + 5, y: it.y + 5, r: 46, a: 0.9, col: [255, 170, 70] });
    else if (it.type === '+') L.push({ x: it.x + 5, y: it.y + 5, r: 40, a: 0.9, col: [255, 60, 80] });
    else if (it.type === 'E') L.push({ x: it.x + 5, y: it.y + 4, r: 80, a: 1, col: [120, 200, 255] });
    else if (it.type === 'heart') L.push({ x: it.x + 4, y: it.y + 4, r: 18, a: 0.8, col: [255, 60, 80] });
  }
  return L;
}

function drawLighting(camX, camY) {
  const th = theme(), lights = gatherLights();
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, VIEW_W, VIEW_H);
  lctx.fillStyle = `rgba(3,5,8,${th.light})`;
  lctx.fillRect(0, 0, VIEW_W, VIEW_H);
  lctx.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const fl = l.flick ? 0.9 + 0.1 * Math.sin(G.time * 13 + l.x) * Math.sin(G.time * 7.3 + l.y) : 1;
    const x = l.x - camX, y = l.y - camY, r = l.r * fl;
    if (x < -r || x > VIEW_W + r || y < -r || y > VIEW_H + r) continue;
    const g = lctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${l.a})`); g.addColorStop(0.5, `rgba(0,0,0,${l.a * 0.55})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(lightCv, 0, 0, CW, CH);
  // brilho colorido das chamas e relíquias
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    if (!l.col) continue;
    const fl = l.flick ? 0.85 + 0.15 * Math.sin(G.time * 11 + l.x * 3) : 1;
    const x = (l.x - camX) * AP, y = (l.y - camY) * AP, r = l.r * AP * 0.7 * fl;
    if (x < -r || x > CW + r || y < -r || y > CH + r) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${l.col[0]},${l.col[1]},${l.col[2]},${0.2 * fl})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

let vignette = null;
function getVignette() {
  if (vignette) return vignette;
  vignette = document.createElement('canvas'); vignette.width = CW; vignette.height = CH;
  const g = vignette.getContext('2d');
  const v = g.createRadialGradient(CW / 2, CH / 2, CH * 0.38, CW / 2, CH / 2, CW * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
  g.fillStyle = v; g.fillRect(0, 0, CW, CH);
  return vignette;
}

// ---------------- render principal ----------------
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  if (!G.room) { ctx.fillStyle = '#07090a'; ctx.fillRect(0, 0, CW, CH); return; }
  const art = G.room.art;
  let sx = 0, sy = 0;
  if (G.shake > 0) { sx = (Math.random() - 0.5) * 3; sy = (Math.random() - 0.5) * 3; }
  const camX = G.cam.x + sx, camY = G.cam.y + sy;
  const ox = -Math.round(camX * AP), oy = -Math.round(camY * AP);

  ctx.drawImage(art.far, Math.round(ox * 0.3), Math.round(oy * 0.3));
  ctx.drawImage(art.mid, Math.round(ox * 0.6), Math.round(oy * 0.6));

  ctx.save();
  ctx.translate(ox, oy);
  ctx.drawImage(art.canvas, 0, 0);
  drawCracked();
  const fi = Math.floor(G.time * 12);
  for (const f of art.flames) { const fr = SPR[f.kind]; ctx.drawImage(fr[(fi + f.x) % fr.length], f.x, f.y); }
  drawItems();
  for (const e of G.enemies) drawEnemy(e);
  drawPlayer();
  for (const p of G.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5));
    ctx.fillStyle = p.color;
    const s = Math.max(2, Math.round(p.size * 2));
    ctx.fillRect(Math.round(p.x * AP - s / 2), Math.round(p.y * AP - s / 2), s, s);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  drawLighting(camX, camY);
  drawAmbient();
  ctx.drawImage(getVignette(), 0, 0);
  drawHUD();

  if (G.fade > 0) { ctx.globalAlpha = Math.min(1, G.fade * 2); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CW, CH); ctx.globalAlpha = 1; }
  if (G.state === 'dead') {
    const t = 2.4 - G.deadT;
    ctx.globalAlpha = Math.min(0.85, t * 0.7); ctx.fillStyle = '#0a0000'; ctx.fillRect(0, 0, CW, CH); ctx.globalAlpha = 1;
    text('VOCÊ MORREU', CW / 2, CH / 2 - 40, { size: 76, font: FONT_T, weight: 800, align: 'center', color: '#9a1a14', alpha: Math.min(1, t * 1.2), spacing: 6 });
  }
  if (G.paused) {
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CW, CH); ctx.globalAlpha = 1;
    text('PAUSADO', CW / 2, CH / 2 - 44, { size: 56, font: FONT_T, weight: 800, align: 'center', color: '#d8d0b8', spacing: 6 });
    text('aperte pausa para continuar', CW / 2, CH / 2 + 26, { size: 24, align: 'center', color: '#8a8478', weight: 500 });
  }
}

function drawCracked() {
  const th = theme(), key = 'crack_' + G.room.def.theme;
  const spr = SPR[key] || (SPR[key] = crackedBlock(th.stone));
  for (let ty = 0; ty < G.room.h; ty++) for (let tx = 0; tx < G.room.w; tx++)
    if (tileAt(tx, ty) === 'B') ctx.drawImage(spr, tx * TILE * AP, ty * TILE * AP);
}

function drawItems() {
  const t = G.time;
  for (const it of G.items) {
    const bob = Math.round(Math.sin(t * 2.5 + it.x) * 4);
    if (it.type === 'save') {
      const cx = (it.x + 8) * AP, by = (it.y + 16) * AP;
      ctx.drawImage(SPR.brazier, cx - 30, by - 74);
      const fr = SPR.flameBig;
      ctx.drawImage(fr[Math.floor(t * 12) % fr.length], cx - 13, by - 74 + 28 - 32);
    } else if (it.type === 'D' || it.type === 'H') {
      const s = it.type === 'D' ? SPR.relicD : SPR.relicH;
      ctx.drawImage(s, (it.x + 5) * AP - 18, (it.y + 5) * AP - 23 + bob);
    } else if (it.type === '+') {
      ctx.drawImage(SPR.life, (it.x + 5) * AP - 18, (it.y + 5) * AP - 22 + bob);
    } else if (it.type === 'heart') {
      if (it.life < 2 && Math.floor(t * 10) % 2) continue;
      ctx.drawImage(SPR.soul, Math.round(it.x * AP), Math.round(it.y * AP) + Math.round(Math.sin(t * 5) * 2));
    } else if (it.type === 'E') {
      const arch = SPR.arch || (SPR.arch = portalArch(theme().stone).canvas());
      const cx = (it.x + 5) * AP, by = (it.y + 20) * AP;
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t * 3);
      const g = ctx.createRadialGradient(cx, by - 60, 4, cx, by - 60, 46);
      g.addColorStop(0, '#d8f4ff'); g.addColorStop(0.4, '#4aa8e0'); g.addColorStop(1, 'rgba(20,60,120,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 32, by - 110, 64, 104);
      ctx.globalAlpha = 1;
      for (let i = 0; i < 14; i++) {
        const a = t * 1.8 + i * 0.45, r = 8 + ((i * 7 + t * 20) % 28);
        ctx.fillStyle = i % 2 ? '#bfe8ff' : '#5ab8f0';
        ctx.fillRect(Math.round(cx + Math.cos(a) * r * 0.8), Math.round(by - 60 + Math.sin(a) * r * 1.2), 3, 3);
      }
      ctx.restore();
      ctx.drawImage(arch, cx - 50, by - 132);
    }
  }
}

function drawEnemy(e) {
  if (e.dead) return;
  const flash = e.flash > 0;
  if (e instanceof Walker) {
    const spr = flash ? SPR.skeletonHit : SPR.skeleton[Math.floor(e.t * 6) % 4];
    const ax = Math.round((e.x + e.w / 2) * AP), ay = Math.round((e.y + e.h) * AP);
    shadowAt(ax, ay, 30);
    ctx.save(); ctx.translate(ax, 0); if (e.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(spr, -34, ay - 102); ctx.restore();
  } else {
    const spr = flash ? SPR.batHit : SPR.bat[Math.floor(e.t * 12) % 3];
    const ax = Math.round((e.x + 6) * AP), ay = Math.round((e.y + 5 + Math.sin(e.t * 3) * 1.2) * AP);
    ctx.save(); ctx.translate(ax, 0); if (G.player.x < e.x) ctx.scale(-1, 1);
    ctx.drawImage(spr, -40, ay - 25); ctx.restore();
  }
}

function shadowAt(x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(x, y - 1, w, 5, 0, 0, Math.PI * 2); ctx.fill();
}

function heroPose(p) {
  if (p.dashT > 0) return 'roll';
  if (p.stun > 0) return 'hurt';
  if (p.atkT > 0) return p.crouch ? 'lunge' : 'attack';
  if (p.crouch) return 'crouch';
  if (!p.onGround) return 'jump';
  if (Math.abs(p.vx) > 15) return 'run';
  return 'idle';
}
function drawHero(pose, cx, fy, facing, rot = 0, alpha = 1, bob = 0) {
  const [sx, sy, w, h, ax, ay] = HERO_FRAMES[pose];
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(Math.round(cx), 0);
  if (facing < 0) ctx.scale(-1, 1);
  if (rot) {
    const ccy = fy - h / 2 - 8;
    ctx.translate(0, ccy); ctx.rotate(rot * facing);
    ctx.drawImage(heroImg, sx, sy, w, h, -Math.round(w / 2), -Math.round(h / 2), w, h);
  } else {
    ctx.drawImage(heroImg, sx, sy, w, h, -Math.round(ax), Math.round(fy - ay + bob), w, h);
  }
  ctx.restore();
}
function drawPlayer() {
  const p = G.player;
  if (G.state === 'dead' || !heroImg.complete) return;
  const cx = (p.x + p.w / 2) * AP, fy = Math.round((p.y + p.h) * AP);
  for (const gh of p.trail) drawHero('roll', gh.x * AP, gh.y * AP, gh.f, gh.rot, gh.life * 2);
  shadowAt(cx, fy, p.onGround ? 26 : 16);
  const pose = heroPose(p);
  let bob = 0;
  if (pose === 'run') bob = -Math.round(Math.abs(Math.sin(p.anim * 0.3)) * 4);
  else if (pose === 'idle') bob = Math.sin(G.time * 2.6) > 0.6 ? -1 : 0;
  const alpha = p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0 ? 0.35 : 1;
  drawHero(pose, cx, fy, p.facing, pose === 'roll' ? p.rollAngle() : 0, alpha, bob);
}

// ---------------- interface ----------------
function frameBox(x, y, w, h, alpha = 0.82) {
  ctx.fillStyle = `rgba(8,10,12,${alpha})`; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#000'; ctx.lineWidth = 6; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
  ctx.strokeStyle = '#4a4f57'; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.fillStyle = '#7a808a';
  for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) ctx.fillRect(cx - 4, cy - 4, 8, 8);
}

function drawHUD() {
  const p = G.player, d = G.data;
  // retrato
  frameBox(20, 18, 84, 84, 0.9);
  if (heroImg.complete) {
    const [fx] = HERO_FRAMES.idle;
    ctx.drawImage(heroImg, fx + 8, 0, 76, 70, 24, 26, 76, 70);
  }
  // vida
  const segW = 34, bx = 120, by = 30, bw = d.maxHp * segW + 8;
  frameBox(bx, by, bw, 30, 0.9);
  for (let i = 0; i < d.maxHp; i++) {
    const x = bx + 6 + i * segW, full = i < p.hp;
    ctx.fillStyle = full ? '#8a1414' : '#241010'; ctx.fillRect(x, by + 6, segW - 4, 18);
    if (full) {
      ctx.fillStyle = '#c42a22'; ctx.fillRect(x, by + 6, segW - 4, 9);
      ctx.fillStyle = '#ff6a50'; ctx.fillRect(x, by + 6, segW - 4, 2);
    }
  }
  text('VIDA', bx, by + 36, { size: 16, font: FONT_T, weight: 800, color: '#9a9284', spacing: 2 });
  // habilidades
  let ix = bx + 70;
  for (const [has, spr] of [[d.abilities.doubleJump, SPR.relicD], [d.abilities.dash, SPR.relicH]]) {
    if (!has) continue;
    frameBox(ix, by + 38, 30, 30, 0.9);
    ctx.drawImage(spr, ix + 6, by + 41, 18, 23);
    ix += 40;
  }
  drawMinimap();

  if (G.roomTitle && G.roomTitle.t > 0) {
    const a = Math.min(1, G.roomTitle.t, (2.5 - G.roomTitle.t) * 2);
    text(G.roomTitle.text.toUpperCase(), CW / 2, 120, { size: 44, font: FONT_T, weight: 800, align: 'center', alpha: a, color: '#d8d0b8', spacing: 4 });
    ctx.globalAlpha = a; ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(CW / 2 - 220, 178, 200, 2); ctx.fillRect(CW / 2 + 20, 178, 200, 2);
    ctx.save(); ctx.translate(CW / 2, 179); ctx.rotate(Math.PI / 4); ctx.fillRect(-6, -6, 12, 12); ctx.restore();
    ctx.globalAlpha = 1;
  }

  if (G.banner && G.banner.t > 0) {
    const b = G.banner, a = Math.min(1, b.t * 2);
    const lines = wrapText(b.text, 640, 24);
    const h = 74 + lines.length * 30, w = 720, x = CW / 2 - w / 2, y = 205;
    ctx.save(); ctx.globalAlpha = a;
    frameBox(x, y, w, h, 0.88);
    ctx.fillStyle = b.color || '#c8c0a8'; ctx.globalAlpha = a * 0.7;
    ctx.fillRect(x + 40, y + 58, w - 80, 2);
    ctx.globalAlpha = a;
    text(b.title.toUpperCase(), CW / 2, y + 16, { size: 30, font: FONT_T, weight: 800, align: 'center', color: b.color || '#d8d0b8', spacing: 3 });
    lines.forEach((l, i) => text(l, CW / 2, y + 72 + i * 30, { size: 24, align: 'center', color: '#cfc8b8', weight: 500 }));
    ctx.restore();
  }
}

function drawMinimap() {
  const CWm = 30, CHm = 18;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const id in ROOMS) {
    const r = ROOMS[id], w = r.map[0].length / 20, h = r.map.length / 12;
    minX = Math.min(minX, r.wx); maxX = Math.max(maxX, r.wx + w);
    minY = Math.min(minY, r.wy); maxY = Math.max(maxY, r.wy + h);
  }
  const W = (maxX - minX) * CWm, H = (maxY - minY) * CHm;
  const x0 = CW - W - 40, y0 = 26;
  frameBox(x0 - 12, y0 - 10, W + 24, H + 20, 0.75);
  for (const id in ROOMS) {
    if (!G.data.visited[id]) continue;
    const r = ROOMS[id], w = r.map[0].length / 20, h = r.map.length / 12, col = THEMES[r.theme].map;
    const x = x0 + (r.wx - minX) * CWm, y = y0 + (r.wy - minY) * CHm;
    ctx.fillStyle = id === G.roomId ? col : mix(col, '#101214', 0.55);
    ctx.fillRect(x + 1, y + 1, w * CWm - 2, h * CHm - 2);
    if (id === G.roomId) { ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w * CWm - 2, h * CHm - 2); }
  }
  const p = G.player, d = G.room.def;
  if (Math.floor(G.time * 3) % 2 === 0) {
    ctx.fillStyle = '#ff3a2a';
    ctx.fillRect(Math.round(x0 + (d.wx - minX) * CWm + p.x / VIEW_W * CWm) - 3, Math.round(y0 + (d.wy - minY) * CHm + p.y / VIEW_H * CHm) - 3, 6, 6);
  }
}
