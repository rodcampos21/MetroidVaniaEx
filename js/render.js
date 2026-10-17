// =============================================================
//  DESENHO: tudo é desenhado com retângulos (sem imagens ainda)
// =============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W * SCALE;
canvas.height = VIEW_H * SCALE;

const FONT = '"Press Start 2P", "Courier New", monospace';

function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

function text(str, x, y, { size = 6, color = '#fff', align = 'left', alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000';
  ctx.fillText(str, x + 0.7, y + 0.7);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

function wrapText(str, maxChars) {
  const words = str.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) { lines.push(line); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line);
  return lines;
}

const hash = (x, y) => {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
};

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// ---------------------------------------------------------------
function render() {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;

  if (!G.room) { rect(0, 0, VIEW_W, VIEW_H, '#05060c'); return; }

  const def = G.room.def;
  let sx = 0, sy = 0;
  if (G.shake > 0) { sx = (Math.random() - 0.5) * 4; sy = (Math.random() - 0.5) * 4; }
  const camX = Math.round(G.cam.x + sx), camY = Math.round(G.cam.y + sy);

  drawBackground(def, camX, camY);

  ctx.save();
  ctx.translate(-camX, -camY);
  drawTiles(def, camX, camY);
  drawItems();
  for (const e of G.enemies) drawEnemy(e);
  drawPlayer();
  for (const p of G.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    rect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size, p.color);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  drawHUD();

  if (G.fade > 0) { ctx.globalAlpha = Math.min(1, G.fade * 2); rect(0, 0, VIEW_W, VIEW_H, '#000'); ctx.globalAlpha = 1; }

  if (G.state === 'dead') {
    ctx.globalAlpha = Math.min(0.8, (1.6 - G.deadT) * 0.8);
    rect(0, 0, VIEW_W, VIEW_H, '#1a0008');
    ctx.globalAlpha = 1;
    text('VOCÊ CAIU...', VIEW_W / 2, VIEW_H / 2 - 4, { size: 8, align: 'center', color: '#ff5a7a' });
  }
  if (G.paused) {
    ctx.globalAlpha = 0.6; rect(0, 0, VIEW_W, VIEW_H, '#000'); ctx.globalAlpha = 1;
    text('PAUSADO', VIEW_W / 2, VIEW_H / 2 - 10, { size: 10, align: 'center' });
    text('aperte pausa para continuar', VIEW_W / 2, VIEW_H / 2 + 8, { size: 5, align: 'center', color: '#aab' });
  }
}

function drawBackground(def, camX, camY) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, def.bg[0]); g.addColorStop(1, def.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // rochas distantes (parallax)
  ctx.fillStyle = shade(def.bg[1], 14);
  for (let i = 0; i < 14; i++) {
    const w = 30 + hash(i, 1) * 50, h = 40 + hash(i, 2) * 90;
    const x = ((i * 83 - camX * 0.25) % 420 + 420) % 420 - 50;
    ctx.fillRect(x, VIEW_H - h + (camY * 0.1) % 20, w, h);
    ctx.fillRect(x + w * 0.3, 0, w * 0.4, 20 + hash(i, 3) * 40);
  }
  // esporos brilhando
  for (let i = 0; i < 30; i++) {
    const x = ((hash(i, 7) * 400 - camX * 0.5) % 340 + 340) % 340 - 10;
    const y = ((hash(i, 9) * 220 - camY * 0.5 + Math.sin(G.time + i) * 4) % 210 + 210) % 210 - 10;
    ctx.globalAlpha = 0.25 + 0.25 * Math.sin(G.time * 2 + i);
    rect(Math.round(x), Math.round(y), 1, 1, def.edge);
  }
  ctx.globalAlpha = 1;
}

