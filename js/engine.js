// versão dos arquivos (atualizada pelo atualizar_versao.sh) — evita imagem antiga em cache
const ASSET_V = '20261017154655';

// =============================================================
//  MOTOR: constantes, estado global, colisão com blocos, partículas
// =============================================================

const TILE = 16;
const VIEW_W = 320, VIEW_H = 192;   // tamanho da tela do jogo (em pixels do jogo)
const SCALE = 4;                     // pixels da tela por unidade do jogo (= densidade da arte)

// Física (pixels por segundo)
const PHYS = {
  RUN: 100,
  GRAVITY: 900,
  MAX_FALL: 300,
  JUMP: 320,          // pulo normal  (~3,5 blocos de altura)
  DOUBLE_JUMP: 300,   // segundo pulo
  DASH_SPEED: 240,     // rolamento
  DASH_TIME: 0.3,
  SPRINT_SPEED: 330,   // dash no chão
  SPRINT_TIME: 0.17,
};

// Estado global do jogo
const G = {
  state: 'title',     // title | play | dead
  paused: false,
  room: null,
  roomId: null,
  player: null,
  enemies: [],
  items: [],
  particles: [],
  ambient: [],        // pétalas, folhas, vaga-lumes (enfeite de tela)
  cam: { x: 0, y: 0 },
  shake: 0,
  banner: null,
  roomTitle: null,
  time: 0,
  data: null,         // progresso (é o que vai pro save)
  saveLock: false,
  deadT: 0,
  fade: 0,
};

// ---------- blocos ----------
function tileAt(tx, ty) {
  const r = G.room;
  if (tx < 0 || ty < 0 || tx >= r.w || ty >= r.h) return '.';
  return r.tiles[ty * r.w + tx];
}
function setTile(tx, ty, c) {
  const r = G.room;
  if (tx < 0 || ty < 0 || tx >= r.w || ty >= r.h) return;
  r.tiles[ty * r.w + tx] = c;
}
const isSolid = c => c === '#' || c === 'B' || c === 'X';   // X = portão fechado

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function collidesSolid(b) {
  const x0 = Math.floor(b.x / TILE), x1 = Math.floor((b.x + b.w - 0.001) / TILE);
  const y0 = Math.floor(b.y / TILE), y1 = Math.floor((b.y + b.h - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++)
      if (isSolid(tileAt(tx, ty))) return true;
  return false;
}

// Move um corpo (jogador ou inimigo) e resolve colisão com os blocos
function moveBody(b, dt) {
  b.hitWallX = 0;
  b.hitCeil = false;

  // eixo X
  b.x += b.vx * dt;
  if (collidesSolid(b)) {
    if (b.vx > 0) b.x = Math.floor((b.x + b.w) / TILE) * TILE - b.w - 0.001;
    else if (b.vx < 0) b.x = (Math.floor(b.x / TILE) + 1) * TILE + 0.001;
    b.hitWallX = Math.sign(b.vx) || 1;
    b.vx = 0;
  }

  // eixo Y
  const prevBottom = b.y + b.h;
  b.y += b.vy * dt;
  b.onGround = false;
  const x0 = Math.floor(b.x / TILE), x1 = Math.floor((b.x + b.w - 0.001) / TILE);

  if (b.vy > 0) {
    const ty = Math.floor((b.y + b.h) / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      const c = tileAt(tx, ty);
      const oneWay = c === '=' && !(b.dropT > 0) && prevBottom <= ty * TILE + 0.5;
      if (isSolid(c) || oneWay) {
        b.y = ty * TILE - b.h;
        b.vy = 0;
        b.onGround = true;
        b.groundTile = c;
        break;
      }
    }
  } else if (b.vy < 0) {
    const ty = Math.floor(b.y / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolid(tileAt(tx, ty))) {
        b.y = (ty + 1) * TILE;
        b.vy = 0;
        b.hitCeil = true;
        break;
      }
    }
  }
}

// O espinho ocupa só a metade de baixo do bloco
function touchingSpikes(b) {
  const box = { x: b.x + 2, y: b.y + 2, w: b.w - 4, h: b.h - 2 };
  const x0 = Math.floor(box.x / TILE), x1 = Math.floor((box.x + box.w) / TILE);
  const y0 = Math.floor(box.y / TILE), y1 = Math.floor((box.y + box.h) / TILE);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++)
      if (tileAt(tx, ty) === '^' &&
          overlaps(box, { x: tx * TILE, y: ty * TILE + 8, w: TILE, h: 8 })) return true;
  return false;
}

// ---------- partículas ----------
function spawnParticles(x, y, n, color, opts = {}) {
  for (let i = 0; i < n; i++) {
    const ang = opts.angle != null ? opts.angle + (Math.random() - 0.5) * (opts.spread ?? Math.PI * 2)
                                   : Math.random() * Math.PI * 2;
    const sp = (opts.speed ?? 60) * (0.4 + Math.random() * 0.8);
    const life = (opts.life ?? 0.5) * (0.6 + Math.random() * 0.6);
    G.particles.push({
      x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      life, max: life, color, size: opts.size ?? 2, grav: opts.grav ?? 0,
    });
  }
}

function updateParticles(dt) {
  for (const p of G.particles) {
    p.life -= dt;
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  G.particles = G.particles.filter(p => p.life > 0);
}

const approach = (v, target, amount) =>
  v < target ? Math.min(v + amount, target) : Math.max(v - amount, target);
