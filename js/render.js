// =============================================================
//  DESENHO DO MUNDO, FUNDO E INTERFACE
//  As salas são pintadas uma vez numa "camada estática" quando você
//  entra nelas (leve pro celular). Só o que se mexe é redesenhado.
// =============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W * SCALE;
canvas.height = VIEW_H * SCALE;

const FONT = '"M PLUS Rounded 1c", "Nunito", "Trebuchet MS", sans-serif';
const theme = () => THEMES[G.room.def.theme];

function text(str, x, y, { size = 6, color = '#fff', align = 'left', alpha = 1, weight = 800, stroke = null, sw = 1.6 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.strokeText(str, x, y); }
  ctx.fillStyle = color; ctx.fillText(str, x, y);
  ctx.restore();
}
function wrapText(str, maxW, size) {
  ctx.save(); ctx.font = `700 ${size}px ${FONT}`;
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

// =============================================================
//  CAMADA ESTÁTICA DA SALA (blocos + enfeites)
// =============================================================
function buildRoomLayer(room) {
  const th = THEMES[room.def.theme];
  const c = document.createElement('canvas');
  c.width = Math.ceil(room.pw * SCALE); c.height = Math.ceil(room.ph * SCALE);
  const g = c.getContext('2d');
  g.scale(SCALE, SCALE);
  const S = (tx, ty) => tileAt(tx, ty) === '#';
  const R = 3; // raio das quinas arredondadas

  // 1) corpo dos blocos
  for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
    if (!S(tx, ty)) continue;
    const x = tx * TILE, y = ty * TILE;
    const up = !S(tx, ty - 1) && ty > 0, dn = !S(tx, ty + 1) && ty < room.h - 1;
    const lf = !S(tx - 1, ty) && tx > 0, rt = !S(tx + 1, ty) && tx < room.w - 1;
    g.save();
    rrPath(g, x, y, TILE, TILE, [up && lf ? R : 0, up && rt ? R : 0, dn && rt ? R : 0, dn && lf ? R : 0]);
    g.clip();
    g.fillStyle = th.soil; g.fillRect(x - 1, y - 1, TILE + 2, TILE + 2);
    if (th.style === 'stone') {
      g.fillStyle = th.soilDark; g.fillRect(x, y, TILE, TILE);
      for (let r = 0; r < 2; r++) {
        const off = ((ty * 2 + r) % 2) * 6;
        for (let bx = -off; bx < TILE; bx += 12) {
          const v = hash(tx * 3 + bx, ty * 2 + r);
          rrPath(g, x + bx + 0.5, y + r * 8 + 0.5, 11, 7, 1.6);
          g.fillStyle = v > 0.6 ? th.soilLight : v > 0.25 ? th.soil : shadeHex(th.soil, -12); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + bx + 1.5, y + r * 8 + 1, 8, 0.8);
        }
      }
    } else if (th.style === 'wood') {
      for (let i = 0; i < 4; i++) {
        g.fillStyle = (tx + i) % 2 ? th.soil : shadeHex(th.soil, 10);
        g.fillRect(x + i * 4, y, 4, TILE);
        g.fillStyle = 'rgba(90,50,20,0.35)'; g.fillRect(x + i * 4, y, 0.5, TILE);
        g.strokeStyle = 'rgba(90,50,20,0.25)'; g.lineWidth = 0.4;
        g.beginPath(); g.moveTo(x + i * 4 + 1.5, y + hash(tx, i) * 6); g.quadraticCurveTo(x + i * 4 + 2.8, y + 8, x + i * 4 + 1.8, y + 10 + hash(i, ty) * 6); g.stroke();
      }
      if ((tx + ty) % 2 === 0) { ell(g, x + 2, y + 2.5, 0.5, 0.5, '#5a3518'); ell(g, x + 14, y + 2.5, 0.5, 0.5, '#5a3518'); }
    } else {
      for (let i = 0; i < 4; i++) {
        const hx = x + hash(tx * 5 + i, ty) * TILE, hy = y + hash(tx, ty * 5 + i) * TILE, r = 1.5 + hash(i, tx + ty) * 2.5;
        ell(g, hx, hy, r, r * 0.8, i % 2 ? 'rgba(255,240,200,0.35)' : 'rgba(120,70,30,0.18)');
      }
      if (hash(tx + 11, ty) > 0.55) {
        const px = x + 3 + hash(ty, tx) * 10, py = y + 4 + hash(tx * 2, ty) * 9;
        ell(g, px, py, 1.4, 0.9, th.soilDark); ell(g, px - 0.3, py - 0.3, 0.6, 0.35, th.soilLight);
      }
    }
    // escurece conforme vai mais fundo na terra
    let depth = 0; while (depth < 4 && S(tx, ty - depth - 1)) depth++;
    const dg = g.createLinearGradient(0, y, 0, y + TILE);
    dg.addColorStop(0, `rgba(50,25,20,${Math.min(0.3, depth * 0.075)})`);
    dg.addColorStop(1, `rgba(50,25,20,${Math.min(0.3, (depth + 1) * 0.075)})`);
    g.fillStyle = dg; g.fillRect(x, y, TILE, TILE);
    if (dn) { const sg = g.createLinearGradient(0, y + TILE - 5, 0, y + TILE); sg.addColorStop(0, 'rgba(40,20,20,0)'); sg.addColorStop(1, 'rgba(40,20,20,0.3)'); g.fillStyle = sg; g.fillRect(x, y + TILE - 5, TILE, 5); }
    g.restore();

    // contorno só nos lados expostos
    g.strokeStyle = th.outline; g.lineWidth = 0.9; g.lineCap = 'round';
    g.beginPath();
    if (lf) { g.moveTo(x, y + (up ? R : 0)); g.lineTo(x, y + TILE - (dn ? R : 0)); }
    if (rt) { g.moveTo(x + TILE, y + (up ? R : 0)); g.lineTo(x + TILE, y + TILE - (dn ? R : 0)); }
    if (dn) { g.moveTo(x + (lf ? R : 0), y + TILE); g.lineTo(x + TILE - (rt ? R : 0), y + TILE); }
    if (up && th.style === 'stone') { g.moveTo(x + (lf ? R : 0), y); g.lineTo(x + TILE - (rt ? R : 0), y); }
    g.stroke();
    if (dn && lf) { g.beginPath(); g.arc(x + R, y + TILE - R, R, Math.PI / 2, Math.PI); g.stroke(); }
    if (dn && rt) { g.beginPath(); g.arc(x + TILE - R, y + TILE - R, R, 0, Math.PI / 2); g.stroke(); }
  }

  // 2) raízes e cipós pendurados no teto
  for (let ty = 1; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
    if (!S(tx, ty - 1) || S(tx, ty) || tileAt(tx, ty) !== '.') continue;
    const h = hash(tx * 9, ty * 3);
    if (h > 0.3) continue;
    const x = tx * TILE + 3 + hash(tx, ty * 7) * 10, y = ty * TILE, len = 5 + hash(ty, tx) * 12;
    const col = th.style === 'stone' ? th.grassDark : th.grass;
    g.strokeStyle = col; g.lineWidth = 0.8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 2, y + len * 0.5, x - 0.5, y + len); g.stroke();
    for (let k = 1; k < len / 3; k++) {
      const ly = y + k * 3, lx = x + Math.sin(k) * 0.9;
      ell(g, lx + (k % 2 ? 1.3 : -1.3), ly, 1.4, 0.75, k % 2 ? th.grassLight : col, null, 0, k % 2 ? 0.5 : -0.5);
    }
  }

  // 3) grama / musgo por cima
  for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
    if (!S(tx, ty) || S(tx, ty - 1) || ty === 0) continue;
    const lf = !S(tx - 1, ty), rt = !S(tx + 1, ty);
    drawGrassCap(g, tx, ty, th, lf && tx > 0, rt && tx < room.w - 1);
  }

  // 4) plataformas de madeira e espinhos
  for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
    const c = tileAt(tx, ty), x = tx * TILE, y = ty * TILE;
    if (c === '=') {
      const lj = tileAt(tx - 1, ty) === '=', rj = tileAt(tx + 1, ty) === '=';
      if (!lj || !rj) {
        const bx = lj ? x + 11 : x + 2.5;
        rrPath(g, bx, y + 4, 2.5, 5, [0, 0, 1, 1]); paint(g, '#8a5530', OUT, 0.5);
      }
      ell(g, x + 8, y + 6.5, 8, 1.6, 'rgba(40,20,20,0.15)');
      rrPath(g, x + (lj ? 0 : 0.5), y, TILE - (lj ? 0 : 0.5) - (rj ? 0 : 0.5), 4.6, [lj ? 0 : 2, rj ? 0 : 2, rj ? 0 : 2, lj ? 0 : 2]);
      const pg = g.createLinearGradient(0, y, 0, y + 4.6);
      pg.addColorStop(0, '#e2a76a'); pg.addColorStop(1, '#a96d3c');
      paint(g, pg, '#5a3518', 0.6);
      g.fillStyle = 'rgba(255,230,190,0.6)'; g.fillRect(x + 1, y + 0.7, TILE - 2, 0.6);
      g.strokeStyle = 'rgba(90,50,20,0.45)'; g.lineWidth = 0.4;
      g.beginPath(); g.moveTo(x + 2, y + 2.6); g.lineTo(x + 6 + hash(tx, ty) * 5, y + 2.6); g.stroke();
      ell(g, x + 1.8, y + 2.3, 0.45, 0.45, '#4a2a14'); ell(g, x + 14.2, y + 2.3, 0.45, 0.45, '#4a2a14');
    } else if (c === '^') {
      for (let i = 0; i < 3; i++) {
        const bx = x + i * (TILE / 3), tip = y + 6.5 + hash(tx * 3 + i, ty) * 2;
        g.beginPath(); g.moveTo(bx + 0.2, y + 15); g.lineTo(bx + TILE / 6, tip); g.lineTo(bx + TILE / 3 - 0.2, y + 15); g.closePath();
        const sg = g.createLinearGradient(bx, 0, bx + TILE / 3, 0);
        sg.addColorStop(0, '#fbf8ff'); sg.addColorStop(1, '#9893bd');
        paint(g, sg, '#3d3a5a', 0.6);
      }
      rrPath(g, x, y + 14.4, TILE, 1.8, 0.6); paint(g, '#6b5f8a', '#3d3a5a', 0.4);
    }
  }

  // 5) objetos de cenário em cima do chão
  const props = {
    grass: [['flowers', 0.2], ['tallgrass', 0.1], ['rock', 0.04], ['stump', 0.04], ['barrel', 0.03], ['fence', th.fence ? 0.07 : 0], ['mushroom', th.mushrooms ? 0.14 : 0.03], ['pot', 0.02]],
    stone: [['crystal', 0.12], ['rock', 0.08], ['tallgrass', 0.08], ['mushroom', 0.04]],
    wood: [['sack', 0.07], ['barrel', 0.06], ['flowers', 0.14], ['tallgrass', 0.08], ['pot', 0.05]],
  }[th.style];
  for (let ty = 2; ty < room.h; ty++) for (let tx = 1; tx < room.w - 1; tx++) {
    if (!S(tx, ty) || tileAt(tx, ty - 1) !== '.' || tileAt(tx, ty - 2) !== '.') continue;
    if ((room.def.map[ty - 1][tx] || '.') !== '.') continue;
    let h = hash(tx * 7 + 3, ty * 13 + 1), kind = null;
    for (const [k, p] of props) { if (h < p) { kind = k; break; } h -= p; }
    if (!kind) continue;
    if (kind === 'fence' && (!S(tx + 1, ty) || S(tx + 1, ty - 1))) continue;
    drawProp(g, kind, tx * TILE + 8 + (hash(tx, ty + 5) - 0.5) * 4, ty * TILE + 0.6, th, hash(tx + 1, ty + 2));
  }

  room.layer = c;
}