function drawTiles(def, camX, camY) {
  const x0 = Math.max(0, Math.floor(camX / TILE)), x1 = Math.min(G.room.w - 1, Math.floor((camX + VIEW_W) / TILE));
  const y0 = Math.max(0, Math.floor(camY / TILE)), y1 = Math.min(G.room.h - 1, Math.floor((camY + VIEW_H) / TILE));
  const dark = shade(def.wall, -25), light = shade(def.wall, 18);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const c = tileAt(tx, ty), x = tx * TILE, y = ty * TILE;
      if (c === '#') {
        rect(x, y, TILE, TILE, def.wall);
        if (hash(tx, ty) > 0.55) rect(x + 3 + Math.floor(hash(ty, tx) * 8), y + 4 + Math.floor(hash(tx + 9, ty) * 7), 3, 2, dark);
        if (hash(tx + 3, ty + 5) > 0.7) rect(x + 2 + Math.floor(hash(ty, tx + 2) * 10), y + 9, 2, 2, light);
        if (!isSolid(tileAt(tx, ty - 1))) { rect(x, y, TILE, 2, def.edge); rect(x, y + 2, TILE, 1, light); }
        if (!isSolid(tileAt(tx, ty + 1))) rect(x, y + TILE - 2, TILE, 2, dark);
        if (!isSolid(tileAt(tx - 1, ty))) rect(x, y, 1, TILE, light);
        if (!isSolid(tileAt(tx + 1, ty))) rect(x + TILE - 1, y, 1, TILE, dark);
      } else if (c === 'B') {
        rect(x, y, TILE, TILE, '#7a5a3a');
        rect(x + 1, y + 1, TILE - 2, TILE - 2, '#8f6b45');
        rect(x + 4, y + 2, 1, 6, '#4a3420'); rect(x + 5, y + 7, 5, 1, '#4a3420');
        rect(x + 10, y + 8, 1, 6, '#4a3420');
      } else if (c === '=') {
        rect(x, y, TILE, 4, '#8a6a4a');
        rect(x, y, TILE, 1, '#c9a27a');
        rect(x + 2, y + 4, 2, 3, '#5a4330'); rect(x + 12, y + 4, 2, 3, '#5a4330');
      } else if (c === '^') {
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = '#d9dce8';
          ctx.beginPath();
          ctx.moveTo(x + i * 4, y + 16); ctx.lineTo(x + i * 4 + 2, y + 8); ctx.lineTo(x + i * 4 + 4, y + 16);
          ctx.fill();
        }
        rect(x, y + 15, TILE, 1, '#6a6f80');
      }
    }
  }
}

