// =============================================================
//  ARTE: personagens, itens e objetos desenhados por código
//  Estilo chibi/anime: cabeça grande, olhos brilhantes, contorno suave
// =============================================================

const TAU = Math.PI * 2;
const OUT = '#3a2630';   // cor do contorno (marrom-escuro, mais suave que preto)

function ell(g, x, y, rx, ry, fill, stroke, lw = 0.7, rot = 0) {
  g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function paint(g, fill, stroke, lw = 0.7) {
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function rrPath(g, x, y, w, h, r) {
  const [tl, tr, br, bl] = typeof r === 'number' ? [r, r, r, r] : r;
  g.beginPath();
  g.moveTo(x + tl, y); g.lineTo(x + w - tr, y); g.quadraticCurveTo(x + w, y, x + w, y + tr);
  g.lineTo(x + w, y + h - br); g.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  g.lineTo(x + bl, y + h); g.quadraticCurveTo(x, y + h, x, y + h - bl);
  g.lineTo(x, y + tl); g.quadraticCurveTo(x, y, x + tl, y); g.closePath();
}
function thickLine(g, x1, y1, x2, y2, w, color) {
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
  g.strokeStyle = OUT; g.lineWidth = w + 1.2; g.stroke();
  g.strokeStyle = color; g.lineWidth = w; g.stroke();
}
function sparkle(g, x, y, r, color, alpha = 1) {
  g.save(); g.globalAlpha *= alpha; g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r);
  g.fill(); g.restore();
}

// ---------------------------------------------------------------
//  MIA — a heroína (garota-gato aventureira)
//  (x, y) = ponto entre os pés. o = { facing, t, run, phase, air, atk, hurt }
// ---------------------------------------------------------------
const MIA = {
  hair: '#ff8f5a', hairD: '#d4583a', hairL: '#ffc996',
  skin: '#ffe6d0', tunic: '#4f8fe6', tunicD: '#2f62b8', tunicL: '#a6ceff',
  pants: '#3b3f6e', boot: '#8a4f2c', scarf: '#ff4f6a',
  iris1: '#1d5e78', iris2: '#3fd6c6',
};

function drawMia(g, x, y, o) {
  const C = MIA, t = o.t;
  g.save();
  g.translate(x, y);
  g.scale(o.facing, 1);

  const air = o.air, running = o.run && !air, ph = o.phase;
  const bob = air ? 0 : running ? -Math.abs(Math.sin(ph)) * 1.1 : Math.sin(t * 3) * 0.35;

  // ---- rabo ----
  const sway = Math.sin(t * 4) * 1.8 + (running ? Math.sin(ph) * 1.5 : 0) + (air < 0 ? 2 : 0);
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(-2.5, -8.5 + bob);
  g.quadraticCurveTo(-10, -9 + bob, -9 + sway * 0.5, -16 + bob + (air > 0 ? -2 : 0));
  g.strokeStyle = OUT; g.lineWidth = 3.4; g.stroke();
  g.strokeStyle = C.hair; g.lineWidth = 2.2; g.stroke();
  ell(g, -9 + sway * 0.5, -16 + bob + (air > 0 ? -2 : 0), 1.2, 1.2, '#fff3e6');

  // ---- ponta do cachecol ----
  const wave = Math.sin(t * 9) * 1.2, lift = air < 0 ? 3 : running ? 1.5 : 0;
  g.beginPath();
  g.moveTo(-2, -15.5 + bob);
  g.quadraticCurveTo(-6, -15 + wave - lift + bob, -10.5, -13.5 + wave * 1.4 - lift + bob);
  g.lineTo(-10, -11.2 + wave - lift * 0.6 + bob);
  g.quadraticCurveTo(-6, -12.5 + bob, -2, -13.5 + bob);
  g.closePath();
  paint(g, C.scarf, OUT);

  // ---- bainha da espada ----
  thickLine(g, -3.5, -9 + bob, -7.5, -5 + bob, 1.4, '#6b3f22');
  ell(g, -7.6, -4.9 + bob, 0.8, 0.8, '#ffd36b');

  // ---- pernas ----
  let lf = 1.5, lb = -1.5, upF = 0, upB = 0;
  if (air) { lf = 2.6; lb = -1.2; upF = 2.2; upB = 0.8; }
  else if (running) {
    lf = Math.sin(ph) * 3.2; lb = -Math.sin(ph) * 3.2;
    upF = Math.max(0, Math.cos(ph)) * 1.6; upB = Math.max(0, -Math.cos(ph)) * 1.6;
  }
  const leg = (hx, fx, up, dark) => {
    thickLine(g, hx, -7 + bob, fx, -1.8 - up, 2.1, dark ? '#2c2f55' : C.pants);
    ell(g, fx + 0.7, -1.3 - up, 2.1, 1.35, dark ? '#6e3e22' : C.boot, OUT);
  };
  leg(-1, lb, upB, true);
  leg(1, lf, upF, false);

  // ---- braço de trás ----
  const armSwing = running ? -Math.sin(ph) * 2 : 0;
  thickLine(g, -1.5, -13.5 + bob, -3.4 + armSwing, -9.8 + bob, 1.6, C.tunicD);

  // ---- corpo (túnica) ----
  g.beginPath();
  g.moveTo(-3.4, -15.2 + bob); g.lineTo(3.6, -15.2 + bob);
  g.lineTo(4.8, -6.8 + bob); g.quadraticCurveTo(0.6, -5.4 + bob, -4, -6.8 + bob);
  g.closePath();
  paint(g, C.tunic, OUT);
  g.beginPath();
  g.moveTo(-2.6, -14.6 + bob); g.lineTo(-1.2, -14.6 + bob); g.lineTo(-1.6, -7 + bob); g.lineTo(-3.2, -7.2 + bob); g.closePath();
  paint(g, C.tunicL);
  rrPath(g, -4.1, -9.8 + bob, 8.6, 1.5, 0.4); paint(g, '#7a4a2a', OUT, 0.5);
  rrPath(g, 1.2, -10 + bob, 1.8, 1.9, 0.3); paint(g, '#ffd36b', OUT, 0.4);
  ell(g, 0.3, -15 + bob, 3.8, 1.6, C.scarf, OUT);

  // ---- braço da frente + espada ----
  if (o.atk >= 0) {
    const a = -1.5 + o.atk * 2.6;                       // ângulo do golpe
    const hx = 2 + Math.cos(a) * 5, hy = -13 + bob + Math.sin(a) * 5;
    thickLine(g, 1.6, -13.5 + bob, hx, hy, 1.7, C.tunic);
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.cos(a) * 13, hy + Math.sin(a) * 13);
    g.strokeStyle = OUT; g.lineWidth = 2.6; g.stroke();
    g.strokeStyle = '#e8f4ff'; g.lineWidth = 1.5; g.stroke();
    thickLine(g, hx - Math.sin(a) * 2, hy + Math.cos(a) * 2, hx + Math.sin(a) * 2, hy - Math.cos(a) * 2, 1, '#ffd36b');
    ell(g, hx, hy, 1.4, 1.4, C.skin, OUT, 0.5);
  } else {
    const hx = 3.6 - armSwing, hy = -9.8 + bob + (air < 0 ? -1.5 : 0);
    thickLine(g, 1.8, -13.5 + bob, hx, hy, 1.6, C.tunic);
    ell(g, hx + 0.2, hy + 0.3, 1.3, 1.3, C.skin, OUT, 0.5);
  }

  // ---- cabeça ----
  const hx = 0.6, hy = -19.6 + bob * 0.7;
  // cabelo de trás
  ell(g, hx - 1, hy + 0.6, 7.4, 7.2, C.hairD, OUT);
  g.beginPath(); g.moveTo(hx - 6, hy + 2); g.quadraticCurveTo(hx - 7.8, hy + 7, hx - 5.5, hy + 9.5 + (running ? 0.6 : 0));
  g.lineTo(hx - 3.6, hy + 5); g.closePath(); paint(g, C.hairD, OUT);
  // orelhas de gato
  const ear = (ex, ey, rot) => {
    g.save(); g.translate(ex, ey); g.rotate(rot + Math.sin(t * 2.3 + ex) * 0.04);
    g.beginPath(); g.moveTo(-2.4, 1.6); g.lineTo(0.2, -4.6); g.lineTo(2.6, 1.6); g.closePath(); paint(g, C.hair, OUT);
    g.beginPath(); g.moveTo(-1.2, 1.1); g.lineTo(0.2, -2.6); g.lineTo(1.4, 1.1); g.closePath(); paint(g, '#ffb3c6');
    g.restore();
  };
  ear(hx - 4.3, hy - 5.4, -0.35);
  ear(hx + 3.4, hy - 6, 0.28);
  // rosto
  ell(g, hx + 0.9, hy + 1.2, 6, 5.7, C.skin, OUT);
  ell(g, hx + 4.5, hy + 3.4, 1.4, 0.7, 'rgba(255,120,140,0.45)');
  ell(g, hx - 1.6, hy + 3.4, 1.1, 0.6, 'rgba(255,120,140,0.4)');
  // franja
  g.beginPath();
  g.moveTo(hx - 6.6, hy + 1.4);
  g.quadraticCurveTo(hx - 7, hy - 6.6, hx + 0.6, hy - 6.9);
  g.quadraticCurveTo(hx + 7.4, hy - 6.6, hx + 7.3, hy + 0.8);
  g.lineTo(hx + 6, hy - 1.6); g.lineTo(hx + 5, hy + 0.4); g.lineTo(hx + 3.8, hy - 2.1);
  g.lineTo(hx + 2, hy - 0.4); g.lineTo(hx + 0.9, hy - 2.7); g.lineTo(hx - 1, hy - 0.6);
  g.lineTo(hx - 2.5, hy - 2.3); g.lineTo(hx - 4.2, hy + 0.6); g.lineTo(hx - 5.3, hy - 0.8);
  g.closePath();
  paint(g, C.hair, OUT);
  ell(g, hx - 0.8, hy - 4.6, 3, 0.85, C.hairL, null, 0, -0.2);
  ell(g, hx + 3.6, hy - 4.3, 1.1, 0.5, C.hairL, null, 0, 0.3);
  // mecha lateral
  g.beginPath(); g.moveTo(hx + 6.4, hy - 1.4); g.quadraticCurveTo(hx + 7.6, hy + 3, hx + 6.2, hy + 6.2);
  g.lineTo(hx + 5.4, hy + 1.5); g.closePath(); paint(g, C.hair, OUT, 0.5);

  // olhos
  const blink = (t % 3.4) < 0.12;
  const eye = (ex, ey, w, h) => {
    if (o.hurt) {
      g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(ex - w, ey - h * 0.6); g.lineTo(ex + w * 0.6, ey); g.lineTo(ex - w, ey + h * 0.6); g.stroke();
      return;
    }
    if (blink) {
      g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(ex - w, ey + 0.4); g.quadraticCurveTo(ex, ey + 1.2, ex + w, ey + 0.4); g.stroke();
      return;
    }
    const grd = g.createLinearGradient(0, ey - h, 0, ey + h);
    grd.addColorStop(0, C.iris1); grd.addColorStop(1, C.iris2);
    ell(g, ex, ey, w, h, grd, OUT, 0.6);
    ell(g, ex + 0.1, ey + 0.2, w * 0.45, h * 0.5, '#123040');
    ell(g, ex + w * 0.35, ey - h * 0.4, w * 0.38, w * 0.38, '#ffffff');
    ell(g, ex - w * 0.35, ey + h * 0.45, w * 0.18, w * 0.18, '#ffffff');
    g.strokeStyle = OUT; g.lineWidth = 0.95; g.lineCap = 'round';
    g.beginPath(); g.moveTo(ex - w - 0.2, ey - h * 0.55); g.quadraticCurveTo(ex, ey - h - 0.5, ex + w + 0.4, ey - h * 0.7); g.stroke();
  };
  eye(hx + 3.4, hy + 1.4, 1.75, 2.4);
  eye(hx - 0.9, hy + 1.4, 1.45, 2.3);
  // boca
  g.strokeStyle = OUT; g.lineWidth = 0.55; g.lineCap = 'round';
  g.beginPath();
  if (o.hurt) { g.moveTo(hx + 1.2, hy + 4.9); g.quadraticCurveTo(hx + 1.9, hy + 4.2, hx + 2.6, hy + 4.9); }
  else { g.moveTo(hx + 1.2, hy + 4.4); g.quadraticCurveTo(hx + 1.6, hy + 5, hx + 2, hy + 4.5); g.quadraticCurveTo(hx + 2.4, hy + 5, hx + 2.8, hy + 4.4); }
  g.stroke();

  g.restore();
}