function drawGrassCap(g, tx, ty, th, lf, rt) {
  const x = tx * TILE, y = ty * TILE;
  const thick = th.style === 'stone' ? 2.6 : 4.4;
  const x0 = lf ? x - 0.6 : x - 0.3, x1 = rt ? x + TILE + 0.6 : x + TILE + 0.3, top = y - 1.3;
  const pts = [];
  for (let k = 0; k <= 4; k++) pts.push([x1 - (x1 - x0) * k / 4, y + thick * 0.75]);
  // forma
  g.beginPath();
  g.moveTo(x0, y + thick * 0.8);
  if (lf) g.quadraticCurveTo(x0 - 0.3, top, x0 + 3, top); else g.lineTo(x0, top);
  g.lineTo(x1 - (rt ? 3 : 0), top);
  if (rt) g.quadraticCurveTo(x1 + 0.3, top, x1, y + thick * 0.8);
  else g.lineTo(x1, y + thick * 0.75);
  for (let k = 0; k < 4; k++) {
    const [ax] = pts[k], [bx] = pts[k + 1];
    const dip = y + thick + 0.8 + hash(tx * 4 + k, ty) * (th.style === 'stone' ? 1.5 : 2.6);
    g.quadraticCurveTo((ax + bx) / 2, dip + 1.2, bx, y + thick * 0.75);
  }
  g.closePath();
  const gg = g.createLinearGradient(0, top, 0, y + thick + 3);
  gg.addColorStop(0, th.grassLight); gg.addColorStop(0.35, th.grass); gg.addColorStop(1, th.grassDark);
  g.fillStyle = gg; g.fill();
  // contorno de baixo (as "gotinhas" da grama)
  g.strokeStyle = shadeHex(th.grassDark, -25); g.lineWidth = 0.6;
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let k = 0; k < 4; k++) {
    const [ax] = pts[k], [bx] = pts[k + 1];
    const dip = y + thick + 0.8 + hash(tx * 4 + k, ty) * (th.style === 'stone' ? 1.5 : 2.6);
    g.quadraticCurveTo((ax + bx) / 2, dip + 1.2, bx, y + thick * 0.75);
  }
  g.stroke();
  // brilho em cima
  g.strokeStyle = 'rgba(255,255,230,0.75)'; g.lineWidth = 0.7;
  g.beginPath(); g.moveTo(x0 + (lf ? 2.5 : 0), top + 0.5); g.lineTo(x1 - (rt ? 2.5 : 0), top + 0.5); g.stroke();
  // tufinhos
  const n = th.style === 'stone' ? 1 : 3;
  for (let i = 0; i < n; i++) {
    const bx = x + 2 + hash(tx * 3 + i, ty * 7) * 12, bh = 1.6 + hash(ty, tx * 3 + i) * 2.4;
    g.beginPath(); g.moveTo(bx - 1, top + 0.6); g.quadraticCurveTo(bx, top - bh * 0.4, bx + 0.6, top - bh); g.quadraticCurveTo(bx + 0.4, top - bh * 0.3, bx + 1.2, top + 0.6); g.closePath();
    paint(g, i % 2 ? th.grassLight : th.grass);
  }
  if (th.style !== 'stone' && hash(tx + 40, ty) > 0.8) {
    ell(g, x + 4 + hash(tx, ty + 40) * 8, top + 0.2, 0.9, 0.9, th.flowers[1]);
  }
}

