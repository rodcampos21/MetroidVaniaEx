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

// HUD: painel do retrato e a parte vermelha da barra (recortados da arte do autor)
const HUD = { panel: new Image(), fill: new Image(), lagImg: null, lag: null,
              track: { x0: 21, x1: 142, y0: 146, y1: 155 } };
HUD.panel.src = 'assets/hud_panel.png?v=' + ASSET_V;
HUD.panelRod = new Image(); HUD.panelRod.src = 'assets/hud_panel_rod.png?v=' + ASSET_V;
HUD.fill.src = 'assets/hud_fill.png?v=' + ASSET_V;
HUD.fill.onload = () => {        // versão clara para o "dano recente"
  const c = document.createElement('canvas'); c.width = HUD.fill.width; c.height = HUD.fill.height;
  const g = c.getContext('2d'); g.drawImage(HUD.fill, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,225,200,0.75)'; g.fillRect(0, 0, c.width, c.height);
  HUD.lagImg = c;
};

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
  for (const e of G.enemies)                       // o lobisomem fica visível na penumbra
    if (e instanceof Werewolf && e.state !== 'dying') L.push({ x: e.x + e.w / 2, y: e.y + e.h * 0.4, r: 52, a: 0.6, col: null });
    else if (e instanceof GuitaristBoss) L.push({ x: e.x + e.w / 2, y: e.y + e.h * 0.4, r: 96, a: 0.75, col: e.boom > 0 ? [255, 120, 40] : null });
    else if (e instanceof SonicNote) L.push({ x: e.x + 5, y: e.y + 5, r: 34, a: 0.8, col: [255, 50, 50] });
    else if (e instanceof Shockwave) L.push({ x: e.x + 6, y: e.y + 6, r: 40, a: 0.8, col: [255, 140, 60] });
  for (const it of G.items) {
    if (it.wait > 0) continue;
    if (it.type === 'save') L.push({ x: it.x + 8, y: it.y + 2, r: 90, a: 1, col: [255, 140, 50], flick: 1 });
    else if (it.type === 'D') L.push({ x: it.x + 5, y: it.y + 5, r: 46, a: 0.9, col: [120, 220, 255] });
    else if (it.type === 'H') L.push({ x: it.x + 5, y: it.y + 5, r: it.reward ? 64 : 46, a: 0.95, col: [255, 120, 70] });
    else if (it.type === 'G') L.push({ x: it.x + 5, y: it.y + 5, r: 46, a: 0.9, col: [180, 130, 255] });
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
  drawGate();
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
  if (G.paused && !Controls.open) {
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
    if (it.wait > 0) continue;
    const bob = Math.round(Math.sin(t * 2.5 + it.x) * 4);
    if (it.type === 'save') {
      const cx = (it.x + 8) * AP, by = (it.y + 16) * AP;
      ctx.drawImage(SPR.brazier, cx - 30, by - 74);
      const fr = SPR.flameBig;
      ctx.drawImage(fr[Math.floor(t * 12) % fr.length], cx - 13, by - 74 + 28 - 32);
    } else if (it.type === 'D' || it.type === 'H' || it.type === 'G') {
      const s = it.type === 'D' ? SPR.relicD : it.type === 'H' ? SPR.relicH : SPR.relicG;
      if (it.reward && it.vy === 0) {           // feixe de luz sobre a recompensa do chefe
        const cx = (it.x + 5) * AP, by = (it.y + it.h) * AP;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, by - 150, 0, by);
        g.addColorStop(0, 'rgba(255,90,60,0)'); g.addColorStop(1, `rgba(255,150,80,${0.22 + 0.08 * Math.sin(t * 4)})`);
        ctx.fillStyle = g; ctx.fillRect(cx - 14, by - 150, 28, 150);
        ctx.restore();
        if (Math.random() < 0.3) spawnParticles(it.x + 5 + (Math.random() - 0.5) * 8, it.y + it.h, 1, '#ffb070', { angle: -Math.PI / 2, spread: 0.3, speed: 30, life: 0.9, size: 1 });
      }
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
  if (e instanceof Werewolf) {
    drawWerewolf(e);
  } else if (e instanceof GuitaristBoss) {
    drawBoss(e);
  } else if (e instanceof SonicNote) {
    drawSonicNote(e);
  } else if (e instanceof Shockwave) {
    drawShockwave(e);
  } else {
    const spr = flash ? SPR.batHit : SPR.bat[Math.floor(e.t * 12) % 3];
    const ax = Math.round((e.x + 6) * AP), ay = Math.round((e.y + 5 + Math.sin(e.t * 3) * 1.2) * AP);
    ctx.save(); ctx.translate(ax, 0); if (G.player.x < e.x) ctx.scale(-1, 1);
    ctx.drawImage(spr, -40, ay - 25); ctx.restore();
  }
}

// ---------------- lobisomem ----------------
let wolfWhite = null;                    // silhueta branca para o "piscar" ao levar dano
function wolfFrameImg(white) {
  if (!white) return wolfImg;
  if (!wolfWhite && wolfImg.complete) {
    wolfWhite = document.createElement('canvas'); wolfWhite.width = wolfImg.width; wolfWhite.height = wolfImg.height;
    const g = wolfWhite.getContext('2d'); g.drawImage(wolfImg, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#fff'; g.fillRect(0, 0, wolfWhite.width, wolfWhite.height);
  }
  return wolfWhite || wolfImg;
}
function drawWolfFrame(fi, ax, ay, dir, rot, img, alpha = 1, sx = 1, sy = 1) {
  const [x, y, w, h, cx, cy] = WOLF_FRAMES[fi];
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(Math.round(ax), Math.round(ay));
  if (dir < 0) ctx.scale(-1, 1);
  if (rot) ctx.rotate(rot);
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  ctx.drawImage(img, x, y, w, h, -Math.round(cx), -Math.round(cy), w, h);
  ctx.restore();
}
function drawWerewolf(e) {
  if (!wolfImg.complete) return;
  const ax = (e.x + e.w / 2) * AP, ay = (e.y + e.h) * AP;
  let fi = 'w0', rot = 0, sx = 1, sy = 1, ox = 0, oy = 0;
  const st = e.st, walkF = 'w' + (Math.floor(e.walk / 3.2) % 12);
  switch (e.state) {
    case 'patrol': case 'chase':
      fi = Math.abs(e.vx) > 1 ? walkF : 'w0';
      if (fi === 'w0') sy = 1 + Math.sin(G.time * 3) * 0.012;      // respirando
      break;
    case 'alert': fi = 'howl'; ox = st > 0.12 ? (Math.random() - 0.5) * 3 : 0; break;   // uivo tremendo
    case 'dashPrep': fi = 'windup2'; sy = 0.93; sx = 1.05; break;                       // agacha
    case 'dash': fi = 'dash'; break;
    case 'windup': fi = e.combo % 2 ? 'windup2' : 'windup'; break;
    case 'claw': fi = e.combo % 2 ? 'claw2' : 'claw'; ox = 4; break;
    case 'recover': fi = 'w0'; break;
    case 'dying': fi = st < 0.25 ? 'death0' : st < 0.55 ? 'death1' : 'death2'; break;
  }
  if (e.kb > 0 && e.state !== 'dying') fi = 'hurt';
  // rastro do dash
  for (const gh of e.trail) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawWolfFrame('dash', (gh.x + e.w / 2) * AP, (gh.y + e.h) * AP, gh.dir, 0, wolfImg, gh.life * 1.6);
    ctx.restore();
  }
  shadowAt(ax, ay, 40);
  const alpha = e.state === 'dying' ? Math.max(0, 1 - Math.max(0, st - 0.7) / 0.4) : 1;
  const dir = e.dir;
  drawWolfFrame(fi, ax + ox * dir, ay + oy, dir, rot, wolfFrameImg(e.flash > 0), alpha, sx, sy);
  // olhos brilhando no alerta, no preparo e no dash
  if (e.state !== 'dying') {
    const f = WOLF_FRAMES[fi], ex = f[6] - f[4], ey = f[7] - f[5];
    const c = Math.cos(rot), s = Math.sin(rot);
    const gx = ax + (ox + ex * c - ey * s) * dir, gy = ay + oy + ex * s + ey * c;
    const angry = ['alert', 'dashPrep', 'dash', 'windup', 'claw'].includes(e.state);
    const r = e.state === 'alert' ? 18 + Math.sin(G.time * 30) * 3 : angry ? 12 : 6;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    g.addColorStop(0, 'rgba(255,240,140,0.95)'); g.addColorStop(0.3, 'rgba(255,90,30,0.5)'); g.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(gx - r, gy - r, r * 2, r * 2); ctx.restore();
  }
  // marcas das garras
  if (e.state === 'claw' && st < WOLF.STRIKE + 0.06) {
    const prog = Math.min(1, st / WOLF.STRIKE), fade = 1 - Math.max(0, st - WOLF.STRIKE) / 0.06;
    const bx = ax + dir * 58, by = ay - 128, down = e.combo % 2 === 0;
    ctx.save(); ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const x0 = bx + dir * (k * 16 - 26), y0 = by + (down ? 0 : 80) + k * 5;
      const x1 = x0 + dir * 40, y1 = y0 + (down ? 80 : -80);
      const xe = x0 + (x1 - x0) * prog, ye = y0 + (y1 - y0) * prog;
      ctx.strokeStyle = `rgba(160,10,10,${0.8 * fade})`; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(xe, ye); ctx.stroke();
      ctx.strokeStyle = `rgba(255,235,220,${0.95 * fade})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(xe, ye); ctx.stroke();
    }
    ctx.restore();
  }
}

function shadowAt(x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(x, y - 1, w, 5, 0, 0, Math.PI * 2); ctx.fill();
}

// poses do Rod (socos/chutes, esquiva com dash, pulo em fases)
function rodPose(p) {
  // agachar: desce (crouch2→4) e, ao soltar, levanta (crouch5→6)
  if (p.crouch) { if (p._cStart == null) p._cStart = G.time; p._uStart = null; }
  else if (p._cStart != null) { p._cStart = null; p._uStart = G.time; }
  if (p.wall) return 'climb' + (Math.floor(p.climbAnim / 6) % 8);
  if (p.dashT > 0) return p.rollPose();
  if (p.stun > 0) return p.stun > 0.12 ? 'hurt0' : 'hurt1';
  if (p.atkKind) {
    const a = ATK[p.atkKind], prog = 1 - p.atkT / a.total;
    const seq = p.atkKind === 'kick' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
    return p.atkKind + seq[Math.min(5, Math.floor(prog * 6))];
  }
  if (p.crouch) { const t = G.time - p._cStart; return t < 0.04 ? 'crouch2' : t < 0.08 ? 'crouch3' : 'crouch4'; }
  if (p._uStart != null && p.onGround && Math.abs(p.vx) < 15 && G.time - p._uStart < 0.1) return G.time - p._uStart < 0.05 ? 'crouch5' : 'crouch6';
  if (p.sprintT > 0) return 'dash' + (Math.floor(G.time * 20) % 2 ? 4 : 3);
  if (!p.onGround) return p.vy < -150 ? 'jump2' : p.vy < 90 ? 'jump3' : 'jump4';
  if (Math.abs(p.vx) > 15) return 'walk' + (Math.floor(p.anim / 7) % 8);
  return 'idle' + (Math.floor(G.time * 7) % 8);
}
function heroPose(p) {
  if (isRod()) return rodPose(p);
  if (p.wall) return 'wall' + (Math.floor(p.climbAnim / 10) % 2);
  if (p.dashT > 0) return p.rollPose();
  if (p.stun > 0) return 'hurt';
  if (p.atkKind) {
    const ph = p.atkPhase();
    if (p.atkKind === 'low') return 'lunge';
    if (p.atkKind === 'up') return ph === 0 ? 'lunge' : 'jump';
    return ph === 0 ? 'atk_raise' : 'attack';
  }
  if (p.crouch) return 'crouch';
  if (p.sprintT > 0) return 'dash';
  if (!p.onGround) return 'jump';
  if (Math.abs(p.vx) > 15) return 'run' + (Math.floor(p.anim / 9) % RUN_FRAMES);   // ciclo de corrida
  return 'idle';
}
function drawHero(pose, cx, fy, facing, rot = 0, alpha = 1, bob = 0) {
  if (isRod()) return drawRod(pose, cx, fy, facing, alpha);
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
// rastro da espada: arco de a0 até a1 (graus; 0 = para frente, negativo = para cima)
function drawSlashArc(cx, cy, f, a0, a1, prog, r) {
  const t = Math.min(1, prog * 1.7), a = a0 + (a1 - a0) * t, fade = prog < 0.55 ? 1 : Math.max(0, 1 - (prog - 0.55) / 0.45);
  const ccw = a1 < a0, A = d => d * Math.PI / 180;
  const from = ccw ? Math.min(a0, a + 120) : Math.max(a0, a - 120);
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy)); ctx.scale(f, 1);
  // meia-lua: borda de fora inteira, borda de dentro mais fechada (afina na ponta)
  const mid = (A(from) + A(a)) / 2, off = r * 0.22;
  ctx.beginPath();
  ctx.arc(0, 0, r, A(from), A(a), ccw);
  ctx.arc(-Math.cos(mid) * off, -Math.sin(mid) * off, r * 0.8, A(a), A(from), !ccw);
  ctx.closePath();
  ctx.fillStyle = `rgba(200,232,255,${0.3 * fade})`; ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${0.95 * fade})`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r, A(Math.abs(a - from) > 40 ? (ccw ? a + 40 : a - 40) : from), A(a), ccw); ctx.stroke();
  ctx.restore();
}
function drawRod(pose, cx, fy, facing, alpha = 1, rot = 0) {
  const f = ROD_FRAMES[pose];
  if (!f || !rodImg.complete) return;
  const [sx, sy, w, h, ax, ay] = f;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(Math.round(cx), Math.round(fy));
  if (facing < 0) ctx.scale(-1, 1);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(rodImg, sx, sy, w, h, -Math.round(ax), -Math.round(ay), w, h);
  ctx.restore();
}
function drawPlayer() {
  const p = G.player;
  // Rod: animação de queda quando morre
  if (G.state === 'dead' && isRod()) {
    const el = 2.4 - G.deadT, i = Math.min(7, 1 + Math.floor(el / 0.14));
    const cx = (p.x + p.w / 2) * AP, fy = Math.round((p.y + p.h) * AP);
    shadowAt(cx - p.facing * 20, fy, 34);
    drawRod('hurt' + i, cx, fy, p.facing, Math.min(1, G.deadT / 0.6));
    return;
  }
  if (G.state === 'dead' || !heroImg.complete) return;
  const cx = (p.x + p.w / 2) * AP, fy = Math.round((p.y + p.h) * AP);
  for (const gh of p.trail) drawHero(gh.pose, gh.x * AP, gh.y * AP, gh.f, gh.rot || 0, gh.life * (gh.tint ? 2.2 : 2));
  const pose = heroPose(p);
  const alpha = p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0 ? 0.35 : 1;
  if (p.wall && isRod()) {                                 // Rod agarrado: encosta na parede
    const wx = p.wall < 0 ? p.x * AP + 16 : (p.x + p.w) * AP - 16;
    drawRod(pose, wx, Math.round((p.y + p.h) * AP) + 8, p.wall, alpha);
    return;
  }
  if (p.wall) {
    // encostado na parede: o lado da mão encosta na parede
    const wx = p.wall < 0 ? p.x * AP - 6 : (p.x + p.w) * AP + 6;
    drawHero(pose, wx, Math.round((p.y + p.h / 2) * AP), -p.wall, 0, alpha);
    return;
  }
  shadowAt(cx, fy, p.onGround ? 26 : 16);
  const bob = pose === 'idle' && Math.sin(G.time * 2.6) > 0.6 ? -1 : 0;
  drawHero(pose, cx, fy, p.facing, pose.startsWith('roll') ? p.rollAngle() : 0, alpha, bob);
  // efeitos dos golpes
  if (p.atkKind && p.atkPhase() >= 1) {
    const a = ATK[p.atkKind], prog = 1 - (p.atkT - (a.hitTo - 0.06)) / (a.hitFrom - a.hitTo + 0.06);
    const cy = (p.y + p.h / 2) * AP;
    if (p.atkKind === 'punch' || p.atkKind === 'kick') {   // impacto do soco/chute
      const b = p.attackBox(), ix = (p.facing > 0 ? b.x + b.w : b.x) * AP, iy = (b.y + b.h * (p.atkKind === 'kick' ? 0.3 : 0.5)) * AP;
      const k = Math.max(0, 1 - Math.abs(prog - 0.4) * 2.2);
      if (k > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, 26);
        g.addColorStop(0, `rgba(255,245,220,${0.85 * k})`); g.addColorStop(1, 'rgba(255,170,90,0)');
        ctx.fillStyle = g; ctx.fillRect(ix - 26, iy - 26, 52, 52); ctx.restore();
      }
    }
    if (p.atkKind === 'down') drawSlashArc(cx + p.facing * 12, cy + 2, p.facing, -110, 35, Math.max(0, prog), 62);
    else if (p.atkKind === 'up') drawSlashArc(cx + p.facing * 10, cy - 6, p.facing, 55, -115, Math.max(0, prog), 66);
  }
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
  // ---- retrato com barra de vida (arte do autor: assets/hud_panel.png) ----
  const PX = 14, PY = 12;
  const T = HUD.track;                                   // trilha da barra dentro do painel
  const panelImg = isRod() ? HUD.panelRod : HUD.panel;
  if (panelImg.complete) ctx.drawImage(panelImg, PX, PY);
  // levou dano: o retrato pisca em vermelho
  if (p.stun > 0 || p.inv > 0.85) {
    ctx.fillStyle = `rgba(200,20,20,${0.35 * Math.min(1, (p.inv - 0.6) * 2.5)})`;
    ctx.fillRect(PX + 7, PY + 7, 137, 131);
  }
  if (HUD.fill.complete) {
    const frac = Math.max(0, p.hp) / d.maxHp;
    HUD.lag = HUD.lag == null ? frac : Math.max(frac, HUD.lag - 0.6 / 60);   // pedaço perdido some devagar
    const len = T.x1 - T.x0;
    const lagW = Math.round(T.x0 + len * HUD.lag), hpW = Math.round(T.x0 + len * frac);
    if (lagW > hpW && HUD.lagImg) {
      ctx.save(); ctx.globalAlpha = 0.85;
      ctx.drawImage(HUD.lagImg, hpW, 0, lagW - hpW, HUD.fill.height, PX + hpW, PY, lagW - hpW, HUD.fill.height);
      ctx.restore();
    }
    if (hpW > 0) {
      const low = p.hp <= 1 ? 0.75 + 0.25 * Math.sin(G.time * 8) : 1;
      ctx.save(); ctx.globalAlpha = low;
      ctx.drawImage(HUD.fill, 0, 0, hpW, HUD.fill.height, PX, PY, hpW, HUD.fill.height);
      ctx.restore();
    }
    // divisões: uma para cada ponto de vida
    ctx.fillStyle = 'rgba(25,4,6,0.7)';
    for (let k = 1; k < d.maxHp; k++) ctx.fillRect(PX + Math.round(T.x0 + len * k / d.maxHp), PY + T.y0 + 1, 1, T.y1 - T.y0 - 2);
  }
  // habilidades (abaixo do retrato)
  let ix = PX + 4, iy = PY + 168;
  for (const [has, spr] of [[d.abilities.doubleJump, SPR.relicD], [d.abilities.dash && !isRod(), SPR.relicH], [d.abilities.climb, SPR.relicG]]) {
    if (!has) continue;
    frameBox(ix, iy, 30, 30, 0.85);
    ctx.drawImage(spr, ix + 6, iy + 3, 18, 23);
    ix += 40;
  }
  drawMinimap();
  drawBossUI();
  Tutorial.draw();

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
    const h = 74 + lines.length * 30, w = 720, x = CW / 2 - w / 2, y = Tutorial.active() ? 230 : 205;
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