// Rastro do golpe de espada (meia-lua brilhante)
function drawSlash(g, cx, cy, f, t) {
  g.save();
  g.translate(cx, cy); g.scale(f, 1);
  const a0 = -1.5, a1 = -1.5 + Math.min(1, t * 1.6) * 2.6;
  g.globalAlpha = 1 - t * 0.7;
  g.beginPath();
  g.arc(2, 0, 17, a0, a1);
  g.arc(4, 1, 11, a1, a0, true);
  g.closePath();
  const grd = g.createRadialGradient(2, 0, 9, 2, 0, 17);
  grd.addColorStop(0, 'rgba(160,240,255,0)'); grd.addColorStop(0.6, 'rgba(190,245,255,0.7)'); grd.addColorStop(1, '#ffffff');
  g.fillStyle = grd; g.fill();
  for (let i = 0; i < 3; i++) {
    const a = a0 + (a1 - a0) * (0.3 + i * 0.3);
    sparkle(g, 2 + Math.cos(a) * 18, Math.sin(a) * 18, 2.2 - i * 0.4, '#ffffff');
  }
  g.restore();
}

// ---------------------------------------------------------------
//  COGUMELINHO — inimigo que anda
// ---------------------------------------------------------------
function drawMushroom(g, x, y, dir, t, flash) {
  g.save(); g.translate(x, y); g.scale(dir, 1);
  const sq = Math.sin(t * 12) * 0.6;
  const W = flash ? '#ffffff' : null;
  const step = Math.sin(t * 12) * 1.4;
  ell(g, -3 + step, -1.2, 2.3, 1.4, W || '#8a5a3a', OUT);
  ell(g, 3 - step, -1.2, 2.3, 1.4, W || '#8a5a3a', OUT);
  ell(g, 0, -5.2, 5.3, 4.5 + sq * 0.3, W || '#fff1dc', OUT);
  ell(g, 3.2, -3.6, 1.1, 0.6, 'rgba(255,120,140,0.5)');
  // olhinhos bravos
  ell(g, 2.4, -5.6, 0.95, 1.4, OUT); ell(g, 2.6, -6.1, 0.35, 0.35, '#fff');
  ell(g, -0.6, -5.6, 0.85, 1.3, OUT); ell(g, -0.4, -6.1, 0.3, 0.3, '#fff');
  g.strokeStyle = OUT; g.lineWidth = 0.6;
  g.beginPath(); g.moveTo(1.4, -7.6); g.lineTo(3.4, -7); g.moveTo(-1.6, -7.4); g.lineTo(0.2, -7.7); g.stroke();
  // chapéu
  const top = -16.5 - sq;
  g.beginPath();
  g.moveTo(-8.4, -7.6); g.quadraticCurveTo(-8.6, top, 0, top);
  g.quadraticCurveTo(8.6, top, 8.4, -7.6);
  g.quadraticCurveTo(0, -5.4, -8.4, -7.6); g.closePath();
  let cap = W;
  if (!cap) { cap = g.createLinearGradient(0, top, 0, -6); cap.addColorStop(0, '#ff7a7a'); cap.addColorStop(1, '#d63c4e'); }
  paint(g, cap, OUT);
  if (!flash) {
    ell(g, -3.5, -12.5 - sq, 1.8, 1.3, '#fff6ee'); ell(g, 2.6, -13.8 - sq, 1.5, 1.1, '#fff6ee');
    ell(g, 5.6, -10, 1.1, 0.9, '#fff6ee'); ell(g, -6.4, -9.3, 0.9, 0.8, '#fff6ee');
    ell(g, -1.5, -15 - sq, 2.5, 0.6, 'rgba(255,255,255,0.45)');
  }
  g.restore();
}