// =============================================================
//  FUNDO (céu, nuvens, morros, árvores, moinho, poço)
// =============================================================
function drawBackground(th, camX, camY) {
  const g = ctx;
  const sky = g.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, th.sky[0]); sky.addColorStop(1, th.sky[1]);
  g.fillStyle = sky; g.fillRect(0, 0, VIEW_W, VIEW_H);
  const vy = (G.room.ph - VIEW_H) - camY;   // 0 quando a câmera está embaixo

  if (th.bg === 'poco') return drawWellBackground(th, camX, camY);

  // sol
  const sx = VIEW_W * 0.74 - camX * 0.03, sy = 34 + vy * 0.03;
  const sun = g.createRadialGradient(sx, sy, 2, sx, sy, 80);
  sun.addColorStop(0, th.sun); sun.addColorStop(0.15, th.sun + 'cc'); sun.addColorStop(1, th.sun + '00');
  g.fillStyle = sun; g.fillRect(0, 0, VIEW_W, VIEW_H);

  // nuvens
  for (let i = 0; i < 6; i++) {
    const cx = (((i * 97 + G.time * (2 + i * 0.7) - camX * 0.08) % 460) + 460) % 460 - 70;
    const cy = 14 + hash(i, 4) * 40 + vy * 0.06, s = 0.6 + hash(i, 8) * 0.6;
    cloud(cx, cy, s);
  }

  hills(th.hills[0], 0.15, 96 + vy * 0.12, 16, 0.012);
  if (th.bg === 'moinho') windmill(230 - camX * 0.16, 92 + vy * 0.12, th);
  treeLine(th.hills[1], 0.32, 128 + vy * 0.25);
  hills(th.hills[2], 0.55, 158 + vy * 0.4, 7, 0.028);
  if (th.fence) fenceRow(shadeHex(th.hills[2], -18), 0.55, 158 + vy * 0.4);

  const haze = g.createLinearGradient(0, 60, 0, VIEW_H);
  haze.addColorStop(0, 'rgba(255,255,255,0)'); haze.addColorStop(1, 'rgba(255,240,220,0.12)');
  g.fillStyle = haze; g.fillRect(0, 0, VIEW_W, VIEW_H);
}