function drawItems() {
  for (const it of G.items) {
    const bob = Math.round(Math.sin(G.time * 3 + it.x) * 2);
    if (it.type === 'save') {
      const cx = it.x + 8, glow = 0.5 + 0.5 * Math.sin(G.time * 3);
      ctx.globalAlpha = 0.25 + glow * 0.2;
      ctx.fillStyle = '#7dffb0';
      ctx.beginPath(); ctx.arc(cx, it.y + 6, 10, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      rect(it.x + 3, it.y + 13, 10, 3, '#556');
      ctx.fillStyle = '#b8ffd6';
      ctx.beginPath();
      ctx.moveTo(cx, it.y - 2 + bob); ctx.lineTo(cx + 4, it.y + 6 + bob);
      ctx.lineTo(cx, it.y + 12 + bob); ctx.lineTo(cx - 4, it.y + 6 + bob); ctx.fill();
      rect(cx - 1, it.y + 2 + bob, 1, 4, '#fff');
    } else if (it.type === 'heart') {
      drawHeart(Math.round(it.x), Math.round(it.y), true);
    } else if (it.type === 'E') {
      const cx = it.x + 5, cy = it.y + 2;
      for (let r = 12; r > 2; r -= 3) {
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(G.time * 4 + r);
        ctx.fillStyle = r % 2 ? '#fff6a0' : '#ffb0f0';
        ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.6, r, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else {
      const color = { D: '#7df9ff', H: '#ffb347', '+': '#ff5a7a' }[it.type];
      const cx = it.x + 5, cy = it.y + 5 + bob;
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, 9 + Math.sin(G.time * 5), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      if (it.type === '+') drawHeart(cx - 3, cy - 3, true);
      else {
        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
        rect(cx - 2, cy - 3, 2, 2, '#fff');
      }
      if (Math.random() < 0.1) spawnParticles(cx, cy, 1, color, { speed: 20, life: 0.6 });
    }
  }
}

function drawEnemy(e) {
  if (e.dead) return;
  const x = Math.round(e.x), y = Math.round(e.y);
  const white = e.flash > 0;
  if (e instanceof Walker) {
    const body = white ? '#fff' : e.color, dark = white ? '#fff' : '#8a2f44';
    const step = Math.floor(e.t * 8) % 2;
    rect(x + 1, y + 10, 3, 2 - step, dark); rect(x + 8, y + 10, 3, 1 + step, dark);
    rect(x, y + 4, 12, 7, body);
    rect(x + 2, y + 1, 8, 3, body);
    rect(x + 2, y + 2, 8, 1, white ? '#fff' : '#ff9bb0');
    const ex = e.dir > 0 ? x + 7 : x + 2;
    rect(ex, y + 5, 3, 3, '#fff'); rect(ex + (e.dir > 0 ? 1 : 0), y + 6, 2, 2, '#200');
  } else {
    const flap = Math.sin(e.t * 18) > 0;
    const body = white ? '#fff' : e.color, wing = white ? '#fff' : '#6a3fbf';
    ctx.fillStyle = wing;
    ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x - 3, flap ? y - 2 : y + 8); ctx.lineTo(x + 3, y + 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 8, y + 4); ctx.lineTo(x + 15, flap ? y - 2 : y + 8); ctx.lineTo(x + 9, y + 7); ctx.fill();
    rect(x + 3, y + 2, 6, 7, body);
    rect(x + 3, y + 1, 1, 1, body); rect(x + 8, y + 1, 1, 1, body);
    rect(x + 4, y + 4, 1, 1, '#ffe14d'); rect(x + 7, y + 4, 1, 1, '#ffe14d');
  }
}

function drawPlayer() {
  const p = G.player;
  if (G.state === 'dead') return;
  if (p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0) return;
  const x = Math.round(p.x), y = Math.round(p.y), f = p.facing;
  // desenha espelhado quando olha para a esquerda
  const R = (rx, ry, w, h, c) => rect(f > 0 ? x + rx : x + p.w - rx - w, y + ry, w, h, c);

  const running = p.onGround && Math.abs(p.vx) > 10;
  const step = running ? Math.floor(p.anim / 8) % 2 : 0;
  const wave = Math.round(Math.sin(G.time * 10));

  // cachecol
  R(-3, 6 + wave * (p.onGround ? 0 : 1), 3, 2, '#e8475f');
  R(-5, 7 + wave, 2, 2, '#e8475f');
  // pernas
  if (!p.onGround) { R(2, 11, 3, 3, '#2b2b45'); R(6, 10, 3, 3, '#2b2b45'); }
  else { R(2, 11, 3, 3 - step, '#2b2b45'); R(6, 11, 3, 2 + step, '#2b2b45'); }
  // corpo
  R(1, 6, 8, 5, '#3fa9f5');
  R(1, 6, 8, 1, '#8fd3ff');
  R(0, 6, 2, 2, '#e8475f');
  // cabeça
  R(2, 0, 7, 6, '#f2c79b');
  R(1, 0, 8, 2, '#3a2a4a');
  R(1, 2, 2, 3, '#3a2a4a');
  R(6, 2, 1, 2, '#1a1020');
  // espada
  if (p.atkT > 0) {
    const t = 1 - p.atkT / 0.16;
    const cx = x + p.w / 2 + f * 4, cy = y + p.h / 2;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 1 - t * 0.6;
    ctx.beginPath();
    const a0 = -1.3 + t * 0.6, a1 = 1.1;
    if (f > 0) ctx.arc(cx, cy, 14, a0, a1);
    else ctx.arc(cx, cy, 14, Math.PI - a1, Math.PI - a0);
    ctx.stroke();
    ctx.strokeStyle = '#7df9ff'; ctx.lineWidth = 1;
    ctx.beginPath();
    if (f > 0) ctx.arc(cx, cy, 11, a0, a1); else ctx.arc(cx, cy, 11, Math.PI - a1, Math.PI - a0);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    R(9, 7, 1, 4, '#c9d1e8');
  }
}

function drawHeart(x, y, full) {
  const shape = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  for (let j = 0; j < shape.length; j++)
    for (let i = 0; i < 7; i++)
      if (shape[j][i] === 'X') rect(x + i, y + j, 1, 1, full ? (j === 1 && i === 1 ? '#ffc0cc' : '#ff4d6d') : '#3a2030');
}

function drawHUD() {
  const p = G.player, d = G.data;
  for (let i = 0; i < d.maxHp; i++) drawHeart(6 + i * 9, 6, i < p.hp);
  // habilidades
  let ix = 6;
  if (d.abilities.doubleJump) { rect(ix, 15, 6, 6, '#7df9ff'); text('2', ix + 1, 15.5, { size: 5, color: '#003' }); ix += 8; }
  if (d.abilities.dash) { rect(ix, 15, 6, 6, '#ffb347'); text('»', ix + 0.5, 15.5, { size: 5, color: '#310' }); }
  drawMinimap();

  if (G.roomTitle && G.roomTitle.t > 0) {
    const a = Math.min(1, G.roomTitle.t);
    text(G.roomTitle.text, VIEW_W / 2, 26, { size: 7, align: 'center', alpha: a, color: G.room.def.edge });
  }

  if (G.banner && G.banner.t > 0) {
    const b = G.banner, a = Math.min(1, b.t * 2);
    const lines = wrapText(b.text, 42);
    const h = 26 + lines.length * 9, by = 38;
    ctx.globalAlpha = a * 0.85;
    rect(30, by, VIEW_W - 60, h, '#0a0c18');
    rect(30, by, VIEW_W - 60, 1, b.color || '#fff');
    rect(30, by + h - 1, VIEW_W - 60, 1, b.color || '#fff');
    ctx.globalAlpha = 1;
    text(b.title, VIEW_W / 2, by + 7, { size: 8, align: 'center', alpha: a, color: b.color || '#fff' });
    lines.forEach((l, i) => text(l, VIEW_W / 2, by + 21 + i * 9, { size: 5, align: 'center', alpha: a, color: '#dde' }));
  }
}

function drawMinimap() {
  const CW = 8, CH = 5;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const id in ROOMS) {
    const r = ROOMS[id], w = r.map[0].length / 20, h = r.map.length / 12;
    minX = Math.min(minX, r.wx); maxX = Math.max(maxX, r.wx + w);
    minY = Math.min(minY, r.wy); maxY = Math.max(maxY, r.wy + h);
  }
  const W = (maxX - minX) * CW, H = (maxY - minY) * CH;
  const ox = VIEW_W - W - 6, oy = 6;
  ctx.globalAlpha = 0.55; rect(ox - 2, oy - 2, W + 4, H + 4, '#000'); ctx.globalAlpha = 1;
  for (const id in ROOMS) {
    if (!G.data.visited[id]) continue;
    const r = ROOMS[id], w = r.map[0].length / 20, h = r.map.length / 12;
    const x = ox + (r.wx - minX) * CW, y = oy + (r.wy - minY) * CH;
    rect(x, y, w * CW, h * CH, id === G.roomId ? r.edge : shade(r.wall, 10));
    rect(x + 1, y + 1, w * CW - 2, h * CH - 2, id === G.roomId ? shade(r.wall, 40) : r.wall);
  }
  const p = G.player, d = G.room.def;
  if (Math.floor(G.time * 3) % 2 === 0) {
    const px = ox + (d.wx - minX) * CW + (p.x / VIEW_W) * CW;
    const py = oy + (d.wy - minY) * CH + (p.y / VIEW_H) * CH;
    rect(Math.round(px) - 1, Math.round(py) - 1, 2, 2, '#fff');
  }
}