// ---------------------------------------------------------------
//  PLUMITO — bichinho voador (fofo, mas morde!)
// ---------------------------------------------------------------
function drawPlumito(g, x, y, t, face, flash) {
  g.save(); g.translate(x, y); g.scale(face, 1);
  const flap = Math.sin(t * 16);
  const W = flash ? '#ffffff' : null;
  const wing = (s) => {
    g.save(); g.scale(s, 1);
    g.beginPath();
    g.moveTo(3.5, -1);
    g.quadraticCurveTo(9, -6 - flap * 4, 13, -3 - flap * 5);
    g.quadraticCurveTo(11, -1 - flap * 2, 12, 1 - flap * 2);
    g.quadraticCurveTo(9, 0, 9.5, 2.5 - flap);
    g.quadraticCurveTo(6, 1.5, 3.5, 2);
    g.closePath();
    paint(g, W || (s < 0 ? '#e3dcff' : '#ffffff'), OUT);
    g.restore();
  };
  wing(-1);
  // corpo
  let body = W;
  if (!body) { body = g.createRadialGradient(-1.5, -2, 1, 0, 0, 7); body.addColorStop(0, '#e9dcff'); body.addColorStop(1, '#a983ee'); }
  ell(g, 0, 0, 6.2, 5.6, body, OUT);
  // orelhas
  g.beginPath(); g.moveTo(-4.6, -3); g.lineTo(-3.6, -8); g.lineTo(-1.2, -4.8); g.closePath(); paint(g, W || '#a983ee', OUT);
  g.beginPath(); g.moveTo(1.4, -5); g.lineTo(3.8, -8.2); g.lineTo(4.8, -3); g.closePath(); paint(g, W || '#a983ee', OUT);
  ell(g, 0.5, 2.2, 3.4, 2.2, W || '#f6efff');
  // olhos
  ell(g, 2.3, -0.8, 1.2, 1.6, '#3a1d5a'); ell(g, 2.6, -1.4, 0.45, 0.45, '#fff');
  ell(g, -1.4, -0.8, 1.1, 1.5, '#3a1d5a'); ell(g, -1.1, -1.4, 0.4, 0.4, '#fff');
  g.strokeStyle = OUT; g.lineWidth = 0.6;
  g.beginPath(); g.moveTo(1.2, -3); g.lineTo(3.6, -2.4); g.moveTo(-2.6, -2.5); g.lineTo(-0.4, -3); g.stroke();
  // presinha
  g.beginPath(); g.moveTo(0.4, 1.6); g.lineTo(1, 2.8); g.lineTo(1.5, 1.6); g.closePath(); paint(g, '#fff', OUT, 0.35);
  wing(1);
  g.restore();
}