function cloud(x, y, s) {
  const g = ctx;
  g.save(); g.translate(x, y); g.scale(s, s);
  g.globalAlpha = 0.85;
  ell(g, 12, 6, 18, 5, '#e6f0ff');
  ell(g, 0, 2, 8, 7, '#ffffff'); ell(g, 10, -2, 10, 9, '#ffffff'); ell(g, 22, 2, 8, 6.5, '#ffffff');
  ell(g, 9, -4, 5, 3, 'rgba(255,255,255,0.9)');
  g.restore();
}

function hills(color, par, base, amp, freq) {
  const g = ctx, off = G.cam.x * par;
  g.beginPath(); g.moveTo(0, VIEW_H);
  for (let sx = 0; sx <= VIEW_W + 6; sx += 6) {
    const wx = sx + off;
    g.lineTo(sx, base - (Math.sin(wx * freq) * 0.6 + Math.sin(wx * freq * 2.3 + 1.3) * 0.4) * amp);
  }
  g.lineTo(VIEW_W, VIEW_H); g.closePath();
  g.fillStyle = color; g.fill();
  g.strokeStyle = shadeHex(color, 28); g.globalAlpha = 0.6; g.lineWidth = 1.2;
  g.beginPath();
  for (let sx = 0; sx <= VIEW_W + 6; sx += 6) {
    const wx = sx + off, yy = base - (Math.sin(wx * freq) * 0.6 + Math.sin(wx * freq * 2.3 + 1.3) * 0.4) * amp;
    sx ? g.lineTo(sx, yy + 0.8) : g.moveTo(sx, yy + 0.8);
  }
  g.stroke(); g.globalAlpha = 1;
}

function treeLine(color, par, base) {
  const g = ctx, off = G.cam.x * par, sp = 26;
  g.fillStyle = color; g.fillRect(0, base - 2, VIEW_W, VIEW_H);
  const i0 = Math.floor((off - 40) / sp);
  const light = shadeHex(color, 24), dark = shadeHex(color, -30);
  for (let i = i0; i < i0 + 16; i++) {
    const sx = i * sp + hash(i, 1) * 12 - off, h = hash(i, 2), r = 8 + h * 7;
    g.fillStyle = dark; g.fillRect(sx - 1.2, base - 8, 2.4, 9);
    ell(g, sx - r * 0.55, base - 6 - r * 0.5, r * 0.7, r * 0.62, color);
    ell(g, sx + r * 0.55, base - 6 - r * 0.45, r * 0.66, r * 0.6, color);
    ell(g, sx, base - 8 - r * 0.85, r, r * 0.85, color);
    g.globalAlpha = 0.5;
    ell(g, sx - r * 0.3, base - 9 - r * 1.25, r * 0.5, r * 0.3, light);
    g.globalAlpha = 1;
  }
}

function fenceRow(color, par, base) {
  const g = ctx, off = G.cam.x * par;
  g.save(); g.globalAlpha = 0.55; g.fillStyle = color;
  const i0 = Math.floor(off / 7) - 1;
  for (let i = i0; i < i0 + 50; i++) {
    const sx = i * 7 - off;
    if (Math.floor(i / 12) % 3 === 2) continue;   // buracos na cerca
    g.beginPath(); g.moveTo(sx - 1.4, base + 2); g.lineTo(sx - 1.4, base - 9); g.lineTo(sx, base - 11);
    g.lineTo(sx + 1.4, base - 9); g.lineTo(sx + 1.4, base + 2); g.fill();
    g.fillRect(sx - 4, base - 7.5, 7, 1.4); g.fillRect(sx - 4, base - 3.5, 7, 1.4);
  }
  g.restore();
}

function windmill(x, base, th) {
  const g = ctx, col = shadeHex(th.hills[2], -10);
  g.beginPath(); g.moveTo(x - 9, base + 6); g.lineTo(x - 5, base - 34); g.lineTo(x + 5, base - 34); g.lineTo(x + 9, base + 6); g.closePath();
  g.fillStyle = col; g.fill();
  g.beginPath(); g.moveTo(x - 7, base - 34); g.lineTo(x, base - 42); g.lineTo(x + 7, base - 34); g.closePath(); g.fillStyle = shadeHex(col, -15); g.fill();
  rrPath(g, x - 2, base - 12, 4, 6, [2, 2, 0, 0]); g.fillStyle = shadeHex(col, -25); g.fill();
  const a0 = G.time * 0.8;
  for (let i = 0; i < 4; i++) {
    const a = a0 + i * Math.PI / 2;
    g.save(); g.translate(x, base - 32); g.rotate(a);
    g.fillStyle = shadeHex(col, -20); g.fillRect(-0.6, 0, 1.2, 26);
    g.fillStyle = 'rgba(255,248,230,0.75)'; g.fillRect(0.6, 5, 5, 20);
    g.restore();
  }
  ell(g, x, base - 32, 1.8, 1.8, shadeHex(col, -30));
}

function drawWellBackground(th, camX, camY) {
  const g = ctx, ox = camX * 0.5, oy = camY * 0.5;
  for (let r = Math.floor(oy / 10) - 1; r < Math.floor(oy / 10) + 22; r++) {
    const y = r * 10 - oy, sh = (r % 2) * 10;
    for (let c = Math.floor(ox / 20) - 1; c < Math.floor(ox / 20) + 18; c++) {
      const x = c * 20 - ox + sh, v = hash(c, r);
      rrPath(g, x + 0.6, y + 0.6, 18.8, 8.8, 2);
      g.fillStyle = v > 0.5 ? th.hills[0] : th.hills[1]; g.fill();
      if (v > 0.85) { ell(g, x + 4 + v * 8, y + 6, 3, 1.2, 'rgba(110,170,110,0.35)'); }
    }
  }
  // raios de luz entrando pelo alto
  for (let i = 0; i < 3; i++) {
    const bx = 60 + i * 90 - camX * 0.2, a = 0.07 + Math.sin(G.time * 0.8 + i * 2) * 0.03;
    const lg = g.createLinearGradient(0, 0, 0, VIEW_H);
    lg.addColorStop(0, `rgba(220,245,255,${a * 2})`); lg.addColorStop(1, 'rgba(220,245,255,0)');
    g.fillStyle = lg;
    g.beginPath(); g.moveTo(bx, 0); g.lineTo(bx + 22, 0); g.lineTo(bx + 60, VIEW_H); g.lineTo(bx + 20, VIEW_H); g.closePath(); g.fill();
  }
  const dark = g.createLinearGradient(0, 0, 0, VIEW_H);
  dark.addColorStop(0, 'rgba(10,20,30,0)'); dark.addColorStop(1, 'rgba(10,20,30,0.35)');
  g.fillStyle = dark; g.fillRect(0, 0, VIEW_W, VIEW_H);
}

// =============================================================
//  PARTÍCULAS DE AMBIENTE (pétalas, folhas, vaga-lumes, poeira)
// =============================================================
let lastCam = { x: 0, y: 0 };
function updateAmbient(dt) {
  const th = theme(), kind = th.ambient;
  const dx = G.cam.x - lastCam.x, dy = G.cam.y - lastCam.y;
  lastCam = { x: G.cam.x, y: G.cam.y };
  const jump = Math.abs(dx) > 100 || Math.abs(dy) > 100;   // trocou de sala
  const rate = { petal: 4, leaf: 3, firefly: 3, dust: 5 }[kind];
  if (G.ambient.length < 34 && Math.random() < rate * dt) {
    const a = { kind, t: Math.random() * 10, life: 8, rot: Math.random() * TAU };
    if (kind === 'firefly') { a.x = Math.random() * VIEW_W; a.y = 30 + Math.random() * (VIEW_H - 40); a.vx = (Math.random() - 0.5) * 10; a.vy = (Math.random() - 0.5) * 8; a.life = 4 + Math.random() * 3; }
    else if (kind === 'dust') { a.x = Math.random() * VIEW_W; a.y = VIEW_H + 4; a.vx = (Math.random() - 0.5) * 4; a.vy = -6 - Math.random() * 6; a.life = 12; }
    else {
      a.x = Math.random() * (VIEW_W + 80); a.y = -6; a.vx = -10 - Math.random() * 14; a.vy = 12 + Math.random() * 12;
      a.color = kind === 'petal' ? ['#ffd0e0', '#ffffff', '#ffb3cf'][Math.floor(Math.random() * 3)]
                                 : ['#a8d65a', '#f0b04a', '#e8803a'][Math.floor(Math.random() * 3)];
    }
    G.ambient.push(a);
  }
  for (const a of G.ambient) {
    a.t += dt; a.life -= dt;
    if (!jump) { a.x -= dx * 0.9; a.y -= dy * 0.9; }
    a.x += (a.vx + Math.sin(a.t * 2) * 8) * dt;
    a.y += a.vy * dt;
    a.rot += dt * 2;
    if (kind === 'firefly') { a.vx += (Math.random() - 0.5) * 20 * dt; a.vy += (Math.random() - 0.5) * 20 * dt; }
  }
  G.ambient = G.ambient.filter(a => a.life > 0 && a.y < VIEW_H + 10 && a.y > -20 && a.x > -40 && a.x < VIEW_W + 100);
}
function drawAmbient() {
  const g = ctx;
  for (const a of G.ambient) {
    const fade = Math.min(1, a.life, a.t);
    if (a.kind === 'firefly') {
      const p = 0.5 + 0.5 * Math.sin(a.t * 3);
      const gl = g.createRadialGradient(a.x, a.y, 0, a.x, a.y, 6);
      gl.addColorStop(0, `rgba(230,255,150,${0.6 * p * fade})`); gl.addColorStop(1, 'rgba(230,255,150,0)');
      g.fillStyle = gl; g.fillRect(a.x - 6, a.y - 6, 12, 12);
      ell(g, a.x, a.y, 0.8, 0.8, `rgba(255,255,220,${fade})`);
    } else if (a.kind === 'dust') {
      ell(g, a.x, a.y, 0.6, 0.6, `rgba(220,240,255,${0.5 * fade})`);
    } else {
      g.save(); g.globalAlpha = fade * 0.9; g.translate(a.x, a.y); g.rotate(a.rot);
      g.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(a.t * 3)));
      if (a.kind === 'leaf') { g.beginPath(); g.moveTo(-2.2, 0); g.quadraticCurveTo(0, -1.8, 2.2, 0); g.quadraticCurveTo(0, 1.8, -2.2, 0); paint(g, a.color); }
      else ell(g, 0, 0, 1.6, 1.1, a.color);
      g.restore();
    }
  }
}