// ---------------------------------------------------------------
//  ITENS
// ---------------------------------------------------------------
function heartPath(g, cx, cy, s) {
  g.beginPath();
  g.moveTo(cx, cy + s * 0.9);
  g.bezierCurveTo(cx - s * 1.4, cy + s * 0.1, cx - s * 1.1, cy - s * 1.1, cx, cy - s * 0.45);
  g.bezierCurveTo(cx + s * 1.1, cy - s * 1.1, cx + s * 1.4, cy + s * 0.1, cx, cy + s * 0.9);
  g.closePath();
}
function drawHeartIcon(g, cx, cy, s, full) {
  heartPath(g, cx, cy, s);
  if (full) {
    const grd = g.createLinearGradient(0, cy - s, 0, cy + s);
    grd.addColorStop(0, '#ff8aa8'); grd.addColorStop(1, '#e8264f');
    paint(g, grd, '#7a1a33', 0.7);
    ell(g, cx - s * 0.45, cy - s * 0.35, s * 0.28, s * 0.18, 'rgba(255,255,255,0.85)', null, 0, -0.6);
  } else {
    paint(g, 'rgba(60,30,50,0.55)', '#7a1a33', 0.7);
  }
}

// Lanterna de salvamento (x, y = canto do bloco)
function drawLantern(g, x, y, t, active) {
  const glow = 0.75 + Math.sin(t * 3) * 0.15;
  const cx = x + 11, cy = y + 7.5;
  const grd = g.createRadialGradient(cx, cy, 1, cx, cy, 18);
  grd.addColorStop(0, `rgba(255,220,130,${0.55 * glow})`); grd.addColorStop(1, 'rgba(255,200,100,0)');
  g.fillStyle = grd; g.fillRect(cx - 18, cy - 18, 36, 36);
  // poste
  rrPath(g, x + 5.6, y + 2, 2.4, 14, 0.6); paint(g, '#8a5a32', OUT, 0.6);
  rrPath(g, x + 5, y + 1.2, 8.4, 1.8, 0.6); paint(g, '#8a5a32', OUT, 0.6);
  rrPath(g, x + 3.8, y + 14.4, 4.8, 1.8, 0.6); paint(g, '#6b4226', OUT, 0.5);
  // lanterna
  g.strokeStyle = OUT; g.lineWidth = 0.5; g.beginPath(); g.moveTo(cx, y + 3); g.lineTo(cx, y + 4.4); g.stroke();
  rrPath(g, cx - 2.6, y + 4.4, 5.2, 6.4, 1.2);
  const lg = g.createLinearGradient(0, y + 4.4, 0, y + 11);
  lg.addColorStop(0, active ? '#fffbe0' : '#ffe9a0'); lg.addColorStop(1, '#ffb347');
  paint(g, lg, OUT, 0.6);
  rrPath(g, cx - 3.2, y + 3.8, 6.4, 1.4, 0.5); paint(g, '#5a3a24', OUT, 0.4);
  rrPath(g, cx - 3.2, y + 10.4, 6.4, 1.4, 0.5); paint(g, '#5a3a24', OUT, 0.4);
  ell(g, cx - 1, y + 6.6, 0.6, 1.4, 'rgba(255,255,255,0.8)');
}

function drawOrb(g, cx, cy, color, t, kind) {
  const grd = g.createRadialGradient(cx, cy, 1, cx, cy, 16);
  grd.addColorStop(0, color + 'aa'); grd.addColorStop(1, color + '00');
  g.fillStyle = grd; g.fillRect(cx - 16, cy - 16, 32, 32);
  // anel girando (parte de trás)
  g.save(); g.translate(cx, cy); g.rotate(-0.4);
  g.strokeStyle = color; g.lineWidth = 0.9; g.globalAlpha = 0.8;
  g.beginPath(); g.ellipse(0, 0, 9, 2.6, 0, Math.PI, TAU); g.stroke();
  g.restore();
  const sg = g.createRadialGradient(cx - 1.8, cy - 2, 0.5, cx, cy, 5.5);
  sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.4, color); sg.addColorStop(1, shadeHex(color, -70));
  ell(g, cx, cy, 5.2, 5.2, sg, OUT, 0.6);
  g.strokeStyle = '#ffffff'; g.lineWidth = 0.9; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  if (kind === 'D') { g.moveTo(cx - 2, cy + 0.2); g.lineTo(cx, cy - 1.8); g.lineTo(cx + 2, cy + 0.2); g.moveTo(cx - 2, cy + 2.2); g.lineTo(cx, cy + 0.2); g.lineTo(cx + 2, cy + 2.2); }
  else { g.moveTo(cx - 2, cy - 2); g.lineTo(cx, cy); g.lineTo(cx - 2, cy + 2); g.moveTo(cx + 0.4, cy - 2); g.lineTo(cx + 2.4, cy); g.lineTo(cx + 0.4, cy + 2); }
  g.stroke();
  g.save(); g.translate(cx, cy); g.rotate(-0.4);
  g.strokeStyle = color; g.lineWidth = 0.9; g.globalAlpha = 0.8;
  g.beginPath(); g.ellipse(0, 0, 9, 2.6, 0, 0, Math.PI); g.stroke();
  g.restore();
  for (let i = 0; i < 3; i++) {
    const a = t * 1.5 + i * 2.1;
    sparkle(g, cx + Math.cos(a) * 10, cy + Math.sin(a) * 7, 1.4 + Math.sin(t * 5 + i) * 0.6, '#ffffff', 0.9);
  }
}