// =============================================================
//  RENDER PRINCIPAL
// =============================================================
let vignette = null;
function getVignette() {
  if (vignette) return vignette;
  vignette = document.createElement('canvas');
  vignette.width = VIEW_W * SCALE; vignette.height = VIEW_H * SCALE;
  const g = vignette.getContext('2d'); g.scale(SCALE, SCALE);
  const v = g.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
  v.addColorStop(0, 'rgba(60,30,40,0)'); v.addColorStop(1, 'rgba(60,30,40,0.32)');
  g.fillStyle = v; g.fillRect(0, 0, VIEW_W, VIEW_H);
  return vignette;
}

function render() {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if (!G.room) { ctx.fillStyle = '#1a1424'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); return; }

  const th = theme();
  let sx = 0, sy = 0;
  if (G.shake > 0) { sx = (Math.random() - 0.5) * 4; sy = (Math.random() - 0.5) * 4; }
  const camX = Math.round((G.cam.x + sx) * SCALE) / SCALE, camY = Math.round((G.cam.y + sy) * SCALE) / SCALE;

  drawBackground(th, camX, camY);

  ctx.save();
  ctx.translate(-camX, -camY);
  ctx.drawImage(G.room.layer, 0, 0, G.room.pw, G.room.ph);
  drawCrates(camX, camY);
  drawItems();
  for (const e of G.enemies) drawEnemy(e);
  drawPlayer();
  for (const p of G.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ell(ctx, p.x, p.y, p.size / 2, p.size / 2, p.color);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  drawAmbient();
  ctx.drawImage(getVignette(), 0, 0, VIEW_W, VIEW_H);
  drawHUD();

  if (G.fade > 0) { ctx.globalAlpha = Math.min(1, G.fade * 2); ctx.fillStyle = '#fff8f0'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1; }

  if (G.state === 'dead') {
    ctx.globalAlpha = Math.min(0.75, (1.6 - G.deadT) * 0.75);
    ctx.fillStyle = '#2a1030'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1;
    text('Você desmaiou...', VIEW_W / 2, VIEW_H / 2 - 6, { size: 11, align: 'center', color: '#ffd0e0', stroke: '#3a1030', sw: 2.4 });
  }
  if (G.paused) {
    ctx.globalAlpha = 0.45; ctx.fillStyle = '#1a1030'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
    uiWindow(VIEW_W / 2 - 60, VIEW_H / 2 - 22, 120, 40, 'Pausa');
    text('Aperte pausa para voltar', VIEW_W / 2, VIEW_H / 2 + 1, { size: 6, align: 'center', color: '#3b3550', weight: 700 });
  }
}

function drawShadow(cx, feetY, w) {
  const tx = Math.floor(cx / TILE);
  let gy = null;
  for (let ty = Math.floor((feetY - 1) / TILE); ty < Math.floor(feetY / TILE) + 6; ty++) {
    const c = tileAt(tx, ty);
    if ((isSolid(c) || c === '=') && ty * TILE >= feetY - 2) { gy = ty * TILE; break; }
  }
  if (gy == null) return;
  const d = gy - feetY;
  ell(ctx, cx, gy + 0.3, w * Math.max(0.3, 1 - d / 160), 1.8 * Math.max(0.4, 1 - d / 160), `rgba(50,25,30,${0.3 * Math.max(0, 1 - d / 90)})`);
}