function drawHeartContainer(g, cx, cy, t) {
  const grd = g.createRadialGradient(cx, cy, 1, cx, cy, 15);
  grd.addColorStop(0, 'rgba(255,120,160,0.55)'); grd.addColorStop(1, 'rgba(255,120,160,0)');
  g.fillStyle = grd; g.fillRect(cx - 15, cy - 15, 30, 30);
  ell(g, cx, cy, 7.5, 7.5, null, '#ffd36b', 1.2);
  drawHeartIcon(g, cx, cy + 0.5, 5 + Math.sin(t * 4) * 0.3, true);
  sparkle(g, cx + 6, cy - 6, 1.8, '#fff');
}

function drawPortal(g, cx, cy, t) {
  const beam = g.createLinearGradient(0, cy - 26, 0, cy + 12);
  beam.addColorStop(0, 'rgba(160,220,255,0)'); beam.addColorStop(1, 'rgba(160,220,255,0.55)');
  g.fillStyle = beam; g.fillRect(cx - 9, cy - 26, 18, 38);
  for (let i = 0; i < 4; i++) {
    const r = 10 - i * 2 + Math.sin(t * 4 + i) * 0.8;
    g.save(); g.translate(cx, cy + 9); g.rotate(t * (i % 2 ? 1.5 : -1.2));
    g.strokeStyle = i % 2 ? 'rgba(255,255,255,0.8)' : 'rgba(120,200,255,0.9)';
    g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(0, 0, r, r * 0.35, 0, 0, TAU * 0.8); g.stroke();
    g.restore();
  }
  for (let i = 0; i < 5; i++) {
    const k = (t * 0.6 + i / 5) % 1;
    sparkle(g, cx + Math.sin(i * 7 + t) * 6, cy + 10 - k * 34, 1.4, '#ffffff', 1 - k);
  }
}