function drawCrates(camX, camY) {
  const x0 = Math.max(0, Math.floor(camX / TILE)), x1 = Math.min(G.room.w - 1, Math.floor((camX + VIEW_W) / TILE));
  const y0 = Math.max(0, Math.floor(camY / TILE)), y1 = Math.min(G.room.h - 1, Math.floor((camY + VIEW_H) / TILE));
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (tileAt(tx, ty) !== 'B') continue;
    const x = tx * TILE, y = ty * TILE, g = ctx;
    rrPath(g, x + 0.5, y + 0.5, 15, 15, 1.6);
    const cg = g.createLinearGradient(0, y, 0, y + 16); cg.addColorStop(0, '#e2a96a'); cg.addColorStop(1, '#b07440');
    paint(g, cg, '#4a2a14', 0.8);
    g.strokeStyle = '#7a4a26'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + 13, y + 13); g.stroke();
    rrPath(g, x + 1.5, y + 1.5, 13, 13, 1); g.strokeStyle = '#8a5530'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = 'rgba(255,240,210,0.5)'; g.fillRect(x + 2, y + 1.6, 12, 0.6);
    for (const [nx, ny] of [[2.5, 2.5], [13.5, 2.5], [2.5, 13.5], [13.5, 13.5]]) ell(g, x + nx, y + ny, 0.5, 0.5, '#4a2a14');
  }
}

function drawItems() {
  for (const it of G.items) {
    const bob = Math.sin(G.time * 3 + it.x) * 1.5;
    if (it.type === 'save') drawLantern(ctx, it.x, it.y, G.time, G.saveLock);
    else if (it.type === 'heart') { drawShadow(it.x + 4, it.y + it.h, 3); drawHeartIcon(ctx, it.x + 4, it.y + 4, 3.2, true); }
    else if (it.type === 'E') drawPortal(ctx, it.x + 5, it.y + 8, G.time);
    else if (it.type === '+') drawHeartContainer(ctx, it.x + 5, it.y + 5 + bob, G.time);
    else {
      const color = it.type === 'D' ? '#5fe8ff' : '#ffb347';
      drawOrb(ctx, it.x + 5, it.y + 5 + bob, color, G.time, it.type);
      if (Math.random() < 0.08) spawnParticles(it.x + 5, it.y + 5, 1, color, { speed: 18, life: 0.7 });
    }
  }
}

function drawEnemy(e) {
  if (e.dead) return;
  const flash = e.flash > 0;
  if (e instanceof Walker) {
    drawShadow(e.x + e.w / 2, e.y + e.h, 7);
    drawMushroom(ctx, e.x + e.w / 2, e.y + e.h, e.dir, e.t, flash);
  } else {
    drawShadow(e.x + e.w / 2, e.y + e.h + 2, 5);
    const face = G.player.x > e.x ? 1 : -1;
    drawPlumito(ctx, e.x + 6, e.y + 5 + Math.sin(e.t * 3) * 1.2, e.t, face, flash);
  }
}

function drawPlayer() {
  const p = G.player;
  if (G.state === 'dead') return;
  const cx = p.x + p.w / 2, fy = p.y + p.h;
  const pose = {
    facing: p.facing, t: G.time, run: Math.abs(p.vx) > 15, phase: p.anim * 0.22,
    air: p.onGround ? 0 : (p.vy < 0 ? -1 : 1), atk: p.atkT > 0 ? 1 - p.atkT / 0.16 : -1, hurt: p.stun > 0,
  };
  for (const gh of p.trail) {
    ctx.globalAlpha = gh.life * 1.2;
    drawMia(ctx, gh.x, gh.y, { ...pose, facing: gh.f, atk: -1 });
  }
  ctx.globalAlpha = 1;
  drawShadow(cx, fy, 6);
  if (p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0) ctx.globalAlpha = 0.45;
  drawMia(ctx, cx, fy, pose);
  ctx.globalAlpha = 1;
  if (p.atkT > 0) drawSlash(ctx, cx + p.facing * 2, fy - 12, p.facing, 1 - p.atkT / 0.16);
}

// =============================================================
//  INTERFACE (janelinhas no estilo RPG online)
// =============================================================
function uiWindow(x, y, w, h, title) {
  const g = ctx;
  g.save(); g.globalAlpha = 0.3; rrPath(g, x + 1, y + 1.6, w, h, 4); g.fillStyle = '#1a1030'; g.fill(); g.restore();
  rrPath(g, x, y, w, h, 4);
  const bg = g.createLinearGradient(0, y, 0, y + h);
  bg.addColorStop(0, 'rgba(255,255,255,0.96)'); bg.addColorStop(1, 'rgba(226,234,248,0.96)');
  g.fillStyle = bg; g.fill();
  g.strokeStyle = '#5b6fa8'; g.lineWidth = 0.8; g.stroke();
  if (title) {
    rrPath(g, x + 1, y + 1, w - 2, 8.5, [3, 3, 0, 0]);
    const tg = g.createLinearGradient(0, y, 0, y + 9);
    tg.addColorStop(0, '#9dc0f5'); tg.addColorStop(1, '#5a7fd0');
    g.fillStyle = tg; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x + 3, y + 1.6, w - 6, 0.6);
    text(title, x + 4, y + 1.9, { size: 5.6, color: '#fff', stroke: '#2c3e7a', sw: 1.2 });
  }
}