// ---------------------------------------------------------------
//  OBJETOS DE CENÁRIO (desenhados uma vez na camada estática)
//  x = centro, y = chão
// ---------------------------------------------------------------
function drawProp(g, kind, x, y, th, r) {
  switch (kind) {
    case 'flowers': {
      const n = 2 + Math.floor(r * 3);
      for (let i = 0; i < n; i++) {
        const fx = x - 5 + i * 4 + hash(i, r * 99) * 2, fh = 3 + hash(r * 50, i) * 4;
        g.strokeStyle = th.grassDark; g.lineWidth = 0.6;
        g.beginPath(); g.moveTo(fx, y); g.quadraticCurveTo(fx + 1, y - fh / 2, fx, y - fh); g.stroke();
        const col = th.flowers[(i + Math.floor(r * 10)) % th.flowers.length];
        for (let p = 0; p < 5; p++) ell(g, fx + Math.cos(p * TAU / 5) * 1.1, y - fh + Math.sin(p * TAU / 5) * 1.1, 0.9, 0.9, col);
        ell(g, fx, y - fh, 0.6, 0.6, '#ffcf3a');
      }
      break;
    }
    case 'tallgrass': {
      for (let i = 0; i < 6; i++) {
        const bx = x - 5 + i * 2, h = 4 + hash(i, r * 77) * 6, bend = (hash(r * 31, i) - 0.5) * 4;
        g.beginPath(); g.moveTo(bx - 0.8, y); g.quadraticCurveTo(bx + bend * 0.3, y - h * 0.6, bx + bend, y - h);
        g.quadraticCurveTo(bx + bend * 0.3 + 0.6, y - h * 0.5, bx + 0.9, y); g.closePath();
        paint(g, i % 2 ? th.grass : th.grassLight);
      }
      break;
    }
    case 'mushroom': {
      rrPath(g, x - 1, y - 4, 2, 4, 0.6); paint(g, '#fff1dc', OUT, 0.5);
      g.beginPath(); g.moveTo(x - 3.6, y - 3.6); g.quadraticCurveTo(x - 3.6, y - 7.5, x, y - 7.5);
      g.quadraticCurveTo(x + 3.6, y - 7.5, x + 3.6, y - 3.6); g.closePath();
      paint(g, th.mushrooms ? '#9a7aff' : '#ef5a64', OUT, 0.5);
      ell(g, x - 1.2, y - 5.8, 0.7, 0.5, '#fff'); ell(g, x + 1.6, y - 5, 0.5, 0.4, '#fff');
      if (th.mushrooms) { const gg = g.createRadialGradient(x, y - 5, 0, x, y - 5, 7); gg.addColorStop(0, 'rgba(180,160,255,0.35)'); gg.addColorStop(1, 'rgba(180,160,255,0)'); g.fillStyle = gg; g.fillRect(x - 7, y - 12, 14, 14); }
      break;
    }
    case 'rock': {
      g.beginPath(); g.moveTo(x - 5, y); g.quadraticCurveTo(x - 5, y - 4.5, x - 1, y - 4.8);
      g.quadraticCurveTo(x + 5, y - 5, x + 5.4, y); g.closePath();
      paint(g, '#a9a4b8', OUT, 0.6);
      ell(g, x - 1.5, y - 3.4, 1.8, 0.7, 'rgba(255,255,255,0.5)');
      break;
    }
    case 'stump': {
      rrPath(g, x - 5, y - 6, 10, 6.4, [0, 0, 1, 1]); paint(g, '#a06a3c', OUT, 0.6);
      g.strokeStyle = 'rgba(80,40,20,0.4)'; g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(x - 2, y - 5); g.lineTo(x - 2, y); g.moveTo(x + 2.5, y - 5); g.lineTo(x + 2.5, y); g.stroke();
      ell(g, x, y - 6, 5, 1.8, '#e2b47a', OUT, 0.6);
      ell(g, x, y - 6, 2.6, 0.9, null, '#b07a46', 0.5);
      break;
    }
    case 'barrel': {
      rrPath(g, x - 4.2, y - 10, 8.4, 10, 2.5);
      const bg = g.createLinearGradient(x - 4, 0, x + 4, 0);
      bg.addColorStop(0, '#9a5e32'); bg.addColorStop(0.4, '#cf8f55'); bg.addColorStop(1, '#8a5228');
      paint(g, bg, OUT, 0.6);
      rrPath(g, x - 4.4, y - 8.2, 8.8, 1.2, 0.4); paint(g, '#5f6b7a', OUT, 0.4);
      rrPath(g, x - 4.4, y - 3, 8.8, 1.2, 0.4); paint(g, '#5f6b7a', OUT, 0.4);
      ell(g, x, y - 10, 3.6, 1, '#7a4422', OUT, 0.5);
      break;
    }
    case 'fence': {
      for (let i = 0; i < 3; i++) {
        const fx = x - 7 + i * 7;
        g.beginPath(); g.moveTo(fx - 1.6, y); g.lineTo(fx - 1.6, y - 11); g.lineTo(fx, y - 13);
        g.lineTo(fx + 1.6, y - 11); g.lineTo(fx + 1.6, y); g.closePath();
        paint(g, '#b8693f', OUT, 0.6);
        g.strokeStyle = 'rgba(255,220,180,0.4)'; g.lineWidth = 0.5;
        g.beginPath(); g.moveTo(fx - 0.6, y - 1); g.lineTo(fx - 0.6, y - 10.5); g.stroke();
      }
      rrPath(g, x - 9, y - 9, 18, 1.8, 0.6); paint(g, '#9a5532', OUT, 0.5);
      rrPath(g, x - 9, y - 4.5, 18, 1.8, 0.6); paint(g, '#9a5532', OUT, 0.5);
      break;
    }
    case 'crystal': {
      const shard = (sx, h, w, rot) => {
        g.save(); g.translate(sx, y); g.rotate(rot);
        g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w, -h * 0.7); g.lineTo(0, -h); g.lineTo(w, -h * 0.7); g.lineTo(w, 0); g.closePath();
        const cg = g.createLinearGradient(-w, 0, w, 0); cg.addColorStop(0, '#bfeaff'); cg.addColorStop(1, '#6ab0e8');
        paint(g, cg, '#2c4a6a', 0.5);
        g.restore();
      };
      shard(x - 2.5, 6, 1.5, -0.3); shard(x + 2.5, 5, 1.3, 0.35); shard(x, 9, 1.8, 0);
      const gg = g.createRadialGradient(x, y - 4, 0, x, y - 4, 10); gg.addColorStop(0, 'rgba(160,220,255,0.35)'); gg.addColorStop(1, 'rgba(160,220,255,0)');
      g.fillStyle = gg; g.fillRect(x - 10, y - 14, 20, 20);
      break;
    }
    case 'sack': {
      g.beginPath(); g.moveTo(x - 4, y); g.quadraticCurveTo(x - 5.5, y - 6, x - 1.5, y - 7.5);
      g.lineTo(x - 2, y - 9); g.lineTo(x + 2, y - 9); g.lineTo(x + 1.5, y - 7.5);
      g.quadraticCurveTo(x + 5.5, y - 6, x + 4, y); g.closePath();
      paint(g, '#e6cf9a', OUT, 0.6);
      rrPath(g, x - 2, y - 8, 4, 1, 0.3); paint(g, '#a0703a');
      break;
    }
    case 'pot': {
      g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x - 4, y - 5); g.lineTo(x + 4, y - 5); g.lineTo(x + 3, y); g.closePath();
      paint(g, '#d8774a', OUT, 0.6);
      rrPath(g, x - 4.6, y - 6.2, 9.2, 1.6, 0.5); paint(g, '#c0603a', OUT, 0.5);
      for (let i = 0; i < 3; i++) ell(g, x - 2 + i * 2, y - 8 - (i % 2) * 1.5, 1.4, 1.4, th.flowers[i % th.flowers.length], OUT, 0.4);
      break;
    }
  }
}

function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1, 7), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v + amt))).toString(16).padStart(2, '0');
  return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255);
}
function hash(x, y) {
  let h = Math.floor(x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