function drawHUD() {
  const p = G.player, d = G.data, g = ctx;

  // janela de status
  const W = Math.max(78, 30 + d.maxHp * 8.5);
  uiWindow(4, 4, W, 33, 'Mia');
  text('Nv. 1', 4 + W - 4, 5.9, { size: 4.6, color: '#fff', align: 'right', stroke: '#2c3e7a', sw: 1 });
  g.save();
  g.beginPath(); g.arc(15, 24, 8, 0, TAU);
  const pb = g.createLinearGradient(0, 16, 0, 32); pb.addColorStop(0, '#fff3e0'); pb.addColorStop(1, '#ffd0b0');
  g.fillStyle = pb; g.fill(); g.clip();
  g.translate(15, 24); g.scale(0.95, 0.95);
  drawMia(g, -0.5, 19.5, { facing: 1, t: G.time, run: false, phase: 0, air: 0, atk: -1, hurt: p.stun > 0 });
  g.restore();
  g.beginPath(); g.arc(15, 24, 8, 0, TAU); g.strokeStyle = '#5b6fa8'; g.lineWidth = 0.8; g.stroke();
  for (let i = 0; i < d.maxHp; i++) drawHeartIcon(g, 29 + i * 8.5, 19, 3.2, i < p.hp);
  let ix = 27;
  const icon = (color, kind) => {
    ell(g, ix + 2.4, 30.5, 2.6, 2.6, color, OUT, 0.5);
    g.strokeStyle = '#fff'; g.lineWidth = 0.6; g.lineCap = 'round'; g.beginPath();
    if (kind === 'D') { g.moveTo(ix + 1.2, 31.2); g.lineTo(ix + 2.4, 30); g.lineTo(ix + 3.6, 31.2); }
    else { g.moveTo(ix + 1.6, 29.3); g.lineTo(ix + 2.8, 30.5); g.lineTo(ix + 1.6, 31.7); }
    g.stroke(); ix += 7;
  };
  if (d.abilities.doubleJump) icon('#5fe8ff', 'D');
  if (d.abilities.dash) icon('#ffb347', 'H');

  drawMinimap();

  if (G.roomTitle && G.roomTitle.t > 0) {
    const a = Math.min(1, G.roomTitle.t, (2.5 - G.roomTitle.t) * 3);
    text(G.roomTitle.text, VIEW_W / 2, 42, { size: 10, align: 'center', alpha: a, color: '#fffaf0', stroke: '#4a2a3a', sw: 2.4 });
    g.globalAlpha = a; g.fillStyle = '#fffaf0';
    g.fillRect(VIEW_W / 2 - 60, 55, 120, 0.7);
    sparkle(g, VIEW_W / 2, 55.3, 2.2, '#ffe9a0');
    g.globalAlpha = 1;
  }

  if (G.banner && G.banner.t > 0) {
    const b = G.banner, a = Math.min(1, b.t * 2);
    const lines = wrapText(b.text, 182, 6);
    const h = 16 + lines.length * 8.5, bx = VIEW_W / 2 - 100, by = 62;
    g.save(); g.globalAlpha = a;
    uiWindow(bx, by, 200, h, b.title);
    g.fillStyle = b.color || '#5a7fd0';
    ell(g, bx + 196 - 3, by + 5.2, 2, 2, b.color || '#fff', '#2c3e7a', 0.5);
    lines.forEach((l, i) => text(l, VIEW_W / 2, by + 12 + i * 8.5, { size: 6, align: 'center', color: '#3b3550', weight: 700 }));
    g.restore();
  }
}

function drawMinimap() {
  const g = ctx, CW = 7, CH = 4.2;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const id in ROOMS) {
    const r = ROOMS[id], w = r.map[0].length / 20, h = r.map.length / 12;
    minX = Math.min(minX, r.wx); maxX = Math.max(maxX, r.wx + w);
    minY = Math.min(minY, r.wy); maxY = Math.max(maxY, r.wy + h);
  }
  const W = (maxX - minX) * CW, H = (maxY - minY) * CH;
  const wx = VIEW_W - W - 12, wy = 4;
  uiWindow(wx, wy, W + 8, H + 14, 'Mapa');
  const ox = wx + 4, oy = wy + 11;
  for (const id in ROOMS) {
    if (!G.data.visited[id]) continue;
    const r = ROOMS[id], w = r.map[0].length / 20, h = r.map.length / 12, col = THEMES[r.theme].map;
    rrPath(g, ox + (r.wx - minX) * CW + 0.3, oy + (r.wy - minY) * CH + 0.3, w * CW - 0.6, h * CH - 0.6, 1);
    g.fillStyle = id === G.roomId ? col : shadeHex(col, -10) + '88'; g.fill();
    if (id === G.roomId) { g.strokeStyle = '#2c3e7a'; g.lineWidth = 0.6; g.stroke(); }
  }
  const p = G.player, d = G.room.def;
  const px = ox + (d.wx - minX) * CW + (p.x / VIEW_W) * CW;
  const py = oy + (d.wy - minY) * CH + (p.y / VIEW_H) * CH;
  ell(g, px, py, 1.3 + Math.sin(G.time * 6) * 0.3, 1.3 + Math.sin(G.time * 6) * 0.3, '#ff3d6a', '#fff', 0.5);
}
